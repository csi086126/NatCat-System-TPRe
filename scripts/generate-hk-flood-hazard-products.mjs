// 为 Hong Kong 生成预计算的年指标栅格,使前端 flood-query 与 Macau 共用同一套查询路径。
//
// 数学与 src/app/api/hazards/flood-query/route.ts 中 computeAnnualMetricsFromRpCurve 完全一致:
//   1) annualFloodProbability: 在 log(RP)-log(depth) 空间插值,找到 depth=threshold 时的 RP*,概率 = 1/RP*
//   2) annualizedExcessDepth: 在概率空间用梯形法数值积分 max(depth - threshold, 0)
//
// 每个像素逐个调用同一函数,只是把单点搜索变成 2083 × 1505 = 3.13M 次重复。
// 11 个 RP × 2 个事件族 = 22 次 WCS GetCoverage;每族串行、族间并行以降低 GeoServer 压力。
//
// 输出:
//   scripts/generated/hk-flood-hazard/HK_Flood_NONTC_AnnualProbability_GT015m.tif
//   scripts/generated/hk-flood-hazard/HK_Flood_NONTC_AnnualizedExcessDepth_GT015m.tif
//   scripts/generated/hk-flood-hazard/HK_Flood_Compound_AnnualProbability_GT015m.tif
//   scripts/generated/hk-flood-hazard/HK_Flood_Compound_AnnualizedExcessDepth_GT015m.tif
//
// 运行:
//   node scripts/generate-hk-flood-hazard-products.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromArrayBuffer, writeArrayBuffer } from 'geotiff';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'scripts', 'generated', 'hk-flood-hazard');
const STATS_FILE = path.join(ROOT, 'src', 'features', 'risk-map', 'data', 'hongKongFloodHazardStats.json');
const WCS_URL = process.env.HAZARD_GEOSERVER_WCS_URL || 'http://10.253.22.15:8080/geoserver/wcs';
const WORKSPACE = process.env.NEXT_PUBLIC_HK_FLOOD_GEOSERVER_WORKSPACE || 'natcat_platform';

const THRESHOLD = Number(process.env.FLOOD_INUNDATION_THRESHOLD_METERS || 0.15);
// 与 hongKongScenarios.ts 中 HK_NON_TYPHOON_RETURN_PERIODS 保持同步。
const RETURN_PERIODS = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const AEP = RETURN_PERIODS.map(returnPeriod => 1 / returnPeriod);

// 与源栅格 HK_Flood_NONTC_R100 等完全一致的几何(EPSG:2326 / HK 1980 Grid)。
// 源文件 IFD 给出的精确值:
//   - ImageWidth=2084, ImageLength=1506(注意 DescribeCoverage 的 high 是最大索引 0-based,
//     所以实际像素数 = high+1)
//   - ModelTiepoint=(0,0,0,801018.5,846907.6132437619,0):pixel (0,0) center at (E=801018.5, N=846907.61)
//   - ModelPixelScale=(30.0024,30.0024,0)
// 必须严格对齐,否则 WCS 邻域查询会拿到错位置的像素。
const GRID = {
  crs: 'EPSG:2326',
  // 用 tiepoint + 像素数推回 bbox,作为 WCS GetCoverage 的查询参数,确保服务端
  // 不做重投影/重采样,直接返回原生网格。
  bbox: [
    801018.5,
    846907.6132437619 - 1505 * 30.002399232245683,  // minY
    801018.5 + 2083 * 30.002399232245683,            // maxX
    846907.6132437619,                                // maxY
  ],
  width: 2084,
  height: 1506,
  pixelSize: 30.002399232245683,
  // 直接写到 GeoTIFF 的 ModelTiepoint:像素 (0,0) center at (E=801018.5, N=846907.61)
  tiepointX: 801018.5,
  tiepointY: 846907.6132437619,
};

const FAMILIES = [
  {
    id: 'non-typhoon-rainfall',
    localPrefix: 'HK_Flood_NONTC_R',
    shortName: 'NONTC',
  },
  {
    id: 'typhoon-compound',
    localPrefix: 'HK_Flood_Compound_R',
    shortName: 'Compound',
  },
];

function code(returnPeriod) {
  return String(returnPeriod).padStart(3, '0');
}

function coverage(family, returnPeriod) {
  return `${WORKSPACE}:${family.localPrefix}${code(returnPeriod)}`;
}

