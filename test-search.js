const fs = require('fs');

const policyToFind = '060101152022009885';

console.log('Simulating UI data loading and search...\n');

// Load 2022 data (since the policy is from 2022)
const rawData = fs.readFileSync('public/data/by-year/tphk-portfolio-2022.json', 'utf8');
const allData = JSON.parse(rawData.replace(/:\s*NaN/g, ': null'));

console.log(`Loaded ${allData.length} records from 2022 file`);

// Simulate UI data extraction (matching line 249-260 of PortfolioMap.tsx)
const allLocations = allData
  .filter((item) => item.location && item.location.lat && item.location.lng)
  .map((item) => ({
    lat: item.location.lat,
    lng: item.location.lng,
    sum_insured: item['公司保額'] || item.sum_insured || 0,
    address: item['保險處所'] || item.address || '',
    region: item['分區'] || item.region || '',
    policy_id: item['保單號'] || item.policy_id || '',
    occupancy: item['佔用性質'] || item.occupancy,
  }))
  .filter((loc) => loc.sum_insured > 0);

console.log(`After filtering: ${allLocations.length} locations with coordinates and exposure\n`);

// Simulate search (matching line 291-309 of PortfolioMap.tsx)
const sampleSize = 1000; // Default UI sample size
const mapData = sampleSize > 0 ? allLocations.slice(0, sampleSize) : allLocations;

console.log(`Sample size: ${sampleSize}`);
console.log(`Map data records: ${mapData.length}\n`);

// Search in mapData
const lowerQuery = policyToFind.toLowerCase();
const results = [];

mapData.forEach((location, index) => {
  let matchType = null;

  if (location.address.toLowerCase().includes(lowerQuery)) {
    matchType = 'address';
  } else if (location.policy_id.toLowerCase().includes(lowerQuery)) {
    matchType = 'policy_id';
  } else if (location.region.toLowerCase().includes(lowerQuery)) {
    matchType = 'region';
  }

  if (matchType) {
    results.push({
      ...location,
      index,
      matchType,
    });
  }
});

console.log('='.repeat(60));
console.log(`Search results for "${policyToFind}": ${results.length} found`);
console.log('='.repeat(60));

if (results.length > 0) {
  results.forEach(r => {
    console.log('\nFound:');
    console.log('  Match type:', r.matchType);
    console.log('  Policy ID:', r.policy_id);
    console.log('  Address:', r.address);
    console.log('  Index in mapData:', r.index);
  });
} else {
  console.log('\n❌ NOT FOUND in search results!');
  console.log('\nChecking if policy exists in allLocations (before sample limit)...');

  const foundInAll = allLocations.find(loc =>
    loc.policy_id.toLowerCase().includes(lowerQuery)
  );

  if (foundInAll) {
    const indexInAll = allLocations.findIndex(loc =>
      loc.policy_id.toLowerCase().includes(lowerQuery)
    );
    console.log(`✓ Found in allLocations at index ${indexInAll}`);
    console.log(`  Policy ID: ${foundInAll.policy_id}`);
    console.log(`  Address: ${foundInAll.address}`);
    console.log(`\n🔍 REASON: Index ${indexInAll} is beyond sample size of ${sampleSize}`);
    console.log(`   Solution: Increase sample size to at least ${indexInAll + 1} or select "All"`);
  } else {
    console.log('✗ Not found in allLocations either - possible data extraction issue');
  }
}
