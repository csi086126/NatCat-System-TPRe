
const fs = require('fs');
const path = require('path');
const http = require('http');

const GEOSERVER_HOST = '10.253.22.15';
const GEOSERVER_PORT = 8080;
const OUTPUT_DIR = path.join(__dirname, '../public/data/statistics');

// Configuration for layers to generate stats for
const LAYERS = [
  {
    type: 'spu',
    typeName: 'natcat_platform:HongKong_SPU_52_polygon',
    idProperty: 'SPU',
    outputFile: 'spu-statistics-demo.json'
  },
  {
    type: 'tpu',
    typeName: 'natcat_platform:HongKong_TPU_292_polygon',
    idProperty: 'TPU',
    outputFile: 'tpu-statistics-demo.json'
  },
  {
    type: 'subunit',
    typeName: 'natcat_platform:HongKong_Subunit_4916_polygon',
    idProperty: 'Subunit',
    // Subunit IDs might duplicate across TPUs? Let's check. 
    // Usually Subunit is unique or used in combo. 
    // For demo simplicity, we'll assume the property "Subunit" is sufficient or generate a safe key.
    outputFile: 'subunit-statistics-demo.json' 
  }
];

// Helper to fetch valid IDs from GeoServer
function fetchFeatureIds(layerConfig) {
  return new Promise((resolve, reject) => {
    const propertyName = layerConfig.idProperty;
    const path = `/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerConfig.typeName}&propertyName=${propertyName}&outputFormat=application/json`;
    
    console.log(`Fetching IDs for ${layerConfig.type} from ${GEOSERVER_HOST}...`);
    
    const req = http.request({
      hostname: GEOSERVER_HOST,
      port: GEOSERVER_PORT,
      path: path,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ids = json.features.map(f => f.properties[propertyName]).filter(id => id !== undefined && id !== null);
          console.log(`Found ${ids.length} features for ${layerConfig.type}`);
          resolve([...new Set(ids)]); // Unique IDs
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.end();
  });
}

// Helper to generate random stats
function generateStats(type, id) {
  const count = Math.floor(Math.random() * 500) + 10; // 10 to 510 policies
  const avgExposure = 5000000 + Math.random() * 20000000; // 5M to 25M
  const totalExposure = count * avgExposure;
  
  // Format the key based on layer type
  let key = '';
  let name = '';
  
  if (type === 'spu') {
    key = `spu_${id}`;
    name = `SPU ${id}`;
  } else if (type === 'tpu') {
    key = `tpu_${id}`;
    name = `TPU ${id}`;
  } else if (type === 'subunit') {
    key = `subunit_${id}`;
    name = `SUBUNIT ${id}`;
  }

  return {
    key: key,
    data: {
      id: id,
      name: name,
      count: count,
      totalExposure: totalExposure,
      avgExposure: avgExposure,
      minExposure: avgExposure * 0.1,
      maxExposure: avgExposure * 10,
      byOccupancy: {
         "RESIDENTIAL": { count: Math.floor(count * 0.6), totalExposure: totalExposure * 0.5 },
         "COMMERCIAL": { count: Math.floor(count * 0.4), totalExposure: totalExposure * 0.5 }
      }
    }
  };
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)){
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const layer of LAYERS) {
    try {
      const ids = await fetchFeatureIds(layer);
      const statsObj = {};
      
      ids.forEach(id => {
        const { key, data } = generateStats(layer.type, id);
        statsObj[key] = data;
      });
      
      const filePath = path.join(OUTPUT_DIR, layer.outputFile);
      fs.writeFileSync(filePath, JSON.stringify(statsObj, null, 2));
      console.log(`✅ Generated demo data: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${layer.type}:`, error.message);
    }
  }
}

run();
