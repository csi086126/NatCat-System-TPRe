/**
 * Regenerate District Statistics with Correct Exposure Calculations
 * This script reads the portfolio data and calculates statistics for 18 districts
 * with proper handling of the 公司保額 (Company Sum Insured) field
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Regenerating District Statistics...\n');

// Load portfolio data
const portfolioPath = path.join(__dirname, 'public', 'data', 'tphk-geocoded-portfolio.json');
console.log('📂 Loading portfolio data from:', portfolioPath);
const portfolioData = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
console.log(`✅ Loaded ${portfolioData.length} records\n`);

// District mapping (from 分區 field to district ID and names)
const districtMapping = {
  '中西區': { id: 1, name: 'CENTRAL & WESTERN', nameCN: '中西區' },
  '灣仔區': { id: 2, name: 'WAN CHAI', nameCN: '灣仔區' },
  '東區': { id: 3, name: 'EASTERN', nameCN: '東區' },
  '南區': { id: 4, name: 'SOUTHERN', nameCN: '南區' },
  '油尖旺區': { id: 5, name: 'YAU TSIM MONG', nameCN: '油尖旺區' },
  '深水埗區': { id: 6, name: 'SHAM SHUI PO', nameCN: '深水埗區' },
  '九龍城區': { id: 7, name: 'KOWLOON CITY', nameCN: '九龍城區' },
  '黃大仙區': { id: 8, name: 'WONG TAI SIN', nameCN: '黃大仙區' },
  '觀塘區': { id: 9, name: 'KWUN TONG', nameCN: '觀塘區' },
  '荃灣區': { id: 10, name: 'TSUEN WAN', nameCN: '荃灣區' },
  '屯門區': { id: 11, name: 'TUEN MUN', nameCN: '屯門區' },
  '元朗區': { id: 12, name: 'YUEN LONG', nameCN: '元朗區' },
  '北區': { id: 13, name: 'NORTH', nameCN: '北區' },
  '大埔區': { id: 14, name: 'TAI PO', nameCN: '大埔區' },
  '西貢區': { id: 15, name: 'SAI KUNG', nameCN: '西貢區' },
  '沙田區': { id: 16, name: 'SHA TIN', nameCN: '沙田區' },
  '葵青區': { id: 17, name: 'KWAI TSING', nameCN: '葵青區' },
  '離島區': { id: 18, name: 'ISLANDS', nameCN: '離島區' }
};

// Initialize statistics object
const statistics = {};

// Process each record
let processedCount = 0;
let skippedCount = 0;

console.log('📊 Processing records...');

portfolioData.forEach((record, index) => {
  const districtCN = record['分區'];

  if (!districtCN || !districtMapping[districtCN]) {
    skippedCount++;
    return;
  }

  const district = districtMapping[districtCN];
  const districtKey = `district_${district.id}`;

  // Initialize district statistics if not exists
  if (!statistics[districtKey]) {
    statistics[districtKey] = {
      id: district.id,
      name: district.name,
      nameCN: district.nameCN,
      count: 0,
      totalExposure: 0,
      avgExposure: 0,
      minExposure: Infinity,
      maxExposure: 0,
      byOccupancy: {},
      byYear: {}
    };
  }

  const stats = statistics[districtKey];

  // Get exposure value - try multiple fields
  let exposure = 0;
  if (record['公司保額'] && !isNaN(record['公司保額'])) {
    exposure = parseFloat(record['公司保額']);
  } else if (record['sum_insured'] && !isNaN(record['sum_insured'])) {
    exposure = parseFloat(record['sum_insured']);
  } else if (record['共保前總保險金額'] && !isNaN(record['共保前總保險金額'])) {
    exposure = parseFloat(record['共保前總保險金額']);
  }

  // Update statistics
  stats.count++;
  stats.totalExposure += exposure;

  if (exposure > 0) {
    stats.minExposure = Math.min(stats.minExposure, exposure);
    stats.maxExposure = Math.max(stats.maxExposure, exposure);
  }

  // By occupancy
  const occupancy = record['佔用性質'] || record['occupancy'] || 'Unknown';
  if (!stats.byOccupancy[occupancy]) {
    stats.byOccupancy[occupancy] = {
      count: 0,
      totalExposure: 0
    };
  }
  stats.byOccupancy[occupancy].count++;
  stats.byOccupancy[occupancy].totalExposure += exposure;

  // By year
  const yearBuilt = record['建造年份'] || record['year_built'];
  if (yearBuilt) {
    const year = String(yearBuilt);
    if (!stats.byYear[year]) {
      stats.byYear[year] = {
        count: 0,
        totalExposure: 0
      };
    }
    stats.byYear[year].count++;
    stats.byYear[year].totalExposure += exposure;
  }

  processedCount++;

  // Progress update
  if ((index + 1) % 10000 === 0) {
    console.log(`   Processed ${index + 1}/${portfolioData.length} records...`);
  }
});

console.log(`\n✅ Processing complete:`);
console.log(`   Processed: ${processedCount} records`);
console.log(`   Skipped: ${skippedCount} records\n`);

// Calculate averages and clean up
Object.keys(statistics).forEach(key => {
  const stats = statistics[key];
  stats.avgExposure = stats.count > 0 ? stats.totalExposure / stats.count : 0;

  // Fix infinity values
  if (stats.minExposure === Infinity) {
    stats.minExposure = 0;
  }

  // Round values to 2 decimal places
  stats.totalExposure = Math.round(stats.totalExposure * 100) / 100;
  stats.avgExposure = Math.round(stats.avgExposure * 100) / 100;
  stats.minExposure = Math.round(stats.minExposure * 100) / 100;
  stats.maxExposure = Math.round(stats.maxExposure * 100) / 100;

  // Round occupancy totals
  Object.keys(stats.byOccupancy).forEach(occ => {
    stats.byOccupancy[occ].totalExposure =
      Math.round(stats.byOccupancy[occ].totalExposure * 100) / 100;
  });

  // Round year totals
  Object.keys(stats.byYear).forEach(year => {
    stats.byYear[year].totalExposure =
      Math.round(stats.byYear[year].totalExposure * 100) / 100;
  });
});

// Save to file
const outputPath = path.join(__dirname, 'public', 'data', 'statistics', 'districts-18-statistics.json');
fs.writeFileSync(outputPath, JSON.stringify(statistics, null, 2), 'utf8');
console.log(`💾 Statistics saved to: ${outputPath}\n`);

// Print summary
console.log('📈 Statistics Summary:\n');
console.log('District                | Policies | Total Exposure (HKD)      | Avg Exposure (HKD)');
console.log('------------------------|----------|---------------------------|-------------------');

Object.keys(statistics)
  .sort((a, b) => statistics[b].count - statistics[a].count)
  .forEach(key => {
    const stats = statistics[key];
    const totalStr = stats.totalExposure.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const avgStr = stats.avgExposure.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    console.log(
      `${stats.name.padEnd(23)} | ${String(stats.count).padStart(8)} | ${totalStr.padStart(25)} | ${avgStr.padStart(17)}`
    );
  });

console.log('\n✨ Done!');
