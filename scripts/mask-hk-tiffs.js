/**
 * scripts/mask-hk-tiffs.js
 *
 * 把 HK_LULC_DynamicWorld.tif 和 HK_SOIL_OpenLandMap.tif 两个 TIFF 按香港行政边界
 * (从 COP:HKDistrict WFS 取) 做数据层 mask,在 HK 之外的像素设置为 NaN(GeoServer 渲染
 * 为透明),然后 PUT 到 143.89.22.7:8090 替换现有 coverage store 中的 geotiff。
 *
 * 不处理 HK_DEM_5m.tif(用户只要求 LULC + Soil)。
 *
 * 用法:  node scripts/mask-hk-tiffs.js
 */

const fs = require('fs');
const path = require('path');
const https = require('http');
const GeoTIFF = require('geotiff');
const proj4 = require('proj4');
const turf = require('@turf/turf');

// 注册 EPSG:2326 (Hong Kong 1980 Grid System)
// proj4 字符串从 GeoServer WKT 派生
proj4.defs(
  'EPSG:2326',
  '+proj=tmerc +lat_0=22.31213333333333 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,2.243648,1.158828,-1.094246 +units=m +no_defs'
);

const ROOT = path.resolve(__dirname, '..');

// 简易 .env 解析(不用 dotenv)
function loadEnv(p) {
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !line.startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}
const env = { ...loadEnv(path.join(ROOT, '.env')), ...loadEnv(path.join(ROOT, '.env.local')) };

const GEOSERVER = (env.GEOSERVER_GEOSPATIAL_URL || 'http://143.89.22.7:8090/geoserver/wms')
  .replace(/\/wms$/, '');
// .env 里的 GEOSERVER_USER/PASS 是给其他 GeoServer 用的(10.253.22.15:8080),
// 143.89.22.7:8090 是单独的实例,凭据独立,固定用 admin/geoserver
const USER = 'admin';
const PASS = 'geoserver';
const WORKSPACE = 'natcat_platform';

const SOURCE_DIR = 'D:/HK-MO-Deliverable/HK/Advertising/underlying';
const HK_BOUNDARY_GEOJSON = path.join(__dirname, 'sld', 'hk_district.geojson');

const TARGETS = [
  { tif: 'LULC_DynamicWorld.tif', layer: 'HK_LULC_DynamicWorld' },
  { tif: 'SOIL_OpenLandMap.tif',  layer: 'HK_SOIL_OpenLandMap'  },
];

const TMP_DIR = path.join(ROOT, '.tmp-masked-tiffs');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ---------- helpers ----------

/** 把 WFS 取的 GeoJSON(18 个 districts)直接展开成所有 outer rings,
 *  并预计算每个 ring 的 bbox 用于快速预过滤。 */
function loadHKBoundaryRings() {
  const fc = JSON.parse(fs.readFileSync(HK_BOUNDARY_GEOJSON, 'utf8'));
  console.log(`   加载 ${fc.features.length} 个 districts`);

  const rings = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      rings.push(g.coordinates[0]);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        rings.push(poly[0]);
      }
    }
  }

  // 给每个 ring 算 bbox (lng/lat min/max)
  const indexed = rings.map((ring) => {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return { ring, minLng, minLat, maxLng, maxLat };
  });
  console.log(`   收集 ${indexed.length} 个 outer rings`);
  return indexed;
}

/** 用 ray casting 检测 [lng, lat] 是否在 ring 内 */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 检测点是否在任一 HK ring 内(陆地或离岛)。
 *  使用 ring bbox 预过滤,大幅减少 point-in-polygon 调用次数。 */
function pointInHK(lng, lat, indexedRings) {
  for (const { ring, minLng, minLat, maxLng, maxLat } of indexedRings) {
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    if (pointInRing(lng, lat, ring)) return true;
  }
  return false;
}

