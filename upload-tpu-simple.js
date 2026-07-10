/**
 * Simple solution: Upload GeoJSON to GeoServer as external datastore
 * This creates a datastore reference to the GeoJSON file
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

const geojsonPath = path.join(__dirname, 'public', 'data', 'shapefiles', 'Hong_Kong_292_TPU.geojson');
const geojsonUri = `file:///${geojsonPath.replace(/\\/g, '/')}`;

console.log('🚀 Uploading TPU layer to GeoServer...\n');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(options.url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': options.contentType || 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: responseData });
        } else {
          reject(new Error(`Request failed: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function uploadViaRestAPI() {
  try {
    console.log('📝 Method: Using GeoServer REST API for file upload\n');

    // Read GeoJSON file
    const geojsonData = fs.readFileSync(geojsonPath);

    // Upload file directly using REST API file upload endpoint
    const uploadUrl = `${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${DATASTORE_NAME}/file.geojson`;

    console.log('📤 Uploading GeoJSON file...');
    console.log('   URL:', uploadUrl);

    const result = await makeRequest({
      url: uploadUrl,
      method: 'PUT',
      contentType: 'application/json'
    }, geojsonData);

    console.log(`✅ Upload successful! (Status: ${result.status})`);
    console.log(`   Workspace: ${WORKSPACE}`);
    console.log(`   Datastore: ${DATASTORE_NAME}`);
    console.log(`   Layer: ${WORKSPACE}:${LAYER_NAME}\n`);

    return true;

  } catch (error) {
    console.error('❌ REST API upload failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Hong Kong 292 TPU - GeoServer Upload');
  console.log('='.repeat(60));
  console.log('');

  // Try REST API upload
  const success = await uploadViaRestAPI();

  if (success) {
    console.log('✨ Success! Layer uploaded to GeoServer\n');
    console.log('🔍 Verify the layer:');
    console.log('1. Open: http://localhost:8080/geoserver');
    console.log('2. Go to: Layer Preview');
    console.log(`3. Find: ${WORKSPACE}:${LAYER_NAME}`);
    console.log('4. Click: OpenLayers\n');
  } else {
    console.log('\n📝 Manual upload instructions:');
    console.log('='.repeat(60));
    console.log('');
    console.log('Since automatic upload failed, please upload manually:');
    console.log('');
    console.log('Option 1: Using GeoServer Web UI (Recommended)');
    console.log('----------------------------------------------');
    console.log('1. Open: http://localhost:8080/geoserver');
    console.log('2. Login with chensi/[your-password]');
    console.log('3. Click: Stores → Add new Store');
    console.log('4. Select: "Directory of spatial files (shapefiles)"');
    console.log('5. Configure:');
    console.log(`   - Workspace: ${WORKSPACE}`);
    console.log(`   - Data Source Name: ${DATASTORE_NAME}`);
    console.log('   - Connection Parameters:');
    console.log(`     URL: file:///${path.join(__dirname, 'public', 'data', 'shapefiles').replace(/\\/g, '/')}`);
    console.log('6. Click: Save');
    console.log('7. Click: Publish next to Hong_Kong_292_TPU');
    console.log('8. Click: "Compute from data" for bounding boxes');
    console.log('9. Click: Save');
    console.log('');
    console.log('Option 2: Convert to Shapefile first');
    console.log('-------------------------------------');
    console.log('Download QGIS: https://qgis.org/download/');
    console.log('Then follow the conversion steps in:');
    console.log('MD/TPU_292_GEOSERVER_UPLOAD_GUIDE.md');
    console.log('');
  }
}

main().catch(console.error);
