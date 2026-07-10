const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('d:/Nat Cat Platform/UI_system/public/data/statistics/subunit-statistics.json', 'utf8'));

console.log('=== Checking Subunit Statistics Structure ===\n');

// Get a sample entry to see the structure
const sampleKey = Object.keys(stats).find(k => k !== 'Unknown');
console.log('Sample subunit entry:', sampleKey);
console.log(JSON.stringify(stats[sampleKey], null, 2));

// Check if any subunits have parentTPU pointing to the missing TPUs
console.log('\n=== Searching for subunits with missing TPUs as parent ===');
const missingTPUs = [414, 620, 733, 743, 934];

missingTPUs.forEach(tpuId => {
  const subunitsWithThisTPU = Object.entries(stats).filter(([key, stat]) => {
    return stat.parentTPU === `tpu_${tpuId}` || stat.tpu === tpuId;
  });

  console.log(`\nTPU ${tpuId}:`);
  if (subunitsWithThisTPU.length > 0) {
    console.log(`  Found ${subunitsWithThisTPU.length} subunits:`);
    subunitsWithThisTPU.forEach(([key, stat]) => {
      console.log(`    ${key}: ${stat.count} policies, parentTPU: ${stat.parentTPU}, tpu: ${stat.tpu}`);
    });
  } else {
    console.log(`  No subunits found with this TPU as parent`);
  }
});

// Also check all unique parentTPU values
console.log('\n=== All unique parentTPU values (first 30) ===');
const allParentTPUs = new Set();
Object.values(stats).forEach(stat => {
  if (stat.parentTPU) allParentTPUs.add(stat.parentTPU);
});
console.log(Array.from(allParentTPUs).sort().slice(0, 30));
