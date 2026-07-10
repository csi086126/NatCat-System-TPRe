/**
 * Generate Hong Kong Hierarchy Statistics from Portfolio Data
 * 
 * Creates statistics for PPU, TPU, SPU, and Subunit levels using
 * point-in-polygon spatial matching similar to Macau statistical areas.
 * 
 * Usage: node generate-hk-hierarchy-statistics.js
 * 
 * Prerequisites:
 * - GeoServer running with HK layers
 * - Portfolio data in public/data/by-year/
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Paths
const YEAR_DATA_DIR = path.join(__dirname, 'public', 'data', 'by-year');
const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'statistics');
const YEARS = [2021, 2022, 2023, 2024];

// GeoServer config
const GEOSERVER_BASE = 'http://10.253.22.15:8080/geoserver';
const WORKSPACE = 'natcat_platform';

// Layer configuration with hierarchy info
const LAYERS = {
  ppu: {
    layer: 'HongKong_PPU_9_polygon',
    idField: 'PPU',
    nameField: 'NAME',
    outputFile: 'ppu-statistics.json',
    description: 'Primary Planning Units (9 regions)'
  },
  spu: {
    layer: 'HongKong_SPU_52_polygon',
    idField: 'SPU',
    nameField: 'NAME',
    outputFile: 'spu-statistics.json',
    description: 'Secondary Planning Units (52 regions)'
  },
  tpu: {
    layer: 'HongKong_TPU_292_polygon',
    idField: 'TPU',
    nameField: 'NAME',
    ppuField: 'PPU',
    spuField: 'SPU',
    outputFile: 'tpu-statistics.json',
    description: 'Tertiary Planning Units (292 regions)'
  },
  subunit: {
    layer: 'HongKong_Subunit_4916_polygon',
    idField: 'Subunit',
    nameField: 'Subunit',  // No NAME field, use Subunit ID
    tpuField: 'TPU',
    outputFile: 'subunit-statistics.json',
    description: 'Subunits (4,916 units)'
  }
};

/**
 * Fetch GeoJSON from GeoServer (request in WGS84 / EPSG:4326)
 */
