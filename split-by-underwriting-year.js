const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('=== Splitting Portfolio Data by Underwriting Year ===\n');

// Configuration
const INPUT_FILE = path.join(__dirname, 'public/data/tphk-geocoded-portfolio.json');
const OUTPUT_DIR = path.join(__dirname, 'public/data/by-year');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  console.log(`Creating output directory: ${OUTPUT_DIR}\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Step 1: Reading large file (377MB)...');
console.log('This may take a few minutes...\n');

// Read the large file
const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
console.log('✓ File loaded successfully');

console.log('\nStep 2: Parsing JSON (handling NaN values)...');
const data = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));
console.log(`✓ Parsed ${data.length.toLocaleString()} records`);

// Group by underwriting year
console.log('\nStep 3: Grouping records by underwriting year...');
const yearData = {};
let processed = 0;
let missingYear = 0;

data.forEach((record, index) => {
  // Progress indicator
  processed++;
  if (processed % 5000 === 0) {
    process.stdout.write(`\r  Processing: ${processed.toLocaleString()} / ${data.length.toLocaleString()} records...`);
  }

  // Get underwriting year from 保單起期 or policy_start
  const policyStart = record['保單起期'] || record['policy_start'];

  if (policyStart && typeof policyStart === 'string' && policyStart.length >= 4) {
    const year = policyStart.substring(0, 4);

    if (/^\d{4}$/.test(year)) {
      if (!yearData[year]) {
        yearData[year] = [];
      }
      yearData[year].push(record);
    } else {
      missingYear++;
    }
  } else {
    missingYear++;
  }
});

console.log(`\r  Processing: ${processed.toLocaleString()} / ${data.length.toLocaleString()} records... ✓`);

// Display year distribution
console.log('\n\nStep 4: Year Distribution Summary:');
console.log('='.repeat(50));
const years = Object.keys(yearData).sort();
let totalWithYear = 0;

years.forEach(year => {
  const count = yearData[year].length;
  totalWithYear += count;
  const sizeEstimate = (JSON.stringify(yearData[year]).length / 1024 / 1024).toFixed(2);
  console.log(`  ${year}: ${count.toLocaleString().padStart(8)} records (~${sizeEstimate} MB)`);
});

console.log('='.repeat(50));
console.log(`  Total with valid year: ${totalWithYear.toLocaleString()} records`);
console.log(`  Missing/Invalid year: ${missingYear.toLocaleString()} records`);
console.log(`  Unique years found: ${years.length}`);

// Write year-specific files
console.log('\n\nStep 5: Writing year-specific JSON files...');
console.log('='.repeat(50));

years.forEach(year => {
  const outputPath = path.join(OUTPUT_DIR, `tphk-portfolio-${year}.json`);
  const jsonContent = JSON.stringify(yearData[year], null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');

  const sizeMB = (jsonContent.length / 1024 / 1024).toFixed(2);
  console.log(`  ✓ ${year}: ${yearData[year].length.toLocaleString()} records (${sizeMB} MB)`);
});

// Create index file with metadata
console.log('\n\nStep 6: Creating index file...');
const indexData = {
  generatedAt: new Date().toISOString(),
  sourceFile: 'tphk-geocoded-portfolio.json',
  totalRecords: data.length,
  recordsWithYear: totalWithYear,
  recordsMissingYear: missingYear,
  years: years.map(year => ({
    year: parseInt(year),
    recordCount: yearData[year].length,
    fileName: `tphk-portfolio-${year}.json`,
    url: `/data/by-year/tphk-portfolio-${year}.json`
  }))
};

const indexPath = path.join(OUTPUT_DIR, 'years-index.json');
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`  ✓ Index file: years-index.json`);

console.log('\n' + '='.repeat(50));
console.log('✅ SUCCESS! All files created in: public/data/by-year/');
console.log('='.repeat(50));
console.log('\nFiles created:');
years.forEach(year => {
  console.log(`  - tphk-portfolio-${year}.json`);
});
console.log(`  - years-index.json (metadata)\n`);
