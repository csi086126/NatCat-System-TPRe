import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromArrayBuffer, writeArrayBuffer } from 'geotiff';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'scripts', 'generated', 'macau-flood-hazard');
const STATS_FILE = path.join(ROOT, 'src', 'features', 'risk-map', 'data', 'macauFloodHazardStats.json');
const WCS_URL = process.env.HAZARD_GEOSERVER_WCS_URL || 'http://10.253.22.15:8080/geoserver/wcs';
const WORKSPACE = process.env.NEXT_PUBLIC_MACAU_DESIGN_GEOSERVER_WORKSPACE || 'natcat_platform';
const PREFIX = process.env.NEXT_PUBLIC_MACAU_DESIGN_LAYER_PREFIX || 'MO_Flood_Design_';
const REFERENCE_MASK_COVERAGE = process.env.MACAU_REFERENCE_MASK_COVERAGE || '';
const THRESHOLD = Number(process.env.FLOOD_INUNDATION_THRESHOLD_METERS || 0.15);
const RETURN_PERIODS = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const AEP = RETURN_PERIODS.map(returnPeriod => 1 / returnPeriod);
const GRID = {
  crs: 'EPSG:32649',
  bbox: [760679.8190789167, 2447151.917165788, 767479.8190789167, 2459075.917165788],
  width: 1700,
  height: 2981,
  pixelSize: 4,
};

const FAMILIES = [
  { id: 'non-typhoon-rainfall', suffix: 'Rain_R', output: 'MO_Flood_AnnualizedHazard_NON_Typhoon.tif' },
  { id: 'typhoon-compound', suffix: 'Surge_T', output: 'MO_Flood_AnnualizedHazard_TyphoonProxy.tif' },
];

function code(returnPeriod) {
  return String(returnPeriod).padStart(3, '0');
}

function coverage(family, returnPeriod) {
  return `${WORKSPACE}:${PREFIX}${family.suffix}${code(returnPeriod)}`;
}

async function downloadCoverage(layer) {
  const params = new URLSearchParams({
    SERVICE: 'WCS', VERSION: '1.0.0', REQUEST: 'GetCoverage', COVERAGE: layer,
    CRS: GRID.crs, BBOX: GRID.bbox.join(','), WIDTH: String(GRID.width),
    HEIGHT: String(GRID.height), FORMAT: 'GeoTIFF',
  });
  const response = await fetch(`${WCS_URL}?${params}`, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${layer}: WCS HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('tiff')) throw new Error(`${layer}: expected TIFF, received ${contentType}`);
  return response.arrayBuffer();
}

