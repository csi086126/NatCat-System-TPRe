/**
 * Analyze Geocoding Quality
 * Check for remaining issues after correction
 */

const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

console.log('=== Geocoding Quality Analysis ===\n');

// 1. Check policies with 'Hong Kong' as formatted address (too generic)
const genericHK = data.filter(p =>
  p.location &&
  p.location.formatted_address === 'Hong Kong' &&
  !p.location.correction_applied
);

console.log('1. Policies still with generic "Hong Kong" address (not corrected):');
console.log('   Count:', genericHK.length);
if (genericHK.length > 0) {
  console.log('   Sample policies:');
  genericHK.slice(0, 5).forEach(p => {
    console.log(`     ${p.policy_id}: Region=${p.region}, Coords=(${p.location.lat}, ${p.location.lng})`);
  });
}

// 2. Check policies without region field
const noRegion = data.filter(p => !p.region && !p['分區']);
console.log('\n2. Policies without region field:');
console.log('   Count:', noRegion.length);

// 3. Check coordinate distribution - find clusters
const coordGroups = {};
data.forEach(p => {
  if (p.location) {
    const key = `${p.location.lat.toFixed(3)},${p.location.lng.toFixed(3)}`;
    if (!coordGroups[key]) coordGroups[key] = [];
    coordGroups[key].push(p);
  }
});

const largeGroups = Object.entries(coordGroups)
  .filter(([_, policies]) => policies.length > 100)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log('\n3. Top 10 coordinate clusters (>100 policies at same location):');
largeGroups.forEach(([coords, policies], idx) => {
  const [lat, lng] = coords.split(',');
  const sampleRegions = [...new Set(policies.slice(0, 10).map(p => p.region))];
  const totalExposure = policies.reduce((sum, p) => sum + p.sum_insured, 0);
  console.log(`   ${idx + 1}. (${lat}, ${lng}): ${policies.length} policies, HKD ${totalExposure.toLocaleString()}`);
  console.log(`      Regions: ${sampleRegions.join(', ')}`);
  console.log(`      Sample IDs: ${policies.slice(0, 3).map(p => p.policy_id).join(', ')}`);
});

// 4. Check if corrected policies are properly distributed
console.log('\n4. Corrected policies distribution by region:');
const correctedByRegion = {};
data.filter(p => p.location?.correction_applied).forEach(p => {
  const region = p.region || 'Unknown';
  if (!correctedByRegion[region]) correctedByRegion[region] = 0;
  correctedByRegion[region]++;
});

Object.entries(correctedByRegion)
  .sort((a, b) => b[1] - a[1])
  .forEach(([region, count]) => {
    console.log(`   ${region}: ${count} policies`);
  });

// 5. Summary
console.log('\n=== Summary ===');
console.log('Total policies:', data.length.toLocaleString());
console.log('Corrected policies:', data.filter(p => p.location?.correction_applied).length.toLocaleString());
console.log('Policies with specific addresses:', data.filter(p =>
  p.location &&
  p.location.formatted_address !== 'Hong Kong' &&
  !p.location.correction_applied
).length.toLocaleString());
console.log('Policies still with generic "Hong Kong" address:', genericHK.length);
