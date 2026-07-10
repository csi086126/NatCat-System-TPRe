/**
 * Generate Macau Statistical Area Statistics from Portfolio Data
 * 
 * This script reads the Macau portfolio JSON and generates
 * statistics by statistical area for use in the Portfolio Map
 * 
 * Since we have geocoded coordinates, we'll use point-in-polygon
 * to determine which statistical area each policy belongs to.
 * 
 * Usage: node generate-macau-statistical-area-statistics.js
 */

const fs = require('fs');
const path = require('path');
const https = require('http'); // Using http for internal GeoServer

// Paths
const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json');
const STATISTICAL_AREAS_FILE = path.join(__dirname, 'macau_statistical_areas.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'data', 'statistics', 'macau-statistical-area-statistics.json');

// Statistical Area list (25 areas) - from GeoServer
const STATISTICAL_AREAS = {
  1: { zona: 1, cname: '青洲區', sname: '青洲区', pname: 'Ilha Verde' },
  2: { zona: 2, cname: '台山區', sname: '台山区', pname: 'Tamagnini Barbosa' },
  3: { zona: 3, cname: '黑沙環及祐漢區', sname: '黑沙环及祐汉区', pname: 'Areia Preta e Iao Hon' },
  4: { zona: 4, cname: '黑沙環新填海區', sname: '黑沙环新填海区', pname: 'Novos Aterros da Areia Preta' },
  5: { zona: 5, cname: '望廈及水塘區', sname: '望厦及水塘区', pname: 'Móng Há e Reservatório' },
  6: { zona: 6, cname: '筷子基區', sname: '筷子基区', pname: 'Fai Chi Kei' },
  7: { zona: 7, cname: '林茂塘區', sname: '林茂塘区', pname: 'Lam Mau' },
  8: { zona: 8, cname: '高士德及雅廉訪區', sname: '高士德及雅廉访区', pname: 'Horta e Costa e Ouvidor Arriaga' },
  9: { zona: 9, cname: '新橋區', sname: '新桥区', pname: 'San Kio' },
  10: { zona: 10, cname: '沙梨頭及大三巴區', sname: '沙梨头及大三巴区', pname: 'Patane e Ruínas de S. Paulo' },
  11: { zona: 11, cname: '荷蘭園區', sname: '荷兰园区', pname: 'Flora' },
  12: { zona: 12, cname: '東望洋區(松山區)', sname: '东望洋区(松山区)', pname: 'Guia' },
  13: { zona: 13, cname: '新口岸區', sname: '新口岸区', pname: 'NAPE' },
  14: { zona: 14, cname: '外港及南灣湖新填海區', sname: '外港及南湾湖新填海区', pname: 'Porto Exterior e ZAPE' },
  15: { zona: 15, cname: '中區', sname: '中区', pname: 'Centro' },
  16: { zona: 16, cname: '下環區', sname: '下环区', pname: 'Baixa da Cidade' },
  17: { zona: 17, cname: '南西灣及主教山區', sname: '南西湾及主教山区', pname: 'Praia Grande e Penha' },
  18: { zona: 18, cname: '海洋及小潭山區', sname: '海洋及小潭山区', pname: 'Jardins do Oceano e Taipa Pequena' },
  19: { zona: 19, cname: '氹仔中心區', sname: '氹仔中心区', pname: 'Baixa da Taipa' },
  20: { zona: 20, cname: '大學及北安灣區', sname: '大学及北安湾区', pname: 'Universidade e Baía de Pac On' },
  21: { zona: 21, cname: '北安及大潭山區', sname: '北安及大潭山区', pname: 'Pac On e Taipa Grande' },
  22: { zona: 22, cname: '氹仔舊城及馬場區', sname: '氹仔旧城及马场区', pname: 'Vila da Taipa e Hipódromo' },
  23: { zona: 23, cname: '路環區', sname: '路环区', pname: 'Coloane' },
  24: { zona: 24, cname: '路氹填海區', sname: '路氹填海区', pname: 'Cotai' },
  25: { zona: 25, cname: '新城A區及港珠澳大橋澳門口岸管理區', sname: '新城A区及港珠澳大桥澳门口岸管理区', pname: 'Zona A' },
};

// Address keywords mapping to statistical areas
// This is a heuristic mapping based on common address patterns
const ADDRESS_KEYWORDS_TO_AREA = {
  // 青洲區 (Ilha Verde)
  '青洲': 1,
  
  // 台山區
  '台山': 2,
  '关闸': 2,
  '關閘': 2,
  
  // 黑沙環及祐漢區
  '黑沙环': 3,
  '黑沙環': 3,
  '祐汉': 3,
  '祐漢': 3,
  '慕拉士': 3,
  
  // 黑沙環新填海區
  '东北大马路': 4,
  '東北大馬路': 4,
  '渔翁街': 4,
  '漁翁街': 4,
  
  // 望廈及水塘區
  '望厦': 5,
  '望廈': 5,
  '美副将': 5,
  '美副將': 5,
  '水塘': 5,
  
  // 筷子基區
  '筷子基': 6,
  
  // 林茂塘區
  '林茂塘': 7,
  '林茂': 7,
  
  // 高士德及雅廉訪區
  '高士德': 8,
  '雅廉访': 8,
  '雅廉訪': 8,
  '贾伯乐': 8,
  '賈伯樂': 8,
  '俾利喇': 8,
  
  // 新橋區
  '新桥': 9,
  '新橋': 9,
  '三盏灯': 9,
  '三盞燈': 9,
  
  // 沙梨頭及大三巴區
  '沙梨头': 10,
  '沙梨頭': 10,
  '大三巴': 10,
  '新马路': 10,
  '新馬路': 10,
  '议事亭': 10,
  '議事亭': 10,
  '營地': 10,
  '营地': 10,
  
  // 荷蘭園區
  '荷兰园': 11,
  '荷蘭園': 11,
  '东望洋斜巷': 11,
  '東望洋斜巷': 11,
  '疯堂': 11,
  '瘋堂': 11,
  
  // 東望洋區(松山區)
  '松山': 12,
  '东望洋': 12,
  '東望洋': 12,
  '二龙喉': 12,
  '二龍喉': 12,
  '得胜': 12,
  '得勝': 12,
  
  // 新口岸區
  '新口岸': 13,
  '皇朝': 13,
  '仙德丽': 13,
  '仙德麗': 13,
  '宋玉生': 13,
  '何贤': 13,
  '何賢': 13,
  
  // 外港及南灣湖新填海區
  '外港': 14,
  '南湾湖': 14,
  '南灣湖': 14,
  '新填海': 14,
  '友谊大马路': 14,
  '友誼大馬路': 14,
  
  // 中區
  '大堂街': 15,
  '板樟堂': 15,
  '板樟堂': 15,
  '邮政局': 15,
  '郵政局': 15,
  '南湾大马路': 15,
  '南灣大馬路': 15,
  
  // 下環區
  '下环': 16,
  '下環': 16,
  '司打口': 16,
  '河边新街': 16,
  '河邊新街': 16,
  '妈阁': 16,
  '媽閣': 16,
  
  // 南西灣及主教山區
  '西湾': 17,
  '西灣': 17,
  '主教山': 17,
  '民国大马路': 17,
  '民國大馬路': 17,
  
  // 海洋及小潭山區
  '海洋花园': 18,
  '海洋花園': 18,
  '小潭山': 18,
  
  // 氹仔中心區
  '氹仔中': 19,
  '地堡街': 19,
  '濠景': 19,
  '花城': 19,
  '湖畔': 19,
  
  // 大學及北安灣區
  '澳门大学': 20,
  '澳門大學': 20,
  '北安湾': 20,
  '北安灣': 20,
  
  // 北安及大潭山區
  '北安': 21,
  '大潭山': 21,
  '机场': 21,
  '機場': 21,
  
  // 氹仔舊城及馬場區
  '氹仔旧城': 22,
  '氹仔舊城': 22,
  '马场': 22,
  '馬場': 22,
  '官也街': 22,
  '卓家村': 22,
  '龙环葡韵': 22,
  '龍環葡韻': 22,
  
  // 路環區
  '路环': 23,
  '路環': 23,
  '石排湾': 23,
  '石排灣': 23,
  '黑沙': 23,
  '竹湾': 23,
  '竹灣': 23,
  '九澳': 23,
  
  // 路氹填海區 (Cotai)
  '路氹': 24,
  'cotai': 24,
  'Cotai': 24,
  'COTAI': 24,
  '金光大道': 24,
  '威尼斯人': 24,
  '巴黎人': 24,
  '银河': 24,
  '銀河': 24,
  '新濠天地': 24,
  '新濠影汇': 24,
  '新濠影匯': 24,
  '永利皇宫': 24,
  '永利皇宮': 24,
  '美狮美高梅': 24,
  '美獅美高梅': 24,
  'Galaxy': 24,
  'Venetian': 24,
  'Parisian': 24,
  'Studio City': 24,
  'City of Dreams': 24,
  'Sands': 24,
  'Wynn Palace': 24,
  
  // 新城A區
  '新城A': 25,
  '港珠澳大桥': 25,
  '港珠澳大橋': 25,
};

function matchStatisticalArea(address) {
  if (!address) return null;
  
  const normalizedAddress = address.toLowerCase();
  
  // Check each keyword
  for (const [keyword, zonaId] of Object.entries(ADDRESS_KEYWORDS_TO_AREA)) {
    if (normalizedAddress.includes(keyword.toLowerCase())) {
      return zonaId;
    }
  }
  
  return null;
}

function getAreaInfo(zonaId) {
  return STATISTICAL_AREAS[zonaId] || null;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('📊 Generating Macau Statistical Area Statistics');
  console.log('=' .repeat(60));

  // Read portfolio data
  console.log(`\n📂 Reading: ${INPUT_FILE}`);
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Error: Portfolio file not found!');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  
  // Handle both array format and GeoJSON format
  let records;
  if (Array.isArray(rawData)) {
    records = rawData;
  } else if (rawData.features) {
    records = rawData.features.map(f => f.properties);
  } else {
    console.error('❌ Unknown data format');
    process.exit(1);
  }
  
  console.log(`✅ Loaded ${records.length} records`);

  // Initialize statistics by statistical area
  const areaStats = {};
  
  // Initialize all 25 areas
  for (const [id, info] of Object.entries(STATISTICAL_AREAS)) {
    const key = info.sname; // Use simplified Chinese name as key (matches GeoServer SNAME)
    areaStats[key] = {
      id: parseInt(id),
      zona: info.zona,
      name: info.pname,
      nameCN: info.cname,
      sname: info.sname,
      count: 0,
      totalExposure: 0,
      avgExposure: 0,
      minExposure: Infinity,
      maxExposure: 0,
      byOccupancy: {},
      byYear: {},
    };
  }
  
  // Add Unknown category
  areaStats['Unknown'] = {
    id: 0,
    zona: 0,
    name: 'Unknown',
    nameCN: 'Unknown',
    sname: 'Unknown',
    count: 0,
    totalExposure: 0,
    avgExposure: 0,
    minExposure: Infinity,
    maxExposure: 0,
    byOccupancy: {},
    byYear: {},
  };

  let matchedByAddress = 0;
  let unmatched = 0;

  // Process each record
  records.forEach(record => {
    const address = record.address || record['保险地址'] || '';
    
    // Try to match statistical area from address
    const zonaId = matchStatisticalArea(address);
    
    let key;
    if (zonaId) {
      const info = getAreaInfo(zonaId);
      key = info ? info.sname : 'Unknown';
      matchedByAddress++;
    } else {
      key = 'Unknown';
      unmatched++;
    }
    
    // Get financial data
    const sumInsured = parseFloat(record.company_sum_insured || record['公司保额'] || record.sum_insured_100 || 0);
    const occupancy = record.insurance_type || record['险种'] || record.occupation_desc || 'Unknown';
    const year = record.year || record.policy_year;
    
    const stats = areaStats[key];
    if (!stats) {
      console.warn(`Warning: No stats object for key: ${key}`);
      return;
    }
    
    // Update counts
    stats.count++;
    stats.totalExposure += sumInsured;
    if (sumInsured > 0) {
      stats.minExposure = Math.min(stats.minExposure, sumInsured);
    }
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
  Object.values(areaStats).forEach(stats => {
    if (stats.count > 0) {
      stats.avgExposure = stats.totalExposure / stats.count;
    }
    if (stats.minExposure === Infinity) {
      stats.minExposure = 0;
    }
  });

  // Print summary
  console.log('\n📊 Statistical Area Summary:');
  console.log('-'.repeat(60));
  console.log(`  Matched by address keywords: ${matchedByAddress}`);
  console.log(`  Unmatched (Unknown): ${unmatched}`);
  console.log('-'.repeat(60));
  
  Object.entries(areaStats)
    .filter(([_, stats]) => stats.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([key, stats]) => {
      console.log(`  ${stats.zona || '-'}: ${stats.sname}`);
      console.log(`      Policies: ${stats.count}, Exposure: MOP ${(stats.totalExposure / 1e6).toFixed(2)}M`);
    });

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(areaStats, null, 2));
  console.log(`\n✅ Statistics saved to: ${OUTPUT_FILE}`);
  console.log(`   Total areas with data: ${Object.values(areaStats).filter(s => s.count > 0).length}`);
  console.log(`   Total policies processed: ${records.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Macau statistical area statistics generation complete!');
  console.log('='.repeat(60));
}

main();
