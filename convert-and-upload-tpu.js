/**
 * Convert GeoJSON to Shapefile and Upload to GeoServer
 * Uses shp-write package to create shapefile from GeoJSON
 */

const fs = require('fs');
const path = require('path');
const shpwrite = require('shp-write');
const AdmZip = require('adm-zip');
const http = require('http');

console.log('🔄 Converting GeoJSON to Shapefile and uploading to GeoServer...\n');

// Configuration
const GEOSERVER_URL = 'http://localhost:8080/geoserver';
const WORKSPACE = 'natcat_platform';
const USERNAME = 'admin';
const PASSWORD = 'geoserver';
const LAYER_NAME = 'Hong_Kong_292_TPU';

const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// Paths
const geojsonPath = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.geojson');
const outputDir = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU');
const zipPath = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.zip');

async function convertToShapefile() {
  console.log('📂 Reading GeoJSON...');
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  console.log(`✅ Loaded ${geojson.features.length} features\n`);

  console.log('🔨 Converting to Shapefile...');

  // shp-write expects specific format
  const options = {
    folder: 'Hong_Kong_292_TPU',
    types: {
      polygon: LAYER_NAME
    }
  };

  return new Promise((resolve, reject) => {
    shpwrite.write(geojson, 'EPSG:4326', options, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('✅ Shapefile created\n');

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write files
      for (const [filename, buffer] of Object.entries(files)) {
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, buffer);
        console.log(`   Created: ${filename}`);
      }

      console.log('\n📦 Creating ZIP archive...');
      const zip = new AdmZip();

      // Add all shapefile components to zip
      ['shp', 'shx', 'dbf', 'prj'].forEach(ext => {
        const file = path.join(outputDir, `${LAYER_NAME}.${ext}`);
        if (fs.existsSync(file)) {
          zip.addLocalFile(file);
        }
      });

      zip.writeZip(zipPath);
      console.log(`✅ ZIP created: ${zipPath}\n`);

      resolve(zipPath);
    });
  });
}

async function uploadToGeoServer(zipPath) {
  console.log('📤 Uploading to GeoServer via REST API...\n');

  const zipData = fs.readFileSync(zipPath);

  // Upload ZIP file to GeoServer
  const url = `${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${LAYER_NAME}_store/file.shp`;

  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/zip',
      'Content-Length': zipData.length
    }
  };

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers
    }, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('✅ Successfully uploaded to GeoServer!');
          console.log(`   Datastore: ${LAYER_NAME}_store`);
          console.log(`   Layer: ${WORKSPACE}:${LAYER_NAME}\n`);
          resolve();
        } else {
          console.error(`❌ Upload failed with status ${res.statusCode}`);
          console.error('Response:', data);
          reject(new Error(`Upload failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err);
      reject(err);
    });

    req.write(zipData);
    req.end();
  });
}

async function main() {
  try {
    // Step 1: Convert to Shapefile
    await convertToShapefile();

    // Step 2: Upload to GeoServer
    await uploadToGeoServer(zipPath);

    console.log('✨ Done! Layer is now available in GeoServer.');
    console.log('\n🎯 Next steps:');
    console.log('1. Verify in GeoServer: http://localhost:8080/geoserver');
    console.log('2. Go to Layer Preview');
    console.log(`3. Find: ${WORKSPACE}:${LAYER_NAME}`);
    console.log('4. Click OpenLayers to preview');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📝 Manual upload instructions:');
    console.error('1. Go to GeoServer: http://localhost:8080/geoserver');
    console.error('2. Login (admin/geoserver)');
    console.error('3. Stores → Add new Store → Shapefile');
    console.error(`4. Upload: ${zipPath}`);
    process.exit(1);
  }
}

main();
