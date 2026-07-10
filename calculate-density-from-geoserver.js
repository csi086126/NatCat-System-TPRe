/**
 * Calculate Risk Density by Fetching from GeoServer
 *
 * This script fetches GeoJSON boundaries from GeoServer WFS and calculates
 * risk density for all geographic levels.
 */

const fs = require('fs');
const http = require('http');

console.log('=== Calculating Risk Density from GeoServer ===\n');

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

// Fetch GeoJSON from GeoServer
function fetchFromGeoServer(layerName) {
  return new Promise((resolve, reject) => {
    const url = `http://10.253.22.15:8080/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsName=EPSG:4326`;

    console.log(`  Fetching ${layerName}...`);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`  ✅ Fetched ${json.features?.length || 0} features`);
          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Calculate density for a given level
async function calculateDensityForLevel(layerName, statsPath, idField, avgLatitude) {
  console.log(`\nProcessing ${layerName}...`);

  try {
    // Fetch GeoJSON from GeoServer
    const geoJson = await fetchFromGeoServer(layerName);

    // Load statistics
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    console.log(`  Loaded ${Object.keys(stats).length} statistics entries`);

    let processedCount = 0;
    let skippedCount = 0;

    // Calculate area for each feature
    geoJson.features.forEach(feature => {
      const props = feature.properties;
      let id = props[idField];

      if (!id && idField === 'ID') {
        // For districts, try ENAME as fallback
        id = props.ENAME;
      }

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
        id,
        `${idField.toLowerCase()}_${id}`,
        props.ENAME, // For districts
        props.CNAME, // For districts
      ];

      for (const key of possibleKeys) {
        if (key && stats[key]) {
          statEntry = stats[key];
          statKey = key;
          break;
        }
      }

      if (!statEntry) {
        // Try searching by id field in the stat object
        for (const [key, stat] of Object.entries(stats)) {
          if (stat.id === id || stat.id === parseInt(id) || stat.name === id) {
            statEntry = stat;
            statKey = key;
            break;
          }
        }
      }

      if (!statEntry) {
        if (skippedCount < 5) {
          console.log(`  ⚠️  No stats found for ${idField}=${id}`);
        }
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
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return { processedCount: 0, skippedCount: 0 };
  }
}

// Main execution
async function main() {
  const levels = [
    {
      name: 'Districts (18)',
      layer: 'natcat_platform:Hong_Kong_18_Districts',
      stats: './public/data/statistics/districts-18-statistics.json',
      idField: 'ID',
      avgLat: 22.35,
    },
    {
      name: 'SPU (52)',
      layer: 'natcat_platform:HongKong_SPU_52_polygon',
      stats: './public/data/statistics/spu-statistics.json',
      idField: 'SPU',
      avgLat: 22.35,
    },
    {
      name: 'TPU (292)',
      layer: 'natcat_platform:HongKong_TPU_292_polygon',
      stats: './public/data/statistics/tpu-statistics.json',
      idField: 'TPU',
      avgLat: 22.35,
    },
    {
      name: 'Subunit (4,916)',
      layer: 'natcat_platform:HongKong_Subunit_4916_polygon',
      stats: './public/data/statistics/subunit-statistics.json',
      idField: 'Subunit',
      avgLat: 22.35,
    },
  ];

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const level of levels) {
    if (!fs.existsSync(level.stats)) {
      console.log(`\n⚠️  Statistics not found: ${level.stats}`);
      continue;
    }

    const result = await calculateDensityForLevel(
      level.layer,
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
  console.log('Refresh the application to see the difference between Total Exposure and Risk Density views.');
}

main().catch(console.error);
