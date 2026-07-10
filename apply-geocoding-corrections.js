/**
 * Apply Geocoding Corrections
 *
 * This script applies the corrections identified in geocoding-corrections-full.json
 * to create a corrected portfolio file.
 */

const fs = require('fs');

console.log('=== Applying Geocoding Corrections ===\n');

// Load data
const portfolio = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));
const corrections = JSON.parse(fs.readFileSync('./geocoding-corrections-full.json', 'utf8'));
const districtMapping = JSON.parse(fs.readFileSync('./district-tpu-mapping.json', 'utf8'));

console.log(`Loaded ${portfolio.length.toLocaleString()} policies`);
console.log(`Loaded ${corrections.length.toLocaleString()} corrections\n`);

// Create correction lookup map
const correctionMap = new Map();
corrections.forEach(c => {
  const key = c.policy_id;
  if (!correctionMap.has(key)) {
    correctionMap.set(key, []);
  }
  correctionMap.get(key).push(c);
});

console.log('Applying corrections...\n');

let correctedCount = 0;
let skippedCount = 0;

const correctedPortfolio = portfolio.map(policy => {
  const policyCorrections = correctionMap.get(policy.policy_id);

  if (!policyCorrections || policyCorrections.length === 0) {
    // No correction needed
    return policy;
  }

  // Apply correction
  const correction = policyCorrections[0]; // Use first correction

  if (correction.status !== 'NEEDS_CORRECTION') {
    skippedCount++;
    return policy;
  }

  correctedCount++;

  // Create corrected policy
  const correctedPolicy = {
    ...policy,
    // Update TPU
    TPU: correction.recommended_tpu,
    // Update coordinates
    location: {
      ...policy.location,
      lat: correction.recommended_coords.lat,
      lng: correction.recommended_coords.lng,
      // Mark as corrected
      geocoding_method: 'district_based_fallback',
      original_formatted_address: policy.location.formatted_address,
      corrected: true,
      correction_date: new Date().toISOString()
    },
    // Add metadata
    geocoding_quality: 'CORRECTED_FROM_DISTRICT',
    original_tpu: policy.TPU
  };

  return correctedPolicy;
});

console.log(`Corrected: ${correctedCount.toLocaleString()} policies`);
console.log(`Skipped: ${skippedCount.toLocaleString()} policies`);
console.log(`Unchanged: ${(portfolio.length - correctedCount - skippedCount).toLocaleString()} policies\n`);

// Save corrected portfolio
const outputPath = './public/data/tphk-geocoded-portfolio-corrected.json';
fs.writeFileSync(outputPath, JSON.stringify(correctedPortfolio, null, 2));

console.log(`Corrected portfolio saved to: ${outputPath}`);

// Generate correction report
const report = {
  correction_date: new Date().toISOString(),
  total_policies: portfolio.length,
  corrections_applied: correctedCount,
  corrections_skipped: skippedCount,
  unchanged: portfolio.length - correctedCount - skippedCount,
  by_district: {}
};

// Count corrections by district
corrections.forEach(c => {
  if (c.status === 'NEEDS_CORRECTION') {
    if (!report.by_district[c.district]) {
      report.by_district[c.district] = {
        count: 0,
        total_exposure: 0,
        tpu_changes: {}
      };
    }
    report.by_district[c.district].count++;
    report.by_district[c.district].total_exposure += c.sum_insured || 0;

    const change = `${c.current_tpu} → ${c.recommended_tpu}`;
    report.by_district[c.district].tpu_changes[change] =
      (report.by_district[c.district].tpu_changes[change] || 0) + 1;
  }
});

fs.writeFileSync('./correction-report.json', JSON.stringify(report, null, 2));

console.log('\n=== Correction Report ===\n');
console.log('By District:');
Object.entries(report.by_district)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([district, data]) => {
    console.log(`\n${district}: ${data.count} corrections`);
    console.log(`  Total Exposure: HKD ${data.total_exposure.toLocaleString()}`);
    console.log('  TPU Changes:');
    Object.entries(data.tpu_changes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([change, count]) => {
        console.log(`    ${change}: ${count} policies`);
      });
  });

console.log('\nReport saved to: correction-report.json');

// Verify specific policy (HKCEC)
console.log('\n=== Verification: Hong Kong Convention Centre ===\n');
const hkcecOriginal = portfolio.find(p => p.policy_id === '060101012024001412');
const hkcecCorrected = correctedPortfolio.find(p => p.policy_id === '060101012024001412');

if (hkcecOriginal && hkcecCorrected) {
  console.log('Original:');
  console.log(`  TPU: ${hkcecOriginal.TPU}`);
  console.log(`  Coords: ${hkcecOriginal.location.lat}, ${hkcecOriginal.location.lng}`);
  console.log(`  Formatted Address: ${hkcecOriginal.location.formatted_address}`);

  console.log('\nCorrected:');
  console.log(`  TPU: ${hkcecCorrected.TPU}`);
  console.log(`  Coords: ${hkcecCorrected.location.lat}, ${hkcecCorrected.location.lng}`);
  console.log(`  Method: ${hkcecCorrected.location.geocoding_method}`);
  console.log(`  Quality: ${hkcecCorrected.geocoding_quality}`);
}

console.log('\n=== Next Steps ===');
console.log('1. Review the corrected portfolio file');
console.log('2. Test with the application to verify map display');
console.log('3. If satisfied, replace the original file or update database');
console.log('4. Consider implementing validation in the geocoding pipeline');
