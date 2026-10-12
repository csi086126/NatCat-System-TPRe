// Probe: 模拟一次 flood-area-query 对一个 family 的全量 WCS 调用,
// 验证 GeoServer 在 6 路并发下能否在 8s 内完成 13 个 GetCoverage。

const BASE = process.env.GEOSERVER_BASE || 'http://localhost:8080/geoserver/wcs';
const USER = process.env.GEOSERVER_USER || 'chensi';
const PASS = process.env.GEOSERVER_PASS || 'CSma19921020~!';

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

// 用户在 HK 画一个 ~5km×2km 的多边形
const W = 114.15;
const S = 22.27;
const E = 114.20;
const N = 22.30;

const WIDTH = 640;
const HEIGHT = 640;

const NONTC_LAYERS = [
  'HK_Flood_NONTC_R002',
  'HK_Flood_NONTC_R005',
  'HK_Flood_NONTC_R010',
  'HK_Flood_NONTC_R020',
  'HK_Flood_NONTC_R025',
  'HK_Flood_NONTC_R050',
  'HK_Flood_NONTC_R100',
  'HK_Flood_NONTC_R200',
  'HK_Flood_NONTC_R250',
  'HK_Flood_NONTC_R500',
  'HK_Flood_NONTC_R1000',
];

const ANNUAL_LAYERS = [
  'HK_Flood_NONTC_AnnualProbability_GT015m',
  'HK_Flood_NONTC_AnnualizedExcessDepth_GT015m',
];

const allLayers = [...NONTC_LAYERS, ...ANNUAL_LAYERS];

async function getCoverage(layer, concurrencyTag) {
  const url = `${BASE}?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=natcat_platform:${layer}&CRS=EPSG:4326&BBOX=${W},${S},${E},${N}&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}&FORMAT=GeoTIFF`;
  const t0 = Date.now();
  const r = await fetch(url, { headers: { Authorization: auth } });
  const buf = await r.arrayBuffer();
  return { layer, ms: Date.now() - t0, bytes: buf.byteLength, status: r.status };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

async function main() {
  console.log(`Layers: ${allLayers.length}, WCS concurrency: 6, bbox ${W},${S} -> ${E},${N}`);
  const overallStart = Date.now();
  // 全部并发,不模拟"等 scenarios 再读 annual"
  const results = await mapWithConcurrency(allLayers, 6, l => getCoverage(l));
  const totalMs = Date.now() - overallStart;
  console.log(`Total: ${totalMs}ms`);
  for (const r of results) {
    console.log(`  ${r.layer.padEnd(48)} ${String(r.ms).padStart(5)}ms ${String(r.bytes).padStart(7)}B status=${r.status}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });