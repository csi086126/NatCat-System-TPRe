/**
 * Shapefile Loader Utility
 * Loads and processes Cresta Zone shapefiles for regional risk visualization
 */

import shp from 'shpjs';

export interface CrestaZoneFeature {
  type: 'Feature';
  properties: {
    ZONE_CODE?: string;
    ZONE_NAME?: string;
    COUNTRY?: string;
    REGION?: string;
    // Add other properties from your Cresta Zone shapefile
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
}

export interface CrestaZoneGeoJSON {
  type: 'FeatureCollection';
  features: CrestaZoneFeature[];
}

/**
 * Load shapefile from URL or file path
 * @param shpPath Path to .shp file or .zip containing shapefiles
 * @returns GeoJSON FeatureCollection
 */
export async function loadShapefile(shpPath: string): Promise<CrestaZoneGeoJSON> {
  try {
    const geojson = await shp(shpPath);
    return geojson as CrestaZoneGeoJSON;
  } catch (error) {
    console.error('Failed to load shapefile:', error);
    throw new Error(`Shapefile loading failed: ${error}`);
  }
}

/**
 * Load shapefile from uploaded File object (for file input)
 * @param file Uploaded .zip or .shp file
 * @returns GeoJSON FeatureCollection
 */
export async function loadShapefileFromFile(file: File): Promise<CrestaZoneGeoJSON> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const geojson = await shp(arrayBuffer);
    return geojson as CrestaZoneGeoJSON;
  } catch (error) {
    console.error('Failed to load shapefile from file:', error);
    throw new Error(`Shapefile loading failed: ${error}`);
  }
}

/**
 * Match region name to Cresta Zone feature
 * Maps your treaty region names to Cresta Zone properties
 */
export function matchRegionToZone(
  regionName: string,
  features: CrestaZoneFeature[]
): CrestaZoneFeature | null {
  // Normalize region name for matching
  const normalized = regionName.toLowerCase().trim();
  
  // Try exact match first
  let match = features.find(feature => {
    const zoneName = (feature.properties.ZONE_NAME || '').toLowerCase();
    const country = (feature.properties.COUNTRY || '').toLowerCase();
    const region = (feature.properties.REGION || '').toLowerCase();
    
    return zoneName === normalized || 
           country === normalized || 
           region === normalized;
  });
  
  if (match) return match;
  
  // Try partial match
  match = features.find(feature => {
    const zoneName = (feature.properties.ZONE_NAME || '').toLowerCase();
    const country = (feature.properties.COUNTRY || '').toLowerCase();
    
    return zoneName.includes(normalized) || 
           normalized.includes(zoneName) ||
           country.includes(normalized) ||
           normalized.includes(country);
  });
  
  return match || null;
}

/**
 * Get color for utilization percentage (for choropleth map)
 */
export function getUtilizationColorHex(utilization: number): string {
  if (utilization >= 90) return '#DC2626'; // Red
  if (utilization >= 80) return '#F97316'; // Orange
  if (utilization >= 70) return '#FACC15'; // Yellow
  if (utilization >= 50) return '#A3E635'; // Light green
  return '#10B981'; // Green
}

/**
 * Get opacity for utilization (higher utilization = more opaque)
 */
export function getUtilizationOpacity(utilization: number): number {
  // Map 0-100% utilization to 0.3-0.8 opacity
  return 0.3 + (utilization / 100) * 0.5;
}

/**
 * Calculate centroid of a polygon (for label placement)
 */
export function getPolygonCentroid(coordinates: any): [number, number] | null {
  try {
    // Handle MultiPolygon - use first polygon
    const coords = Array.isArray(coordinates[0][0][0]) 
      ? coordinates[0][0] // MultiPolygon
      : coordinates[0];   // Polygon
    
    let sumLat = 0;
    let sumLng = 0;
    const count = coords.length;
    
    coords.forEach(([lng, lat]: [number, number]) => {
      sumLat += lat;
      sumLng += lng;
    });
    
    return [sumLat / count, sumLng / count];
  } catch (error) {
    console.error('Failed to calculate centroid:', error);
    return null;
  }
}
