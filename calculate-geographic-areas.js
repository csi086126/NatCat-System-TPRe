/**
 * Calculate areas for all geographic regions (TPU, SPU, Districts, etc.)
 * and create a lookup table for risk density calculations
 */

const fs = require('fs');

console.log('=== Calculating Geographic Areas ===\n');

/**
 * Calculate area of a polygon using the Shoelace formula
 * Assumes coordinates are in a projected system (meters)
 * @param {Array} coordinates - Array of [x, y] coordinate pairs
 * @returns {number} Area in square meters
 */
function calculatePolygonArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  return Math.abs(area / 2);
}

/**
 * Calculate area of a MultiPolygon
 * @param {Array} multiPolygonCoords - MultiPolygon coordinates
 * @returns {number} Total area in square meters
 */
function calculateMultiPolygonArea(multiPolygonCoords) {
  let totalArea = 0;

  for (const polygon of multiPolygonCoords) {
    // polygon[0] is the outer ring, polygon[1+] are holes
    const outerRingArea = calculatePolygonArea(polygon[0]);

    // Subtract holes
    let holesArea = 0;
    for (let i = 1; i < polygon.length; i++) {
      holesArea += calculatePolygonArea(polygon[i]);
    }

    totalArea += (outerRingArea - holesArea);
  }

  return totalArea;
}

/**
 * Calculate area for a feature
 */
function calculateFeatureArea(feature) {
  const geometry = feature.geometry;

  if (geometry.type === 'Polygon') {
    const outerRing = geometry.coordinates[0];
    let area = calculatePolygonArea(outerRing);

    // Subtract holes
    for (let i = 1; i < geometry.coordinates.length; i++) {
      area -= calculatePolygonArea(geometry.coordinates[i]);
    }

    return area;
  } else if (geometry.type === 'MultiPolygon') {
    return calculateMultiPolygonArea(geometry.coordinates);
  }

  return 0;
}

// Process all geographic layers
const layers = [
  { file: 'Hong_Kong_292_TPU.geojson', name: 'TPU', idField: 'TPU' },
  { file: 'HongKong_SPU_52_polygon.geojson', name: 'SPU', idField: 'SPU' },
  { file: 'HongKong_PPU_9_polygon.geojson', name: 'PPU', idField: 'PPU' },
  { file: 'Hong_Kong_18_Districts.geojson', name: 'District', idField: 'ENAME' },
  { file: 'HongKong_Subunit_4916_polygon.geojson', name: 'Subunit', idField: 'Subunit' }
];

const areaLookup = {};

layers.forEach(layer => {
  const filePath = `./public/data/${layer.file}`;

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${layer.name}: File not found, skipping`);
    return;
  }

  try {
    const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const areas = {};

    geojson.features.forEach(feature => {
      const id = feature.properties[layer.idField];
      const areaM2 = calculateFeatureArea(feature);
      const areaKm2 = areaM2 / 1_000_000; // Convert to km²

      areas[id] = {
        area_m2: areaM2,
        area_km2: areaKm2,
        properties: feature.properties
      };
    });

    areaLookup[layer.name] = areas;

    // Statistics
    const totalAreaKm2 = Object.values(areas).reduce((sum, a) => sum + a.area_km2, 0);
    const avgAreaKm2 = totalAreaKm2 / Object.keys(areas).length;
    const minArea = Math.min(...Object.values(areas).map(a => a.area_km2));
    const maxArea = Math.max(...Object.values(areas).map(a => a.area_km2));

    console.log(`✓ ${layer.name}:`);
    console.log(`  Features: ${Object.keys(areas).length}`);
    console.log(`  Total area: ${totalAreaKm2.toFixed(2)} km²`);
    console.log(`  Average area: ${avgAreaKm2.toFixed(2)} km²`);
    console.log(`  Range: ${minArea.toFixed(2)} - ${maxArea.toFixed(2)} km²`);
    console.log('');

  } catch (error) {
    console.log(`✗ ${layer.name}: Error - ${error.message}`);
  }
});

// Save lookup table
const outputPath = './public/data/geographic-areas.json';
fs.writeFileSync(outputPath, JSON.stringify(areaLookup, null, 2));

console.log(`\n✓ Area lookup table saved to: ${outputPath}`);

// Create a simplified version for quick lookups
const simplifiedLookup = {};
Object.entries(areaLookup).forEach(([layerName, areas]) => {
  simplifiedLookup[layerName] = {};
  Object.entries(areas).forEach(([id, data]) => {
    simplifiedLookup[layerName][id] = data.area_km2;
  });
});

const simplifiedPath = './public/data/geographic-areas-simple.json';
fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedLookup, null, 2));

console.log(`✓ Simplified lookup saved to: ${simplifiedPath}`);

// Sample output for verification
console.log('\n=== Sample Data ===');
if (areaLookup.TPU) {
  const sampleTPUs = Object.entries(areaLookup.TPU).slice(0, 5);
  console.log('\nSample TPU areas:');
  sampleTPUs.forEach(([id, data]) => {
    console.log(`  TPU ${id}: ${data.area_km2.toFixed(3)} km²`);
  });
}

if (areaLookup.District) {
  console.log('\nDistrict areas:');
  Object.entries(areaLookup.District).forEach(([name, data]) => {
    console.log(`  ${name}: ${data.area_km2.toFixed(2)} km²`);
  });
}

console.log('\n=== Next Steps ===');
console.log('1. Use geographic-areas-simple.json for risk density calculations');
console.log('2. Formula: Risk Density = Total Exposure / Area (km²)');
console.log('3. Unit: HKD per km²');
