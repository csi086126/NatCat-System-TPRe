/**
 * Enhanced Portfolio Map Component with Heatmap
 * Features:
 * - Heatmap visualization by exposure
 * - Cluster markers
 * - District boundaries overlay
 * - Toggle between heatmap and markers
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import '@/styles/map-controls.css';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Flame, AlertCircle, Search, X, Filter, List, Download, Eye, EyeOff, TrendingUp, Building2, DollarSign, Layers } from 'lucide-react';
import { GeoServerClickHandler } from './GeoServerLayers';
import { WMSLayer } from './WMSLayer';
import AreaSelectionTools from './AreaSelectionTools';
import RiskChoroplethLayer from './RiskChoroplethLayer';
import RiskLegend from './RiskLegend';
import HeatmapLegend from './HeatmapLegend';
import FloodLegend from './FloodLegend';

// Fix for default marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// ============================================
// TESTING CONFIGURATION
// ============================================
// Set to true to use the corrected geocoding data
// This fixes 1,630 policies that were incorrectly placed due to geocoding failures
const USE_CORRECTED_GEOCODING_DATA = true;
// ============================================

interface LocationData {
  lat: number;
  lng: number;
  sum_insured: number;
  address: string;
  region: string;
  policy_id: string;
  occupancy?: string;
  construction?: string;
  business_type?: string;
  coverage?: string;
}

interface SearchResult extends LocationData {
  index: number;
  matchType: 'address' | 'policy_id' | 'region';
}

interface FilterStats {
  count: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;
  byOccupancy: Record<string, { count: number; total: number }>;
  topPolicies: LocationData[];
  searchTerm: string;
}

interface PortfolioMapProps {
  selectedYear: number | null;
  region: string;
  groupByField?: string;
  groupByValue?: string;
  onDataLoaded?: (data: LocationData[]) => void;
  onOverviewStatsChange?: (stats: {
    totalPolicies: number;
    totalExposure: number;
    avgExposure: number;
    topDistrict: string;
    topDistrictExposure: number;
  }) => void;
}

type RegionViewConfig = {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]]; // [[south, west], [north, east]]
};

const REGION_VIEWS: Record<string, RegionViewConfig> = {
  worldwide: {
    // Center worldwide view on China
    center: [34.5, 104.0],
    zoom: 3,
  },
  hk: {
    center: [22.3193, 114.1694],
    zoom: 11,
    bounds: [[22.1500, 113.8300], [22.5600, 114.4400]],
  },
  mo: {
    center: [22.1987, 113.5439],
    zoom: 12,
    bounds: [[22.1100, 113.5200], [22.2200, 113.5900]],
  },
};

// Shapefile Layer Configurations
type ShapefileLayer = {
  id: string;
  name: string;
  type: 'polygon' | 'line' | 'raster';
  layer: string;
  region: 'hk' | 'mo';
  opacity?: number;
};

const SHAPEFILE_LAYERS: ShapefileLayer[] = [
  // Hong Kong Flood Maps (Rain-induced)
  { id: 'hk_flood_rain_5', name: 'Flood (Rain) 5-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R5', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_10', name: 'Flood (Rain) 10-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R10', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_20', name: 'Flood (Rain) 20-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R20', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_50', name: 'Flood (Rain) 50-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R50', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_100', name: 'Flood (Rain) 100-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R100', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_200', name: 'Flood (Rain) 200-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R200', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_500', name: 'Flood (Rain) 500-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R500', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_rain_1000', name: 'Flood (Rain) 1000-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R1000', region: 'hk', opacity: 0.7 },

  // Hong Kong Flood Maps (Storm Surge)
  { id: 'hk_flood_surge_q90', name: 'Storm Surge (Q90)', type: 'raster', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q90', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_surge_q95', name: 'Storm Surge (Q95)', type: 'raster', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q95', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_surge_q98', name: 'Storm Surge (Q98)', type: 'raster', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q98', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_surge_q99', name: 'Storm Surge (Q99)', type: 'raster', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q99', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_surge_expected', name: 'Storm Surge (Expected)', type: 'raster', layer: 'natcat_platform:HK_Flood_Surge_mc_expected_depth', region: 'hk', opacity: 0.7 },
  
  // Hong Kong Flood Maps (Wave)
  { id: 'hk_flood_wave_5', name: 'Wave 5-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R5', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_10', name: 'Wave 10-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R10', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_20', name: 'Wave 20-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R20', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_50', name: 'Wave 50-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R50', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_100', name: 'Wave 100-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R100', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_200', name: 'Wave 200-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R200', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_500', name: 'Wave 500-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R500', region: 'hk', opacity: 0.7 },
  { id: 'hk_flood_wave_1000', name: 'Wave 1000-yr', type: 'raster', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R1000', region: 'hk', opacity: 0.7 },

  // Hong Kong Polygons
  { id: 'hk_districts', name: '18 Districts', type: 'polygon', layer: 'natcat_platform:Hong_Kong_18_Districts', region: 'hk', opacity: 0.3 },
  { id: 'hk_ppu', name: 'PPU (9)', type: 'polygon', layer: 'natcat_platform:HongKong_PPU_9_polygon', region: 'hk', opacity: 0.4 },
  { id: 'hk_spu', name: 'SPU (52)', type: 'polygon', layer: 'natcat_platform:HongKong_SPU_52_polygon', region: 'hk', opacity: 0.4 },
  { id: 'hk_tpu', name: 'TPU (292)', type: 'polygon', layer: 'natcat_platform:HongKong_TPU_292_polygon', region: 'hk', opacity: 0.3 },
  { id: 'hk_subunit', name: 'Subunit (4,916)', type: 'polygon', layer: 'natcat_platform:HongKong_Subunit_4916_polygon', region: 'hk', opacity: 0.3 },

  // Hong Kong Lines
  { id: 'hk_districts_line', name: '18 Districts Lines', type: 'line', layer: 'natcat_platform:Hong_Kong_18_Districts', region: 'hk' },
  { id: 'hk_ppu_line', name: 'PPU (9) Lines', type: 'line', layer: 'natcat_platform:HongKong_PPU_9_polygon', region: 'hk' },
  { id: 'hk_spu_line', name: 'SPU (52) Lines', type: 'line', layer: 'natcat_platform:HongKong_SPU_52_polygon', region: 'hk' },
  { id: 'hk_tpu_line', name: 'TPU (292) Lines', type: 'line', layer: 'natcat_platform:HongKong_TPU_292_polygon', region: 'hk' },
  { id: 'hk_subunit_line', name: 'Subunit (4,916) Lines', type: 'line', layer: 'natcat_platform:HongKong_Subunit_4916_polygon', region: 'hk' },

  // Macau Polygons
  { id: 'mo_districts', name: 'Districts (7 Parish)', type: 'polygon', layer: 'natcat_platform:Macau_7_Districts', region: 'mo', opacity: 0.3 },
  { id: 'mo_statistical', name: 'Statistical Areas (25)', type: 'polygon', layer: 'natcat_platform:Macau_25_Statistical_Areas', region: 'mo', opacity: 0.3 },

  // Macau Lines
  { id: 'mo_districts_line', name: 'District Lines (7)', type: 'line', layer: 'natcat_platform:Macau_7_Districts', region: 'mo' },
  { id: 'mo_statistical_line', name: 'Statistical Area Lines (25)', type: 'line', layer: 'natcat_platform:Macau_25_Statistical_Areas', region: 'mo' },
];

// Heatmap Layer Component using CircleMarkers
function HeatmapLayer({ data }: { data: LocationData[] }) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  const maxExposure = Math.max(...data.map(d => d.sum_insured));

  // Calculate percentile thresholds for risk classification
  const sortedExposures = [...data.map(d => d.sum_insured)].sort((a, b) => a - b);
  const p50Index = Math.floor(sortedExposures.length * 0.5);
  const p90Index = Math.floor(sortedExposures.length * 0.9);
  const p50Threshold = sortedExposures[p50Index] || 0;
  const p90Threshold = sortedExposures[p90Index] || 0;

  // Calculate radius and color based on exposure percentile
  const getCircleStyle = (exposure: number) => {
    const normalizedExposure = exposure / maxExposure;
    const radius = 5 + Math.sqrt(normalizedExposure) * 20;

    let color;
    if (exposure < p50Threshold) {
      color = `rgba(59, 130, 246, ${0.4 + normalizedExposure * 0.3})`;
    } else if (exposure < p90Threshold) {
      color = `rgba(234, 179, 8, ${0.5 + normalizedExposure * 0.3})`;
    } else {
      color = `rgba(239, 68, 68, ${0.6 + normalizedExposure * 0.2})`;
    }

    return { radius, color };
  };

  // Create location key for tracking expanded state
  const getLocationKey = (lat: number, lng: number) => `${lat},${lng}`;

  // Calculate spread positions in a circle around center
  const calculateSpreadPositions = (centerLat: number, centerLng: number, count: number, radiusMeters: number = 200) => {
    const latRadiusDeg = radiusMeters / 111000;
    const lngRadiusDeg = radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180));

    const positions: Array<[number, number]> = [];
    const angleStep = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const lat = centerLat + latRadiusDeg * Math.sin(angle);
      const lng = centerLng + lngRadiusDeg * Math.cos(angle);
      positions.push([lat, lng]);
    }

    return positions;
  };

  // Handle click on circle to expand/collapse
  const handleCircleClick = (lat: number, lng: number, e: any, isExpanded: boolean) => {
    console.log('🔵 Circle clicked!', { lat, lng, currentExpanded: expandedLocation, isExpanded });

    // If already expanded, don't handle click - let popup open naturally
    if (isExpanded) {
      console.log('🔵 Already expanded - allowing popup to open');
      return;
    }

    // If not expanded, expand the cluster
    e.originalEvent.stopPropagation();
    const locationKey = getLocationKey(lat, lng);
    console.log('🔵 Expanding location:', locationKey);
    setExpandedLocation(locationKey);
  };

  // Map click handler to collapse expanded location
  const MapClickHandler = () => {
    useMapEvents({
      click: () => {
        setExpandedLocation(null);
      },
    });
    return null;
  };

  // Group data by location
  const locationGroups = new Map<string, LocationData[]>();
  data.forEach(point => {
    const key = getLocationKey(point.lat, point.lng);
    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(point);
  });

  // Debug: Always log basic info
  console.log('🔵 [Heatmap] Total data points:', data.length);
  console.log('🔵 [Heatmap] Unique locations:', locationGroups.size);

  // Debug: Log locations with multiple policies
  const multiPolicyLocations = Array.from(locationGroups.entries()).filter(([_, policies]) => policies.length > 1);
  if (multiPolicyLocations.length > 0) {
    console.log('🔵 [Heatmap] Found', multiPolicyLocations.length, 'locations with multiple policies');
    console.log('🔵 [Heatmap] Sample:', multiPolicyLocations.slice(0, 3).map(([key, policies]) => ({
      location: key,
      count: policies.length
    })));
  } else {
    console.log('🔵 [Heatmap] No locations with multiple policies found');
    console.log('🔵 [Heatmap] Try increasing sample size (e.g., Top 500 or Top 1k)');
  }

  return (
    <>
      <MapClickHandler />

      {Array.from(locationGroups.entries()).map(([locationKey, policies]) => {
        const centerLat = policies[0].lat;
        const centerLng = policies[0].lng;
        const isExpanded = expandedLocation === locationKey;
        const isMultiplePolicies = policies.length > 1;

        // Debug: Log expanded state
        if (isExpanded) {
          console.log('🔵 [Heatmap] Rendering expanded location:', locationKey, 'with', policies.length, 'policies');
        }

        // Calculate spread positions if expanded
        const spreadPositions = isExpanded && isMultiplePolicies
          ? calculateSpreadPositions(centerLat, centerLng, policies.length)
          : [];

        return (
          <React.Fragment key={locationKey}>
            {/* Render connecting lines when expanded */}
            {isExpanded && isMultiplePolicies && spreadPositions.map((pos, idx) => (
              <Polyline
                key={`line-${idx}`}
                positions={[[centerLat, centerLng], pos]}
                pathOptions={{
                  color: '#6b7280',
                  weight: 1,
                  opacity: 0.6,
                  dashArray: '4, 4'
                }}
              />
            ))}

            {/* Render circles */}
            {policies.map((point, idx) => {
              const style = getCircleStyle(point.sum_insured);
              const position: [number, number] = isExpanded && isMultiplePolicies
                ? spreadPositions[idx]
                : [centerLat, centerLng];

              return (
                <CircleMarker
                  key={`${locationKey}-${idx}`}
                  center={position}
                  radius={style.radius}
                  fillColor={style.color}
                  color={style.color}
                  weight={1}
                  fillOpacity={0.6}
                  eventHandlers={{
                    click: (e) => handleCircleClick(centerLat, centerLng, e, isExpanded)
                  }}
                >
                  <Popup maxHeight={400}>
                    <div className="p-2 min-w-[250px] max-w-[350px] font-sans">
                      {isMultiplePolicies && !isExpanded ? (
                        // Multiple policies - show summary
                        <>
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-500">📍 LOCATION</span>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {policies.length} Policies
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate" title={point.address}>
                              {point.address}
                            </p>
                            <div className="mt-1 text-xs">
                              <span className="font-semibold text-gray-500">Total Exposure: </span>
                              <span className="font-bold text-blue-600">
                                HKD {policies.reduce((sum, p) => sum + p.sum_insured, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-center text-gray-500 italic">
                            💡 Click to expand and see individual policies
                          </div>
                        </>
                      ) : (
                        // Single policy or expanded individual policy
                        <>
                          <h3 className="font-bold text-sm mb-1">{point.policy_id}</h3>
                          <p className="text-xs text-gray-600 mb-2">{point.address}</p>
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-semibold">Region:</span> {point.region}
                            </div>
                            <div>
                              <span className="font-semibold">Sum Insured:</span>{' '}
                              HKD {point.sum_insured.toLocaleString()}
                            </div>
                            {point.occupancy && (
                              <div>
                                <span className="font-semibold">Occupancy:</span> {point.occupancy}
                              </div>
                            )}
                          </div>
                          {isExpanded && isMultiplePolicies && (
                            <div className="mt-2 pt-2 border-t text-xs text-center text-gray-500 italic">
                              💡 Click center marker to collapse
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Center marker when expanded */}
            {isExpanded && isMultiplePolicies && (
              <CircleMarker
                center={[centerLat, centerLng]}
                radius={4}
                fillColor="#374151"
                color="#374151"
                weight={2}
                fillOpacity={0.8}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    console.log('🔵 Center marker clicked - collapsing');
                    setExpandedLocation(null);
                  }
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// Marker Layer Component
function MarkerLayer({ data }: { data: LocationData[] }) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  // Find all policies at the same location
  const getPoliciesAtLocation = (lat: number, lng: number) => {
    return data.filter(p => p.lat === lat && p.lng === lng);
  };

  // Create location key for tracking expanded state
  const getLocationKey = (lat: number, lng: number) => `${lat},${lng}`;

  // Calculate spread positions in a circle around center
  const calculateSpreadPositions = (centerLat: number, centerLng: number, count: number, radiusMeters: number = 200) => {
    const latRadiusDeg = radiusMeters / 111000;
    const lngRadiusDeg = radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180));

    const positions: Array<[number, number]> = [];
    const angleStep = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const lat = centerLat + latRadiusDeg * Math.sin(angle);
      const lng = centerLng + lngRadiusDeg * Math.cos(angle);
      positions.push([lat, lng]);
    }

    return positions;
  };

  // Handle click on marker to expand/collapse
  const handleMarkerClick = (lat: number, lng: number, e: any, isExpanded: boolean) => {
    console.log('🔵 Marker clicked!', { lat, lng, currentExpanded: expandedLocation, isExpanded });

    // If already expanded, don't handle click - let popup open naturally
    if (isExpanded) {
      console.log('🔵 Already expanded - allowing popup to open');
      return;
    }

    // If not expanded, expand the cluster
    e.originalEvent.stopPropagation();
    const locationKey = getLocationKey(lat, lng);
    console.log('🔵 Expanding location:', locationKey);
    setExpandedLocation(locationKey);
  };

  // Map click handler to collapse expanded location
  const MapClickHandler = () => {
    useMapEvents({
      click: () => {
        setExpandedLocation(null);
      },
    });
    return null;
  };

  // Group data by location
  const locationGroups = new Map<string, LocationData[]>();
  data.forEach(point => {
    const key = getLocationKey(point.lat, point.lng);
    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(point);
  });

  return (
    <>
      <MapClickHandler />

      {Array.from(locationGroups.entries()).map(([locationKey, policies]) => {
        const centerLat = policies[0].lat;
        const centerLng = policies[0].lng;
        const isExpanded = expandedLocation === locationKey;
        const isMultiplePolicies = policies.length > 1;

        // Calculate spread positions if expanded
        const spreadPositions = isExpanded && isMultiplePolicies
          ? calculateSpreadPositions(centerLat, centerLng, policies.length)
          : [];

        return (
          <React.Fragment key={locationKey}>
            {/* Render connecting lines when expanded */}
            {isExpanded && isMultiplePolicies && spreadPositions.map((pos, idx) => (
              <Polyline
                key={`line-${idx}`}
                positions={[[centerLat, centerLng], pos]}
                pathOptions={{
                  color: '#6b7280',
                  weight: 1,
                  opacity: 0.6,
                  dashArray: '4, 4'
                }}
              />
            ))}

            {/* Render markers */}
            {policies.map((point, idx) => {
              const position: [number, number] = isExpanded && isMultiplePolicies
                ? spreadPositions[idx]
                : [centerLat, centerLng];

              return (
                <Marker
                  key={`${locationKey}-${idx}`}
                  position={position}
                  eventHandlers={{
                    click: (e) => handleMarkerClick(centerLat, centerLng, e, isExpanded)
                  }}
                >
                  <Popup maxHeight={400}>
                    <div className="p-2 min-w-[250px] max-w-[350px] font-sans">
                      {isMultiplePolicies && !isExpanded ? (
                        // Multiple policies - show summary
                        <>
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-500">📍 LOCATION</span>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {policies.length} Policies
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate" title={point.address}>
                              {point.address}
                            </p>
                            <div className="mt-1 text-xs">
                              <span className="font-semibold text-gray-500">Total Exposure: </span>
                              <span className="font-bold text-blue-600">
                                HKD {policies.reduce((sum, p) => sum + p.sum_insured, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-center text-gray-500 italic">
                            💡 Click to expand and see individual policies
                          </div>
                        </>
                      ) : (
                        // Single policy or expanded individual policy
                        <>
                          <h3 className="font-bold text-sm mb-1">{point.policy_id}</h3>
                          <p className="text-xs text-gray-600 mb-2">{point.address}</p>
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-semibold">Region:</span> {point.region}
                            </div>
                            <div>
                              <span className="font-semibold">Sum Insured:</span>{' '}
                              HKD {point.sum_insured.toLocaleString()}
                            </div>
                            {point.occupancy && (
                              <div>
                                <span className="font-semibold">Occupancy:</span> {point.occupancy}
                              </div>
                            )}
                          </div>
                          {isExpanded && isMultiplePolicies && (
                            <div className="mt-2 pt-2 border-t text-xs text-center text-gray-500 italic">
                              💡 Click center marker to collapse
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Center marker when expanded */}
            {isExpanded && isMultiplePolicies && (
              <CircleMarker
                center={[centerLat, centerLng]}
                radius={4}
                fillColor="#374151"
                color="#374151"
                weight={2}
                fillOpacity={0.8}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    console.log('🔵 Center marker clicked - collapsing');
                    setExpandedLocation(null);
                  }
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// Selected Result Highlight Component
function SelectedMarker({ result }: { result: SearchResult }) {
  const map = useMap();

  // Auto zoom to selected location
  useEffect(() => {
    if (result) {
      map.setView([result.lat, result.lng], 16, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [result, map]);

  // Create a custom red icon for selected result
  const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <Marker position={[result.lat, result.lng]} icon={redIcon}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="text-xs font-semibold text-red-600 mb-2">📍 Selected Location</div>
          <h3 className="font-bold text-sm mb-1">{result.policy_id}</h3>
          <p className="text-xs text-gray-600 mb-2">{result.address}</p>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-semibold">Region:</span> {result.region}
            </div>
            <div>
              <span className="font-semibold">Sum Insured:</span>{' '}
              HKD {result.sum_insured.toLocaleString()}
            </div>
            {result.occupancy && (
              <div>
                <span className="font-semibold">Occupancy:</span> {result.occupancy}
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Auto-zoom to fit all filtered locations
function AutoZoomToFiltered({ locations }: { locations: LocationData[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 0.5,
      });
    }
  }, [locations, map]);

  return null;
}

function RegionViewUpdater({ region }: { region: string }) {
  const map = useMap();

  useEffect(() => {
    const view = REGION_VIEWS[region] ?? REGION_VIEWS.hk;
    if (view.bounds) {
      map.fitBounds(view.bounds, {
        padding: [20, 20],
        animate: true,
        duration: 0.5,
      });
      return;
    }

    map.setView(view.center, view.zoom, {
      animate: true,
      duration: 0.5,
    });
  }, [region, map]);

  return null;
}

export default function PortfolioMap({
  selectedYear,
  region,
  groupByField,
  groupByValue,
  onDataLoaded,
  onOverviewStatsChange
}: PortfolioMapProps) {
  const isWorldwide = region === 'worldwide';
  const [mounted, setMounted] = useState(false);
  const [mapData, setMapData] = useState<LocationData[]>([]);
  const [allLocations, setAllLocations] = useState<LocationData[]>([]); // Full dataset for search
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'area_risk'>('individual');
  const [individualRiskMode, setIndividualRiskMode] = useState<'heatmap' | 'markers'>('heatmap');
  const [totalAvailable, setTotalAvailable] = useState(0); // Total records available
  const [sampleSize, setSampleSize] = useState<number>(100); // Top N by exposure for performance

  // Base Map State
  const [baseMap, setBaseMap] = useState<'esri' | 'carto' | 'google' | 'amap'>('carto');
  const [showMapSettings, setShowMapSettings] = useState(false);

  // Shapefile Layers State
  const [enabledShapefileLayers, setEnabledShapefileLayers] = useState<string[]>(['hk_districts_line']); // Default: show district lines
  const [showShapefileSection, setShowShapefileSection] = useState(false);

  // Area risk visualization state
  const [areaRiskLevel, setAreaRiskLevel] = useState<'statistical_area' | 'district' | 'spu' | 'subunit'>('statistical_area');
  const [areaStatistics, setAreaStatistics] = useState<Record<string, any>>({});
  const [areaMetricType, setAreaMetricType] = useState<'exposure' | 'density'>('exposure');

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filter functionality
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
  const [showDetailsList, setShowDetailsList] = useState(false);

  // Overview KPI Stats
  const [overviewStats, setOverviewStats] = useState({
    totalPolicies: 0,
    totalExposure: 0,
    avgExposure: 0,
    topDistrict: '',
    topDistrictExposure: 0,
  });

  const regionView = useMemo(() => {
    return REGION_VIEWS[region] ?? REGION_VIEWS.hk;
  }, [region]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset search/filter UI when switching regions
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setShowSearchResults(false);
    setIsFilterActive(false);
    setFilterStats(null);
    setShowDetailsList(false);
  }, [region]);

  // Calculate overview statistics from loaded data
  useEffect(() => {
    if (allLocations.length > 0) {
      // Calculate total exposure and policies
      const totalPolicies = allLocations.length;
      const totalExposure = allLocations.reduce((sum, loc) => sum + loc.sum_insured, 0);
      const avgExposure = totalExposure / totalPolicies;

      // Group by region/district to find top district
      const districtMap = new Map<string, { count: number; exposure: number }>();
      allLocations.forEach(loc => {
        const district = loc.region || 'Unknown';
        if (!districtMap.has(district)) {
          districtMap.set(district, { count: 0, exposure: 0 });
        }
        const districtData = districtMap.get(district)!;
        districtData.count++;
        districtData.exposure += loc.sum_insured;
      });

      // Find top district by exposure
      let topDistrict = '';
      let topDistrictExposure = 0;
      districtMap.forEach((data, district) => {
        if (data.exposure > topDistrictExposure) {
          topDistrict = district;
          topDistrictExposure = data.exposure;
        }
      });

      setOverviewStats({
        totalPolicies,
        totalExposure,
        avgExposure,
        topDistrict,
        topDistrictExposure,
      });

      // Notify parent component of stats change
      if (onOverviewStatsChange) {
        onOverviewStatsChange({
          totalPolicies,
          totalExposure,
          avgExposure,
          topDistrict,
          topDistrictExposure,
        });
      }
    }
  }, [allLocations, onOverviewStatsChange]);

  // Load area statistics for risk aggregation visualization
  useEffect(() => {
    async function fetchAreaStatistics() {
      if (region !== 'mo' && region !== 'hk') {
        setAreaStatistics({});
        return;
      }

      try {
        if (region === 'mo') {
          const yearSuffix = selectedYear ? `-${selectedYear}` : '';

          if (areaRiskLevel === 'statistical_area') {
            // For statistical areas, only load statistical area data (25 areas)
            const response = await fetch(`/data/statistics/macau-statistical-area-statistics${yearSuffix}.json`);

            if (response.ok) {
              const data = await response.json();
              setAreaStatistics(data);
            } else if (selectedYear) {
              // Fallback to all-years
              const fallback = await fetch('/data/statistics/macau-statistical-area-statistics.json');
              if (fallback.ok) {
                const data = await fallback.json();
                setAreaStatistics(data);
              }
            }
          } else {
            // For districts, merge both data sources because the district layer has 11 areas:
            // - 7 traditional parishes (from district stats)
            // - 4 other areas like Cotai (from statistical area stats)
            const [statAreaResponse, districtResponse] = await Promise.all([
              fetch(`/data/statistics/macau-statistical-area-statistics${yearSuffix}.json`),
              fetch(`/data/statistics/macau-district-statistics${yearSuffix}.json`)
            ]);

            let mergedData = {};

            // Load statistical area data first
            if (statAreaResponse.ok) {
              const statAreaData = await statAreaResponse.json();
              mergedData = { ...statAreaData };
            }

            // Merge district data (overwrites any duplicates)
            if (districtResponse.ok) {
              const districtData = await districtResponse.json();
              mergedData = { ...mergedData, ...districtData };
            }

            // If year-specific files failed, try all-years fallback
            if (!statAreaResponse.ok && !districtResponse.ok && selectedYear) {
              const [fallbackStatArea, fallbackDistrict] = await Promise.all([
                fetch('/data/statistics/macau-statistical-area-statistics.json'),
                fetch('/data/statistics/macau-district-statistics.json')
              ]);

              if (fallbackStatArea.ok) {
                const data = await fallbackStatArea.json();
                mergedData = { ...data };
              }

              if (fallbackDistrict.ok) {
                const data = await fallbackDistrict.json();
                mergedData = { ...mergedData, ...data };
              }
            }

            setAreaStatistics(mergedData);
          }
          return;
        }

        if (region === 'hk') {
          // Hong Kong statistics
          const yearSuffix = selectedYear ? `-${selectedYear}` : '';
          let statsPath = '';

          if (areaRiskLevel === 'district') {
            statsPath = `/data/statistics/districts-18-statistics${yearSuffix}.json`;
          } else if (areaRiskLevel === 'spu') {
            statsPath = `/data/statistics/spu-statistics${yearSuffix}.json`;
          } else if (areaRiskLevel === 'statistical_area') {
            statsPath = `/data/statistics/tpu-statistics${yearSuffix}.json`;
          } else if (areaRiskLevel === 'subunit') {
            statsPath = `/data/statistics/subunit-statistics${yearSuffix}.json`;
          }

          const response = await fetch(statsPath);
          if (response.ok) {
            const rawData = await response.json();
            // Transform HK statistics: convert keys from "district_1" to district name
            const transformedData: Record<string, any> = {};
            Object.entries(rawData).forEach(([key, value]: [string, any]) => {
              // Add original key as well (e.g. spu_11, tpu_123)
              transformedData[key] = value;
              
              if (value) {
                // Add by ID if available (e.g. 11, 328) for robust matching
                if (value.id !== undefined) {
                  transformedData[value.id] = value;
                  transformedData[String(value.id)] = value;
                }

                if (value.name) {
                  // Use name as-is (already in correct format for all levels)
                  transformedData[value.name] = value;
                }
              }
            });
            console.log(`[HK Statistics] Level: ${areaRiskLevel}, Total entries: ${Object.keys(transformedData).length}`);
            console.log(`[HK Statistics] First 5 keys:`, Object.keys(transformedData).slice(0, 5));
            setAreaStatistics(transformedData);
          } else if (selectedYear) {
            // Fallback to all-years file
            const fallbackPath = statsPath.replace(yearSuffix, '');
            const fallbackResponse = await fetch(fallbackPath);
            if (fallbackResponse.ok) {
              const rawData = await fallbackResponse.json();
              // Transform HK statistics
              const transformedData: Record<string, any> = {};
              Object.entries(rawData).forEach(([key, value]: [string, any]) => {
                // Add original key
                transformedData[key] = value;
                
                if (value) {
                  // Add by ID
                  if (value.id !== undefined) {
                    transformedData[value.id] = value;
                    transformedData[String(value.id)] = value;
                  }

                  if (value.name) {
                    transformedData[value.name] = value;
                  }
                }
              });
              setAreaStatistics(transformedData);
            }
          }
          return;
        }
      } catch (error) {
        console.error('Error loading area statistics:', error);
        setAreaStatistics({});
      }
    }

    if (viewMode === 'area_risk') {
      fetchAreaStatistics();
    }
  }, [region, selectedYear, areaRiskLevel, viewMode]);

  useEffect(() => {
    async function fetchMapData() {
      try {
        setLoading(true);
        setError(null);

        let allData: unknown = [];

        // Worldwide: render global view without portfolio points
        if (region === 'worldwide') {
          setAllLocations([]);
          setMapData([]);
          setTotalAvailable(0);
          setLoading(false);
          return;
        }

        // Check if region has data available
        const supportedRegions = ['hk', 'mo'];

        if (!supportedRegions.includes(region)) {
          // Region in development - no data yet
          console.log(`Region ${region} is in development - no portfolio data available yet`);
          setAllLocations([]);
          setMapData([]);
          setTotalAvailable(0);
          setLoading(false);
          return;
        }

        // Determine data paths based on region
        const dataConfig: Record<string, { path: string; prefix: string; ext: string }> = {
          hk: { path: '/data/by-year', prefix: 'tphk-portfolio', ext: '.json' },
          mo: { path: '/data/macau', prefix: 'tpmo-portfolio-enhanced-FULL', ext: '.json' },
        };

        const config = dataConfig[region];

        if (selectedYear && region === 'hk') {
          // Load year-specific file for HK (better performance)
          try {
            const filePath = `${config.path}/${config.prefix.replace('-FULL', '')}-${selectedYear}${config.ext}`;
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`No data available for year ${selectedYear}`);
            allData = (await response.json()) as unknown;
            console.log(`✅ Loaded ${allData.length} records for ${region.toUpperCase()} year ${selectedYear}`);
          } catch (yearError) {
            console.error(`Failed to load data for year ${selectedYear}:`, yearError);
            throw new Error(`Could not load portfolio data for ${selectedYear}. Please ensure the year file exists.`);
          }
        } else {
          // For Macau (all years in one file) or no year selected for HK
          try {
            let filePath: string;

            if (region === 'hk') {
              // Use corrected data if enabled
              filePath = USE_CORRECTED_GEOCODING_DATA
                ? '/data/tphk-geocoded-portfolio-corrected.json'
                : '/data/tphk_portfolio_subset_5000.json';

              if (USE_CORRECTED_GEOCODING_DATA) {
                console.log('🔧 Using CORRECTED geocoding data (1,875 policies fixed)');
              }
            } else {
              filePath = `${config.path}/${config.prefix}${config.ext}`;
            }

            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to load portfolio dataset (${response.status})`);
            allData = (await response.json()) as unknown;
            console.log(`✅ Loaded data for ${region.toUpperCase()}${selectedYear && region === 'mo' ? ` (will filter to year ${selectedYear})` : ''}`);
          } catch (error) {
            console.error('Failed to load portfolio data:', error);
            throw new Error('Could not load portfolio data. Please ensure data files exist in public/data.');
          }
        }

        // Handle GeoJSON format (if using GeoJSON)
        if (
          isRecord(allData) &&
          allData.type === 'FeatureCollection' &&
          Array.isArray(allData.features)
        ) {
          const features = allData.features;
          allData = features
            .map((feature) => {
              if (!isRecord(feature)) return null;
              const properties = isRecord(feature.properties) ? feature.properties : {};
              const geometry = isRecord(feature.geometry) ? feature.geometry : null;
              const coords = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
              if (!coords || coords.length < 2) return null;

              const lng = Number(coords[0]);
              const lat = Number(coords[1]);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              return {
                ...properties,
                location: { lat, lng },
              };
            })
            .filter((v): v is Record<string, unknown> & { location: { lat: number; lng: number } } => v !== null);
        }
        // Otherwise, data is already in JSON array format with location field

        // Extract location data
        const rows = Array.isArray(allData) ? allData : [];

        const allLocs: LocationData[] = rows
          .filter((item) => {
            // Basic location validation
            if (!isRecord(item)) return false;
            const location = isRecord(item.location) ? item.location : null;
            if (!location) return false;
            const lat = Number(location.lat);
            const lng = Number(location.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

            // Year filtering for Macau (since all years are in one file)
            if (region === 'mo' && selectedYear) {
              const itemYear = (item as Record<string, unknown>).policy_year || (item as Record<string, unknown>).year || (item as Record<string, unknown>).保單年度;
              if (itemYear && itemYear !== selectedYear) return false;
            }

            return true;
          })
          .map((item) => {
            const record = item as Record<string, unknown>;
            const location = (record.location as Record<string, unknown>) ?? {};

            const sumInsuredRaw =
              record.公司保额 ??
              record.公司保額 ??
              record.company_sum_insured ??
              record.sum_insured ??
              0;

            return {
              lat: Number(location.lat),
              lng: Number(location.lng),
              sum_insured: Number(sumInsuredRaw) || 0,
              address: String(record.标的位置 ?? record.保險處所 ?? record.address ?? ''),
              region: String(record.parish ?? record.分區 ?? record.region ?? ''),
              policy_id: String(record.policyno ?? record.保單號 ?? record.policy_id ?? ''),
              occupancy: record.occupation_desc
                ? String(record.occupation_desc)
                : record.佔用性質
                  ? String(record.佔用性質)
                  : record.occupancy
                    ? String(record.occupancy)
                    : undefined,
              construction: String(record.建築等級 ?? record.const_class_desc ?? record.construction_class ?? record.structure ?? ''),
              business_type: String(record.業務類別 ?? record.business_type_desc ?? record.business_type ?? ''),
              coverage: String(record.險種名稱 ?? record.section_desc ?? record.insurance_type ?? ''),
            };
          })
          .filter((loc: LocationData) => loc.sum_insured > 0); // Only show policies with exposure

        // Store full dataset for searching
        setAllLocations(allLocs);

        // Notify parent that data is loaded
        if (onDataLoaded) {
          onDataLoaded(allLocs);
        }

        // Set total available records
        setTotalAvailable(allLocs.length);

        // Map data update is now handled by the useEffect below
      } catch (error) {
        console.error('Failed to fetch map data:', error);
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (mounted) {
      fetchMapData();
    }
  }, [mounted, selectedYear, region]);

  // Effect to update Map Data when filters or allLocations change
  useEffect(() => {
    if (allLocations.length === 0) {
      setMapData([]);
      return;
    }

    let filtered = allLocations;

    // Apply Group By Filter
    if (groupByField && groupByValue && groupByValue !== 'all') {
      filtered = filtered.filter(loc => {
         const val = (loc as any)[groupByField];
         // Loose comparison for strings
         return String(val) === groupByValue;
      });
    }

    // Apply sample size limit for performance (only for Exposure mode)
    if (viewMode === 'individual') {
      if (sampleSize > 0 && filtered.length > sampleSize) {
        // Sort by exposure (descending) and take top N
        const sorted = [...filtered].sort((a, b) => {
          const exposureA = (a as any).sum_insured || (a as any)['公司保額'] || 0;
          const exposureB = (b as any).sum_insured || (b as any)['公司保額'] || 0;
          return exposureB - exposureA; // Descending order
        });
        filtered = sorted.slice(0, sampleSize);
      }
    }

    setMapData(filtered);
  }, [allLocations, groupByField, groupByValue, sampleSize, viewMode]);

  // Search functionality - searches in ALL locations, not just visible sample
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedResult(null);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search in ALL locations, not just mapData (sample)
    allLocations.forEach((location, index) => {
      let matchType: 'address' | 'policy_id' | 'region' | null = null;

      if (location.address.toLowerCase().includes(lowerQuery)) {
        matchType = 'address';
      } else if (location.policy_id.toLowerCase().includes(lowerQuery)) {
        matchType = 'policy_id';
      } else if (location.region.toLowerCase().includes(lowerQuery)) {
        matchType = 'region';
      }

      if (matchType) {
        results.push({
          ...location,
          index,
          matchType,
        });
      }
    });

    setSearchResults(results.slice(0, 50)); // Limit to 50 results
    setShowSearchResults(true);
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setShowSearchResults(false);
    setSearchQuery(result.address);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedResult(null);
    // Also clear filter when clearing search
    if (isFilterActive) {
      handleClearFilter();
    }
  };

  // Calculate statistics for filtered results
  const calculateFilterStats = (locations: LocationData[], term: string): FilterStats => {
    const exposures = locations.map(l => l.sum_insured);

    // Group by occupancy
    const byOccupancy: Record<string, { count: number; total: number }> = {};
    locations.forEach(loc => {
      const occ = loc.occupancy || 'Unknown';
      if (!byOccupancy[occ]) {
        byOccupancy[occ] = { count: 0, total: 0 };
      }
      byOccupancy[occ].count++;
      byOccupancy[occ].total += loc.sum_insured;
    });

    // Get top 3 by exposure
    const topPolicies = [...locations]
      .sort((a, b) => b.sum_insured - a.sum_insured)
      .slice(0, 3);

    return {
      count: locations.length,
      totalExposure: exposures.reduce((sum, v) => sum + v, 0),
      avgExposure: exposures.reduce((sum, v) => sum + v, 0) / locations.length,
      minExposure: Math.min(...exposures),
      maxExposure: Math.max(...exposures),
      byOccupancy,
      topPolicies,
      searchTerm: term,
    };
  };

  // Activate filter - show only search results on map
  const handleFilterMap = () => {
    if (searchResults.length === 0) return;

    // Convert search results to LocationData array
    const filteredLocs: LocationData[] = searchResults.map(r => ({
      lat: r.lat,
      lng: r.lng,
      sum_insured: r.sum_insured,
      address: r.address,
      region: r.region,
      policy_id: r.policy_id,
      occupancy: r.occupancy,
    }));

    // Calculate statistics
    const stats = calculateFilterStats(filteredLocs, searchQuery);
    setFilterStats(stats);

    // Update map data to show only filtered results
    setMapData(filteredLocs);
    setIsFilterActive(true);
    setShowSearchResults(false);
  };

  // Clear filter - restore original view
  const handleClearFilter = () => {
    setIsFilterActive(false);
    setFilterStats(null);

    // Restore all map data
    setMapData(allLocations);
  };

  // Export filtered results to CSV
  const handleExportCSV = () => {
    if (!filterStats || searchResults.length === 0) return;

    // Create CSV content
    const headers = ['Policy ID', 'Address', 'Region', 'Sum Insured (HKD)', 'Occupancy'];
    const rows = searchResults.map(r => [
      r.policy_id,
      `"${r.address.replace(/"/g, '""')}"`, // Escape quotes in address
      r.region,
      r.sum_insured,
      r.occupancy || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `filtered-portfolio-${searchQuery.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Format currency helper
  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `HKD ${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `HKD ${(value / 1e6).toFixed(2)}M`;
    } else {
      return `HKD ${value.toLocaleString()}`;
    }
  };

  if (!mounted) {
    return (
      <div className="h-[600px] w-full bg-gray-100 animate-pulse flex items-center justify-center">
        Loading Map...
      </div>
    );
  }

  const totalExposure = mapData.reduce((sum, d) => sum + d.sum_insured, 0);
  const maxExposure = mapData.length > 0 ? Math.max(...mapData.map(d => d.sum_insured)) : 0;

  // Calculate percentile thresholds for legend (matching HeatmapLayer logic)
  const sortedExposures = mapData.length > 0 
    ? [...mapData.map(d => d.sum_insured)].sort((a, b) => a - b)
    : [];
  const p50Index = Math.floor(sortedExposures.length * 0.5);
  const p90Index = Math.floor(sortedExposures.length * 0.9);
  const lowThreshold = sortedExposures[p50Index] || 0;    // 50th percentile
  const mediumThreshold = sortedExposures[p90Index] || 0; // 90th percentile

  return (
    <div className="flex flex-col h-full">
      {/* Map Container */}
      <div className="flex-1 w-full z-0 relative h-full">
        {error ? (
          <div className="h-full w-full bg-gray-50 flex items-center justify-center">
            <div className="text-center p-6 max-w-md bg-white rounded-lg shadow-sm border border-red-100">
              <div className="text-red-500 mb-2">
                <AlertCircle className="h-8 w-8 mx-auto" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Unable to Load Map Data</h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading map data...</div>
          </div>
        ) : totalAvailable === 0 && region !== 'worldwide' ? (
          // No data available for this region (in development)
          <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
            <div className="text-center p-8 max-w-lg bg-white rounded-xl shadow-lg border border-blue-100">
              <div className="mb-4">
                <Building2 className="h-16 w-16 mx-auto text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Portfolio Data in Development
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Portfolio data for <span className="font-semibold text-blue-600">{region.toUpperCase()}</span> region is currently under development.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">Available Regions:</span>
                  <br />
                  • HK - Hong Kong (Active)
                  <br />
                  • MO - Macau (Active)
                  <br />
                  • GBA, TH, VN, MY (Coming Soon)
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Please select HK or MO from the region selector in the header to view portfolio data.
              </p>
            </div>
          </div>
        ) : (
          <>
            <MapContainer
              center={regionView.center}
              zoom={regionView.zoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              worldCopyJump={isWorldwide}
              minZoom={isWorldwide ? 3 : undefined}
            >
              <RegionViewUpdater region={region} />
              {/* Base Map Layers - Always render based on state */}
              {baseMap === 'esri' && (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                />
              )}
              {baseMap === 'carto' && (
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
              )}
              {baseMap === 'google' && (
                <TileLayer
                  url="http://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution='&copy; Google Maps'
                />
              )}
              {baseMap === 'amap' && (
                <TileLayer
                  url="http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
                  attribution='&copy; 高德地图'
                />
              )}

              {!isWorldwide && (
                <>
                  {/* Render Shapefile Layers based on selection */}
                  {enabledShapefileLayers.map(layerId => {
                    const layerConfig = SHAPEFILE_LAYERS.find(l => l.id === layerId);
                    if (!layerConfig) return null;

                    // Generate SLD for styling
                    const getSLD = (layer: ShapefileLayer) => {
                      if (layer.type === 'raster') return undefined;
                      if (layer.type === 'polygon') {
                        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld"><NamedLayer><Name>${layer.layer}</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#C62828</CssParameter><CssParameter name="fill-opacity">${layer.opacity || 0.3}</CssParameter></Fill><Stroke><CssParameter name="stroke">#333333</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
                      } else {
                        return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld"><NamedLayer><Name>${layer.layer}</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">#333333</CssParameter><CssParameter name="stroke-width">2</CssParameter></Stroke></LineSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
                      }
                    };

                    const sldBody = getSLD(layerConfig);
                    const wmsParams: any = {
                      layers: layerConfig.layer,
                      format: 'image/png',
                      transparent: true,
                      version: '1.1.0',
                      styles: '',
                    };
                    
                    if (sldBody) {
                      wmsParams.SLD_BODY = sldBody;
                    }

                    return (
                      <WMSLayer
                        key={layerId}
                        url="http://10.253.22.15:8080/geoserver/wms"
                        params={wmsParams}
                        attribution="GeoServer - Nat Cat Platform"
                        opacity={layerConfig.type === 'line' ? 0.9 : (layerConfig.opacity || 0.7)}
                      />
                    );
                  })}

                  {/* Render based on view mode */}
                  {viewMode === 'individual' && individualRiskMode === 'heatmap' && <HeatmapLayer data={mapData} />}
                  {viewMode === 'individual' && individualRiskMode === 'markers' && <MarkerLayer data={mapData} />}
                  {viewMode === 'area_risk' && (
                    <RiskChoroplethLayer
                      key={`${region}-${areaRiskLevel}-${areaMetricType}`}
                      region={region}
                      level={areaRiskLevel}
                      statistics={areaStatistics}
                      selectedYear={selectedYear}
                      metricType={areaMetricType}
                    />
                  )}

                  {/* Show selected search result marker */}
                  {selectedResult && <SelectedMarker result={selectedResult} />}

                  {/* Auto-zoom when filter is active */}
                  {isFilterActive && mapData.length > 0 && <AutoZoomToFiltered locations={mapData} />}

                  {/* Area Selection Tools */}
                  <AreaSelectionTools allLocations={allLocations} />

                  {/* GeoServer Click Handler for Statistics */}
                  <GeoServerClickHandler
                    region={region}
                    enabledLayers={enabledShapefileLayers}
                    selectedYear={selectedYear}
                  />
                </>
              )}
            </MapContainer>

            {/* Floating Base Map Selector - Bottom Left */}
            {!isWorldwide && (
              <div className="absolute bottom-4 left-4 z-[1000]">
                {/* Collapsed State: Show current map thumbnail */}
                {!showMapSettings && (
                  <button
                    onClick={() => setShowMapSettings(true)}
                    className="group relative w-16 h-16 rounded-lg overflow-hidden shadow-lg border-2 border-white hover:border-blue-400 transition-all hover:scale-105"
                    title="Base Map Settings"
                  >
                    {/* Real map tile preview */}
                    <img
                      src={
                        baseMap === 'esri'
                          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/13'
                          : baseMap === 'carto'
                          ? 'https://a.basemaps.cartocdn.com/light_all/4/13/6.png'
                          : baseMap === 'google'
                          ? 'http://mt0.google.com/vt/lyrs=m&x=13&y=6&z=4'
                          : 'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=13&y=6&z=4'
                      }
                      alt="Current map style"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </button>
                )}

                {/* Expanded State: Show map gallery */}
                {showMapSettings && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-4 w-[380px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Base Map</span>
                      </div>
                      <button
                        onClick={() => setShowMapSettings(false)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Map Thumbnails Grid - 4 columns */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Satellite / Esri */}
                      <button
                        onClick={() => { setBaseMap('esri'); setShowMapSettings(false); }}
                        className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                          baseMap === 'esri'
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                          baseMap === 'esri' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                        }`}>
                          <img
                            src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/13"
                            alt="Satellite"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${baseMap === 'esri' ? 'text-blue-700' : 'text-gray-600'}`}>
                          Satellite
                        </span>
                      </button>

                      {/* Carto Light */}
                      <button
                        onClick={() => { setBaseMap('carto'); setShowMapSettings(false); }}
                        className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                          baseMap === 'carto'
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                          baseMap === 'carto' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                        }`}>
                          <img
                            src="https://a.basemaps.cartocdn.com/light_all/4/13/6.png"
                            alt="Light"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${baseMap === 'carto' ? 'text-blue-700' : 'text-gray-600'}`}>
                          Light
                        </span>
                      </button>

                      {/* Google Maps */}
                      <button
                        onClick={() => { setBaseMap('google'); setShowMapSettings(false); }}
                        className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                          baseMap === 'google'
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                          baseMap === 'google' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                        }`}>
                          <img
                            src="http://mt0.google.com/vt/lyrs=m&x=13&y=6&z=4"
                            alt="Google Maps"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if Google tiles blocked
                              (e.target as HTMLImageElement).src = 'https://tile.openstreetmap.org/4/13/6.png';
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${baseMap === 'google' ? 'text-blue-700' : 'text-gray-600'}`}>
                          Google
                        </span>
                      </button>

                      {/* Amap / Gaode */}
                      <button
                        onClick={() => { setBaseMap('amap'); setShowMapSettings(false); }}
                        className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                          baseMap === 'amap'
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                          baseMap === 'amap' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                        }`}>
                          <img
                            src="http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=13&y=6&z=4"
                            alt="Amap"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback
                              (e.target as HTMLImageElement).src = 'https://tile.openstreetmap.org/4/13/6.png';
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${baseMap === 'amap' ? 'text-blue-700' : 'text-gray-600'}`}>
                          高德
                        </span>
                      </button>
                    </div>

                    {/* Shapefiles Section */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setShowShapefileSection(!showShapefileSection)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <span>Shapefiles</span>
                        {showShapefileSection ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>

                      {showShapefileSection && (
                        <div className="mt-3 space-y-3 max-h-[300px] overflow-y-auto">
                          {/* Polygon Layers */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Polygons
                            </div>
                            <div className="space-y-1.5">
                              {SHAPEFILE_LAYERS.filter(l => l.type === 'polygon' && l.region === region).map(layer => (
                                <label
                                  key={layer.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={enabledShapefileLayers.includes(layer.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEnabledShapefileLayers([...enabledShapefileLayers, layer.id]);
                                      } else {
                                        setEnabledShapefileLayers(enabledShapefileLayers.filter(id => id !== layer.id));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">{layer.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Polyline Layers */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Lines
                            </div>
                            <div className="space-y-1.5">
                              {SHAPEFILE_LAYERS.filter(l => l.type === 'line' && l.region === region).map(layer => (
                                <label
                                  key={layer.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={enabledShapefileLayers.includes(layer.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEnabledShapefileLayers([...enabledShapefileLayers, layer.id]);
                                      } else {
                                        setEnabledShapefileLayers(enabledShapefileLayers.filter(id => id !== layer.id));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">{layer.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Legend for Aggregated Mode */}
            <RiskLegend visible={viewMode === 'area_risk'} level={areaRiskLevel} metricType={areaMetricType} />

            {/* Heatmap Legend for Individual Exposure Mode */}
            <HeatmapLegend
              visible={viewMode === 'individual' && individualRiskMode === 'heatmap'}
              lowThreshold={lowThreshold}
              mediumThreshold={mediumThreshold}
            />

            {/* Flood Depth Legend */}
            <FloodLegend
              visible={enabledShapefileLayers.some(id => id.startsWith('hk_flood_'))}
            />

            {region === 'worldwide' && (
              <Card className="absolute top-4 left-20 z-[1000] w-[420px] bg-white/95 backdrop-blur-sm shadow-lg">
                <div className="p-4">
                  <div className="text-base font-semibold text-gray-900">Global View</div>
                  <div className="text-sm text-gray-700 mt-1 leading-snug">
                    Default worldwide extent is shown. Switch to HK or MO or other Region in the header to load boundary layers and portfolio points.
                  </div>
                </div>
              </Card>
            )}

            {/* Top Control Bar Overlay */}
            {!isWorldwide && (
            <Card className="absolute top-4 left-16 z-[1000] p-2 h-12 bg-white/95 backdrop-blur-sm shadow-md flex items-center gap-4">
              <div className="flex gap-2">
                {/* Exposure button */}
                <Button
                  variant={viewMode === 'individual' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setViewMode('individual')}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Exposure
                </Button>

                {/* Exposure sub-option selector */}
                <select
                  value={individualRiskMode}
                  onChange={(e) => setIndividualRiskMode(e.target.value as 'heatmap' | 'markers')}
                  disabled={viewMode !== 'individual'}
                  className="px-2 py-1 text-xs border rounded-md h-8 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="heatmap">Heatmap</option>
                  <option value="markers">Markers</option>
                </select>

                {/* Top N selector - only for Exposure mode */}
                <select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  disabled={viewMode !== 'individual'}
                  className="px-2 py-1 text-xs border rounded-md h-8 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={100}>Top 100</option>
                  <option value={500}>Top 500</option>
                  <option value={1000}>Top 1k</option>
                  <option value={5000}>Top 5k</option>
                  <option value={10000}>Top 10k</option>
                  <option value={20000}>Top 20k</option>
                  <option value={50000}>Top 50k</option>
                  <option value={0}>All</option>
                </select>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-400" />

                {/* Aggregated button */}
                <Button
                  variant={viewMode === 'area_risk' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setViewMode('area_risk')}
                >
                  <Layers className="h-3 w-3 mr-1" />
                  Aggregated
                </Button>

                {/* Aggregated sub-option selector */}
                <select
                  value={areaRiskLevel}
                  onChange={(e) => setAreaRiskLevel(e.target.value as 'statistical_area' | 'district' | 'spu' | 'subunit')}
                  disabled={viewMode !== 'area_risk'}
                  className="px-2 py-1 text-xs border rounded-md h-8 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {region === 'mo' && (
                    <>
                      <option value="statistical_area">Statistical Areas (25)</option>
                      <option value="district">Districts (7)</option>
                    </>
                  )}
                  {region === 'hk' && (
                    <>
                      <option value="district">Districts (18)</option>
                      <option value="spu">SPU (52)</option>
                      <option value="statistical_area">TPU (292)</option>
                      <option value="subunit">Subunit (4,916)</option>
                    </>
                  )}
                </select>

                {/* Metric type selector for aggregated view */}
                <select
                  value={areaMetricType}
                  onChange={(e) => setAreaMetricType(e.target.value as 'exposure' | 'density')}
                  disabled={viewMode !== 'area_risk'}
                  className="px-2 py-1 text-xs border rounded-md h-8 bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="exposure">Total Exposure</option>
                  <option value="density">Risk Density</option>
                </select>
              </div>

              <div className="h-8 w-px bg-gray-400" />

              <div className="flex flex-col px-2 w-[350px]">
                <h3 className="font-semibold text-sm">Map Visualization</h3>
                <p className="text-xs text-muted-foreground">
                  {viewMode === 'area_risk' ? (
                    <>
                      Showing {Object.keys(areaStatistics).length} areas
                      {selectedYear && ` (${selectedYear})`}
                      {' '}| {areaMetricType === 'density' ? 'Risk Density' : 'Total Exposure'} by {
                        areaRiskLevel === 'statistical_area' ? 'Statistical Area' :
                        areaRiskLevel === 'district' ? 'District' :
                        areaRiskLevel === 'spu' ? 'SPU' :
                        'Subunit'
                      }
                    </>
                  ) : (
                    <>
                      Showing {mapData.length.toLocaleString()} of {totalAvailable.toLocaleString()} policies
                      {selectedYear && ` (${selectedYear})`}
                      {' '}| {individualRiskMode === 'heatmap' ? 'Heatmap' : 'Markers'} View
                    </>
                  )}
                </p>
              </div>

              <div className="h-8 w-px bg-gray-400" />

              {/* Search functionality */}
              <div className="relative flex items-center gap-2 w-96">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by address, policy ID, or region..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                  className="flex-1 px-2 py-1 text-sm border-none outline-none bg-transparent"
                  disabled={isFilterActive}
                />
                {searchQuery && !isFilterActive && (
                  <button
                    onClick={clearSearch}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && !isFilterActive && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto z-[1001]">
                    <div className="p-2 text-xs text-muted-foreground border-b bg-blue-50 flex items-center justify-between">
                      <div>
                        Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        {searchResults.length === 50 && ' (showing first 50)'}
                        <div className="text-[10px] mt-1">
                          💡 Searching across all {totalAvailable.toLocaleString()} records
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleFilterMap}
                        className="h-7 px-3 text-xs ml-2"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        Filter Map
                      </Button>
                    </div>
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectResult(result)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {result.address}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.policy_id} • {result.region}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              HKD {result.sum_insured.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {result.matchType === 'address' ? 'Address' :
                               result.matchType === 'policy_id' ? 'Policy' : 'Region'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showSearchResults && searchResults.length === 0 && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-[1001]">
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  </div>
                )}
              </div>
            </Card>
            )}

            {/* Filter Statistics Card - Top Right */}
            {!isWorldwide && isFilterActive && filterStats && (
              <Card className="absolute top-4 right-4 z-[1000] w-80 bg-white/95 backdrop-blur-sm shadow-lg border-gray-200">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4 text-blue-600" />
                      Filter Statistics
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportCSV}
                      className="h-7 px-2"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {/* Search Term */}
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <span className="font-semibold text-blue-900">&quot;{filterStats.searchTerm}&quot;</span>
                    </div>

                    {/* Basic Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-[10px] text-muted-foreground">Policies</div>
                        <div className="text-sm font-bold">{filterStats.count}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-[10px] text-muted-foreground">Total Exposure</div>
                        <div className="text-sm font-bold">HKD {(filterStats.totalExposure / 1e6).toFixed(1)}M</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-[10px] text-muted-foreground">Average</div>
                        <div className="text-sm font-bold">HKD {(filterStats.avgExposure / 1e6).toFixed(1)}M</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-[10px] text-muted-foreground">Range</div>
                        <div className="text-[10px] font-semibold">
                          {(filterStats.minExposure / 1e6).toFixed(1)}M - {(filterStats.maxExposure / 1e6).toFixed(1)}M
                        </div>
                      </div>
                    </div>

                    {/* By Occupancy */}
                    {Object.keys(filterStats.byOccupancy).length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-2">By Occupancy</div>
                        <div className="space-y-1">
                          {Object.entries(filterStats.byOccupancy)
                            .sort((a, b) => b[1].total - a[1].total)
                            .slice(0, 3)
                            .map(([occ, data]) => (
                              <div key={occ} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate flex-1">{occ}</span>
                                <span className="font-medium ml-2">
                                  {data.count} ({(data.total / 1e6).toFixed(1)}M)
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Top 3 Policies */}
                    {filterStats.topPolicies.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-2">Top 3 by Exposure</div>
                        <div className="space-y-1">
                          {filterStats.topPolicies.map((policy, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="font-medium">
                                {idx + 1}. HKD {(policy.sum_insured / 1e6).toFixed(1)}M
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {policy.address}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Details List Modal */}
            {!isWorldwide && showDetailsList && filterStats && (
              <div className="absolute inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
                <Card className="w-full max-w-4xl max-h-[80vh] bg-white flex flex-col">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Filtered Results: &quot;{filterStats.searchTerm}&quot; ({filterStats.count} policies)
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailsList(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b">
                          <th className="text-left p-2">Policy ID</th>
                          <th className="text-left p-2">Address</th>
                          <th className="text-left p-2">Region</th>
                          <th className="text-right p-2">Exposure (HKD)</th>
                          <th className="text-left p-2">Occupancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((result, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-[10px]">{result.policy_id}</td>
                            <td className="p-2 truncate max-w-xs">{result.address}</td>
                            <td className="p-2">{result.region}</td>
                            <td className="p-2 text-right font-medium">
                              {result.sum_insured.toLocaleString()}
                            </td>
                            <td className="p-2">{result.occupancy || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                    <div className="text-sm text-muted-foreground">
                      Total: {filterStats.count} policies | HKD {filterStats.totalExposure.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowDetailsList(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