async function readCoverage(layer) {
  const tiff = await fromArrayBuffer(await downloadCoverage(layer));
  const image = await tiff.getImage();
  if (image.getWidth() !== GRID.width || image.getHeight() !== GRID.height) {
    throw new Error(`${layer}: grid mismatch ${image.getWidth()}x${image.getHeight()}`);
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

// Approximate E[max annual excess depth] from the RP/AEP curve. The curve is
// closed conservatively with zero excess at AEP=1 and constant R1000 excess
// from AEP=0.001 to zero. This uses all eleven RP depths.
function integrateExcessDepth(depths) {
  const excess = depths.map(depth => Math.max(depth - THRESHOLD, 0));
  let integral = 0.5 * excess[0] * (1 - AEP[0]);
  for (let index = 0; index < excess.length - 1; index += 1) {
    integral += 0.5 * (excess[index] + excess[index + 1]) * (AEP[index] - AEP[index + 1]);
  }
  integral += excess[excess.length - 1] * AEP[AEP.length - 1];
  return integral;
}

function quantiles(sorted, steps = 1000) {
  const values = [];
  for (let index = 0; index <= steps; index += 1) {
    const position = (index / steps) * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const fraction = position - lower;
    values.push(Number((sorted[lower] + (sorted[upper] - sorted[lower]) * fraction).toFixed(6)));
  }
  return values;
}

function summary(sorted) {
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const at = percentile => sorted[Math.round((sorted.length - 1) * percentile)];
  return {
    validCellCount: sorted.length,
    min: Number(sorted[0].toFixed(6)),
    mean: Number(mean.toFixed(6)),
    p50: Number(at(0.5).toFixed(6)),
    p80: Number(at(0.8).toFixed(6)),
    p90: Number(at(0.9).toFixed(6)),
    p95: Number(at(0.95).toFixed(6)),
    p99: Number(at(0.99).toFixed(6)),
    max: Number(sorted[sorted.length - 1].toFixed(6)),
    quantileStep: 0.001,
    quantiles: quantiles(sorted),
  };
}

async function writeDerivedRaster(values, outputPath) {
  const buffer = await writeArrayBuffer(values, {
    width: GRID.width,
    height: GRID.height,
    BitsPerSample: [32],
    SampleFormat: [3],
    SamplesPerPixel: 1,
    ModelPixelScale: [GRID.pixelSize, GRID.pixelSize, 0],
    ModelTiepoint: [0, 0, 0, GRID.bbox[0], GRID.bbox[3], 0],
    GTModelTypeGeoKey: 1,
    ProjectedCSTypeGeoKey: 32649,
    GTRasterTypeGeoKey: 1,
    GDAL_NODATA: '-9999',
  });
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

async function processFamily(family, referenceMask) {
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
  const annualized = new Float32Array(cellCount);
  annualized.fill(-9999);
  const annualizedValues = [];
  const tailValues = [];
  const depths = new Array(RETURN_PERIODS.length);

  for (let cell = 0; cell < cellCount; cell += 1) {
    let valid = true;
    for (let rp = 0; rp < rasters.length; rp += 1) {
      const value = Number(rasters[rp][cell]);
      if (!isValid(value, noData)) {
        valid = false;
        break;
      }
      depths[rp] = Math.max(value, 0);
    }
    if (!valid) continue;
    const annualizedValue = integrateExcessDepth(depths);
    annualized[cell] = annualizedValue;
    if (referenceMask?.[cell]) {
      annualizedValues.push(annualizedValue);
      tailValues.push(depths[depths.length - 1]);
    }
  }

  const outputPath = path.join(OUTPUT_DIR, family.output);
  await writeDerivedRaster(annualized, outputPath);
  console.log(`  Wrote ${outputPath}`);

  let distributions = null;
  if (referenceMask) {
    const sortedAnnualized = Float64Array.from(annualizedValues);
    sortedAnnualized.sort();
    const sortedTail = Float64Array.from(tailValues);
    sortedTail.sort();
    if (sortedAnnualized.length === 0) throw new Error('The reference mask contains no cells with valid flood values.');
    distributions = {
      annualizedExcessDepth: summary(sortedAnnualized),
      r1000Depth: summary(sortedTail),
    };
  }

  return {
    family: family.id,
    sourceLayers: RETURN_PERIODS.map(returnPeriod => coverage(family, returnPeriod)),
    distributions,
    derivedRaster: path.relative(ROOT, outputPath).replaceAll('\\', '/'),
  };
}

async function loadReferenceMask() {
  if (!REFERENCE_MASK_COVERAGE) return null;
  console.log(`Loading reference mask ${REFERENCE_MASK_COVERAGE}`);
  const raster = await readCoverage(REFERENCE_MASK_COVERAGE);
  const mask = new Uint8Array(raster.values.length);
  let includedCellCount = 0;
  for (let cell = 0; cell < raster.values.length; cell += 1) {
    const value = Number(raster.values[cell]);
    if (isValid(value, raster.noData) && value > 0) {
      mask[cell] = 1;
      includedCellCount += 1;
    }
  }
  if (includedCellCount === 0) throw new Error(`${REFERENCE_MASK_COVERAGE}: no positive mask cells found`);
  return { mask, includedCellCount };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });
  const reference = await loadReferenceMask();
  const families = {};
  for (const family of FAMILIES) {
    families[family.id] = await processFamily(family, reference?.mask ?? null);
  }
  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    percentileStatus: reference ? 'available' : 'unavailable-reference-mask-not-configured',
    referencePopulation: reference ? {
      coverage: REFERENCE_MASK_COVERAGE,
      rule: 'Mask coverage value > 0 and valid depth in all eleven family rasters.',
      maskCellCount: reference.includedCellCount,
    } : null,
    percentileNote: reference
      ? null
      : 'Annualized rasters were generated, but empirical percentiles were intentionally not calculated because no Macau building/land reference mask was configured.',
    thresholdMeters: THRESHOLD,
    returnPeriods: RETURN_PERIODS,
    annualizedMetric: 'Trapezoidal integral of max(depth - threshold, 0) over AEP, with zero excess at AEP=1 and constant R1000 excess over AEP 0-0.001.',
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
