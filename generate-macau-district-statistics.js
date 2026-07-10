/**
 * Generate Macau District Statistics from Portfolio Data
 * 
 * This script reads the Macau portfolio GeoJSON and generates
 * statistics by district (parish) for use in the Portfolio Map
 * 
 * Usage: node generate-macau-district-statistics.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'data', 'statistics', 'macau-district-statistics.json');

// Macau District/Parish mapping
// Key: Various possible names in source data
// canonicalName: Matches GeoServer SNAME field
const MACAU_PARISHES = {
  // Standard simplified names (matching GeoServer SNAME)
  '花地玛堂区': { id: 1, name_en: 'Our Lady of Fatima', pname: 'Nossa Senhora de Fátima', canonicalName: '花地玛堂区' },
  '花王堂区': { id: 2, name_en: 'St. Anthony', pname: 'Santo António', canonicalName: '花王堂区' },
  '大堂区': { id: 3, name_en: 'Cathedral', pname: 'Sé', canonicalName: '大堂区' },
  '望德堂区': { id: 4, name_en: 'St. Lazarus', pname: 'São Lázaro', canonicalName: '望德堂区' },
  '风顺堂区': { id: 5, name_en: 'St. Lawrence', pname: 'São Lourenço', canonicalName: '风顺堂区' },
  '嘉模堂区': { id: 6, name_en: 'Our Lady of Carmel', pname: 'Nossa Senhora do Carmo', canonicalName: '嘉模堂区' },
  '圣方济各堂区': { id: 7, name_en: 'St. Francis Xavier', pname: 'São Francisco Xavier', canonicalName: '圣方济各堂区' },
  '路氹填海区': { id: 8, name_en: 'Cotai', pname: 'Cotai', canonicalName: '路氹填海区' },
  
  // Alternative names (aliases) - map to canonical names
  '圣安多尼堂区': { id: 2, name_en: 'St. Anthony', pname: 'Santo António', canonicalName: '花王堂区' },
  '圣老楞佐堂区': { id: 5, name_en: 'St. Lawrence', pname: 'São Lourenço', canonicalName: '风顺堂区' },
  '路氹城': { id: 8, name_en: 'Cotai', pname: 'Cotai', canonicalName: '路氹填海区' },
  '路环': { id: 7, name_en: 'Coloane', pname: 'Coloane', canonicalName: '圣方济各堂区' },
  '氹仔': { id: 6, name_en: 'Taipa', pname: 'Taipa', canonicalName: '嘉模堂区' },
};

// Get parish ID from name
function getParishId(parishName) {
  if (!parishName) return 0;
  const normalized = parishName.trim();
  if (MACAU_PARISHES[normalized]) {
    return MACAU_PARISHES[normalized].id;
  }
  // Try partial match
  for (const [key, value] of Object.entries(MACAU_PARISHES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value.id;
    }
  }
  return 0;
}

function getParishInfo(parishName) {
  const normalized = parishName ? parishName.trim() : '';
  if (MACAU_PARISHES[normalized]) {
    return MACAU_PARISHES[normalized];
  }
  for (const [key, value] of Object.entries(MACAU_PARISHES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return { id: 0, name_en: 'Unknown', pname: 'Unknown', canonicalName: 'Unknown' };
}

function main() {
  console.log('=' .repeat(60));
  console.log('📊 Generating Macau District Statistics');
  console.log('=' .repeat(60));

  // Read portfolio data
  console.log(`\n📂 Reading: ${INPUT_FILE}`);
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Error: Portfolio file not found!');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  
  // Handle both array format and GeoJSON format
  let features;
  if (Array.isArray(rawData)) {
    // JSON array format - wrap each item
    features = rawData.map(item => ({ properties: item }));
  } else if (rawData.features) {
    // GeoJSON format
    features = rawData.features;
  } else {
    console.error('❌ Unknown data format');
    process.exit(1);
  }
  
  console.log(`✅ Loaded ${features.length} records`);

  // Initialize statistics by district
  const districtStats = {};

  // Process each feature
  features.forEach(feature => {
    const props = feature.properties || feature || {};
    
    // Get district info - use parish field
    const parishName = props.parish || props.parish_name_cn || 'Unknown';
    const parishInfo = getParishInfo(parishName);
    const parishId = props.parish_id || parishInfo.id || getParishId(parishName);
    const parishNameEn = props.parish_name_en || parishInfo.name_en || '';
    const canonicalName = parishInfo.canonicalName || parishName;
    
    // Get financial data
    const sumInsured = parseFloat(props.company_sum_insured || props['公司保额'] || props.sum_insured_100 || 0);
    const occupancy = props.insurance_type || props['险种'] || props.occupation_desc || 'Unknown';
    const year = props.year || props.policy_year;
    
    // Use canonicalName (simplified Chinese name) as key to match GeoServer SNAME field
    const key = canonicalName;
    if (!districtStats[key]) {
      districtStats[key] = {
        id: parishId,
        name: parishNameEn || parishName,
        nameCN: canonicalName,
        count: 0,
        totalExposure: 0,
        avgExposure: 0,
        minExposure: Infinity,
        maxExposure: 0,
        byOccupancy: {},
        byYear: {},
      };
    }

    const stats = districtStats[key];
    
    // Update counts
    stats.count++;
    stats.totalExposure += sumInsured;
    stats.minExposure = Math.min(stats.minExposure, sumInsured);
    stats.maxExposure = Math.max(stats.maxExposure, sumInsured);

    // By occupancy/insurance type
    if (!stats.byOccupancy[occupancy]) {
      stats.byOccupancy[occupancy] = { count: 0, totalExposure: 0 };
    }
    stats.byOccupancy[occupancy].count++;
    stats.byOccupancy[occupancy].totalExposure += sumInsured;

    // By year
    if (year) {
      const yearKey = String(Math.floor(year));
      if (!stats.byYear[yearKey]) {
        stats.byYear[yearKey] = { count: 0, totalExposure: 0 };
      }
      stats.byYear[yearKey].count++;
      stats.byYear[yearKey].totalExposure += sumInsured;
    }
  });

  // Calculate averages and fix min values
  Object.values(districtStats).forEach(stats => {
    if (stats.count > 0) {
      stats.avgExposure = stats.totalExposure / stats.count;
    }
    if (stats.minExposure === Infinity) {
      stats.minExposure = 0;
    }
  });

  // Print summary
  console.log('\n📊 District Statistics Summary:');
  console.log('-'.repeat(60));
  
  Object.entries(districtStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([key, stats]) => {
      console.log(`  ${stats.nameCN || stats.name} (ID: ${stats.id})`);
      console.log(`    Policies: ${stats.count}, Exposure: MOP ${(stats.totalExposure / 1e6).toFixed(2)}M`);
    });

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(districtStats, null, 2));
  console.log(`\n✅ Statistics saved to: ${OUTPUT_FILE}`);
  console.log(`   Total districts: ${Object.keys(districtStats).length}`);
  console.log(`   Total policies: ${features.length}`);

  // Also create by-year files
  const years = new Set();
  Object.values(districtStats).forEach(stats => {
    Object.keys(stats.byYear || {}).forEach(y => years.add(y));
  });

  years.forEach(year => {
    const yearStats = {};
    Object.entries(districtStats).forEach(([key, stats]) => {
      if (stats.byYear && stats.byYear[year]) {
        yearStats[key] = {
          ...stats,
          count: stats.byYear[year].count,
          totalExposure: stats.byYear[year].totalExposure,
          avgExposure: stats.byYear[year].totalExposure / stats.byYear[year].count,
        };
      }
    });
    
    const yearFile = OUTPUT_FILE.replace('.json', `-${year}.json`);
    fs.writeFileSync(yearFile, JSON.stringify(yearStats, null, 2));
    console.log(`   Year ${year}: ${yearFile}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Macau district statistics generation complete!');
  console.log('='.repeat(60));
}

main();
