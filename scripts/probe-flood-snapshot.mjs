// 模拟 /api/maps/flood-snapshot 在 MO 范围内发的 WMS 请求,
// 验证 zoom=15 下 bbox 是否合理、layer 是否存在、style 是否可用。

const BASE = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver/wms';
const USER = process.env.GEOSERVER_USER || 'chensi';
const PASS = process.env.GEOSERVER_PASS || 'CSma19921020~!';

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

// 模拟用户给 area flood 报告用的中心点(Macau 大概中心)
const latitude = 22.198;
const longitude = 113.552;
const zoom = 15;
const family = 'non-typhoon';
const returnPeriod = 2;

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

const layer = `natcat_platform:MO_Flood_NONTC_R${String(returnPeriod).padStart(3, '0')}`;

const url = `${BASE}?service=WMS&version=1.1.1&request=GetMap&layers=${layer}&styles=flood-depth-blue-satellite&srs=EPSG:4326&bbox=${bbox}&width=1280&height=800&format=image/png&transparent=true`;

console.log('URL:', url);
console.log('bbox:', bbox);
console.log();

const t0 = Date.now();
const r = await fetch(url, { headers: { Authorization: auth } });
const ms = Date.now() - t0;
const ct = r.headers.get('content-type');
const buf = await r.arrayBuffer();
console.log(`HTTP=${r.status} TIME=${ms}ms CT=${ct} BYTES=${buf.byteLength}`);
if (r.ok && ct && ct.startsWith('image/')) {
  console.log('OK: PNG returned');
} else {
  console.log('FAIL: not an image');
  console.log(new TextDecoder().decode(buf.slice(0, 500)));
}