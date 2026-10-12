// 模拟 PDF 在 HK 区域 8 个并行 fetch:3 个底图 + 6 个洪水叠加层。
// 任何一步失败都说明问题点。

const BASE = 'http://10.253.22.15:3000/api/maps';
const USER = process.env.GEOSERVER_USER || 'chensi';
const PASS = process.env.GEOSERVER_PASS || 'CSma19921020~!';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const centerLat = 22.282;
const centerLng = 114.158;
const zoom = 15;
const rainfallOnset = 2;
const compoundOnset = 5;

async function probe(path, params, label) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  try {
    const r = await fetch(url, { headers: { Authorization: auth }, cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    const buf = await r.arrayBuffer();
    const ok = r.ok && ct.startsWith('image/');
    return { label, ok, status: r.status, ct, bytes: buf.byteLength, provider: r.headers.get('x-map-provider') || r.headers.get('X-Map-Provider') };
  } catch (e) {
    return { label, ok: false, error: e.message };
  }
}

const results = await Promise.all([
  probe('/location-snapshot', { lat: centerLat, lng: centerLng, type: 'satellite', zoom: String(zoom) }, 'satellite (esri)'),
  probe('/location-snapshot', { lat: centerLat, lng: centerLng, type: 'roadmap', zoom: String(zoom), provider: 'amap' }, 'roadmap (amap fallback)'),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'non-typhoon', rp: String(rainfallOnset), zoom: String(zoom) }, `flood NONTC onset R${rainfallOnset}`),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'compound', rp: String(compoundOnset), zoom: String(zoom) }, `flood Compound onset R${compoundOnset}`),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'non-typhoon', rp: '200', zoom: String(zoom) }, 'flood NONTC R200'),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'compound', rp: '200', zoom: String(zoom) }, 'flood Compound R200'),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'non-typhoon', rp: '1000', zoom: String(zoom) }, 'flood NONTC R1000'),
  probe('/flood-snapshot', { lat: centerLat, lng: centerLng, family: 'compound', rp: '1000', zoom: String(zoom) }, 'flood Compound R1000'),
]);

for (const r of results) {
  const tag = r.ok ? 'OK' : 'FAIL';
  const detail = r.ok
    ? `${r.bytes}B ${r.ct} ${r.provider || ''}`
    : (r.status ? `${r.status} ${r.ct || ''}` : r.error);
  console.log(`${tag.padEnd(4)} ${r.label.padEnd(40)} ${detail}`);
}