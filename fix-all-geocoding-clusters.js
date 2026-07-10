/**
 * Fix All Geocoding Clusters
 *
 * Problem: Many policies from different districts are clustered at the same coordinates
 * This happens when geocoding returns a generic location for vague addresses
 *
 * Solution: For any coordinate cluster with >50 policies from multiple districts,
 * redistribute them to their correct district centers based on "分區" field
 */

const fs = require('fs');

// District center coordinates
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

console.log('Loading portfolio data...');
const portfolio = JSON.parse(fs.readFileSync('./public/data/tphk-geocoded-portfolio.json', 'utf8'));

console.log(`Total policies: ${portfolio.length.toLocaleString()}`);

// Step 1: Find coordinate clusters
console.log('\nStep 1: Identifying coordinate clusters...');
const coordGroups = {};
portfolio.forEach(p => {
  if (p.location) {
    // Use 4 decimal places for grouping (about 11 meters precision)
    const key = `${p.location.lat.toFixed(4)},${p.location.lng.toFixed(4)}`;
    if (!coordGroups[key]) {
      coordGroups[key] = [];
    }
    coordGroups[key].push(p);
  }
});

// Step 2: Find problematic clusters (>50 policies from multiple districts)
console.log('Step 2: Finding problematic clusters...');
const problematicClusters = [];

Object.entries(coordGroups).forEach(([coords, policies]) => {
  if (policies.length > 50) {
    // Check how many different districts are in this cluster
    const districts = new Set(policies.map(p => p.region || p['分區']).filter(Boolean));

    if (districts.size > 1) {
      // This is a problematic cluster - multiple districts at same location
      const [lat, lng] = coords.split(',').map(Number);
      problematicClusters.push({
        coords: { lat, lng },
        count: policies.length,
        districts: Array.from(districts),
        policies: policies
      });
    }
  }
});

console.log(`Found ${problematicClusters.length} problematic clusters`);

// Step 3: Correct the policies
console.log('\nStep 3: Correcting policies...');
let correctedCount = 0;
const corrections = [];

problematicClusters.forEach(cluster => {
  console.log(`\nCluster at (${cluster.coords.lat}, ${cluster.coords.lng}):`);
  console.log(`  ${cluster.count} policies from ${cluster.districts.length} districts: ${cluster.districts.join(', ')}`);

  cluster.policies.forEach(policy => {
    const region = policy.region || policy['分區'];

    if (region && DISTRICT_CENTERS[region]) {
      const districtCenter = DISTRICT_CENTERS[region];

      // Store correction info
      corrections.push({
        policy_id: policy.policy_id,
        region: region,
        old_coords: { lat: policy.location.lat, lng: policy.location.lng },
        new_coords: { lat: districtCenter.lat, lng: districtCenter.lng },
        sum_insured: policy.sum_insured,
        reason: 'Multi-district cluster correction'
      });

      // Update the location
      policy.location.lat = districtCenter.lat;
      policy.location.lng = districtCenter.lng;
      policy.location.formatted_address = `${districtCenter.name_en} District, Hong Kong`;
      policy.location.correction_applied = true;
      policy.location.correction_reason = 'Redistributed from multi-district cluster to correct district center';
      policy.location.original_cluster_coords = { ...cluster.coords };

      correctedCount++;
    }
  });

  console.log(`  Corrected ${cluster.policies.filter(p => p.location.correction_applied).length} policies`);
});

console.log(`\n=== Correction Summary ===`);
console.log(`Total policies corrected: ${correctedCount.toLocaleString()}`);
console.log(`Problematic clusters fixed: ${problematicClusters.length}`);

// Show top corrections by sum insured
console.log(`\n=== Top 10 Corrections by Sum Insured ===`);
corrections
  .sort((a, b) => b.sum_insured - a.sum_insured)
  .slice(0, 10)
  .forEach((c, i) => {
    console.log(`${i + 1}. ${c.policy_id}`);
    console.log(`   Region: ${c.region}`);
    console.log(`   Sum Insured: HKD ${c.sum_insured.toLocaleString()}`);
    console.log(`   Old: (${c.old_coords.lat.toFixed(4)}, ${c.old_coords.lng.toFixed(4)})`);
    console.log(`   New: (${c.new_coords.lat}, ${c.new_coords.lng})`);
    console.log('');
  });

// Save corrected portfolio
const outputPath = './public/data/tphk-geocoded-portfolio.json';
fs.writeFileSync(outputPath, JSON.stringify(portfolio, null, 2));
console.log(`\nCorrected portfolio saved to: ${outputPath}`);

// Save correction log
const logPath = './geocoding-cluster-corrections-log.json';
fs.writeFileSync(logPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  total_policies: portfolio.length,
  corrected_count: correctedCount,
  problematic_clusters: problematicClusters.length,
  corrections: corrections
}, null, 2));
console.log(`Correction log saved to: ${logPath}`);

console.log('\n✅ Done! All multi-district clusters have been corrected.');
console.log('Please restart your dev server and hard refresh the browser.');