async function downloadCoverage(layer) {
  const params = new URLSearchParams({
    SERVICE: 'WCS',
    VERSION: '1.0.0',
    REQUEST: 'GetCoverage',
    COVERAGE: layer,
    CRS: GRID.crs,
    BBOX: GRID.bbox.join(','),
    WIDTH: String(GRID.width),
    HEIGHT: String(GRID.height),
    FORMAT: 'GeoTIFF',
  });
  const response = await fetch(`${WCS_URL}?${params}`, {
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`${layer}: WCS HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('tiff')) {
    throw new Error(`${layer}: expected TIFF, received ${contentType}`);
  }
  return response.arrayBuffer();
}

async function readCoverage(layer) {
  const tiff = await fromArrayBuffer(await downloadCoverage(layer));
  const image = await tiff.getImage();
  if (image.getWidth() !== GRID.width || image.getHeight() !== GRID.height) {
    throw new Error(
      `${layer}: grid mismatch ${image.getWidth()}x${image.getHeight()}, expected ${GRID.width}x${GRID.height}`,
    );
  }
  return {
    values: await image.readRasters({ interleave: true }),
    noData: image.getGDALNoData(),
  };
}

function isValid(value, noData) {
  return Number.isFinite(value)
    && value > -9990
    && value < 10000
    && (noData === null || Math.abs(value - noData) > 1e-6);
}

// 单像素年指标:与 computeAnnualMetricsFromRpCurve 完全相同的算法,
// 区别在于 validDepths 已经按 RETURN_PERIODS 升序排好(都是有效值,已 clamp 到 0)。
function computeAnnualMetrics(validDepths) {
  const dMin = validDepths[0];
  const rMax = RETURN_PERIODS[RETURN_PERIODS.length - 1];
  const dMax = validDepths[validDepths.length - 1];

  // 1) annualFloodProbability:log-log 插值,找到 depth=threshold 时的 RP*
  let probability;
  if (dMax < THRESHOLD) {
    // 最大 RP 仍低于阈值,以 1/R_max 作为可上界(> 实际值,保守一些)
    probability = 1 / rMax;
  } else if (dMin > THRESHOLD) {
    // 最小 RP 已经超过阈值,封顶 1.0
    probability = 1.0;
  } else {
    let rStar = rMax;
    for (let i = 0; i < validDepths.length - 1; i += 1) {
      const di = validDepths[i];
      const di1 = validDepths[i + 1];
      if (di < THRESHOLD && di1 >= THRESHOLD) {
        const ri = RETURN_PERIODS[i];
        const ri1 = RETURN_PERIODS[i + 1];
        const logDepthFraction = (Math.log(THRESHOLD) - Math.log(di)) / (Math.log(di1) - Math.log(di));
        rStar = ri * Math.exp(logDepthFraction * (Math.log(ri1) - Math.log(ri)));
        break;
      }
    }
    probability = 1 / rStar;
  }
  probability = Math.min(1, Math.max(0, probability));

  // 2) annualizedExcessDepth:概率空间梯形积分
  let annualizedExcess = 0;
  for (let i = 0; i < validDepths.length - 1; i += 1) {
    const eI = Math.max(0, validDepths[i] - THRESHOLD);
    const eI1 = Math.max(0, validDepths[i + 1] - THRESHOLD);
    const pI = AEP[i];
    const pI1 = AEP[i + 1];
    annualizedExcess += (pI - pI1) * (eI + eI1) / 2;
  }
  annualizedExcess = Math.max(0, annualizedExcess);

  return { probability, annualizedExcess };
}

async function writeDerivedRaster(values, outputPath) {
  const buffer = await writeArrayBuffer(values, {
    width: GRID.width,
    height: GRID.height,
    BitsPerSample: [32],
    SampleFormat: [3],
    SamplesPerPixel: 1,
    ModelPixelScale: [GRID.pixelSize, GRID.pixelSize, 0],
    ModelTiepoint: [0, 0, 0, GRID.tiepointX, GRID.tiepointY, 0],
    GTModelTypeGeoKey: 1,
    ProjectedCSTypeGeoKey: 2326,
    GTRasterTypeGeoKey: 1,
    GDAL_NODATA: '-9999',
  });
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

async function processFamily(family) {
  console.log(`\nProcessing ${family.id}`);
  const rasters = [];
  let noData = null;
  for (const returnPeriod of RETURN_PERIODS) {
    const layer = coverage(family, returnPeriod);
    console.log(`  Downloading ${layer}`);
    const raster = await readCoverage(layer);
    noData = raster.noData;
    rasters.push(raster.values);
  }

  const cellCount = GRID.width * GRID.height;
  const probability = new Float32Array(cellCount);
  const annualized = new Float32Array(cellCount);
  probability.fill(-9999);
  annualized.fill(-9999);
  const depths = new Array(RETURN_PERIODS.length);

  for (let cell = 0; cell < cellCount; cell += 1) {
    let valid = true;
    for (let rp = 0; rp < rasters.length; rp += 1) {
      const value = Number(rasters[rp][cell]);
      if (!isValid(value, noData)) {
        valid = false;
        break;
      }
      depths[rp] = Math.max(0, value);
    }
    if (!valid) continue;
    const metrics = computeAnnualMetrics(depths);
    probability[cell] = metrics.probability;
    annualized[cell] = metrics.annualizedExcess;
  }

  const probabilityPath = path.join(
    OUTPUT_DIR,
    `HK_Flood_${family.shortName}_AnnualProbability_GT015m.tif`,
  );
  const annualizedPath = path.join(
    OUTPUT_DIR,
    `HK_Flood_${family.shortName}_AnnualizedExcessDepth_GT015m.tif`,
  );
  await writeDerivedRaster(probability, probabilityPath);
  await writeDerivedRaster(annualized, annualizedPath);
  console.log(`  Wrote ${probabilityPath}`);
  console.log(`  Wrote ${annualizedPath}`);

  // 简明统计:有效像素数、均值、最大值
  let validCount = 0;
  let sumProb = 0;
  let sumAnn = 0;
  let maxProb = 0;
  let maxAnn = 0;
  for (let cell = 0; cell < cellCount; cell += 1) {
    if (probability[cell] > -9990) {
      validCount += 1;
      sumProb += probability[cell];
      sumAnn += annualized[cell];
      if (probability[cell] > maxProb) maxProb = probability[cell];
      if (annualized[cell] > maxAnn) maxAnn = annualized[cell];
    }
  }
  const validPct = (validCount / cellCount * 100).toFixed(2);
  console.log(`  Valid cells: ${validCount} / ${cellCount} (${validPct}%)`);
  if (validCount > 0) {
    console.log(`  Probability: mean=${(sumProb / validCount).toFixed(6)}, max=${maxProb.toFixed(6)}`);
    console.log(`  Annualized:  mean=${(sumAnn / validCount).toFixed(6)}, max=${maxAnn.toFixed(6)}`);
  }

  return {
    family: family.id,
    sourceLayers: RETURN_PERIODS.map(returnPeriod => coverage(family, returnPeriod)),
    probabilityLayer: `natcat_platform:HK_Flood_${family.shortName}_AnnualProbability_GT015m`,
    annualizedLayer: `natcat_platform:HK_Flood_${family.shortName}_AnnualizedExcessDepth_GT015m`,
    probabilityRaster: path.relative(ROOT, probabilityPath).replaceAll('\\', '/'),
    annualizedRaster: path.relative(ROOT, annualizedPath).replaceAll('\\', '/'),
    validCellCount: validCount,
    totalCellCount: cellCount,
    meanProbability: validCount ? Number((sumProb / validCount).toFixed(6)) : 0,
    maxProbability: Number(maxProb.toFixed(6)),
    meanAnnualized: validCount ? Number((sumAnn / validCount).toFixed(6)) : 0,
    maxAnnualized: Number(maxAnn.toFixed(6)),
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });

  // 族间并行(2 个并发下载),族内串行,避免 22 路并发压垮 GeoServer。
  const results = await Promise.all(FAMILIES.map(family => processFamily(family)));
  const families = {};
  for (const result of results) {
    families[result.family] = result;
  }

  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    thresholdMeters: THRESHOLD,
    returnPeriods: RETURN_PERIODS,
    probabilityMethod:
      'Log-log interpolation between the two adjacent return periods straddling depth = threshold; probability = 1 / RP*. Lower-bounded at 1 / R1000, upper-bounded at 1.0.',
    annualizedMethod:
      'Trapezoidal integration in probability space: ΔE = (P_i - P_{i+1}) · (e_i + e_{i+1}) / 2 over [R2, R1000] with e = max(depth - threshold, 0).',
    grid: GRID,
    families,
  };
  await fs.writeFile(STATS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${STATS_FILE}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});