function fetchGeoJSON(layerName) {
  return new Promise((resolve, reject) => {
    // Request in EPSG:4326 (WGS84) to match portfolio coordinates
    const url = `${GEOSERVER_BASE}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${WORKSPACE}:${layerName}&outputFormat=application/json&srsName=EPSG:4326`;
    
    console.log(`   📡 Fetching ${layerName}...`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const geojson = JSON.parse(data);
          console.log(`   ✅ Loaded ${geojson.features?.length || 0} features from ${layerName}`);
          resolve(geojson);
        } catch (e) {
          reject(new Error(`Failed to parse GeoJSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Simple point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  
  // Handle both Polygon and MultiPolygon
  const rings = polygon.type === 'MultiPolygon' 
    ? polygon.coordinates.flatMap(poly => poly)
    : polygon.coordinates;
  
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
  }
  
  return inside;
}

/**
 * Build spatial index for faster lookups (simple bounding box based)
 */
function buildSpatialIndex(features) {
  return features.map(feature => {
    const bbox = getBoundingBox(feature.geometry);
    return { feature, bbox };
  });
}

function getBoundingBox(geometry) {
  const coords = getAllCoordinates(geometry);
  const xs = coords.map(c => c[0]);
  const ys = coords.map(c => c[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function getAllCoordinates(geometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2);
  }
  return [];
}

function pointInBBox(point, bbox) {
  return point[0] >= bbox.minX && point[0] <= bbox.maxX &&
         point[1] >= bbox.minY && point[1] <= bbox.maxY;
}

/**
 * Find the feature containing a point
 */
function findContainingFeature(point, spatialIndex) {
  for (const { feature, bbox } of spatialIndex) {
    if (pointInBBox(point, bbox)) {
      if (pointInPolygon(point, feature.geometry)) {
        return feature;
      }
    }
  }
  return null;
}

/**
 * Load all portfolio data for all years
 */
function loadAllPortfolioData() {
  let allRecords = [];
  
  for (const year of YEARS) {
    const filePath = path.join(YEAR_DATA_DIR, `tphk-portfolio-${year}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allRecords = allRecords.concat(data.map(r => ({ ...r, _year: year })));
      console.log(`   📂 Loaded ${data.length} records from ${year}`);
    } else {
      console.log(`   ⚠️  Missing: tphk-portfolio-${year}.json`);
    }
  }
  
  return allRecords;
}

/**
 * Initialize statistics object for a feature
 */
function initStats(feature, config) {
  const id = feature.properties[config.idField];
  const name = feature.properties[config.nameField] || `${config.idField} ${id}`;
  
  const stats = {
    id: id,
    name: name,
    count: 0,
    totalExposure: 0,
    avgExposure: 0,
    minExposure: Infinity,
    maxExposure: 0,
    byOccupancy: {},
    byYear: {}
  };
  
  // Add hierarchy references for TPU
  if (config.ppuField && feature.properties[config.ppuField]) {
    stats.ppu = feature.properties[config.ppuField];
    stats.parentPPU = `ppu_${feature.properties[config.ppuField]}`;
  }
  if (config.spuField && feature.properties[config.spuField]) {
    stats.spu = feature.properties[config.spuField];
    stats.parentSPU = `spu_${feature.properties[config.spuField]}`;
  }
  if (config.tpuField && feature.properties[config.tpuField]) {
    stats.tpu = feature.properties[config.tpuField];
    stats.parentTPU = `tpu_${feature.properties[config.tpuField]}`;
  }
  
  return stats;
}

/**
 * Update statistics with a record
 */
function updateStats(stats, record) {
  const exposure = parseFloat(record['公司保額']) || parseFloat(record.sum_insured) || 0;
  const occupancy = record['佔用性質'] || record.occupancy || 'Unknown';
  const year = record._year || '未知';
  
  stats.count++;
  stats.totalExposure += exposure;
  
  if (exposure > 0) {
    stats.minExposure = Math.min(stats.minExposure, exposure);
    stats.maxExposure = Math.max(stats.maxExposure, exposure);
  }
  
  // By occupancy
  if (!stats.byOccupancy[occupancy]) {
    stats.byOccupancy[occupancy] = { count: 0, totalExposure: 0 };
  }
  stats.byOccupancy[occupancy].count++;
  stats.byOccupancy[occupancy].totalExposure += exposure;
  
  // By year
  const yearKey = String(year);
  if (!stats.byYear[yearKey]) {
    stats.byYear[yearKey] = { count: 0, totalExposure: 0 };
  }
  stats.byYear[yearKey].count++;
  stats.byYear[yearKey].totalExposure += exposure;
}

/**
 * Finalize statistics (calculate averages, fix infinity)
 */
function finalizeStats(statsMap) {
  for (const key of Object.keys(statsMap)) {
    const stats = statsMap[key];
    if (stats.count > 0) {
      stats.avgExposure = stats.totalExposure / stats.count;
    }
    if (stats.minExposure === Infinity) {
      stats.minExposure = 0;
    }
  }
}

/**
 * Generate statistics for a single level
 */
async function generateLevelStatistics(levelKey, config, allRecords) {
  console.log(`\n📊 Processing ${levelKey.toUpperCase()}...`);
  console.log(`   Description: ${config.description}`);
  
  // Fetch GeoJSON from GeoServer
  const geojson = await fetchGeoJSON(config.layer);
  
  if (!geojson.features || geojson.features.length === 0) {
    console.log(`   ❌ No features found for ${config.layer}`);
    return null;
  }
  
  // Build spatial index
  console.log(`   🔍 Building spatial index...`);
  const spatialIndex = buildSpatialIndex(geojson.features);
  
  // Initialize statistics for all features
  const statsMap = {};
  for (const feature of geojson.features) {
    const id = feature.properties[config.idField];
    const key = `${levelKey}_${id}`;
    statsMap[key] = initStats(feature, config);
  }
  
  // Add Unknown category
  statsMap['Unknown'] = {
    id: 0,
    name: 'Unknown',
    count: 0,
    totalExposure: 0,
    avgExposure: 0,
    minExposure: Infinity,
    maxExposure: 0,
    byOccupancy: {},
    byYear: {}
  };
  
  // Match records
  console.log(`   🔄 Matching ${allRecords.length} records...`);
  let matched = 0;
  let noLocation = 0;
  let noMatch = 0;
  
  for (let i = 0; i < allRecords.length; i++) {
    if ((i + 1) % 10000 === 0) {
      process.stdout.write(`      Processed ${i + 1}/${allRecords.length} (matched: ${matched})...\r`);
    }
    
    const record = allRecords[i];
    
    // Get location
    const loc = record.location;
    if (!loc || !loc.lat || !loc.lng) {
      noLocation++;
      updateStats(statsMap['Unknown'], record);
      continue;
    }
    
    const point = [loc.lng, loc.lat];
    const feature = findContainingFeature(point, spatialIndex);
    
    if (feature) {
      const id = feature.properties[config.idField];
      const key = `${levelKey}_${id}`;
      updateStats(statsMap[key], record);
      matched++;
    } else {
      noMatch++;
      updateStats(statsMap['Unknown'], record);
    }
  }
  
  console.log(`\n   ✅ Matched: ${matched}, No location: ${noLocation}, No match: ${noMatch}`);
  
  // Finalize
  finalizeStats(statsMap);
  
  // Filter out empty entries (except Unknown if it has records)
  const filteredStats = {};
  for (const [key, stats] of Object.entries(statsMap)) {
    if (stats.count > 0 || key === 'Unknown') {
      filteredStats[key] = stats;
    }
  }
  
  return filteredStats;
}

/**
 * Update index.json
 */
function updateIndex(results) {
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  
  let index = {};
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }
  
  // Update generated timestamp
  index.generated = new Date().toISOString();
  
  // Update level stats
  if (!index.levels) index.levels = [];
  
  for (const [levelKey, data] of Object.entries(results)) {
    const config = LAYERS[levelKey];
    const levelEntry = index.levels.find(l => l.code === levelKey);
    
    if (levelEntry) {
      levelEntry.count = Object.keys(data).filter(k => k !== 'Unknown').length;
      levelEntry.file = config.outputFile;
    }
  }
  
  // Update summary
  const totalRecords = Object.values(results)[0] 
    ? Object.values(Object.values(results)[0]).reduce((sum, s) => sum + s.count, 0)
    : 0;
  
  index.summary = index.summary || {};
  index.summary.totalPolicies = totalRecords;
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📋 Updated: index.json`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('📊 Generating Hong Kong Hierarchy Statistics');
  console.log('='.repeat(60));
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Load all portfolio data
  console.log('\n📂 Loading portfolio data...');
  const allRecords = loadAllPortfolioData();
  console.log(`   Total: ${allRecords.length} records\n`);
  
  if (allRecords.length === 0) {
    console.log('❌ No portfolio data found!');
    process.exit(1);
  }
  
  const results = {};
  
  // Process each level
  for (const [levelKey, config] of Object.entries(LAYERS)) {
    try {
      const stats = await generateLevelStatistics(levelKey, config, allRecords);
      
      if (stats) {
        results[levelKey] = stats;
        
        // Save to file
        const outputPath = path.join(OUTPUT_DIR, config.outputFile);
        fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
        console.log(`   💾 Saved: ${config.outputFile} (${Object.keys(stats).length} entries)`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${levelKey}: ${error.message}`);
    }
  }
  
  // Update index.json
  updateIndex(results);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary');
  console.log('='.repeat(60));
  
  for (const [levelKey, stats] of Object.entries(results)) {
    const config = LAYERS[levelKey];
    const totalCount = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    const totalExposure = Object.values(stats).reduce((sum, s) => sum + s.totalExposure, 0);
    const unitsWithData = Object.keys(stats).filter(k => k !== 'Unknown' && stats[k].count > 0).length;
    
    console.log(`\n${levelKey.toUpperCase()}:`);
    console.log(`   Units with data: ${unitsWithData}`);
    console.log(`   Total policies: ${totalCount.toLocaleString()}`);
    console.log(`   Total exposure: HKD ${(totalExposure / 1e9).toFixed(2)}B`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Hong Kong hierarchy statistics generation complete!');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
