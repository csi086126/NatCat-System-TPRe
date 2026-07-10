/**
 * Convert GeoJSON to Shapefile using geojson2shp
 */

const geojson2shp = require('geojson2shp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.geojson');
const outputFile = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.zip');

console.log('🔄 Converting GeoJSON to Shapefile...\n');
console.log('📂 Input:', inputFile);
console.log('📦 Output:', outputFile);
console.log('');

geojson2shp(inputFile, outputFile)
  .then(() => {
    console.log('✅ Conversion successful!\n');
    console.log('📦 Shapefile ZIP created:', outputFile);
    console.log('');
    console.log('📝 Manual upload steps:');
    console.log('======================');
    console.log('1. Open GeoServer: http://localhost:8080/geoserver');
    console.log('2. Login (admin/geoserver)');
    console.log('3. Click: Stores → Add new Store');
    console.log('4. Select: "Shapefile"');
    console.log('5. Configure:');
    console.log('   - Workspace: natcat_platform');
    console.log('   - Data Source Name: Hong_Kong_292_TPU_store');
    console.log('   - Shapefile location: Browse and select');
    console.log(`     ${outputFile}`);
    console.log('6. Click: Save');
    console.log('7. Click: Publish');
    console.log('8. In "Data" tab:');
    console.log('   - Scroll to "Bounding Boxes"');
    console.log('   - Click: "Compute from data"');
    console.log('   - Click: "Compute from native bounds"');
    console.log('9. Click: Save');
    console.log('');
    console.log('✨ Done! The layer will be available as:');
    console.log('   natcat_platform:Hong_Kong_292_TPU');
  })
  .catch(err => {
    console.error('❌ Conversion failed:', err);
    console.error('');
    console.error('Please use QGIS to convert manually:');
    console.error('1. Download QGIS: https://qgis.org/download/');
    console.error('2. Open QGIS');
    console.error('3. Layer → Add Layer → Add Vector Layer');
    console.error(`4. Select: ${inputFile}`);
    console.error('5. Right-click layer → Export → Save Features As...');
    console.error('6. Format: ESRI Shapefile');
    console.error('7. Save');
  });
