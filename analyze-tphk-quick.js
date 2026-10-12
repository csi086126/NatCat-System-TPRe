/**
 * TPHK Insurance Data Quick Analysis (Optimized for large files)
 * 快速分析太平香港保险数据（针对大文件优化）
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_PATH = process.env.TPHK_DATA_DIR || 'D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK';
const OUTPUT_FILE = path.join(__dirname, 'tphk-analysis-result.json');

function analyzeExcelFileQuick(filepath) {
  const filename = path.basename(filepath);
  console.log(`\nAnalyzing: ${filename}`);
  console.log('='.repeat(80));

  const result = {
    filename,
    filesize_mb: (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2),
    sheets: []
  };

  try {
    // Read with options to optimize for large files
    const workbook = XLSX.readFile(filepath, { sheetRows: 10 }); // Only read first 10 rows

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

      // Get range to determine dimensions
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const totalColumns = range.e.c - range.s.c + 1;

      // Estimated total rows (from the range, but actual might differ if sheetRows was used)
      const estimatedRows = range.e.r - range.s.r + 1;

      // Convert first few rows to JSON to get headers
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // First row should be headers
      const headers = data.length > 0 ? data[0] : [];

      // Identify address-related columns
      const addressKeywords = ['地址', '地區', '區', '路', '號', '樓', 'address', 'location', 'district', '坐标', '经度', '纬度', 'lat', 'lng', 'longitude', 'latitude'];
      const addressColumns = headers.filter(col =>
        col && addressKeywords.some(keyword => String(col).includes(keyword))
      );

      console.log(`Estimated total rows: ${estimatedRows}`);
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

      // Get sample data (rows 1-3, excluding header)
      const sampleRows = data.slice(1, 4).map(row => {
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });

      const sheetInfo = {
        sheet_name: sheetName,
        estimated_row_count: estimatedRows - 1, // Exclude header
        column_count: headers.length,
        columns: headers,
        address_columns: addressColumns,
        sample_data: sampleRows
      };

      result.sheets.push(sheetInfo);

      // Display sample
      if (sampleRows.length > 0) {
        console.log(`\nSample data (first ${sampleRows.length} rows):`);
        sampleRows.forEach((row, idx) => {
          console.log(`\nRow ${idx + 1}:`);
          Object.entries(row).slice(0, 5).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
          if (Object.keys(row).length > 5) {
            console.log(`  ... (${Object.keys(row).length - 5} more columns)`);
          }
        });
      }
    }

  } catch (error) {
    console.error(`Error analyzing file: ${error.message}`);
    result.error = error.message;
  }

  return result;
}

function main() {
  console.log('TPHK Insurance Data Quick Analysis');
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

    results[filename] = analyzeExcelFileQuick(filepath);
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
        console.log(`    Estimated Rows: ${sheet.estimated_row_count}`);
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

main();
