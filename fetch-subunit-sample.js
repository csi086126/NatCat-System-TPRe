const http = require('http');

const GEOSERVER_BASE = 'http://10.253.22.15:8080/geoserver';
const WORKSPACE = 'natcat_platform';
const LAYER = 'HongKong_Subunit_4916_polygon';

// Fetch a sample of subunit features
const url = `${GEOSERVER_BASE}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${WORKSPACE}:${LAYER}&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=50`;

console.log('Fetching subunit data from GeoServer...\n');

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const geojson = JSON.parse(data);
      console.log('Total features fetched:', geojson.features?.length || 0);

      if (geojson.features && geojson.features.length > 0) {
        console.log('\nFirst 20 subunit features:');
        geojson.features.slice(0, 20).forEach(f => {
          console.log(`  Subunit: ${f.properties.Subunit}, TPU: ${f.properties.TPU}, SPU: ${f.properties.SPU}, PPU: ${f.properties.PPU}`);
        });

        // Check for subunits belonging to the missing TPUs
        console.log('\n=== Checking for subunits in missing TPUs ===');
        const missingTPUs = [414, 620, 733, 743, 934];
        missingTPUs.forEach(tpuId => {
          const subunits = geojson.features.filter(f => f.properties.TPU == tpuId);
          console.log(`TPU ${tpuId}: ${subunits.length} subunits in sample`);
          if (subunits.length > 0) {
            subunits.forEach(f => {
              console.log(`  - Subunit ${f.properties.Subunit}`);
            });
          }
        });
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Response:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('Error fetching data:', e.message);
});
