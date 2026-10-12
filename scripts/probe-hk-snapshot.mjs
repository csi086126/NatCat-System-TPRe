// 模拟 PDF 在 HK 区域发出去的 WMS 请求。
// PDF areaFloodRiskPdf.ts 给定 zoom 来自外层参数,这里用 floodRiskPdf 默认 16。

const BASE = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver/wms';
const USER = process.env.GEOSERVER_USER || 'chensi';
const PASS = process.env.GEOSERVER_PASS || 'CSma19921020~!';

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

async function probe(latitude, longitude, layerName, label) {
  const zoom = 15;
  const logicalWidth = 1024;
  const logicalHeight = 640;
  const worldPixels = 256 * 2 ** zoom;
  const longitudeSpan = logicalWidth * 360 / worldPixels;
  const latitudeSpan = logicalHeight * 360 * Math.cos(latitude * Math.PI / 180) / worldPixels;
  const bbox = [
    longitude - longitudeSpan / 2,
    latitude - latitudeSpan / 2,
    longitude + longitudeSpan / 2,
    latitude + latitudeSpan / 2,
  ].join(',');
  const url = `${BASE}?service=WMS&version=1.1.1&request=GetMap&layers=${layerName}&styles=flood-depth-blue-satellite&srs=EPSG:4326&bbox=${bbox}&width=1280&height=800&format=image/png&transparent=true`;
  console.log(`\n=== ${label} ===`);
  console.log('URL:', url);
  console.log('bbox:', bbox);
  const t0 = Date.now();
  const r = await fetch(url, { headers: { Authorization: auth } });
  const ms = Date.now() - t0;
  const ct = r.headers.get('content-type');
  const buf = await r.arrayBuffer();
  console.log(`HTTP=${r.status} TIME=${ms}ms CT=${ct} BYTES=${buf.byteLength}`);
  if (r.ok && ct && ct.startsWith('image/')) {
    console.log('OK: PNG');
  } else {
    console.log('FAIL: body sample:', new TextDecoder().decode(buf.slice(0, 300)));
  }
}

// Central HK (中环)
const lat = 22.282;
const lng = 114.158;
await probe(lat, lng, 'natcat_platform:HK_Flood_NONTC_R002', 'HK NONTC R002 onset (zoom 15)');
await probe(lat, lng, 'natcat_platform:HK_Flood_Compound_R002', 'HK Compound R002 onset');
await probe(lat, lng, 'natcat_platform:HK_Flood_NONTC_R200', 'HK NONTC R200');
await probe(lat, lng, 'natcat_platform:HK_Flood_Compound_R200', 'HK Compound R200');
await probe(lat, lng, 'natcat_platform:HK_Flood_NONTC_R1000', 'HK NONTC R1000');
await probe(lat, lng, 'natcat_platform:HK_Flood_Compound_R1000', 'HK Compound R1000');