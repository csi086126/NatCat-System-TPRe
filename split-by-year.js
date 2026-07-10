const fs = require('fs');
const path = require('path');

console.log('Step 1: Loading portfolio data...');

// Read the subset data file
const dataPath = path.join(__dirname, 'public/data/tphk_portfolio_subset_5000.json');
const rawData = fs.readFileSync(dataPath, 'utf8');

// Parse JSON with NaN handling
const data = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));

console.log(`Total records loaded: ${data.length}`);

// Check first record structure
console.log('\nStep 2: Analyzing data structure...');
const sample = data[0];
const hasUnderwritingField = '保單起期' in sample;
console.log(`Has '保單起期' field: ${hasUnderwritingField}`);
if (hasUnderwritingField) {
  console.log(`Sample value: ${sample['保單起期']}`);
}

// Extract underwriting years
console.log('\nStep 3: Extracting underwriting years...');
const yearData = {};
let missingCount = 0;

data.forEach((record, index) => {
  const policyStart = record['保單起期'] || record['policy_start'] || record['inception_date'];

  if (policyStart && typeof policyStart === 'string' && policyStart.length >= 4) {
    // Extract year (e.g., "2020-01-01" -> "2020")
    const year = policyStart.substring(0, 4);

    if (/^\d{4}$/.test(year)) {
      if (!yearData[year]) {
        yearData[year] = [];
      }
      yearData[year].push(record);
    } else {
      missingCount++;
    }
  } else {
    missingCount++;
  }
});

// Display year distribution
console.log('\nUnderwriting Year Distribution:');
console.log('-'.repeat(40));
const years = Object.keys(yearData).sort();
years.forEach(year => {
  console.log(`  ${year}: ${yearData[year].length.toLocaleString()} records`);
});
console.log(`  Missing/Invalid: ${missingCount} records`);
console.log(`\nTotal unique years: ${years.length}`);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'public/data/by-year');
if (!fs.existsSync(outputDir)) {
  console.log(`\nStep 4: Creating output directory: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write separate JSON files for each year
console.log('\nStep 5: Writing year-specific JSON files...');
years.forEach(year => {
  const outputPath = path.join(outputDir, `tphk-portfolio-${year}.json`);
  const jsonContent = JSON.stringify(yearData[year], null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');

  const sizeKB = (jsonContent.length / 1024).toFixed(2);
  console.log(`  ✓ ${year}: ${yearData[year].length} records (${sizeKB} KB) -> ${path.basename(outputPath)}`);
});

// Create an index file with year metadata
console.log('\nStep 6: Creating index file...');
const indexData = {
  generatedAt: new Date().toISOString(),
  totalRecords: data.length,
  years: years.map(year => ({
    year: parseInt(year),
    recordCount: yearData[year].length,
    fileName: `tphk-portfolio-${year}.json`
  }))
};

const indexPath = path.join(outputDir, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`  ✓ Index file created: ${path.basename(indexPath)}`);

console.log('\n✅ Done! Year-specific files are in: public/data/by-year/');
