// 端到端模拟 PDF 在 HK 不同 zoom 下的请求,
// 看看 zoom=12 到 zoom=18 哪个会失败。

const BASE = 'http://localhost:8080/geoserver';
const USER = process.env.GEOSERVER_USER || 'chensi';
const PASS = process.env.GEOSERVER_PASS || 'CSma19921020~!';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

// 用户可能在 HK 任意位置画图,这里枚举几个常见的中心
const centers = [
  { name: 'Central (中环)', lat: 22.282, lng: 114.158 },
  { name: 'TST (尖沙咀)', lat: 22.298, lng: 114.172 },
  { name: 'Kowloon Bay (九龙湾)', lat: 22.323, lng: 114.210 },
  { name: 'Shatin (沙田)', lat: 22.380, lng: 114.180 },
  { name: 'Tuen Mun (屯门)', lat: 22.394, lng: 113.978 },
  { name: 'Northern NT (北部都会区)', lat: 22.500, lng: 114.150 },
];

const layers = [
  { family: 'non-typhoon', rp: 2, layerName: 'natcat_platform:HK_Flood_NONTC_R002' },
  { family: 'compound', rp: 2, layerName: 'natcat_platform:HK_Flood_Compound_R002' },
  { family: 'non-typhoon', rp: 200, layerName: 'natcat_platform:HK_Flood_NONTC_R200' },
  { family: 'compound', rp: 200, layerName: 'natcat_platform:HK_Flood_Compound_R200' },
  { family: 'non-typhoon', rp: 1000, layerName: 'natcat_platform:HK_Flood_NONTC_R1000' },
  { family: 'compound', rp: 1000, layerName: 'natcat_platform:HK_Flood_Compound_R1000' },
];

async function probeOne(latitude, longitude, zoom, layer) {
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
  const url = `${BASE}/wms?service=WMS&version=1.1.1&request=GetMap&layers=${layer.layerName}&styles=flood-depth-blue-satellite&srs=EPSG:4326&bbox=${bbox}&width=1280&height=800&format=image/png&transparent=true`;
  const t0 = Date.now();
  const r = await fetch(url, { headers: { Authorization: auth } });
  const ms = Date.now() - t0;
  const ct = r.headers.get('content-type');
  const buf = await r.arrayBuffer();
  return { ...layer, lat: latitude, lng: longitude, zoom, ms, status: r.status, ct, bytes: buf.byteLength };
}

const results = [];
for (const c of centers) {
  for (const zoom of [12, 14, 15, 16, 17]) {
    for (const layer of layers) {
      const r = await probeOne(c.lat, c.lng, zoom, layer);
      results.push(r);
      const tag = r.status === 200 && r.ct && r.ct.startsWith('image/') ? 'OK' : 'FAIL';
      console.log(
        `${tag} ${c.name.padEnd(28)} z=${zoom} ${r.family.padEnd(13)} R${r.rp.toString().padStart(4)}` +
        ` ${String(r.ms).padStart(5)}ms ${String(r.bytes).padStart(7)}B`,
      );
    }
  }
}

const fails = results.filter(r => !(r.status === 200 && r.ct && r.ct.startsWith('image/')));
console.log(`\n${fails.length}/${results.length} failed`);