/**
 * 完整处理澳门 TPMO 保单数据
 * 
 * 从原始 Excel 文件读取全部 83,447 条记录
 * 进行地理编码和数据增强
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const INPUT_FILE = process.env.TPMO_DATA_DIR ? require("path").join(process.env.TPMO_DATA_DIR, '承保信息.xlsx') : 'D:/承保信息.xlsx';
const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'macau');
const CACHE_FILE = path.join(OUTPUT_DIR, 'tpmo-geocoding-cache-full.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tpmo-portfolio-full.json');

// 高德地图 API Key
const AMAP_KEY = 'b779793f7d6260fab7a0495173a4cf16';

// GCJ-02 转 WGS84 常量
const pi = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function outOfChina(lng, lat) {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * pi) + 40.0 * Math.sin(lat / 3.0 * pi)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * pi) + 320 * Math.sin(lat * pi / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * pi) + 40.0 * Math.sin(lng / 3.0 * pi)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * pi) + 300.0 * Math.sin(lng / 30.0 * pi)) * 2.0 / 3.0;
  return ret;
}

function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * pi;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
  return [lng * 2 - (lng + dlng), lat * 2 - (lat + dlat)];
}

// 堂区映射
const PARISH_MAPPING = {
  '花地玛堂区': { id: 1, name_en: 'Our Lady of Fatima', canonical: '花地玛堂区' },
  '花王堂区': { id: 2, name_en: 'St. Anthony', canonical: '花王堂区' },
  '圣安多尼堂区': { id: 2, name_en: 'St. Anthony', canonical: '花王堂区' },
  '大堂区': { id: 3, name_en: 'Cathedral', canonical: '大堂区' },
  '望德堂区': { id: 4, name_en: 'St. Lazarus', canonical: '望德堂区' },
  '风顺堂区': { id: 5, name_en: 'St. Lawrence', canonical: '风顺堂区' },
  '圣老楞佐堂区': { id: 5, name_en: 'St. Lawrence', canonical: '风顺堂区' },
  '嘉模堂区': { id: 6, name_en: 'Our Lady of Carmel', canonical: '嘉模堂区' },
  '圣方济各堂区': { id: 7, name_en: 'St. Francis Xavier', canonical: '圣方济各堂区' },
  '路氹填海区': { id: 8, name_en: 'Cotai', canonical: '嘉模堂区' },
};

// 清洗地址
function cleanAddress(addr) {
  if (!addr) return '';
  // 取第一个地址（如果有多个用换行分隔）
  let clean = addr.split('\n')[0].split('/')[0].trim();
  // 去掉编号前缀 如 "C5-021/1 - "
  clean = clean.replace(/^[A-Z0-9\-\/]+\s*-\s*/i, '');
  // 确保有澳门前缀
  if (!clean.includes('澳門') && !clean.includes('澳门') && !clean.toLowerCase().includes('macau')) {
    clean = '澳門' + clean;
  }
  return clean;
}

// 高德 geocoding
function geocodeAmap(address) {
  return new Promise((resolve, reject) => {
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=澳门`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === '1' && result.geocodes && result.geocodes.length > 0) {
            const geo = result.geocodes[0];
            const [lng, lat] = geo.location.split(',').map(Number);
            // 转换为 WGS84
            const [wgs84Lng, wgs84Lat] = gcj02ToWgs84(lng, lat);
            resolve({
              lat: wgs84Lat,
              lng: wgs84Lng,
              gcj02_lat: lat,
              gcj02_lng: lng,
              formatted_address: geo.formatted_address,
              district: geo.district,
              adcode: geo.adcode,
              provider: 'amap',
              coord_system: 'wgs84'
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('='.repeat(60));
  console.log('📊 Processing TPMO Full Dataset');
  console.log('='.repeat(60));

  // 读取 Excel
  console.log('\n📂 Reading Excel file...');
  const workbook = XLSX.readFile(INPUT_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false });
  console.log(`   Total records: ${rawData.length}`);

  // 加载缓存
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`   Loaded cache: ${Object.keys(cache).length} addresses`);
  }

  // 也加载旧缓存
  const oldCacheFile = path.join(OUTPUT_DIR, 'tpmo-geocoding-cache.json');
  if (fs.existsSync(oldCacheFile)) {
    const oldCache = JSON.parse(fs.readFileSync(oldCacheFile, 'utf8'));
    Object.assign(cache, oldCache);
    console.log(`   Merged old cache: ${Object.keys(cache).length} total`);
  }

  // 处理数据
  console.log('\n🔄 Processing records...');
  const results = [];
  let geocoded = 0, cached = 0, failed = 0, noAddress = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // 提取年份
    let year = null;
    if (row['保单起期']) {
      const match = row['保单起期'].match(/(\d{4})/);
      if (match) year = parseInt(match[1]);
    }

    // 清洗地址
    const rawAddress = row['标的位置'] || '';
    const cleanAddr = cleanAddress(rawAddress);

    // 构建记录
    const record = {
      policy_no: row['policyno'],
      insured: row['被保险人'],
      policy_start: row['保单起期'],
      policy_end: row['保单止期'],
      insurance_type: row['险种'],
      address: cleanAddr,
      raw_address: rawAddress,
      sum_insured_100: parseFloat((row[' 保额（100%） '] || '0').replace(/,/g, '')) || 0,
      share_percentage: parseFloat((row[' 承保份额 '] || '0').replace(/,/g, '')) || 0,
      company_sum_insured: parseFloat((row[' 公司保额 '] || '0').replace(/,/g, '')) || 0,
      year: year,
    };

    // 地理编码
    if (cleanAddr.length > 3) {
      if (cache[cleanAddr]) {
        // 使用缓存
        if (cache[cleanAddr] && cache[cleanAddr].lat) {
          record.location = cache[cleanAddr];
          cached++;
        } else {
          failed++;
        }
      } else {
        // 新地址，需要编码
        const result = await geocodeAmap(cleanAddr);
        cache[cleanAddr] = result;
        
        if (result) {
          record.location = result;
          geocoded++;
        } else {
          failed++;
        }

        // 限速：每秒最多 30 次请求
        if (geocoded % 30 === 0) {
          await delay(1000);
        }

        // 每 1000 条保存进度
        if ((geocoded + failed) % 1000 === 0) {
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
          console.log(`   Progress: ${i + 1}/${rawData.length} (geocoded: ${geocoded}, cached: ${cached}, failed: ${failed})`);
        }
      }
    } else {
      noAddress++;
    }

    // 匹配堂区
    if (record.location && record.location.district) {
      const parish = PARISH_MAPPING[record.location.district];
      if (parish) {
        record.parish = parish.canonical;
        record.parish_id = parish.id;
      }
    }

    results.push(record);
  }

  // 保存缓存
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  // 保存结果
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Processing Complete!');
  console.log('='.repeat(60));
  console.log(`   Total records: ${results.length}`);
  console.log(`   With coordinates: ${results.filter(r => r.location?.lat).length}`);
  console.log(`   - From cache: ${cached}`);
  console.log(`   - Newly geocoded: ${geocoded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   No address: ${noAddress}`);
  console.log(`\n   Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
