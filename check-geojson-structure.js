const fs = require('fs');

const geojson = JSON.parse(fs.readFileSync('./public/data/Hong_Kong_292_TPU.geojson', 'utf8'));

console.log('=== GeoJSON Structure Analysis ===\n');
console.log('Total features:', geojson.features.length);

const sample = geojson.features[0];
console.log('\nSample TPU properties:');
console.log(JSON.stringify(sample.properties, null, 2));

console.log('\nGeometry type:', sample.geometry.type);
console.log('Has coordinates:', sample.geometry.coordinates ? 'Yes' : 'No');

// Check if any features have area property
const hasArea = geojson.features.some(f => f.properties.AREA || f.properties.area || f.properties.Shape_Area);
console.log('\nHas area property:', hasArea);

if (hasArea) {
  const areaProps = geojson.features
    .map(f => Object.keys(f.properties).filter(k => k.toLowerCase().includes('area')))
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i);
  console.log('Area property names:', areaProps);
}

// Sample a few features to see property variations
console.log('\nSample of 5 TPU properties:');
geojson.features.slice(0, 5).forEach(f => {
  console.log(`TPU ${f.properties.TPU}:`, Object.keys(f.properties).join(', '));
});
