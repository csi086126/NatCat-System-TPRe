const fs = require('fs');
const path = require('path');

const statsDir = 'd:/Nat Cat Platform/UI_system/public/data/statistics';

console.log('=== Analyzing All Subunit Statistics ===\n');

const subunitStats = JSON.parse(fs.readFileSync(path.join(statsDir, 'subunit-statistics.json'), 'utf8'));
console.log('Total Subunit entries:', Object.keys(subunitStats).length);

// Group subunits by their parent TPU
const subunitsByTPU = {};

Object.entries(subunitStats).forEach(([key, stat]) => {
  if (key === 'Unknown') return;

  // Extract subunit ID from key like "subunit_1111"
  const subunitId = key.replace('subunit_', '');

  // First 3 digits are the TPU (e.g., 1111 -> TPU 111)
  const tpuId = subunitId.substring(0, 3);

  if (!subunitsByTPU[tpuId]) {
    subunitsByTPU[tpuId] = [];
  }

  subunitsByTPU[tpuId].push({
    key,
    subunitId,
    count: stat.count,
    exposure: stat.totalExposure,
    parentTPU: stat.parentTPU
  });
});

console.log('\nSubunits grouped by TPU (first 20 TPUs):');
const tpuIds = Object.keys(subunitsByTPU).sort();
console.log('Total TPUs with subunit data:', tpuIds.length);
console.log('TPU IDs:', tpuIds.slice(0, 30).join(', '));

// Check if TPUs 414, 620, 733, 743, 934 have any subunits
const missingTPUs = ['414', '620', '733', '743', '934'];
console.log('\n=== Checking Missing TPUs ===');
missingTPUs.forEach(tpuId => {
  const subunits = subunitsByTPU[tpuId];
  if (subunits) {
    console.log(`\nTPU ${tpuId}: ${subunits.length} subunits`);
    subunits.forEach(s => {
      console.log(`  ${s.key}: ${s.count} policies, parentTPU: ${s.parentTPU}`);
    });
  } else {
    console.log(`\nTPU ${tpuId}: NO SUBUNITS FOUND`);
  }
});

// Show all TPU IDs that DO have subunit data
console.log('\n=== All TPUs with Subunit Data ===');
tpuIds.forEach(tpuId => {
  const subunits = subunitsByTPU[tpuId];
  const totalPolicies = subunits.reduce((sum, s) => sum + s.count, 0);
  const totalExposure = subunits.reduce((sum, s) => sum + s.exposure, 0);
  console.log(`TPU ${tpuId}: ${subunits.length} subunits, ${totalPolicies} policies, HKD ${(totalExposure / 1e6).toFixed(1)}M`);
});
