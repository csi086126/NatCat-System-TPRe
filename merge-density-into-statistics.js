/**
 * Merge Risk Density Data into Statistics Files
 *
 * This script merges the calculated risk density data into the actual statistics files
 * used by the application.
 */

const fs = require('fs');

console.log('=== Merging Risk Density into Statistics Files ===\n');

// Load density data
const tpuDensity = JSON.parse(fs.readFileSync('./public/data/statistics/tpu-risk-density.json', 'utf8'));

console.log(`Loaded density data for ${Object.keys(tpuDensity).length} TPUs\n`);

// Function to merge density data into statistics
function mergeDensityIntoStats(statsFile, densityData, keyField = 'id') {
  console.log(`Processing ${statsFile}...`);

  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  let mergedCount = 0;
  let notFoundCount = 0;

  Object.keys(stats).forEach(key => {
    const stat = stats[key];
    const statId = stat[keyField];

    // Find matching density data
    const densityEntry = Object.values(densityData).find(d => {
      // Try multiple matching strategies
      return d.tpu === statId ||
             d.tpu === parseInt(statId) ||
             d.name === key ||
             String(d.tpu) === String(statId);
    });

    if (densityEntry) {
      // Merge density fields
      stat.area_km2 = densityEntry.area_km2;
      stat.riskDensity = densityEntry.riskDensity;
      stat.riskDensityPerKm2 = densityEntry.riskDensityPerKm2;
      stat.policiesPerKm2 = densityEntry.policiesPerKm2;
      mergedCount++;
    } else {
      notFoundCount++;
      if (notFoundCount <= 5) {
        console.log(`  ⚠️  No density data found for: ${key} (${keyField}=${statId})`);
      }
    }
  });

  // Save updated file
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

  console.log(`  ✅ Merged ${mergedCount} entries`);
  if (notFoundCount > 0) {
    console.log(`  ⚠️  ${notFoundCount} entries without density data`);
  }
  console.log('');

  return { mergedCount, notFoundCount };
}

// Merge into TPU statistics (all years)
const tpuFiles = [
  './public/data/statistics/tpu-statistics.json',
  './public/data/statistics/tpu-statistics-2021.json',
  './public/data/statistics/tpu-statistics-2022.json',
  './public/data/statistics/tpu-statistics-2023.json',
  './public/data/statistics/tpu-statistics-2024.json',
];

let totalMerged = 0;
let totalNotFound = 0;

tpuFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const result = mergeDensityIntoStats(file, tpuDensity, 'id');
    totalMerged += result.mergedCount;
    totalNotFound += result.notFoundCount;
  } else {
    console.log(`  ⚠️  File not found: ${file}\n`);
  }
});

console.log('=== Summary ===');
console.log(`Total merged: ${totalMerged}`);
console.log(`Total not found: ${totalNotFound}`);
console.log('\n✅ Done! Density data has been merged into statistics files.');
console.log('The application will now show different results for Total Exposure vs Risk Density views.');
