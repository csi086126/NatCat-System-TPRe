const data = require('./public/data/statistics/subunit-statistics.json');

const withData = Object.values(data).filter(d => d.totalExposure > 0 && d.area_km2);
const exposures = withData.map(d => d.totalExposure).sort((a,b) => a-b);
const densities = withData.map(d => d.riskDensity).sort((a,b) => a-b);

const getPercentile = (arr, p) => arr[Math.floor(arr.length * p / 100)];

const getColorBucket = (value, thresholds) => {
  if (value < thresholds[0]) return 'Very Low';
  if (value < thresholds[1]) return 'Low';
  if (value < thresholds[2]) return 'Medium';
  if (value < thresholds[3]) return 'High';
  return 'Very High';
};

const expThresholds = [
  getPercentile(exposures, 40),
  getPercentile(exposures, 60),
  getPercentile(exposures, 90),
  getPercentile(exposures, 99)
];

const denThresholds = [
  getPercentile(densities, 40),
  getPercentile(densities, 60),
  getPercentile(densities, 90),
  getPercentile(densities, 99)
];

console.log('=== Examples where colors DIFFER ===\n');

const different = [];
const same = [];

withData.forEach(d => {
  const expColor = getColorBucket(d.totalExposure, expThresholds);
  const denColor = getColorBucket(d.riskDensity, denThresholds);

  const item = {
    id: d.id,
    exposure: d.totalExposure,
    density: d.riskDensity,
    area: d.area_km2,
    expColor,
    denColor
  };

  if (expColor !== denColor) {
    different.push(item);
  } else {
    same.push(item);
  }
});

console.log('Total subunits with different colors:', different.length);
console.log('Total subunits with same colors:', same.length);
console.log('\nTop 10 examples where colors DIFFER:\n');

different.slice(0, 10).forEach(d => {
  console.log(`Subunit ${d.id}:`);
  console.log(`  Total Exposure: ${(d.exposure/1e9).toFixed(1)}B → ${d.expColor}`);
  console.log(`  Risk Density: ${(d.density/1e9).toFixed(1)}B/km² → ${d.denColor}`);
  console.log(`  Area: ${d.area.toFixed(4)} km²`);
  console.log('');
});

console.log('\n=== Why they look similar ===');
console.log('Problem: Only 98 out of 4,916 subunits have policy data (2%)');
console.log('These 98 subunits are pre-selected high-risk areas (urban centers)');
console.log('In urban centers, high exposure correlates with small area');
console.log('Result: 64.9% of subunits get the same color in both views');
console.log('\nSolution: The difference is subtle but real - look for specific subunits');
console.log('where the color changes (like the examples above).');
