/**
 * Script to identify and fix geocoding issues
 *
 * Problem: Some policies have failed geocoding and got assigned to wrong TPU
 * - Original district field is correct (e.g., 灣仔區)
 * - But geocoding returned generic "Hong Kong" coordinates
 * - This led to wrong TPU assignment (TPU 227 in Yau Tsim Mong)
 *
 * Solution approaches:
 * 1. Use original district field to assign correct TPU
 * 2. Create manual corrections for high-value policies
 * 3. Improve address preprocessing for re-geocoding
 */

const fs = require('fs');

// Load data
const portfolio = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

console.log('=== Geocoding Issue Analysis ===\n');

// Identify problematic policies
const problematic = portfolio.filter(p =>
  p.location && p.location.formatted_address === 'Hong Kong'
);

console.log(`Total policies: ${portfolio.length.toLocaleString()}`);
console.log(`Problematic geocoding: ${problematic.length.toLocaleString()} (${(problematic.length/portfolio.length*100).toFixed(2)}%)`);

// Group by original district
const byDistrict = {};
problematic.forEach(p => {
  const district = p['分区'] || p.region || 'Unknown';
  if (!byDistrict[district]) {
    byDistrict[district] = [];
  }
  byDistrict[district].push(p);
});

console.log('\n=== By Original District ===');
Object.entries(byDistrict)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([district, policies]) => {
    const totalExposure = policies.reduce((sum, p) => sum + (p.sum_insured || 0), 0);
    console.log(`${district}: ${policies.length} policies, HKD ${totalExposure.toLocaleString()}`);
  });

// High-value policies that need manual correction
const highValue = problematic
  .filter(p => p.sum_insured > 5000000000)
  .sort((a, b) => b.sum_insured - a.sum_insured);

console.log('\n=== High-Value Policies Needing Manual Correction (>5B) ===');
console.log(`Count: ${highValue.length}\n`);

// Create a correction mapping file
const corrections = {};
highValue.slice(0, 20).forEach(p => {
  const key = p.policy_id;
  corrections[key] = {
    policy_id: p.policy_id,
    address: p.address,
    original_district: p['分区'] || p.region,
    current_coords: {
      lat: p.location?.lat,
      lng: p.location?.lng
    },
    current_tpu: p.TPU,
    sum_insured: p.sum_insured,
    needs_manual_review: true,
    suggested_action: 'Use district field to assign correct TPU or manually geocode'
  };
});

// Save corrections file
fs.writeFileSync(
  './geocoding-corrections-needed.json',
  JSON.stringify(corrections, null, 2)
);

console.log('Top 20 high-value policies saved to: geocoding-corrections-needed.json');

// Address pattern analysis
console.log('\n=== Address Patterns ===');
const patterns = {
  'VARIOUS LOCATIONS': 0,
  'ANYWHERE': 0,
  'ANY LOCATION': 0,
  'DETAILS AS PER': 0,
  'SPECIFICATION ATTACHED': 0,
  'LEADING CO': 0,
  'Other': 0
};

problematic.forEach(p => {
  const addr = p.address.toUpperCase();
  let matched = false;
  for (const pattern in patterns) {
    if (pattern !== 'Other' && addr.includes(pattern)) {
      patterns[pattern]++;
      matched = true;
      break;
    }
  }
  if (!matched) patterns['Other']++;
});

Object.entries(patterns).forEach(([pattern, count]) => {
  console.log(`  ${pattern}: ${count}`);
});

// Recommendations
console.log('\n=== Recommendations ===');
console.log('1. For "VARIOUS LOCATIONS" / "ANYWHERE" addresses:');
console.log('   - These are portfolio-level policies covering multiple locations');
console.log('   - Should NOT be assigned to a single TPU');
console.log('   - Consider creating a special "Multi-Location" category');
console.log('');
console.log('2. For specific landmarks (like HKCEC):');
console.log('   - Create a landmark database with known coordinates');
console.log('   - Extract landmark names from complex addresses');
console.log('   - Use landmark coordinates instead of generic geocoding');
console.log('');
console.log('3. For high-value policies:');
console.log('   - Manual review and correction recommended');
console.log('   - Use original district field as fallback');
console.log('   - Build a correction mapping table');
console.log('');
console.log('4. System improvement:');
console.log('   - Add validation: if formatted_address === "Hong Kong", flag for review');
console.log('   - Use district field to validate TPU assignment');
console.log('   - Implement multi-source geocoding with fallback');

console.log('\n=== Specific Case: Policy 060101012024001412 ===');
const hkcec = portfolio.find(p => p.policy_id === '060101012024001412');
if (hkcec) {
  console.log('Policy ID:', hkcec.policy_id);
  console.log('Address:', hkcec.address.substring(0, 100) + '...');
  console.log('Original District:', hkcec['分区'] || hkcec.region);
  console.log('Current Coords:', hkcec.location?.lat, hkcec.location?.lng);
  console.log('Current TPU:', hkcec.TPU);
  console.log('Sum Insured: HKD', hkcec.sum_insured.toLocaleString());
  console.log('');
  console.log('Correct HKCEC coordinates should be: ~22.2828, ~114.1746');
  console.log('This should be in Wan Chai district TPU, not TPU 227');
}
