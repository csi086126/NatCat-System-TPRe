/**
 * Generate District Statistics by Underwriting Year
 * Creates separate statistics files for each year (2021-2024)
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Generating District Statistics by Underwriting Year...\n');

// District mapping from shapefile
const districtMapping = {
  '黃大仙區': { id: 1, name: 'WONG TAI SIN', nameCN: '黃大仙區' },
  '離島區': { id: 2, name: 'ISLANDS', nameCN: '離島區' },
  '葵青區': { id: 3, name: 'KWAI TSING', nameCN: '葵青區' },
  '深水埗區': { id: 4, name: 'SHAM SHUI PO', nameCN: '深水埗區' },
  '油尖旺區': { id: 5, name: 'YAU TSIM MONG', nameCN: '油尖旺區' },
  '九龍城區': { id: 6, name: 'KOWLOON CITY', nameCN: '九龍城區' },
  '觀塘區': { id: 7, name: 'KWUN TONG', nameCN: '觀塘區' },
  '西貢區': { id: 8, name: 'SAI KUNG', nameCN: '西貢區' },
  '大埔區': { id: 9, name: 'TAI PO', nameCN: '大埔區' },
  '沙田區': { id: 10, name: 'SHA TIN', nameCN: '沙田區' },
  '北區': { id: 11, name: 'NORTH', nameCN: '北區' },
  '荃灣區': { id: 12, name: 'TSUEN WAN', nameCN: '荃灣區' },
  '中西區': { id: 13, name: 'CENTRAL & WESTERN', nameCN: '中西區' },
  '灣仔區': { id: 14, name: 'WAN CHAI', nameCN: '灣仔區' },
  '東區': { id: 15, name: 'EASTERN', nameCN: '東區' },
  '南區': { id: 16, name: 'SOUTHERN', nameCN: '南區' },
  '屯門區': { id: 17, name: 'TUEN MUN', nameCN: '屯門區' },
  '元朗區': { id: 18, name: 'YUEN LONG', nameCN: '元朗區' },
};

// PPU mapping (9 regions)
const ppuMapping = {
  '港島': { id: 1, name: 'Hong Kong Island', nameCN: '港島' },
  '九龍東': { id: 2, name: 'Kowloon East', nameCN: '九龍東' },
  '九龍西': { id: 3, name: 'Kowloon West', nameCN: '九龍西' },
  '新界東北': { id: 4, name: 'New Territories Northeast', nameCN: '新界東北' },
  '新界西北': { id: 5, name: 'New Territories Northwest', nameCN: '新界西北' },
  '新界東南': { id: 6, name: 'New Territories Southeast', nameCN: '新界東南' },
  '新界西南': { id: 7, name: 'New Territories Southwest', nameCN: '新界西南' },
  '新界中': { id: 8, name: 'New Territories Central', nameCN: '新界中' },
  '離島': { id: 9, name: 'Islands', nameCN: '離島' },
};

// District to PPU mapping
const districtToPPU = {
  '中西區': '港島', '灣仔區': '港島', '東區': '港島', '南區': '港島',
  '觀塘區': '九龍東', '黃大仙區': '九龍東', '西貢區': '新界東南',
  '油尖旺區': '九龍西', '深水埗區': '九龍西', '九龍城區': '九龍西',
  '沙田區': '新界中', '大埔區': '新界東北', '北區': '新界東北',
  '元朗區': '新界西北', '屯門區': '新界西北',
  '荃灣區': '新界西南', '葵青區': '新界西南',
  '離島區': '離島'
};

function generateStatistics(data, level = 'districts18') {
  const statistics = {};
  let processedCount = 0;
  let skippedCount = 0;

  data.forEach((record) => {
    const districtCN = record['分區'];

    if (!districtCN || !districtMapping[districtCN]) {
      skippedCount++;
      return;
    }

    let key, info;

    if (level === 'districts18') {
      info = districtMapping[districtCN];
      key = `district_${info.id}`;
    } else if (level === 'ppu') {
      const ppuName = districtToPPU[districtCN];
      if (!ppuName || !ppuMapping[ppuName]) {
        skippedCount++;
        return;
      }
      info = ppuMapping[ppuName];
      key = `ppu_${info.id}`;
    }

    // Initialize statistics if not exists
    if (!statistics[key]) {
      statistics[key] = {
        id: info.id,
        name: info.name,
        nameCN: info.nameCN,
        count: 0,
        totalExposure: 0,
        avgExposure: 0,
        minExposure: Infinity,
        maxExposure: 0,
        byOccupancy: {},
        byYear: {} // Building year, kept for compatibility
      };
    }

    const stats = statistics[key];

    // Get exposure value
    let exposure = 0;
    if (record['公司保額'] && !isNaN(record['公司保額'])) {
      exposure = parseFloat(record['公司保額']);
    } else if (record['sum_insured'] && !isNaN(record['sum_insured'])) {
      exposure = parseFloat(record['sum_insured']);
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
      stats.byOccupancy[occupancy] = { count: 0, totalExposure: 0 };
    }
    stats.byOccupancy[occupancy].count++;
    stats.byOccupancy[occupancy].totalExposure += exposure;

    // By building year (kept for compatibility)
    const yearBuilt = record['建造年份'] || record['year_built'];
    if (yearBuilt) {
      const year = String(yearBuilt);
      if (!stats.byYear[year]) {
        stats.byYear[year] = { count: 0, totalExposure: 0 };
      }
      stats.byYear[year].count++;
      stats.byYear[year].totalExposure += exposure;
    }

    processedCount++;
  });

  // Calculate averages and clean up
  Object.keys(statistics).forEach(key => {
    const stats = statistics[key];
    stats.avgExposure = stats.count > 0 ? stats.totalExposure / stats.count : 0;

    if (stats.minExposure === Infinity) {
      stats.minExposure = 0;
    }

    // Round values
    stats.totalExposure = Math.round(stats.totalExposure * 100) / 100;
    stats.avgExposure = Math.round(stats.avgExposure * 100) / 100;
    stats.minExposure = Math.round(stats.minExposure * 100) / 100;
    stats.maxExposure = Math.round(stats.maxExposure * 100) / 100;

    Object.keys(stats.byOccupancy).forEach(occ => {
      stats.byOccupancy[occ].totalExposure =
        Math.round(stats.byOccupancy[occ].totalExposure * 100) / 100;
    });

    Object.keys(stats.byYear).forEach(year => {
      stats.byYear[year].totalExposure =
        Math.round(stats.byYear[year].totalExposure * 100) / 100;
    });
  });

  console.log(`   ${level}: Processed ${processedCount}, Skipped ${skippedCount}`);
  return statistics;
}

// Generate statistics for each year
const years = [2021, 2022, 2023, 2024];
const levels = ['districts18', 'ppu'];

console.log('📊 Processing years:', years.join(', '));
console.log('📊 Processing levels:', levels.join(', '));
console.log('');

years.forEach(year => {
  console.log(`\n🗓️  Processing Year ${year}...`);

  // Load year-specific portfolio data
  const portfolioPath = path.join(__dirname, 'public', 'data', 'by-year', `tphk-portfolio-${year}.json`);

  if (!fs.existsSync(portfolioPath)) {
    console.log(`   ⚠️  File not found: ${portfolioPath}`);
    return;
  }

  console.log(`   📂 Loading: ${portfolioPath}`);
  const portfolioData = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
  console.log(`   ✅ Loaded ${portfolioData.length} records`);

  levels.forEach(level => {
    const statistics = generateStatistics(portfolioData, level);

    // Save to file
    const outputPath = path.join(
      __dirname,
      'public',
      'data',
      'statistics',
      `${level}-statistics-${year}.json`
    );

    fs.writeFileSync(outputPath, JSON.stringify(statistics, null, 2), 'utf8');
    console.log(`   💾 Saved: ${level}-statistics-${year}.json`);
  });
});

console.log('\n✨ Done! Year-specific statistics generated.');
console.log('\n📝 Next steps:');
console.log('   1. Update the statistics loading logic to use year-specific files');
console.log('   2. Update index.json if needed');
