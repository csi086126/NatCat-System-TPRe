const fs = require('fs');
const path = require('path');

const statsDir = 'd:/Nat Cat Platform/UI_system/public/data/statistics';

// Missing TPUs from console logs
const missingTPUs = [414, 620, 733, 743, 934];

console.log('=== Checking Subunit Statistics for Missing TPUs ===\n');

const subunitStats = JSON.parse(fs.readFileSync(path.join(statsDir, 'subunit-statistics.json'), 'utf8'));
console.log('Total Subunit entries:', Object.keys(subunitStats).length);

missingTPUs.forEach(tpuId => {
  console.log(`\n--- TPU ${tpuId} ---`);

  // Find all subunits that belong to this TPU
  // Subunit keys are like "subunit_4141", "subunit_7431", etc.
  const subunitsInTPU = Object.entries(subunitStats).filter(([key, stat]) => {
    // Extract the numeric part after "subunit_"
    const subunitId = key.replace('subunit_', '');
    // Check if it starts with the TPU ID (e.g., 4141 starts with 414)
    return subunitId.startsWith(String(tpuId));
  });

  if (subunitsInTPU.length === 0) {
    console.log(`  No subunits found in statistics`);
  } else {
    console.log(`  Found ${subunitsInTPU.length} subunits with data:`);

    let totalPolicies = 0;
    let totalExposure = 0;

    subunitsInTPU.forEach(([key, stat]) => {
      totalPolicies += stat.count || 0;
      totalExposure += stat.totalExposure || 0;
      console.log(`    ${key}: ${stat.count} policies, HKD ${(stat.totalExposure / 1e6).toFixed(2)}M`);
    });

    console.log(`  TOTAL for TPU ${tpuId}: ${totalPolicies} policies, HKD ${(totalExposure / 1e9).toFixed(2)}B`);
    console.log(`  ⚠️  This data should be aggregated to TPU level!`);
  }
});
