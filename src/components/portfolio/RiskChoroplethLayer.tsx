/**
 * Risk Choropleth Layer Component
 * Displays aggregated risk by geographic areas (statistical areas, districts, etc.)
 * Colors areas based on total exposure to identify high-risk zones
 */

'use client';

import { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

interface AreaStatistics {
  id: number;
  zona?: number;
  name: string;
  nameCN: string;
  sname?: string;
  count: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;
  byOccupancy?: Record<string, { count: number; totalExposure: number }>;
  // Risk density fields (optional)
  area_km2?: number;
  riskDensity?: number;
  riskDensityPerKm2?: number;
}

interface RiskChoroplethLayerProps {
  region: string;
  level: 'statistical_area' | 'district' | 'spu' | 'subunit';
  statistics: Record<string, AreaStatistics>;
  selectedYear?: number | null;
  metricType?: 'exposure' | 'density'; // New prop to switch between exposure and density
}

// Helper to calculate quantiles (percentiles)
const calculateQuantiles = (values: number[], numClasses: number = 5): number[] => {
  const sorted = [...values].filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return Array(numClasses).fill(0);

  const quantiles = [];
  for (let i = 1; i < numClasses; i++) {
    const idx = Math.floor((sorted.length - 1) * (i / numClasses));
    quantiles.push(sorted[idx]);
  }
  return quantiles;
};

// Helper to calculate custom percentiles for Subunit (P30, P50, P80, P90)
const calculateCustomPercentiles = (values: number[], percentiles: number[]): number[] => {
  const sorted = [...values].filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return Array(percentiles.length).fill(0);

  return percentiles.map(p => {
    const idx = Math.floor((sorted.length - 1) * (p / 100));
    return sorted[idx];
  });
};

// Color scale for standard levels (Districts, SPU, TPU) with custom percentiles
const getCheckRiskColorStandard = (exposure: number, thresholds: number[]): string => {
  if (exposure === 0) return '#e5e7eb'; // Grey for zero
  if (exposure < thresholds[0]) return '#10b981'; // Green - Very Low (Bottom 40%)
  if (exposure < thresholds[1]) return '#84cc16'; // Light Green - Low (40-60%)
  if (exposure < thresholds[2]) return '#eab308'; // Yellow - Medium (60-90%)
  if (exposure < thresholds[3]) return '#f97316'; // Orange - High (90-99%)
  return '#991b1b'; // Red-800 - Very High (Top 1%)
};

// Color scale for Subunit with custom percentiles (P30, P50, P80, P90)
const getCheckRiskColorSubunit = (exposure: number, thresholds: number[]): string => {
  if (exposure === 0) return '#e5e7eb'; // Grey for zero
  if (exposure < thresholds[0]) return '#10b981'; // Green-500 - Very Low (Bottom 30%)
  if (exposure < thresholds[1]) return '#84cc16'; // Lime-500 - Low (30-50%)
  if (exposure < thresholds[2]) return '#eab308'; // Yellow-500 - Medium (50-80%)
  if (exposure < thresholds[3]) return '#f97316'; // Orange-500 - High (80-90%)
  return '#dc2626'; // Red-600 - Very High (Top 10%)
};

// Get risk level label for standard levels
const getCheckRiskLevelStandard = (exposure: number, thresholds: number[]): string => {
  if (exposure === 0) return 'No Exposure';
  if (exposure < thresholds[0]) return 'Very Low';
  if (exposure < thresholds[1]) return 'Low';
  if (exposure < thresholds[2]) return 'Medium';
  if (exposure < thresholds[3]) return 'High';
  return 'Very High';
};

// Get risk level label for Subunit with custom percentiles
const getCheckRiskLevelSubunit = (exposure: number, thresholds: number[]): string => {
  if (exposure === 0) return 'No Exposure';
  if (exposure < thresholds[0]) return 'Very Low';
  if (exposure < thresholds[1]) return 'Low';
  if (exposure < thresholds[2]) return 'Medium';
  if (exposure < thresholds[3]) return 'High';
  return 'Very High';
};

export default function RiskChoroplethLayer({
  region,
  level,
  statistics,
  selectedYear,
  metricType = 'exposure', // Default to exposure for backward compatibility
}: RiskChoroplethLayerProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const map = useMap();

  // Calculate quantiles for current dataset
  // Use the selected metric (exposure or density)
  const metricValues = Object.values(statistics).map(s =>
    metricType === 'density' && s.riskDensity ? s.riskDensity : s.totalExposure
  );

  let thresholds: number[];
  let getCheckRiskColor: (value: number, thresholds: number[]) => string;
  let getCheckRiskLevel: (value: number, thresholds: number[]) => string;

  // All levels use the same classification
  // P40, P60, P90, P99 = Bottom 40% | 40-60% | 60-90% | 90-99% | Top 1%
  thresholds = calculateCustomPercentiles(metricValues, [40, 60, 90, 99]);
  getCheckRiskColor = getCheckRiskColorStandard;
  getCheckRiskLevel = getCheckRiskLevelStandard;

  // Debug to see distribution (commented out for production)
  // const nonZeroValues = exposureValues.filter(v => v > 0);
  // console.log(`[${level}] Total areas: ${exposureValues.length}, Non-zero: ${nonZeroValues.length}`);
  // console.log(`[${level}] Risk Thresholds:`, thresholds.map(t => `${(t / 1_000_000).toFixed(2)}M`));

  useEffect(() => {
    const fetchBoundaries = async () => {
      setLoading(true);
      setError(null);
      setGeoJsonData(null); // Clear old data first to force unmount

      try {
        let layerName = '';

        if (region === 'mo') {
          layerName = level === 'statistical_area'
            ? 'macau:macau_statistical_area_polygon'
            : 'macau:macau_district_boundary_polygon';
        } else if (region === 'hk') {
          // Hong Kong layers
          if (level === 'district') {
            layerName = 'natcat_platform:Hong_Kong_18_Districts';
          } else if (level === 'spu') {
            layerName = 'natcat_platform:HongKong_SPU_52_polygon';
          } else if (level === 'statistical_area') {
            layerName = 'natcat_platform:HongKong_TPU_292_polygon';
          } else if (level === 'subunit') {
            layerName = 'natcat_platform:HongKong_Subunit_4916_polygon';
          }
        } else {
          setError('Unsupported region');
          setLoading(false);
          return;
        }

        console.log(`[RiskChoropleth] Fetching layer for level="${level}", layerName="${layerName}"`);

        // Fetch GeoJSON from GeoServer WFS via Next.js API proxy (to avoid CORS)
        // Ensure srsName=EPSG:4326 to get Lat/Lng coordinates for Leaflet
        const wfsUrl = `/api/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsName=EPSG:4326`;

        const response = await fetch(wfsUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch boundaries: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[RiskChoropleth] Fetched ${data.features?.length || 0} features for level="${level}"`);

        setGeoJsonData(data);
      } catch (err) {
        console.error('Error fetching boundaries:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBoundaries();
  }, [region, level]);

  if (loading) {
    return null;
  }

  if (error) {
    console.error('RiskChoroplethLayer error:', error);
    return null;
  }

  if (!geoJsonData) {
    return null;
  }

  // Style function for each feature
  const style = (feature: GeoJSON.Feature | undefined) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#cccccc',
        weight: 1,
        opacity: 1,
        color: '#666666',
        fillOpacity: 0.3,
      };
    }

    // Match feature with statistics - try multiple key formats like GeoServerLayers
    let areaStat = null;

    if (region === 'mo') {
      // Macau: try SNAME and CNAME
      const sname = feature.properties.SNAME || '';
      const cname = feature.properties.CNAME || '';
      areaStat = statistics[sname] || statistics[cname];
    } else if (region === 'hk') {
      // Hong Kong: try multiple formats based on level
      if (level === 'district') {
        const ename = feature.properties.ENAME || '';
        const id = feature.properties.ID || '';
        areaStat = statistics[ename] || statistics[`district_${id}`] || statistics[id];
      } else if (level === 'spu') {
        const spuId = feature.properties.SPU;
        if (spuId !== undefined && spuId !== null) {
          // Try: "11", "spu_11", "SPU 11"
          const idStr = String(spuId);
          areaStat = statistics[spuId] || 
                     statistics[idStr] || 
                     statistics[`spu_${idStr}`] || 
                     statistics[`SPU ${idStr}`] ||
                     statistics[`SPU${idStr}`]; // Try without space too
        }
      } else if (level === 'statistical_area') {
        const tpuId = feature.properties.TPU;
        if (tpuId !== undefined && tpuId !== null) {
          // Try: "111", "tpu_111", "TPU 111"
          const idStr = String(tpuId);
          areaStat = statistics[tpuId] || 
                     statistics[idStr] || 
                     statistics[`tpu_${idStr}`] || 
                     statistics[`TPU ${idStr}`] ||
                     statistics[`TPU${idStr}`];
        }
      } else if (level === 'subunit') {
        const subunitId = feature.properties.Subunit;
        if (subunitId !== undefined && subunitId !== null) {
          // Try: "14", "subunit_14", "SUBUNIT 14"
          const idStr = String(subunitId);
          areaStat = statistics[subunitId] || 
                     statistics[idStr] || 
                     statistics[`subunit_${idStr}`] || 
                     statistics[`SUBUNIT ${idStr}`] || 
                     statistics[`Subunit ${idStr}`];
        }
      }
    }

    // Debug logging for first few features
    if (Math.random() < 0.05) {
      console.log(`[RiskChoropleth] Level: ${level}, found: ${!!areaStat}, properties:`, feature.properties);
      if (!areaStat && level === 'spu') {
        const spuId = feature.properties.SPU;
        console.log(`[RiskChoropleth] SPU ${spuId} not found. Tried keys:`, [
          spuId,
          String(spuId),
          `spu_${spuId}`,
          `SPU ${spuId}`,
          `SPU${spuId}`
        ]);
        console.log(`[RiskChoropleth] Available stats keys sample:`, Object.keys(statistics).slice(0, 10));
      }
      if (!areaStat && level === 'statistical_area') {
        const tpuId = feature.properties.TPU;
        console.log(`[RiskChoropleth] TPU ${tpuId} not found. Tried keys:`, [
          tpuId,
          String(tpuId),
          `tpu_${tpuId}`,
          `TPU ${tpuId}`,
          `TPU${tpuId}`
        ]);
        console.log(`[RiskChoropleth] Available stats keys sample:`, Object.keys(statistics).slice(0, 10));
      }
    }

    if (!areaStat || areaStat.totalExposure === 0) {
      return {
        fillColor: '#e5e7eb',
        weight: 0.8,
        opacity: 1,
        color: '#9ca3af',
        fillOpacity: 0.3,
      };
    }

    // Use the selected metric for coloring
    const metricValue = metricType === 'density' && areaStat.riskDensity
      ? areaStat.riskDensity
      : areaStat.totalExposure;

    const fillColor = getCheckRiskColor(metricValue, thresholds);

    return {
      fillColor,
      weight: 0.8,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.7,
    };
  };

  // Popup content for each feature
  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return;

    // Match feature with statistics - try multiple key formats
    let areaStat = null;
    let areaName = 'Unknown';

    if (region === 'mo') {
      const sname = feature.properties.SNAME || '';
      const cname = feature.properties.CNAME || '';
      const pname = feature.properties.PNAME || '';
      areaStat = statistics[sname] || statistics[cname];
      areaName = `${cname} (${pname})`;
    } else if (region === 'hk') {
      if (level === 'district') {
        const ename = feature.properties.ENAME || '';
        const id = feature.properties.ID || '';
        areaStat = statistics[ename] || statistics[`district_${id}`] || statistics[id];
        areaName = ename || 'Unknown';
      } else if (level === 'spu') {
        const spuId = feature.properties.SPU;
        if (spuId !== undefined && spuId !== null) {
          const idStr = String(spuId);
          areaStat = statistics[spuId] || 
                     statistics[idStr] || 
                     statistics[`spu_${idStr}`] || 
                     statistics[`SPU ${idStr}`] ||
                     statistics[`SPU${idStr}`];
          areaName = `SPU ${spuId}`;
        }
      } else if (level === 'statistical_area') {
        const tpuId = feature.properties.TPU;
        if (tpuId !== undefined && tpuId !== null) {
          const idStr = String(tpuId);
          areaStat = statistics[tpuId] || 
                     statistics[idStr] || 
                     statistics[`tpu_${idStr}`] || 
                     statistics[`TPU ${idStr}`] ||
                     statistics[`TPU${idStr}`];
          areaName = `TPU ${tpuId}`;
        }
      } else if (level === 'subunit') {
        const subunitId = feature.properties.Subunit;
        if (subunitId !== undefined && subunitId !== null) {
          const idStr = String(subunitId);
          areaStat = statistics[subunitId] || 
                     statistics[idStr] || 
                     statistics[`subunit_${idStr}`] || 
                     statistics[`SUBUNIT ${idStr}`] || 
                     statistics[`Subunit ${idStr}`];
          areaName = `SUBUNIT ${subunitId}`;
        }
      }
    }

    if (!areaStat) {
      layer.bindPopup(`
        <div class="p-3 min-w-[250px]">
          <h3 class="font-bold text-sm mb-2">${areaName}</h3>
          <p class="text-xs text-gray-500">No data available</p>
        </div>
      `);
      return;
    }

    const metricValue = metricType === 'density' && areaStat.riskDensity
      ? areaStat.riskDensity
      : areaStat.totalExposure;

    const riskLevel = getCheckRiskLevel(metricValue, thresholds);
    const riskColor = getCheckRiskColor(metricValue, thresholds);

    // Get top occupancy types
    const occupancyList = areaStat.byOccupancy
      ? Object.entries(areaStat.byOccupancy)
          .sort((a, b) => b[1].totalExposure - a[1].totalExposure)
          .slice(0, 3)
      : [];

    const popupContent = `
      <div class="p-3 min-w-[280px]">
        <h3 class="font-bold text-base mb-1">${areaName}</h3>
        <div class="mb-3 pb-2 border-b border-gray-200">
          <span class="inline-block px-2 py-1 text-xs font-semibold rounded"
                style="background-color: ${riskColor}; color: white;">
            ${riskLevel} Risk
          </span>
        </div>

        <div class="space-y-2 text-xs">
          ${metricType === 'density' && areaStat.area_km2 ? `
          <div class="flex justify-between bg-blue-50 p-2 rounded">
            <span class="font-semibold text-blue-700">Risk Density:</span>
            <span class="font-bold text-blue-900">
              ${(areaStat.riskDensity! / 1_000_000_000).toFixed(2)}B/km²
            </span>
          </div>

          <div class="flex justify-between">
            <span class="font-semibold text-gray-700">Area:</span>
            <span>${areaStat.area_km2.toFixed(3)} km²</span>
          </div>
          ` : ''}

          <div class="flex justify-between">
            <span class="font-semibold text-gray-700">Policy Count:</span>
            <span class="font-bold">${areaStat.count.toLocaleString()}</span>
          </div>

          <div class="flex justify-between">
            <span class="font-semibold text-gray-700">Total Exposure:</span>
            <span class="font-bold text-red-600">
              ${(areaStat.totalExposure / 1_000_000).toFixed(2)}M
            </span>
          </div>

          <div class="flex justify-between">
            <span class="font-semibold text-gray-700">Avg Exposure:</span>
            <span>${(areaStat.avgExposure / 1_000_000).toFixed(2)}M</span>
          </div>

          <div class="flex justify-between">
            <span class="font-semibold text-gray-700">Max Exposure:</span>
            <span>${(areaStat.maxExposure / 1_000_000).toFixed(2)}M</span>
          </div>

          ${occupancyList.length > 0 ? `
            <div class="mt-3 pt-2 border-t border-gray-200">
              <div class="font-semibold text-gray-700 mb-1">Top Occupancy Types:</div>
              ${occupancyList.map(([type, data]) => `
                <div class="flex justify-between text-xs">
                  <span class="text-gray-600">${type}:</span>
                  <span>${data.count} (${(data.totalExposure / 1_000_000).toFixed(1)}M)</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    // Highlight on hover
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#000000',
          fillOpacity: 0.9,
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        const originalStyle = style(feature);
        layer.setStyle(originalStyle);
      },
    });
  };

  // Don't render anything if loading or no data
  if (loading || !geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
    return null;
  }

  // Include statistics count in key to force re-render when statistics load
  const statsCount = Object.keys(statistics).length;

  return (
    <GeoJSON
      key={`${region}-${level}-${geoJsonData.features.length}-${statsCount}`}
      data={geoJsonData}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
