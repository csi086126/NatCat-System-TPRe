/**
 * Enhance Macau Portfolio Data with Parish Matching
 * 
 * This script tries to match unknown parishes based on address keywords
 * 
 * Usage: node enhance-macau-parish-matching.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json');

// Address keywords to parish mapping
// Based on known Macau landmarks and areas
const ADDRESS_TO_PARISH = [
  // 大堂区 (Sé) - Central Macau
  { keywords: ['Grand Lisboa', '葡京', 'Lisboa', '新葡京', '永利', 'Wynn', '星际', 'StarWorld', 
               '金沙', 'Sands', '英皇', 'Emperor', '新口岸', 'NAPE', '皇朝', '罗理基', 
               '南湾', 'Praia Grande', '殷皇子', 'D. Afonso', '约翰四世', 'Joao IV',
               '苏亚利斯', 'Soares', '宋玉生', 'Alameda', '孙逸仙', 'Sun Yat Sen',
               '亚马喇', 'Almeida', '友谊大马路', 'Amizade', '八角亭', '议事亭',
               '板樟堂', '大堂', '营地大街', '新马路', 'Senado', '大三巴', 'Ruins',
               'Casino Lisboa', 'One Central', 'MGM', '美高梅', 'Mandarin Oriental',
               '文华东方', '凯旋门', 'L\'Arc'], 
   parish: '大堂区' },
  
  // 花地玛堂区 (Nossa Senhora de Fátima) - North Macau
  { keywords: ['台山', '青洲', '筷子基', '关闸', 'Border Gate', '黑沙环', '望厦', 
               '祐汉', '马场', 'Canidrome', '莲峰', '高士德', 'Horta e Costa',
               '罅些喇', 'Lacerda', '美副将', 'Mesquita', '俾利喇', 'Pereireira',
               '雅廉访', 'Ouvidor Arriaga', '三盏灯', '嘉路米耶', '关闸马路',
               '劳动节', '亚利鸦架', '渡船街', '肥利喇', '三角花园'], 
   parish: '花地玛堂区' },
  
  // 花王堂区 (Santo António) - Inner Harbor area
  { keywords: ['白鸽巢', 'Camoes', '沙梨头', '内港', 'Inner Harbour', '新桥', 
               '三盏灯', '福隆新街', '十月初五', '司打口', '康公', '草堆街',
               '爹美刁', '庇山耶', '连胜', '坟场', '白马行', '大缆巷'], 
   parish: '花王堂区' },
  
  // 望德堂区 (São Lázaro) - Historic center
  { keywords: ['塔石', '东望洋', 'Guia', '荷兰园', 'Flora', '疯堂', 'Lazarus',
               '水坑尾', '西坟马路', '士多纽拜斯', '罗若翰', '肥利喇',
               '荷兰园正街', '美珊枝'], 
   parish: '望德堂区' },
  
  // 风顺堂区 (São Lourenço) - South Macau
  { keywords: ['妈阁', 'A-Ma', 'Barra', '下环', '河边新街', '风顺堂', '圣老楞佐',
               '亚婆井', 'Lilau', '郑家', 'Mandarin House', '港务局', '民国大马路',
               '西湾', '西望洋', '主教山', 'Penha', '竹室正街', '鹅眉横街'], 
   parish: '风顺堂区' },
  
  // 嘉模堂区 (Nossa Senhora do Carmo) - Taipa
  { keywords: ['氹仔', 'Taipa', '官也街', 'Cunha', '嘉模', 'Carmo', '龙环葡韵',
               '北安', 'Pac On', '科技大学', '威尼斯人', 'Venetian', '银河', 'Galaxy',
               '巴黎人', 'Parisian', '新濠天地', 'City of Dreams', '新濠影汇',
               'Studio City', '伦敦人', 'Londoner', '永利皇宫', 'Wynn Palace',
               '美狮', 'MGM Cotai', '摩珀斯', 'Morpheus', 'Altira', '新濠锋',
               '君悦', 'Grand Hyatt', '澳门蛋', 'Dome', '机场', 'Airport',
               '国际机场', 'MIA', '莲花', 'Lotus', '运动场', 'Stadium',
               '大学', 'University', 'MUST', '科大', '氹仔码头', 'Taipa Ferry',
               'Grand Lisboa Palace', '上葡京'], 
   parish: '嘉模堂区' },
  
  // 圣方济各堂区 (São Francisco Xavier) - Coloane
  { keywords: ['路环', 'Coloane', '黑沙', 'Hac Sa', '竹湾', 'Cheoc Van', '九澳',
               'Ka Ho', '荔枝碗', '谭公', '圣方济各', 'St. Francis', '路氹城',
               'Cotai', '金光大道', 'Cotai Strip', '十月初五马路', '恩尼斯',
               '蝴蝶谷'], 
   parish: '圣方济各堂区' },
  
  // 路氹填海区 - Cotai reclaimed land
  { keywords: ['金光', 'Cotai', '路氹', 'Lotus Bridge'], 
   parish: '嘉模堂区' },  // Cotai is administratively under 嘉模堂区
  
  // 澳门大学 - Special zone
  { keywords: ['澳门大学', '澳門大學', 'University of Macau', 'UM', '横琴岛澳门大学'],
   parish: '大堂区' },  // UM campus is technically outside but we assign to 大堂区
];

// Function to match address to parish
function matchAddressToParish(address) {
  if (!address) return null;
  
  const upperAddr = address.toUpperCase();
  
  for (const mapping of ADDRESS_TO_PARISH) {
    for (const keyword of mapping.keywords) {
      if (upperAddr.includes(keyword.toUpperCase())) {
        return mapping.parish;
      }
    }
  }
  
  return null;
}

function main() {
  console.log('=' .repeat(60));
  console.log('📊 Enhancing Macau Parish Matching');
  console.log('=' .repeat(60));

  // Read portfolio data
  console.log(`\n📂 Reading: ${INPUT_FILE}`);
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Error: Portfolio file not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`✅ Loaded ${data.length} records`);

  // Count before
  const beforeUnknown = data.filter(r => !r.parish || r.parish === 'Unknown').length;
  console.log(`\n📊 Before enhancement:`);
  console.log(`   Records without parish: ${beforeUnknown}`);

  // Enhance records
  let enhanced = 0;
  const enhancedByParish = {};
  
  data.forEach(record => {
    if (!record.parish || record.parish === 'Unknown') {
      const matchedParish = matchAddressToParish(record.address);
      if (matchedParish) {
        record.parish = matchedParish;
        record.parish_source = 'address_matching';
        enhanced++;
        enhancedByParish[matchedParish] = (enhancedByParish[matchedParish] || 0) + 1;
      }
    }
  });

  // Count after
  const afterUnknown = data.filter(r => !r.parish || r.parish === 'Unknown').length;
  
  console.log(`\n📊 After enhancement:`);
  console.log(`   Records enhanced: ${enhanced}`);
  console.log(`   Records still unknown: ${afterUnknown}`);
  console.log(`   Improvement: ${((beforeUnknown - afterUnknown) / beforeUnknown * 100).toFixed(1)}%`);
  
  console.log(`\n📊 Enhanced by parish:`);
  Object.entries(enhancedByParish)
    .sort((a, b) => b[1] - a[1])
    .forEach(([parish, count]) => {
      console.log(`   ${parish}: +${count}`);
    });

  // Save enhanced data
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Enhanced data saved to: ${OUTPUT_FILE}`);

  // Now regenerate statistics
  console.log('\n🔄 Regenerating statistics...');
  
  // Update the input file reference for statistics generation
  const statsScript = path.join(__dirname, 'generate-macau-district-statistics.js');
  let statsContent = fs.readFileSync(statsScript, 'utf8');
  
  // Temporarily update input path
  const originalLine = "const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL.json');";
  const newLine = "const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json');";
  
  if (statsContent.includes(originalLine)) {
    statsContent = statsContent.replace(originalLine, newLine);
    fs.writeFileSync(statsScript, statsContent);
    console.log('   Updated statistics script to use enhanced data');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Parish matching enhancement complete!');
  console.log('   Run: node generate-macau-district-statistics.js');
  console.log('='.repeat(60));
}

main();
