/**
 * Create District to TPU Mapping
 *
 * This script creates a mapping from district names to their correct TPUs
 * based on successfully geocoded policies.
 *
 * This can be used as a fallback when geocoding fails.
 */

const fs = require('fs');

const portfolio = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

console.log('=== Creating District to TPU Mapping ===\n');

// Filter out failed geocoding
const successfulGeocode = portfolio.filter(p =>
  p.location &&
  p.location.formatted_address !== 'Hong Kong' &&
  p.TPU &&
  (p['分区'] || p.region)
);

console.log(`Using ${successfulGeocode.length.toLocaleString()} successfully geocoded policies`);

// Build mapping: District -> TPU -> count
const districtTPUMapping = {};

successfulGeocode.forEach(p => {
  const district = p['分区'] || p.region;
  const tpu = p.TPU;

  if (!districtTPUMapping[district]) {
    districtTPUMapping[district] = {};
  }

  if (!districtTPUMapping[district][tpu]) {
    districtTPUMapping[district][tpu] = {
      count: 0,
      totalExposure: 0,
      sampleCoords: []
    };
  }

  districtTPUMapping[district][tpu].count++;
  districtTPUMapping[district][tpu].totalExposure += p.sum_insured || 0;

  if (districtTPUMapping[district][tpu].sampleCoords.length < 5) {
    districtTPUMapping[district][tpu].sampleCoords.push({
      lat: p.location.lat,
      lng: p.location.lng
    });
  }
});

// Convert to sorted arrays
const districtMapping = {};

Object.entries(districtTPUMapping).forEach(([district, tpus]) => {
  const sortedTPUs = Object.entries(tpus)
    .map(([tpu, data]) => ({
      tpu: parseInt(tpu),
      count: data.count,
      totalExposure: data.totalExposure,
      avgExposure: data.totalExposure / data.count,
      sampleCoords: data.sampleCoords
    }))
    .sort((a, b) => b.count - a.count);

  districtMapping[district] = {
    totalPolicies: sortedTPUs.reduce((sum, t) => sum + t.count, 0),
    totalExposure: sortedTPUs.reduce((sum, t) => sum + t.totalExposure, 0),
    tpus: sortedTPUs,
    // Primary TPUs (top 3 by count)
    primaryTPUs: sortedTPUs.slice(0, 3).map(t => t.tpu),
    // Recommended TPU for fallback (highest count)
    recommendedTPU: sortedTPUs[0].tpu
  };
});

// Save mapping
fs.writeFileSync(
  './district-tpu-mapping.json',
  JSON.stringify(districtMapping, null, 2)
);

console.log('\n=== District to TPU Mapping Created ===\n');

// Display summary
Object.entries(districtMapping)
  .sort((a, b) => b[1].totalPolicies - a[1].totalPolicies)
  .forEach(([district, data]) => {
    console.log(`${district}:`);
    console.log(`  Total policies: ${data.totalPolicies.toLocaleString()}`);
    console.log(`  Primary TPUs: ${data.primaryTPUs.join(', ')}`);
    console.log(`  Recommended fallback TPU: ${data.recommendedTPU}`);
    console.log('');
  });

console.log('Mapping saved to: district-tpu-mapping.json');

// Create specific corrections for failed geocoding
console.log('\n=== Creating Corrections for Failed Geocoding ===\n');

const failedGeocode = portfolio.filter(p =>
  p.location &&
  p.location.formatted_address === 'Hong Kong'
);

const corrections = failedGeocode.map(p => {
  const district = p['分区'] || p.region;
  const mapping = districtMapping[district];

  if (!mapping) {
    return {
      policy_id: p.policy_id,
      address: p.address,
      district: district,
      current_tpu: p.TPU,
      recommended_tpu: null,
      status: 'NO_MAPPING_FOUND',
      action: 'Manual review required'
    };
  }

  return {
    policy_id: p.policy_id,
    address: p.address.substring(0, 100),
    district: district,
    current_tpu: p.TPU,
    recommended_tpu: mapping.recommendedTPU,
    current_coords: {
      lat: p.location.lat,
      lng: p.location.lng
    },
    recommended_coords: mapping.tpus[0].sampleCoords[0], // Use sample from most common TPU
    status: 'NEEDS_CORRECTION',
    action: 'Use district-based TPU assignment',
    sum_insured: p.sum_insured
  };
});

// Save corrections
fs.writeFileSync(
  './geocoding-corrections-full.json',
  JSON.stringify(corrections, null, 2)
);

console.log(`Created ${corrections.length.toLocaleString()} correction records`);
console.log('Saved to: geocoding-corrections-full.json');

// Statistics
const needsCorrection = corrections.filter(c => c.status === 'NEEDS_CORRECTION');
const noMapping = corrections.filter(c => c.status === 'NO_MAPPING_FOUND');

console.log('\nStatistics:');
console.log(`  Can be auto-corrected: ${needsCorrection.length.toLocaleString()}`);
console.log(`  Need manual review: ${noMapping.length.toLocaleString()}`);

// High-value corrections
const highValue = needsCorrection
  .filter(c => c.sum_insured > 1000000000)
  .sort((a, b) => b.sum_insured - a.sum_insured);

console.log(`\nHigh-value corrections (>1B): ${highValue.length}`);
if (highValue.length > 0) {
  console.log('\nTop 5:');
  highValue.slice(0, 5).forEach((c, i) => {
    console.log(`${i+1}. ${c.policy_id}`);
    console.log(`   District: ${c.district}`);
    console.log(`   Current TPU: ${c.current_tpu} -> Recommended: ${c.recommended_tpu}`);
    console.log(`   Sum Insured: HKD ${c.sum_insured.toLocaleString()}`);
  });
}

console.log('\n=== Next Steps ===');
console.log('1. Review district-tpu-mapping.json to verify mappings');
console.log('2. Review geocoding-corrections-full.json for specific corrections');
console.log('3. Apply corrections to database or create corrected portfolio file');
console.log('4. For high-value policies, consider manual geocoding');
console.log('5. Implement validation: flag policies where formatted_address === "Hong Kong"');
