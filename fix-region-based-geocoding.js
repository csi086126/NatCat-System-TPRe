/**
 * Fix Geocoding Issues by Using Original Region Field
 *
 * Problem: Policies with vague addresses (e.g., "VARIOUS LOCATIONS WITHIN HONG KONG")
 * are being geocoded to Hong Kong's center (22.3193, 114.1693) which is in Yau Tsim Mong,
 * even though the original "分區" field indicates they should be in a different district.
 *
 * Solution: When geocoding returns generic "Hong Kong" coordinates, use the "分區" field
 * to assign coordinates to the center of the correct district.
 */

const fs = require('fs');

// District center coordinates (approximate centers of each Hong Kong district)
const DISTRICT_CENTERS = {
  '中西區': { lat: 22.2855, lng: 114.1550, name_en: 'Central and Western' },
  '灣仔區': { lat: 22.2783, lng: 114.1747, name_en: 'Wan Chai' },
  '東區': { lat: 22.2840, lng: 114.2250, name_en: 'Eastern' },
  '南區': { lat: 22.2460, lng: 114.1600, name_en: 'Southern' },
  '油尖旺區': { lat: 22.3120, lng: 114.1720, name_en: 'Yau Tsim Mong' },
  '深水埗區': { lat: 22.3350, lng: 114.1620, name_en: 'Sham Shui Po' },
  '九龍城區': { lat: 22.3300, lng: 114.1900, name_en: 'Kowloon City' },
  '黃大仙區': { lat: 22.3420, lng: 114.2030, name_en: 'Wong Tai Sin' },
  '觀塘區': { lat: 22.3120, lng: 114.2260, name_en: 'Kwun Tong' },
  '荃灣區': { lat: 22.3700, lng: 114.1150, name_en: 'Tsuen Wan' },
  '屯門區': { lat: 22.3910, lng: 113.9770, name_en: 'Tuen Mun' },
  '元朗區': { lat: 22.4410, lng: 114.0320, name_en: 'Yuen Long' },
  '北區': { lat: 22.4950, lng: 114.1380, name_en: 'North' },
  '大埔區': { lat: 22.4450, lng: 114.1640, name_en: 'Tai Po' },
  '沙田區': { lat: 22.3820, lng: 114.1950, name_en: 'Sha Tin' },
  '西貢區': { lat: 22.3140, lng: 114.2650, name_en: 'Sai Kung' },
  '葵青區': { lat: 22.3640, lng: 114.1310, name_en: 'Kwai Tsing' },
  '離島區': { lat: 22.2640, lng: 113.9460, name_en: 'Islands' },
};

// Generic Hong Kong center coordinates (what we want to replace)
const GENERIC_HK_CENTER = { lat: 22.3193039, lng: 114.1693611 };
const TOLERANCE = 0.001; // Tolerance for coordinate comparison

function isGenericHKCoordinate(lat, lng) {
  return Math.abs(lat - GENERIC_HK_CENTER.lat) < TOLERANCE &&
         Math.abs(lng - GENERIC_HK_CENTER.lng) < TOLERANCE;
}

// Load the geocoded portfolio
console.log('Loading geocoded portfolio...');
const portfolio = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

console.log(`Total policies: ${portfolio.length.toLocaleString()}`);

// Find policies that need correction
let correctedCount = 0;
let skippedCount = 0;
const corrections = [];

portfolio.forEach(policy => {
  const region = policy['分區'] || policy.region;
  const location = policy.location;

  // Check if this policy has generic HK coordinates
  if (location && isGenericHKCoordinate(location.lat, location.lng)) {
    // Check if we have a valid region field
    if (region && DISTRICT_CENTERS[region]) {
      const districtCenter = DISTRICT_CENTERS[region];

      // Store correction info
      corrections.push({
        policy_id: policy.policy_id,
        address: policy.address,
        region: region,
        old_coords: { lat: location.lat, lng: location.lng },
        new_coords: { lat: districtCenter.lat, lng: districtCenter.lng },
        sum_insured: policy.sum_insured
      });

      // Update the location
      policy.location.lat = districtCenter.lat;
      policy.location.lng = districtCenter.lng;
      policy.location.formatted_address = `${districtCenter.name_en} District, Hong Kong`;
      policy.location.correction_applied = true;
      policy.location.correction_reason = 'Used district center coordinates based on 分區 field';
      policy.location.original_generic_coords = { ...GENERIC_HK_CENTER };

      correctedCount++;
    } else {
      skippedCount++;
    }
  }
});

console.log(`\n=== Correction Summary ===`);
console.log(`Policies corrected: ${correctedCount.toLocaleString()}`);
console.log(`Policies skipped (no valid region): ${skippedCount.toLocaleString()}`);

// Show top corrections by sum insured
console.log(`\n=== Top 10 Corrections by Sum Insured ===`);
corrections
  .sort((a, b) => b.sum_insured - a.sum_insured)
  .slice(0, 10)
  .forEach((c, i) => {
    console.log(`${i + 1}. ${c.policy_id}`);
    console.log(`   Region: ${c.region}`);
    console.log(`   Sum Insured: HKD ${c.sum_insured.toLocaleString()}`);
    console.log(`   Old: (${c.old_coords.lat}, ${c.old_coords.lng})`);
    console.log(`   New: (${c.new_coords.lat}, ${c.new_coords.lng})`);
    console.log(`   Address: ${c.address.substring(0, 80)}...`);
    console.log('');
  });

// Save corrected portfolio
const outputPath = './public/data/tphk-geocoded-portfolio-corrected.json';
fs.writeFileSync(outputPath, JSON.stringify(portfolio, null, 2));
console.log(`\nCorrected portfolio saved to: ${outputPath}`);

// Save correction log
const logPath = './geocoding-corrections-log.json';
fs.writeFileSync(logPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  total_policies: portfolio.length,
  corrected_count: correctedCount,
  skipped_count: skippedCount,
  corrections: corrections
}, null, 2));
console.log(`Correction log saved to: ${logPath}`);

console.log('\n✅ Done! Please review the corrected file and replace the original if satisfied.');
