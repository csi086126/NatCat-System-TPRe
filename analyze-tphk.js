/**
 * TPHK Insurance Data Analysis using Node.js
 * 使用Node.js分析太平香港保险数据
 *
 * 需要安装: npm install xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_PATH = 'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK';
const OUTPUT_FILE = path.join(__dirname, 'tphk-analysis-result.json');

function analyzeExcelFile(filepath) {
  const filename = path.basename(filepath);
  console.log(`\nAnalyzing: ${filename}`);
  console.log('='.repeat(80));

  const result = {
    filename,
    filesize_mb: (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2),
    sheets: []
  };

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filepath);

    console.log(`\nSheets found: ${workbook.SheetNames.length}`);
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`Sheet: ${sheetName}`);
      console.log(`${'-'.repeat(80)}`);

      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON to get data
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Get column names (headers)
      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      // Identify address-related columns
      const addressKeywords = ['地址', '地區', '區', '路', '號', '樓', 'address', 'location', 'district', '坐标', '经度', '纬度', 'lat', 'lng', 'longitude', 'latitude'];
      const addressColumns = headers.filter(col =>
        addressKeywords.some(keyword => col.includes(keyword))
      );

      console.log(`Rows: ${data.length}`);
      console.log(`Columns: ${headers.length}\n`);

      console.log(`Column names:`);
      headers.forEach((col, idx) => {
        const isAddress = addressColumns.includes(col);
        const marker = isAddress ? ' [ADDRESS RELATED]' : '';
        console.log(`  ${idx + 1}. ${col}${marker}`);
      });

      if (addressColumns.length > 0) {
        console.log(`\nAddress-related columns found:`);
        addressColumns.forEach(col => console.log(`  - ${col}`));
      } else {
        console.log(`\n⚠️  No obvious address columns found`);
      }

      // Sample data (first 2 rows)
      const sampleData = data.slice(0, 2);

      const sheetInfo = {
        sheet_name: sheetName,
        row_count: data.length,
        column_count: headers.length,
        columns: headers,
        address_columns: addressColumns,
        sample_data: sampleData
      };

      result.sheets.push(sheetInfo);

      // Display sample
      if (sampleData.length > 0) {
        console.log(`\nSample data (first ${sampleData.length} rows):`);
        console.log(JSON.stringify(sampleData, null, 2).substring(0, 500) + '...');
      }
    }

  } catch (error) {
    console.error(`Error analyzing file: ${error.message}`);
    result.error = error.message;
  }

  return result;
}

function main() {
  console.log('TPHK Insurance Data Analysis');
  console.log('='.repeat(80));

  const files = [
    '2412 巨災統計-承保信息 (香港地區).xlsx',
    '2412 巨災統計-理赔信息 (香港地區).xlsx'
  ];

  const results = {};

  for (const filename of files) {
    const filepath = path.join(BASE_PATH, filename);

    if (!fs.existsSync(filepath)) {
      console.log(`\n❌ File not found: ${filepath}`);
      continue;
    }

    results[filename] = analyzeExcelFile(filepath);
  }

  // Save results to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(80));

  // Print summary
  console.log(`\nSUMMARY`);
  console.log('='.repeat(80));

  for (const [filename, data] of Object.entries(results)) {
    console.log(`\nFile: ${filename}`);
    console.log(`  Size: ${data.filesize_mb} MB`);

    if (data.sheets) {
      for (const sheet of data.sheets) {
        console.log(`\n  Sheet: ${sheet.sheet_name}`);
        console.log(`    Rows: ${sheet.row_count}`);
        console.log(`    Columns: ${sheet.column_count}`);

        if (sheet.address_columns && sheet.address_columns.length > 0) {
          console.log(`    ✅ Address columns: ${sheet.address_columns.join(', ')}`);
        } else {
          console.log(`    ⚠️  No address columns detected`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analysis complete!`);
  console.log('='.repeat(80));
}

// Check if xlsx module is available
try {
  require.resolve('xlsx');
  main();
} catch (e) {
  console.error('\n❌ Error: xlsx module not found');
  console.error('Please install it by running:');
  console.error('  npm install xlsx');
  console.error('\nOr use the Python scripts instead.');
  process.exit(1);
}
