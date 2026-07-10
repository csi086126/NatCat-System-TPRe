/**
 * Upload Hong Kong 292 TPU to GeoServer via REST API
 * This script uploads the GeoJSON file directly to GeoServer without needing Shapefile conversion
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
const WORKSPACE = 'natcat_platform';
const USERNAME = process.env.GEOSERVER_USER || 'chensi';
const PASSWORD = process.env.GEOSERVER_PASS || '';  // 从 .env 读取
const DATASTORE_NAME = 'Hong_Kong_292_TPU_store';
const LAYER_NAME = 'Hong_Kong_292_TPU';

const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

console.log('🚀 Uploading Hong Kong 292 TPU to GeoServer via REST API...\n');

// Step 1: Read GeoJSON file
const geojsonPath = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.geojson');
console.log('📂 Reading GeoJSON file...');
console.log('   Path:', geojsonPath);

if (!fs.existsSync(geojsonPath)) {
  console.error('❌ Error: GeoJSON file not found!');
  process.exit(1);
}

const geojsonData = fs.readFileSync(geojsonPath, 'utf8');
const geojson = JSON.parse(geojsonData);
console.log(`✅ Loaded ${geojson.features.length} features\n`);

// Step 2: Create FeatureType using WFS-T (Transactional Web Feature Service)
console.log('📤 Uploading to GeoServer using WFS Transaction...\n');

// Build WFS-T Insert transaction
const insertXml = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction
  service="WFS"
  version="1.1.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:${WORKSPACE}="http://${WORKSPACE}"
  xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
  ${geojson.features.map((feature, idx) => {
    const coords = feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0][0]; // MultiPolygon

    const coordString = coords.map(c => `${c[0]},${c[1]}`).join(' ');

    return `
  <wfs:Insert>
    <${WORKSPACE}:${LAYER_NAME}>
      <${WORKSPACE}:the_geom>
        <gml:MultiPolygon srsName="EPSG:4326">
          <gml:polygonMember>
            <gml:Polygon>
              <gml:exterior>
                <gml:LinearRing>
                  <gml:coordinates>${coordString}</gml:coordinates>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>
          </gml:polygonMember>
        </gml:MultiPolygon>
      </${WORKSPACE}:the_geom>
      <${WORKSPACE}:TPU>${feature.properties.TPU}</${WORKSPACE}:TPU>
      <${WORKSPACE}:PPU>${feature.properties.PPU}</${WORKSPACE}:PPU>
      <${WORKSPACE}:SPU>${feature.properties.SPU}</${WORKSPACE}:SPU>
      <${WORKSPACE}:NUM_SUBUNITS>${feature.properties.NUM_SUBUNITS}</${WORKSPACE}:NUM_SUBUNITS>
    </${WORKSPACE}:${LAYER_NAME}>
  </wfs:Insert>`;
  }).join('\n')}
</wfs:Transaction>`;

console.log('⚠️ WFS-T method is complex for 292 features.');
console.log('📝 Alternative: Use ogr2ogr or QGIS to convert to Shapefile\n');
console.log('🎯 Recommended approach: Convert GeoJSON to Shapefile using ogr2ogr\n');

// Provide ogr2ogr command
const inputPath = geojsonPath;
const outputPath = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU');

console.log('Option 1: Using ogr2ogr (if installed)');
console.log('=========================================');
console.log('Command:');
console.log(`ogr2ogr -f "ESRI Shapefile" "${outputPath}" "${inputPath}"`);
console.log('');

console.log('Option 2: Using QGIS (GUI)');
console.log('===========================');
console.log('1. Download QGIS: https://qgis.org/download/');
console.log('2. Open QGIS Desktop');
console.log('3. Layer → Add Layer → Add Vector Layer');
console.log(`4. Select: ${inputPath}`);
console.log('5. Right-click layer → Export → Save Features As...');
console.log('6. Format: ESRI Shapefile');
console.log(`7. File name: ${outputPath}.shp`);
console.log('8. CRS: EPSG:4326');
console.log('9. Click OK');
console.log('');

console.log('Option 3: Direct GeoServer REST API Upload (I will create this script)');
console.log('=======================================================================');
console.log('Creating a more efficient upload script...\n');
