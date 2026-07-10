/**
 * Create Hong Kong 292 TPU Shapefile from TPUSU_2021
 * This script dissolves 4,916 subunits into 292 TPU polygons
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🔄 Creating Hong Kong 292 TPU Shapefile...\n');

const turf = require('@turf/turf');

const GEOSERVER_URL = 'http://localhost:8080/geoserver';
const WORKSPACE = 'natcat_platform';
const LAYER = 'TPUSU_2021';

async function fetchGeoJSON() {
  return new Promise((resolve, reject) => {
    const url = `${GEOSERVER_URL}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${WORKSPACE}:${LAYER}&outputFormat=json`;

    console.log('📥 Fetching data from GeoServer...');
    console.log('   URL:', url);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const geojson = JSON.parse(data);
          console.log(`✅ Fetched ${geojson.features.length} features\n`);
          resolve(geojson);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function dissolveByTPU(geojson) {
  console.log('🔀 Dissolving subunits into TPU polygons...\n');

  // Group features by TPU
  const tpuGroups = {};

  geojson.features.forEach((feature, idx) => {
    const tpu = feature.properties.TPU;
    if (!tpu) return;

    if (!tpuGroups[tpu]) {
      tpuGroups[tpu] = [];
    }
    tpuGroups[tpu].push(feature);

    if ((idx + 1) % 1000 === 0) {
      console.log(`   Grouped ${idx + 1}/${geojson.features.length} features...`);
    }
  });

  console.log(`\n✅ Grouped into ${Object.keys(tpuGroups).length} TPU groups\n`);
  console.log('🔨 Merging geometries for each TPU...\n');

  const dissolvedFeatures = [];
  const tpuIds = Object.keys(tpuGroups).sort((a, b) => parseInt(a) - parseInt(b));

  tpuIds.forEach((tpuId, idx) => {
    const features = tpuGroups[tpuId];

    try {
      // Combine all polygons for this TPU
      let combined = features[0];

      for (let i = 1; i < features.length; i++) {
        try {
          combined = turf.union(combined, features[i]);
        } catch (e) {
          console.warn(`   ⚠️ Warning: Could not merge feature ${i} of TPU ${tpuId}`);
        }
      }

      // Get PPU and SPU from first feature (they should be the same for all features in a TPU)
      const ppu = features[0].properties.PPU;
      const spu = features[0].properties.SPU;

      dissolvedFeatures.push({
        type: 'Feature',
        properties: {
          TPU: parseInt(tpuId),
          PPU: ppu,
          SPU: spu,
          NUM_SUBUNITS: features.length
        },
        geometry: combined.geometry
      });

      if ((idx + 1) % 50 === 0) {
        console.log(`   Merged ${idx + 1}/${tpuIds.length} TPUs...`);
      }
    } catch (e) {
      console.error(`   ❌ Error merging TPU ${tpuId}:`, e.message);
    }
  });

  console.log(`\n✅ Created ${dissolvedFeatures.length} dissolved TPU polygons\n`);

  return {
    type: 'FeatureCollection',
    features: dissolvedFeatures
  };
}

async function saveGeoJSON(geojson, filename) {
  const filepath = path.join(__dirname, 'public', 'data', filename);
  fs.writeFileSync(filepath, JSON.stringify(geojson, null, 2), 'utf8');
  console.log(`💾 Saved GeoJSON to: ${filepath}`);
  return filepath;
}

async function convertToShapefile(geojsonPath, shapefileName) {
  console.log('\n📦 Converting to Shapefile...');
  console.log('   Note: You will need to use QGIS or ogr2ogr to convert GeoJSON to Shapefile');
  console.log('   Command: ogr2ogr -f "ESRI Shapefile" output.shp input.geojson');

  // For now, we'll just save the GeoJSON
  // User can convert using QGIS or ogr2ogr
  const outputDir = path.join(__dirname, 'public', 'data', 'shapefiles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const geojsonOutputPath = path.join(outputDir, `${shapefileName}.geojson`);
  fs.copyFileSync(geojsonPath, geojsonOutputPath);

  console.log(`\n✅ GeoJSON saved to: ${geojsonOutputPath}`);
  console.log('\n📝 To convert to Shapefile, use one of these methods:');
  console.log('\n1. Using QGIS:');
  console.log('   - Open QGIS');
  console.log('   - Layer > Add Layer > Add Vector Layer');
  console.log(`   - Select: ${geojsonOutputPath}`);
  console.log('   - Right-click layer > Export > Save Features As...');
  console.log('   - Format: ESRI Shapefile');
  console.log('   - CRS: EPSG:4326');
  console.log('\n2. Using ogr2ogr (command line):');
  console.log(`   ogr2ogr -f "ESRI Shapefile" "${path.join(outputDir, shapefileName)}" "${geojsonOutputPath}"`);

  return geojsonOutputPath;
}

async function main() {
  try {
    // Step 1: Fetch data from GeoServer
    const geojson = await fetchGeoJSON();

    // Step 2: Dissolve by TPU
    const dissolved = await dissolveByTPU(geojson);

    // Step 3: Save GeoJSON
    const geojsonPath = await saveGeoJSON(dissolved, 'Hong_Kong_292_TPU.geojson');

    // Step 4: Prepare for Shapefile conversion
    await convertToShapefile(geojsonPath, 'Hong_Kong_292_TPU');

    // Step 5: Print summary
    console.log('\n📊 Summary:');
    console.log('   Original features (subunits):', geojson.features.length);
    console.log('   Dissolved TPU polygons:', dissolved.features.length);
    console.log('   TPU range:', Math.min(...dissolved.features.map(f => f.properties.TPU)),
                'to', Math.max(...dissolved.features.map(f => f.properties.TPU)));

    console.log('\n✨ Done!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Convert GeoJSON to Shapefile using QGIS or ogr2ogr (see instructions above)');
    console.log('   2. Upload the shapefile to GeoServer');
    console.log('   3. I will help you integrate it into the platform');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
