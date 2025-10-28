/**
 * GeoPackage Inspector
 * 这个脚本帮助查看 GeoPackage 文件的结构
 * GeoPackage 本质上是 SQLite 数据库
 */

const fs = require('fs');
const path = require('path');

const gpkgPath = 'D:\\web-flood-insurance-model\\Data\\Shapefile\\gadm_410.gpkg';

console.log('📦 GeoPackage 文件分析工具\n');
console.log('文件路径:', gpkgPath);

// 检查文件是否存在
if (!fs.existsSync(gpkgPath)) {
  console.error('❌ 文件不存在！');
  process.exit(1);
}

// 获取文件信息
const stats = fs.statSync(gpkgPath);
console.log('文件大小:', (stats.size / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('修改时间:', stats.mtime.toLocaleString());

// 读取文件头（SQLite magic bytes）
const buffer = Buffer.alloc(100);
const fd = fs.openSync(gpkgPath, 'r');
fs.readSync(fd, buffer, 0, 100, 0);
fs.closeSync(fd);

const header = buffer.toString('utf8', 0, 16);
console.log('\n文件格式验证:');
console.log('SQLite Header:', header.startsWith('SQLite format 3') ? '✅ 有效的 SQLite 数据库' : '❌ 不是有效的 SQLite 文件');

console.log('\n📋 GeoPackage 说明:');
console.log('- GeoPackage (.gpkg) 是基于 SQLite 的地理空间数据格式');
console.log('- 它可以包含多个图层（tables）');
console.log('- 每个图层可以有不同的几何类型（点、线、面）');
console.log('- GADM 数据通常包含多个行政级别的边界');
console.log('  - Level 0: 国家边界');
console.log('  - Level 1: 省/州边界');
console.log('  - Level 2: 市/县边界');
console.log('  - Level 3: 区/镇边界');
console.log('  - Level 4: 更细粒度的行政区划');

console.log('\n💡 使用建议:');
console.log('1. 使用 QGIS 软件打开此文件查看详细内容');
console.log('2. 使用 ogr2ogr 工具转换为 GeoJSON:');
console.log('   ogr2ogr -f GeoJSON output.geojson gadm_410.gpkg <layer_name>');
console.log('3. 在 Portfolio Management 中，你可以选择特定的国家/地区导出');
console.log('4. 由于文件很大，建议只加载你需要的区域');

console.log('\n🔧 下一步操作:');
console.log('- 需要安装 GDAL/OGR 工具来查询和转换此文件');
console.log('- 或者使用在线工具: https://mygeodata.cloud/converter/');
console.log('- 也可以使用 Python + geopandas 库来处理');
