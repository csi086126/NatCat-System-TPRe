const fs = require('fs');
const path = require('path');

const byYearDir = path.join(__dirname, '..', 'public', 'data', 'by-year');

console.log('📂 Checking if by-year files have been enriched...\n');

// Check 2023 file
const file2023 = path.join(byYearDir, 'tphk-portfolio-2023.json');
const data2023 = JSON.parse(fs.readFileSync(file2023, 'utf8'));

console.log('📊 2023 Data:');
console.log('Total policies:', data2023.length);

const withSubunit = data2023.filter(p => p.Subunit);
console.log('Policies with Subunit:', withSubunit.length);
console.log('Percentage:', ((withSubunit.length / data2023.length) * 100).toFixed(1) + '%');

if (withSubunit.length > 0) {
  console.log('\n✅ Files ARE enriched!');

  // Check for Subunit 56
  const sub56 = data2023.filter(p => p.Subunit === 56);
  console.log('\n📍 Policies in Subunit 56 (2023):', sub56.length);

  if (sub56.length > 0) {
    console.log('Sample policy:');
    console.log('  Address:', sub56[0].address || sub56[0]['保險處所']);
    console.log('  Subunit:', sub56[0].Subunit);
  }
} else {
  console.log('\n❌ Files are NOT enriched!');
  console.log('You need to run: python enrich-portfolio-with-hierarchy.py');
}
