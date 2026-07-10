const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('d:/Nat Cat Platform/UI_system/public/data/statistics/subunit-statistics.json', 'utf8'));

const keys = Object.keys(stats).filter(k => k !== 'Unknown');

console.log('Total subunit keys:', keys.length);
console.log('\nFirst 30 subunit keys:');
keys.slice(0, 30).forEach(k => console.log('  ', k));

console.log('\nLast 10 subunit keys:');
keys.slice(-10).forEach(k => console.log('  ', k));

// Check if any keys contain 414, 620, 733, 743, 934
console.log('\nSearching for missing TPU IDs in subunit keys:');
[414, 620, 733, 743, 934].forEach(tpuId => {
  const found = keys.filter(k => k.includes(String(tpuId)));
  console.log(`  TPU ${tpuId}: ${found.length} matches`, found.length > 0 ? found : '');
});
