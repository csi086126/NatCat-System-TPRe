/**
 * Calculate Risk Density (Risk Concentration) for all TPUs
 * Risk Density = Total Exposure / Area (km²)
 * Unit: HKD per km²
 */

const fs = require('fs');

console.log('=== Calculating Risk Density ===\n');

// Load area data
const areas = JSON.parse(fs.readFileSync('./public/data/geographic-areas-simple.json', 'utf8'));

// Load TPU statistics
const tpuStats = JSON.parse(fs.readFileSync('./public/data/statistics/tpu-statistics.json', 'utf8'));

console.log('Loaded data:');
console.log(`  TPU areas: ${Object.keys(areas.TPU).length}`);
console.log(`  TPU statistics: ${Object.keys(tpuStats).length}`);
console.log('');

// Calculate risk density for each TPU
const riskDensity = {};
const results = [];

Object.entries(tpuStats).forEach(([key, stats]) => {
  const tpuId = stats.tpu || stats.id;
  const areaKm2 = areas.TPU[tpuId];

  if (!areaKm2 || areaKm2 === 0) {
    console.warn(`⚠️  TPU ${tpuId}: No area data or zero area`);
    return;
  }

  const totalExposure = stats.totalExposure || 0;
  const density = totalExposure / areaKm2;

  riskDensity[key] = {
    tpu: tpuId,
    name: stats.name,
    area_km2: areaKm2,
    totalExposure: totalExposure,
    policyCount: stats.count,
    riskDensity: density,
    riskDensityPerKm2: density,
    // Additional metrics
    avgExposure: stats.avgExposure,
    maxExposure: stats.maxExposure,
    // Density per policy
    policiesPerKm2: stats.count / areaKm2
  };

  results.push({
    tpu: tpuId,
    density: density,
    exposure: totalExposure,
    area: areaKm2,
    policies: stats.count
  });
});

// Sort by risk density
results.sort((a, b) => b.density - a.density);

// Statistics
const densities = results.map(r => r.density);
const avgDensity = densities.reduce((sum, d) => sum + d, 0) / densities.length;
const maxDensity = Math.max(...densities);
const minDensity = Math.min(...densities);

console.log('=== Risk Density Statistics ===\n');
console.log(`Total TPUs analyzed: ${results.length}`);
console.log(`Average risk density: HKD ${avgDensity.toLocaleString()} per km²`);
console.log(`Maximum risk density: HKD ${maxDensity.toLocaleString()} per km²`);
console.log(`Minimum risk density: HKD ${minDensity.toLocaleString()} per km²`);
console.log('');

// Top 20 highest risk density TPUs
console.log('=== Top 20 Highest Risk Density TPUs ===\n');
results.slice(0, 20).forEach((r, i) => {
  console.log(`${i + 1}. TPU ${r.tpu}:`);
  console.log(`   Risk Density: HKD ${r.density.toLocaleString(undefined, { maximumFractionDigits: 0 })} per km²`);
  console.log(`   Total Exposure: HKD ${r.exposure.toLocaleString()}`);
  console.log(`   Area: ${r.area.toFixed(3)} km²`);
  console.log(`   Policies: ${r.policies}`);
  console.log('');
});

// Bottom 10 (lowest risk density)
console.log('=== Bottom 10 Lowest Risk Density TPUs ===\n');
results.slice(-10).reverse().forEach((r, i) => {
  console.log(`${i + 1}. TPU ${r.tpu}:`);
  console.log(`   Risk Density: HKD ${r.density.toLocaleString(undefined, { maximumFractionDigits: 0 })} per km²`);
  console.log(`   Total Exposure: HKD ${r.exposure.toLocaleString()}`);
  console.log(`   Area: ${r.area.toFixed(3)} km²`);
  console.log(`   Policies: ${r.policies}`);
  console.log('');
});

// Save full risk density data
const outputPath = './public/data/statistics/tpu-risk-density.json';
fs.writeFileSync(outputPath, JSON.stringify(riskDensity, null, 2));
console.log(`✓ Risk density data saved to: ${outputPath}`);

// Create a simplified version for quick lookups
const simplifiedDensity = {};
Object.entries(riskDensity).forEach(([key, data]) => {
  simplifiedDensity[key] = {
    tpu: data.tpu,
    density: data.riskDensity,
    exposure: data.totalExposure,
    area: data.area_km2
  };
});

const simplifiedPath = './public/data/statistics/tpu-risk-density-simple.json';
fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedDensity, null, 2));
console.log(`✓ Simplified risk density saved to: ${simplifiedPath}`);

console.log('\n=== Analysis Insights ===');

// Find TPUs with high density but small area
const highDensitySmallArea = results.filter(r => r.density > avgDensity && r.area < 0.01);
console.log(`\nHigh-risk small areas (density > avg, area < 0.01 km²): ${highDensitySmallArea.length}`);
if (highDensitySmallArea.length > 0) {
  console.log('Examples:');
  highDensitySmallArea.slice(0, 5).forEach(r => {
    console.log(`  TPU ${r.tpu}: ${r.density.toLocaleString(undefined, { maximumFractionDigits: 0 })} HKD/km² (${r.area.toFixed(4)} km²)`);
  });
}

// Find TPUs with high exposure but low density (large areas)
const highExposureLowDensity = results.filter(r => r.exposure > 1e9 && r.density < avgDensity);
console.log(`\nHigh exposure but low density (exposure > 1B, density < avg): ${highExposureLowDensity.length}`);
if (highExposureLowDensity.length > 0) {
  console.log('Examples:');
  highExposureLowDensity.slice(0, 5).forEach(r => {
    console.log(`  TPU ${r.tpu}: ${r.exposure.toLocaleString()} HKD, ${r.density.toLocaleString(undefined, { maximumFractionDigits: 0 })} HKD/km² (${r.area.toFixed(2)} km²)`);
  });
}

console.log('\n=== Next Steps ===');
console.log('1. Integrate risk density into RiskChoroplethLayer component');
console.log('2. Add "Risk Density" option to Area Risk visualization');
console.log('3. Update color scale to reflect density values');
console.log('4. Add density information to popup tooltips');
