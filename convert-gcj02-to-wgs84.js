/**
 * 转换澳门保单坐标从 GCJ-02（高德） 到 WGS84（Leaflet/OSM）
 * 
 * 高德地图返回的坐标是 GCJ-02（火星坐标系）
 * Leaflet 和 OpenStreetMap 使用 WGS84 坐标系
 * 需要转换才能正确显示
 */

const fs = require('fs');
const path = require('path');

// 坐标转换常量
const pi = 3.1415926535897932384626;
const a = 6378245.0;  // 长半轴
const ee = 0.00669342162296594323;  // 扁率

/**
 * 判断是否在中国境内
 */
function outOfChina(lng, lat) {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

/**
 * 纬度转换
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * pi) + 40.0 * Math.sin(lat / 3.0 * pi)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * pi) + 320 * Math.sin(lat * pi / 30.0)) * 2.0 / 3.0;
  return ret;
}

/**
 * 经度转换
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * pi) + 40.0 * Math.sin(lng / 3.0 * pi)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * pi) + 300.0 * Math.sin(lng / 30.0 * pi)) * 2.0 / 3.0;
  return ret;
}

/**
 * GCJ-02 转 WGS84
 */
function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * pi;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
  const mglat = lat + dlat;
  const mglng = lng + dlng;
  return [lng * 2 - mglng, lat * 2 - mglat];
}

// 文件路径
const INPUT_FILES = [
  path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL.json'),
  path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json'),
];

console.log('=' .repeat(60));
console.log('📍 Converting GCJ-02 (AMap) coordinates to WGS84 (Leaflet)');
console.log('=' .repeat(60));

INPUT_FILES.forEach(inputFile => {
  if (!fs.existsSync(inputFile)) {
    console.log(`\n⚠️ File not found: ${path.basename(inputFile)}`);
    return;
  }

  console.log(`\n📂 Processing: ${path.basename(inputFile)}`);

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log(`   Total records: ${data.length}`);

  let converted = 0;
  let noCoords = 0;
  let alreadyWgs84 = 0;

  data.forEach(record => {
    if (!record.location || !record.location.lat || !record.location.lng) {
      noCoords++;
      return;
    }

    const lng = record.location.lng;
    const lat = record.location.lat;

    // Check if already converted
    if (record.location.coord_system === 'wgs84') {
      alreadyWgs84++;
      return;
    }

    // Store original GCJ-02 coordinates
    record.location.gcj02_lng = lng;
    record.location.gcj02_lat = lat;

    // Convert to WGS84
    const [wgs84Lng, wgs84Lat] = gcj02ToWgs84(lng, lat);
    
    record.location.lng = wgs84Lng;
    record.location.lat = wgs84Lat;
    record.location.coord_system = 'wgs84';
    
    converted++;
  });

  console.log(`   ✅ Converted: ${converted}`);
  console.log(`   ⏭️ No coordinates: ${noCoords}`);
  console.log(`   ✓ Already WGS84: ${alreadyWgs84}`);

  // Calculate offset for first record (for verification)
  if (converted > 0) {
    const sample = data.find(r => r.location?.gcj02_lng);
    if (sample) {
      const dLng = sample.location.gcj02_lng - sample.location.lng;
      const dLat = sample.location.gcj02_lat - sample.location.lat;
      console.log(`   📐 Offset: ~${(dLng * 111000).toFixed(1)}m E, ~${(dLat * 111000).toFixed(1)}m N`);
    }
  }

  // Save
  fs.writeFileSync(inputFile, JSON.stringify(data, null, 2));
  console.log(`   💾 Saved: ${path.basename(inputFile)}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Coordinate conversion complete!');
console.log('   Refresh browser to see corrected positions');
console.log('='.repeat(60));
