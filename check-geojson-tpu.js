const fs = require('fs');

// Check if the GeoJSON file exists and what TPU IDs it contains
const geojsonPath = 'd:/Nat Cat Platform/UI_system/public/data/Hong_Kong_292_TPU.geojson';

if (fs.existsSync(geojsonPath)) {
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  console.log('Total TPU features:', geojson.features.length);

  // Extract all TPU IDs
  const tpuIds = geojson.features.map(f => f.properties.TPU).filter(Boolean);
  console.log('Total TPU IDs found:', tpuIds.length);
  console.log('Sample TPU IDs:', tpuIds.slice(0, 20));

  // Check for the missing TPUs
  const missingTPUs = [414, 620, 733, 743, 934];
  console.log('\nChecking if missing TPUs exist in GeoJSON:');
  missingTPUs.forEach(id => {
    const exists = tpuIds.includes(id) || tpuIds.includes(String(id));
    console.log(`  TPU ${id}: ${exists ? 'EXISTS in GeoJSON' : 'NOT in GeoJSON'}`);
    if (exists) {
      const feature = geojson.features.find(f => f.properties.TPU == id);
      console.log(`    Properties:`, feature.properties);
    }
  });

  // Check all unique TPU IDs
  const uniqueTPUs = [...new Set(tpuIds)].sort((a, b) => a - b);
  console.log('\nAll unique TPU IDs:', uniqueTPUs.length);
  console.log('Range:', Math.min(...uniqueTPUs), 'to', Math.max(...uniqueTPUs));
} else {
  console.log('GeoJSON file not found at:', geojsonPath);
}