/** 计算整体 bbox(lng/lat),用来判断 tiff 是否需要完全 mask */
function computeOverallBBox(indexedRings) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const r of indexedRings) {
    if (r.minLng < minLng) minLng = r.minLng;
    if (r.maxLng > maxLng) maxLng = r.maxLng;
    if (r.minLat < minLat) minLat = r.minLat;
    if (r.maxLat > maxLat) maxLat = r.maxLat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** 用 ray casting 检测 [lng, lat] 是否在 polygon 内。
 *  turf.booleanPointInPolygon 内部调用,有兼容问题,自己实现一份简单版本 */
function pointInPolygon(lng, lat, polygon) {
  let inside = false;
  const ring = polygon.coordinates[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 检测点是否在 multi-polygon 任意一个 ring 内 */
function _pointInHKLegacy(lng, lat, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(lng, lat, geometry);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(p => pointInPolygon(lng, lat, { type: 'Polygon', coordinates: p }));
  }
  return false;
}

/** 把 pixel 中心转成地理坐标 (EPSG:4326)
 *  GeoTIFF model tiepoint + pixel scale 给出图像坐标 → 地理坐标的仿射变换 */
function pixelToLngLat(originLng, originLat, pixelScaleX, pixelScaleY, x, y) {
  // GeoTIFF ModelTiepointTag (6 doubles): I, J, K, X, Y, Z
  //   I,J = image pixel coords (top-left), K = pixel value (unused for raster)
  //   X,Y,Z = geographic coords
  // GeoTIFF ModelPixelScaleTag (3 doubles): ScaleX, ScaleY, ScaleZ
  //   ScaleY 通常为负(Y 轴向下)
  return [
    originLng + pixelScaleX * x,
    originLat + pixelScaleY * y,
  ];
}

// ---------- main ----------

async function main() {
  console.log('🔍 加载香港边界 rings...');
  const hkRings = loadHKBoundaryRings();
  const overallBBox = computeOverallBBox(hkRings);
  console.log(`   HK bbox (lng/lat): ${overallBBox.map(v => v.toFixed(3)).join(', ')}\n`);

  for (const { tif, layer } of TARGETS) {
    const tifPath = path.join(SOURCE_DIR, tif);
    console.log(`📦 处理 ${tif}`);
    const tiff = await GeoTIFF.fromFile(tifPath);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();

    // 取 affine transform (origin + resolution from geotiff API)
    const [ox, oy] = image.getOrigin();
    const [sx, sy] = image.getResolution();
    console.log(`   size: ${width} × ${height}, scale=${sx},${sy}, origin=(${ox},${oy})`);

    // 计算每个像素的 lng/lat (proj4 单点调用)
    console.log(`   开始 proj4 转换 ${width * height} 个点...`);
    const t0 = Date.now();
    const lngArr = new Float64Array(width * height);
    const latArr = new Float64Array(width * height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = row * width + col;
        const px = ox + sx * col;
        const py = oy + sy * row;
        const [lng, lat] = proj4('EPSG:2326', 'EPSG:4326', [px, py]);
        lngArr[idx] = lng;
        latArr[idx] = lat;
      }
    }
    console.log(`   proj4 转换完成 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    // HK bbox 整体过滤
    const [oMinLng, oMinLat, oMaxLng, oMaxLat] = overallBBox;

    // 构造 mask: 把 HK 外的 pixel 设为 NaN
    const masked = rasters.map((raster) => {
      const arr = new Float64Array(width * height);
      let kept = 0, masked_out = 0;
      for (let i = 0; i < width * height; i++) {
        const lng = lngArr[i];
        const lat = latArr[i];
        if (lng < oMinLng || lng > oMaxLng || lat < oMinLat || lat > oMaxLat) {
          arr[i] = NaN;
          masked_out++;
          continue;
        }
        if (pointInHK(lng, lat, hkRings)) {
          arr[i] = raster[i];
          kept++;
        } else {
          arr[i] = NaN;
          masked_out++;
        }
      }
      console.log(`   band: kept=${kept}, masked_out=${masked_out} (${(masked_out/(width*height)*100).toFixed(1)}% masked)`);
      return arr;
    });

    // 构造 GeotiffWriterMetadata(从原 image 复制必要字段,用 getValue 而不是 direct property)
    const fd = image.fileDirectory;
    // 原 tiff ModelPixelScale.Y 可能是正的(违反 GeoTIFF 标准),强制改负
    const rawScale = Array.from(fd.getValue('ModelPixelScale') || []);
    if (rawScale[1] > 0) rawScale[1] = -rawScale[1];
    const metadata = {
      width: width,
      height: height,
      ModelPixelScale: rawScale,
      ModelTiepoint: Array.from(fd.getValue('ModelTiepoint') || []),
      GeoKeyDirectory: Array.from(fd.getValue('GeoKeyDirectory') || []),
      GeoAsciiParams: fd.getValue('GeoAsciiParams'),
      BitsPerSample: fd.getValue('BitsPerSample'),
      SamplesPerPixel: fd.getValue('SamplesPerPixel'),
      SampleFormat: fd.getValue('SampleFormat'),
      RowsPerStrip: height,
      Compression: 1, // no compression
      PlanarConfiguration: 1,
      PhotometricInterpretation: 1,
      GDAL_NODATA: 'NaN', // 让 GeoServer 把 NaN 渲染为透明
      // 关键:告诉 writer 这是 EPSG:2326 投影坐标系(否则它默认 WGS 84)
      ProjectedCSTypeGeoKey: 2326,
      GTModelTypeGeoKey: 1, // 1 = projected, 2 = geographic
      GeogTypeGeoKey: 4326, // 底层 geographic CRS (WGS 84)
    };
    console.log(`   ModelTiepoint:`, metadata.ModelTiepoint);
    console.log(`   ModelPixelScale:`, metadata.ModelPixelScale);

    // writeArrayBuffer expects data shape [band][row][col] or flat array with .width/.height
    masked.forEach((arr, i) => {
      arr.width = width;
      arr.height = height;
    });

    // 传给 writeArrayBuffer(单个 band 模式): 单个 array
    const outBuf = await GeoTIFF.writeArrayBuffer(masked[0], metadata);

    const tmpPath = path.join(TMP_DIR, tif.replace('.tif', '_masked.tif'));
    fs.writeFileSync(tmpPath, Buffer.from(outBuf));
    console.log(`   ✅ 写出 masked tif (${(outBuf.byteLength / 1024).toFixed(1)} KB) → ${tmpPath}\n`);

    // 上传到 GeoServer 替换原 coverage store 中的文件
    await uploadToGeoServer(layer, tmpPath);
  }

  console.log('✨ 完成。');
}

function uploadToGeoServer(layerName, tifPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(
      `${GEOSERVER}/rest/workspaces/${WORKSPACE}/coveragestores/${layerName}/file.geotiff`
    );
    const fileData = fs.readFileSync(tifPath);
    const auth = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'image/tiff',
        'Content-Length': fileData.length,
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`   📤 PUT ${layerName} → ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 201) resolve();
        else reject(new Error(`upload failed: ${res.statusCode} ${body.slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});