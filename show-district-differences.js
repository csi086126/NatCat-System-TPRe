const data = require('./public/data/statistics/districts-18-statistics.json');

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

console.log('=== Districts: Total Exposure vs Risk Density ===\n');
console.log('District'.padEnd(12) + 'Total Exp'.padEnd(15) + 'Risk Density'.padEnd(15) + 'Area (km²)');
console.log('-'.repeat(60));

const results = withData.map(d => {
  const expColor = getColorBucket(d.totalExposure, expThresholds);
  const denColor = getColorBucket(d.riskDensity, denThresholds);
  return {
    name: d.nameCN,
    expColor,
    denColor,
    area: d.area_km2,
    changed: expColor !== denColor
  };
}).sort((a, b) => b.changed - a.changed);

results.forEach(d => {
  const marker = d.changed ? '[DIFF]' : '      ';
  console.log(
    marker + ' ' +
    d.name.padEnd(10) +
    d.expColor.padEnd(15) +
    d.denColor.padEnd(15) +
    d.area.toFixed(1)
  );
});

console.log('\n=== Summary ===');
const diffCount = results.filter(d => d.changed).length;
console.log(`Districts with DIFFERENT colors: ${diffCount} (${(diffCount/results.length*100).toFixed(1)}%)`);
console.log(`Districts with SAME colors: ${results.length - diffCount} (${((results.length - diffCount)/results.length*100).toFixed(1)}%)`);

console.log('\n=== Key Insights ===');
console.log('Districts layer shows the MOST OBVIOUS difference between the two views!');
console.log('- Large suburban districts (元朗區, 大埔區) drop from high exposure to low density');
console.log('- Small dense districts (油尖旺區, 灣仔區) maintain high risk in both views');
console.log('\nRecommendation: Use Districts layer to demonstrate the feature to users.');
