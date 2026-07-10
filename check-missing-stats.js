const fs = require('fs');
const path = require('path');

const statsDir = 'd:/Nat Cat Platform/UI_system/public/data/statistics';

// Missing IDs from console logs
const missingTPUs = [414, 620, 733, 743, 934];
const missingSPUs = [34];

console.log('=== Checking TPU Statistics ===');
const tpuStats = JSON.parse(fs.readFileSync(path.join(statsDir, 'tpu-statistics.json'), 'utf8'));
console.log('Total TPU entries:', Object.keys(tpuStats).length);
console.log('Sample keys (first 20):', Object.keys(tpuStats).slice(0, 20));
console.log('\nChecking missing TPUs:');
missingTPUs.forEach(id => {
  const exists = tpuStats[id] !== undefined || tpuStats[String(id)] !== undefined;
  console.log(`  TPU ${id}: ${exists ? 'EXISTS' : 'MISSING'}`);
  if (exists) {
    const stat = tpuStats[id] || tpuStats[String(id)];
    console.log(`    - Policies: ${stat.policy_count}, Exposure: ${stat.total_exposure}`);
  }
});

console.log('\n=== Checking SPU Statistics ===');
const spuStats = JSON.parse(fs.readFileSync(path.join(statsDir, 'spu-statistics.json'), 'utf8'));
console.log('Total SPU entries:', Object.keys(spuStats).length);
console.log('Sample keys (first 20):', Object.keys(spuStats).slice(0, 20));
console.log('\nChecking missing SPUs:');
missingSPUs.forEach(id => {
  const exists = spuStats[id] !== undefined || spuStats[String(id)] !== undefined;
  console.log(`  SPU ${id}: ${exists ? 'EXISTS' : 'MISSING'}`);
  if (exists) {
    const stat = spuStats[id] || spuStats[String(id)];
    console.log(`    - Policies: ${stat.policy_count}, Exposure: ${stat.total_exposure}`);
  }
});

console.log('\n=== Checking Subunit Statistics for those TPUs ===');
const subunitStats = JSON.parse(fs.readFileSync(path.join(statsDir, 'subunit-statistics.json'), 'utf8'));
console.log('Total Subunit entries:', Object.keys(subunitStats).length);

// Check if subunits exist for the missing TPUs
missingTPUs.forEach(tpuId => {
  const subunitsInTPU = Object.entries(subunitStats).filter(([key, stat]) => {
    // Check if this subunit belongs to the TPU
    return key.startsWith(String(tpuId));
  });
  console.log(`\nSubunits starting with ${tpuId}: ${subunitsInTPU.length}`);
  if (subunitsInTPU.length > 0) {
    console.log('  Sample subunits:', subunitsInTPU.slice(0, 5).map(([k, v]) => `${k} (${v.policy_count} policies)`));
  }
});
