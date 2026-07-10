/**
 * Calculate Risk Density for All Geographic Levels
 *
 * This script calculates risk density (exposure per km²) for:
 * - Districts (18)
 * - SPU (52)
 * - TPU (292)
 * - Subunit (4,916)
 */

const fs = require('fs');

console.log('=== Calculating Risk Density for All Levels ===\n');

// Shoelace formula to calculate polygon area
function calculatePolygonArea(coordinates) {
  if (!coordinates || coordinates.length === 0) return 0;

  let totalArea = 0;

  coordinates.forEach(polygon => {
    if (polygon[0] && Array.isArray(polygon[0][0])) {
      // MultiPolygon - sum all polygons
      polygon.forEach(ring => {
        totalArea += Math.abs(calculateRingArea(ring));
      });
    } else {
      // Single Polygon
      totalArea += Math.abs(calculateRingArea(polygon));
    }
  });

  return totalArea;
}

function calculateRingArea(ring) {
  let area = 0;
  const n = ring.length;

  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  return area / 2;
}

// Convert square degrees to square kilometers (approximate)
function squareDegreesToKm2(sqDeg, latitude) {
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos(latitude * Math.PI / 180);
  return sqDeg * kmPerDegreeLat * kmPerDegreeLng;
}

// Calculate density for a given level
async function calculateDensityForLevel(geoJsonPath, statsPath, idField, avgLatitude) {
  console.log(`\nProcessing ${geoJsonPath}...`);

  // Load GeoJSON
  const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
  console.log(`  Loaded ${geoJson.features.length} features`);

  // Load statistics
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  console.log(`  Loaded ${Object.keys(stats).length} statistics entries`);

  let processedCount = 0;
  let skippedCount = 0;

  // Calculate area for each feature
  geoJson.features.forEach(feature => {
    const id = feature.properties[idField];
    if (!id) {
      skippedCount++;
      return;
    }

    // Find matching statistics entry
    let statEntry = null;
    let statKey = null;

    // Try different key formats
    const possibleKeys = [
      String(id),
      `${idField.toLowerCase()}_${id}`,
      id,
    ];

    for (const key of possibleKeys) {
      if (stats[key]) {
        statEntry = stats[key];
        statKey = key;
        break;
      }
    }

    if (!statEntry) {
      // Try searching by id field in the stat object
      for (const [key, stat] of Object.entries(stats)) {
        if (stat.id === id || stat.id === parseInt(id)) {
          statEntry = stat;
          statKey = key;
          break;
        }
      }
    }

    if (!statEntry) {
      skippedCount++;
      return;
    }

    // Calculate area
    const coordinates = feature.geometry.coordinates;
    const areaSqDeg = calculatePolygonArea(coordinates);
    const areaKm2 = squareDegreesToKm2(areaSqDeg, avgLatitude);

    // Add density fields to statistics
    statEntry.area_km2 = areaKm2;
    statEntry.riskDensity = statEntry.totalExposure / areaKm2;
    statEntry.riskDensityPerKm2 = statEntry.riskDensity;
    statEntry.policiesPerKm2 = statEntry.count / areaKm2;

    processedCount++;
  });

  // Save updated statistics
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  console.log(`  ✅ Processed ${processedCount} areas`);
  if (skippedCount > 0) {
    console.log(`  ⚠️  Skipped ${skippedCount} areas (no matching data)`);
  }

  return { processedCount, skippedCount };
}

// Main execution
async function main() {
  const levels = [
    {
      name: 'Districts (18)',
      geoJson: './public/data/Hong_Kong_18_Districts.geojson',
      stats: './public/data/statistics/districts-18-statistics.json',
      idField: 'ID',
      avgLat: 22.35,
    },
    {
      name: 'SPU (52)',
      geoJson: './public/data/HongKong_SPU_52_polygon.geojson',
      stats: './public/data/statistics/spu-statistics.json',
      idField: 'SPU',
      avgLat: 22.35,
    },
    {
      name: 'TPU (292)',
      geoJson: './public/data/Hong_Kong_292_TPU.geojson',
      stats: './public/data/statistics/tpu-statistics.json',
      idField: 'TPU',
      avgLat: 22.35,
    },
    {
      name: 'Subunit (4,916)',
      geoJson: './public/data/HongKong_Subunit_4916_polygon.geojson',
      stats: './public/data/statistics/subunit-statistics.json',
      idField: 'Subunit',
      avgLat: 22.35,
    },
  ];

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const level of levels) {
    if (!fs.existsSync(level.geoJson)) {
      console.log(`\n⚠️  GeoJSON not found: ${level.geoJson}`);
      continue;
    }
    if (!fs.existsSync(level.stats)) {
      console.log(`\n⚠️  Statistics not found: ${level.stats}`);
      continue;
    }

    const result = await calculateDensityForLevel(
      level.geoJson,
      level.stats,
      level.idField,
      level.avgLat
    );

    totalProcessed += result.processedCount;
    totalSkipped += result.skippedCount;
  }

  console.log('\n=== Summary ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log('\n✅ Done! Risk density calculated for all levels.');
}

main().catch(console.error);
