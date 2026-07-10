/**
 * Split TPMO Portfolio data by year
 * Creates separate JSON files for each year in /public/data/macau/by-year/
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'public', 'data', 'macau', 'tpmo-portfolio-enhanced-FULL-v2.json');
const OUTPUT_DIR = path.join(__dirname, 'public', 'data', 'macau', 'by-year');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Reading portfolio data...');
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
console.log(`Loaded ${data.length} records`);

// Group by year
const byYear = {};
data.forEach(record => {
  const year = record.year || record.policy_year;
  if (year) {
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(record);
  }
});

// Write each year's data
const yearStats = [];
Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0])).forEach(([year, records]) => {
  const outputFile = path.join(OUTPUT_DIR, `tpmo-portfolio-${year}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
  console.log(`Year ${year}: ${records.length} records -> ${outputFile}`);
  yearStats.push({ year: parseInt(year), count: records.length });
});

// Create index file
const indexFile = path.join(OUTPUT_DIR, 'years-index.json');
fs.writeFileSync(indexFile, JSON.stringify({
  years: yearStats.sort((a, b) => b.year - a.year),
  totalRecords: data.length,
  generatedAt: new Date().toISOString()
}, null, 2));
console.log(`\nIndex file created: ${indexFile}`);
console.log('Done!');
