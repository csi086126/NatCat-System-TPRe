/**
 * GeoServer WMS Click Handler
 * Handles click events on WMS layers to show statistics
 */

'use client';

import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Layer configuration type
interface LayerConfig {
  workspace: string;
  layer: string;
  statsUrl?: string;
  idField?: string;  // Field name for district ID
  nameField?: string; // Field name for district name
  nameCNField?: string; // Field name for Chinese name
  currency?: string; // Currency symbol
  label?: string; // Display label for popup
}

// GeoServer Configuration - supports multiple layers per region
const REGION_QUERY: Record<string, LayerConfig[] | undefined> = {
  hk: [
    {
      workspace: 'natcat_platform',
      layer: 'Hong_Kong_18_Districts',
      statsUrl: '/data/statistics/districts-18-statistics.json',
      idField: 'ID',
      nameField: 'ENAME',
      nameCNField: 'CNAME',
      currency: 'HKD',
      label: 'District',
    },
    {
      workspace: 'natcat_platform',
      layer: 'HongKong_PPU_9_polygon',
      statsUrl: '/data/statistics/ppu-statistics.json',
      idField: 'PPU',
      nameField: 'NAME',
      nameCNField: 'NAME',
      currency: 'HKD',
      label: 'PPU (Primary Planning Unit)',
    },
    {
      workspace: 'natcat_platform',
      layer: 'HongKong_SPU_52_polygon',
      statsUrl: '/data/statistics/spu-statistics.json',
      idField: 'SPU',
      nameField: 'NAME',
      nameCNField: 'NAME',
      currency: 'HKD',
      label: 'SPU (Secondary Planning Unit)',
    },
    {
      workspace: 'natcat_platform',
      layer: 'HongKong_TPU_292_polygon',
      statsUrl: '/data/statistics/tpu-statistics.json',
      idField: 'TPU',
      nameField: 'NAME',
      nameCNField: 'NAME',
      currency: 'HKD',
      label: 'TPU (Tertiary Planning Unit)',
    },
    {
      workspace: 'natcat_platform',
      layer: 'HongKong_Subunit_4916_polygon',
      statsUrl: '/data/statistics/subunit-statistics.json',
      idField: 'Subunit',
      nameField: 'Subunit',
      nameCNField: 'Subunit',
      currency: 'HKD',
      label: 'Subunit',
    },
  ],
  mo: [
    {
      workspace: 'macau',
      layer: 'macau_district_boundary_polygon',
      statsUrl: '/data/statistics/macau-district-statistics.json',
      idField: 'SNAME',  // Use simplified Chinese name as key (e.g., "花王堂区")
      nameField: 'PNAME', // Portuguese name
      nameCNField: 'SNAME', // Simplified Chinese name
      currency: 'MOP',
      label: 'Parish',
    },
    {
      workspace: 'macau',
      layer: 'macau_statistical_area_polygon',
      statsUrl: '/data/statistics/macau-statistical-area-statistics.json',
      idField: 'SNAME',  // Simplified Chinese name as key
      nameField: 'PNAME', // Portuguese name
      nameCNField: 'CNAME', // Traditional Chinese name
      currency: 'MOP',
      label: 'Statistical Area',
    },
  ],
};

// Helper function to query a single layer
async function queryLayer(
  layerConfig: LayerConfig,
  bbox: string,
  size: { x: number; y: number },
  point: { x: number; y: number }
): Promise<{ config: LayerConfig; feature: Record<string, unknown>; properties: Record<string, unknown> } | null> {
  const layerName = `${layerConfig.workspace}:${layerConfig.layer}`;
  
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layerName,
    QUERY_LAYERS: layerName,
    BBOX: bbox,
    WIDTH: size.x.toString(),
    HEIGHT: size.y.toString(),
    X: Math.floor(point.x).toString(),
    Y: Math.floor(point.y).toString(),
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: '1',
    SRS: 'EPSG:4326',
  });

  try {
    const url = `/api/geoserver/getfeatureinfo?${params.toString()}`;
    console.log(`Querying layer: ${layerName}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Layer ${layerName} response:`, data);

    if (data.features && data.features.length > 0) {
      console.log(`Layer ${layerName} found feature:`, data.features[0].properties);
      return {
        config: layerConfig,
        feature: data.features[0],
        properties: data.features[0].properties || {},
      };
    } else {
      console.log(`Layer ${layerName} no features found`);
    }
  } catch (error) {
    console.error(`Failed to query layer ${layerName}:`, error);
  }
  
  return null;
}

// Helper function to load statistics for a layer
async function loadStats(config: LayerConfig, properties: Record<string, unknown>, year?: number | null): Promise<Record<string, unknown> | null> {
  if (!config.statsUrl) return null;
  
  try {
    // Construct year-specific URL if year is selected
    let statsUrl = config.statsUrl;
    if (year) {
      // Assuming statsUrl is like '/data/statistics/districts-18-statistics.json'
      // We want to transform it to '/data/statistics/districts-18-statistics-2024.json'
      if (statsUrl.endsWith('.json')) {
        statsUrl = statsUrl.replace('.json', `-${year}.json`);
      }
    }

    console.log(`Loading stats from: ${statsUrl}`);
    const statsResponse = await fetch(statsUrl);
    
    // If year-specific file not found, fall back to main file (or handle error)
    if (!statsResponse.ok) {
       console.warn(`Failed to load stats for year ${year}, falling back to default`);
       if (year && statsUrl !== config.statsUrl) {
         const fallbackResponse = await fetch(config.statsUrl);
         if (!fallbackResponse.ok) return null;
         const statsData = await fallbackResponse.json();
         return extractStats(statsData, config, properties);
       }
       return null;
    }

    const statsData = await statsResponse.json();
    return extractStats(statsData, config, properties);
  } catch (error) {
    console.error('Failed to load statistics:', error);
    return null;
  }
}

function extractStats(statsData: any, config: LayerConfig, properties: Record<string, unknown>) {
    const idField = config.idField || 'ID';
    const nameCNField = config.nameCNField || 'CNAME';
    
    const districtId = properties[idField] || properties.ID || properties.id || '';
    const districtNameCN = properties[nameCNField] || properties.CNAME || '';
    
    // Determine the key prefix based on the layer type
    let keyPrefix = 'district';
    const layer = config.layer.toLowerCase();
    if (layer.includes('ppu')) {
      keyPrefix = 'ppu';
    } else if (layer.includes('spu')) {
      keyPrefix = 'spu';
    } else if (layer.includes('tpu')) {
      keyPrefix = 'tpu';
    } else if (layer.includes('subunit')) {
      keyPrefix = 'subunit';
    } else if (layer.includes('statistical_area')) {
      keyPrefix = 'area';
    } else if (layer.includes('district_boundary') || layer.includes('macau_district')) {
      keyPrefix = 'parish';
    }
    
    // Try multiple key formats
    let stats = statsData[`${keyPrefix}_${districtId}`];
    if (!stats && typeof districtId === 'string') {
      stats = statsData[districtId];
    }
    if (!stats) {
      stats = statsData[districtNameCN as string];
    }
    // Also try the original district_ prefix as fallback
    if (!stats) {
      stats = statsData[`district_${districtId}`];
    }
    
    return stats;
}

// Format exposure value
function formatExposure(value: number): string {
  if (!value || value === 0) return 'Updating...';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString();
}

// Generate popup HTML for a single layer's stats
function generateStatsHtml(
  config: LayerConfig,
  properties: Record<string, unknown>,
  stats: Record<string, unknown>,
  isFirst: boolean
): string {
  const nameField = config.nameField || 'ENAME';
  const nameCNField = config.nameCNField || 'CNAME';
  const currency = config.currency || 'HKD';
  const label = config.label || 'Area';
  
  const name = (stats.name || properties[nameField] || 'Unknown') as string;
  const nameCN = (stats.nameCN || properties[nameCNField] || '') as string;
  const count = (stats.count || 0) as number;
  const totalExposure = (stats.totalExposure || 0) as number;
  const avgExposure = (stats.avgExposure || 0) as number;
  
  const byOccupancy = (stats.byOccupancy || {}) as Record<string, { count: number }>;
  const topOccupancy = Object.entries(byOccupancy)
    .sort((a, b) => (b[1]?.count ?? 0) - (a[1]?.count ?? 0))
    .slice(0, 3);

  const hasExposureData = totalExposure > 0;
  
  // Different background colors for different layer types
  // Colors match the polygon fill colors on the map
  const colorSchemes: Record<string, { bg: string; accent: string }> = {
    // Hong Kong layers - matching GeoServer default styles / boundaries
    'District': { bg: '#FFEBEE', accent: '#C62828' },           // Red (matches 18 Districts boundary)
    'PPU (Primary Planning Unit)': { bg: '#E3F2FD', accent: '#1565C0' },  // Blue
    'SPU (Secondary Planning Unit)': { bg: '#E8F5E9', accent: '#2E7D32' }, // Green
    'TPU (Tertiary Planning Unit)': { bg: '#FFF3E0', accent: '#E65100' },  // Orange
    'Subunit': { bg: '#F3E5F5', accent: '#7B1FA2' },           // Purple
    // Macau layers - matching SLD styles
    'Parish': { bg: '#FFEBEE', accent: '#E53935' },            // Red (#E53935)
    'Statistical Area': { bg: '#EDE7F6', accent: '#9575CD' },  // Purple (#9575CD)
  };
  
  const colorScheme = colorSchemes[label] || { bg: '#F5F5F5', accent: '#666666' };
  const bgColor = colorScheme.bg;
  const accentColor = colorScheme.accent;

  return `
    <div style="margin-bottom: ${isFirst ? '0' : '12px'}; ${!isFirst ? 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #E0E0E0;' : ''}">
      <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${label}</div>
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">${name}</div>
      ${nameCN ? `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">${nameCN}</div>` : ''}

      <div style="display: grid; grid-template-columns: ${hasExposureData ? 'repeat(3, 1fr)' : '1fr'}; gap: 8px; padding: 10px; background: ${bgColor}; border-radius: 4px; text-align: center;">
        <div>
          <div style="font-size: 18px; font-weight: bold; color: ${accentColor};">${count}</div>
          <div style="font-size: 10px; color: #666;">Policies</div>
        </div>
        ${hasExposureData ? `
        <div>
          <div style="font-size: 12px; font-weight: 600;">${currency} ${formatExposure(totalExposure)}</div>
          <div style="font-size: 10px; color: #666;">Total</div>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600;">${currency} ${formatExposure(avgExposure)}</div>
          <div style="font-size: 10px; color: #666;">Average</div>
        </div>
        ` : `
        <div style="font-size: 11px; color: #999; font-style: italic;">
          Exposure data updating...
        </div>
        `}
      </div>

      ${topOccupancy.length > 0 ? `
        <div style="margin-top: 8px;">
          <div style="font-size: 10px; font-weight: 600; margin-bottom: 4px;">📊 Top Occupancy Types</div>
          ${topOccupancy.map(([occ, data]) => `
            <div style="font-size: 10px; display: flex; justify-content: space-between; margin: 2px 0;">
              <span style="color: #555;">${occ}</span>
              <span style="font-weight: 500;">${data.count} policies</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// Map from overlay name to layer name for filtering
const OVERLAY_TO_LAYER: Record<string, string> = {
  // Hong Kong - Polygons (▢ prefix)
  '▢ 18 Districts': 'Hong_Kong_18_Districts',
  '▢ PPU (9)': 'HongKong_PPU_9_polygon',
  '▢ SPU (52)': 'HongKong_SPU_52_polygon',
  '▢ TPU (292)': 'HongKong_TPU_292_polygon',
  '▢ Subunit (4,916)': 'HongKong_Subunit_4916_polygon',
  // Hong Kong - Lines (─ prefix)
  '─ 18 Districts Lines': 'Hong_Kong_18_Districts',
  '─ PPU (9) Lines': 'HongKong_PPU_9_polygon',
  '─ SPU (52) Lines': 'HongKong_SPU_52_polygon',
  '─ TPU (292) Lines': 'HongKong_TPU_292_polygon',
  '─ Subunit (4,916) Lines': 'HongKong_Subunit_4916_polygon',
  // Macau - Polygons (▢ prefix)
  '▢ Districts (7 Parish)': 'macau_district_boundary_polygon',
  '▢ Statistical Areas (25)': 'macau_statistical_area_polygon',
  // Macau - Lines (─ prefix)
  '─ District Lines (7)': 'macau_district_boundary_polygon',
  '─ Statistical Area Lines (25)': 'macau_statistical_area_polygon',

  // NEW FORMAT - Shapefile Layer IDs
  // Hong Kong - Polygons
  'hk_districts': 'Hong_Kong_18_Districts',
  'hk_ppu': 'HongKong_PPU_9_polygon',
  'hk_spu': 'HongKong_SPU_52_polygon',
  'hk_tpu': 'HongKong_TPU_292_polygon',
  'hk_subunit': 'HongKong_Subunit_4916_polygon',
  // Hong Kong - Lines
  'hk_districts_line': 'Hong_Kong_18_Districts',
  'hk_ppu_line': 'HongKong_PPU_9_polygon',
  'hk_spu_line': 'HongKong_SPU_52_polygon',
  'hk_tpu_line': 'HongKong_TPU_292_polygon',
  'hk_subunit_line': 'HongKong_Subunit_4916_polygon',
  // Macau - Polygons
  'mo_districts': 'macau_district_boundary_polygon',
  'mo_statistical': 'macau_statistical_area_polygon',
  // Macau - Lines
  'mo_districts_line': 'macau_district_boundary_polygon',
  'mo_statistical_line': 'macau_statistical_area_polygon',
};

export function GeoServerClickHandler({ 
  region, 
  enabledLayers,
  selectedYear 
}: { 
  region: string; 
  enabledLayers?: string[];
  selectedYear?: number | null;
}) {
  const allLayerConfigs = REGION_QUERY[region];

  const map = useMapEvents({
    click: async (e) => {
      if (!allLayerConfigs || allLayerConfigs.length === 0) return;

      console.log('=== GeoServer Click Handler ===');
      console.log('Enabled overlays:', enabledLayers);
      console.log('Selected year:', selectedYear);

      // Filter layer configs based on enabled overlays
      let layerConfigs: LayerConfig[] = [];
      
      if (enabledLayers && enabledLayers.length > 0) {
        // Convert enabled overlay names to layer names
        const enabledLayerNames = new Set<string>();
        enabledLayers.forEach(overlayName => {
          const layerName = OVERLAY_TO_LAYER[overlayName];
          console.log(`Mapping overlay "${overlayName}" -> layer "${layerName}"`);
          if (layerName) {
            enabledLayerNames.add(layerName);
          }
        });
        
        console.log('Enabled layer names:', Array.from(enabledLayerNames));
        
        // Filter configs to only include enabled layers
        if (enabledLayerNames.size > 0) {
          layerConfigs = allLayerConfigs.filter(config => 
            enabledLayerNames.has(config.layer)
          );
        }
      }

      console.log('Layer configs to query:', layerConfigs.map(c => c.layer));

      // If no layers are selected, don't show any popup
      if (layerConfigs.length === 0) {
        console.log('No layers to query, returning');
        return;
      }

      const point = map.latLngToContainerPoint(e.latlng);
      const size = map.getSize();
      const bounds = map.getBounds();
      const bbox = `${bounds.getSouthWest().lng},${bounds.getSouthWest().lat},${bounds.getNorthEast().lng},${bounds.getNorthEast().lat}`;

      try {
        // Query only enabled layers in parallel
        const layerResults = await Promise.all(
          layerConfigs.map(config => queryLayer(config, bbox, size, point))
        );
        
        // Filter out null results
        const validResults = layerResults.filter(r => r !== null);
        
        if (validResults.length === 0) {
          return; // No features found in any layer
        }

        console.log(`Found ${validResults.length} layer(s) with features`);

        // Load statistics for each result
        const statsPromises = validResults.map(async result => {
          const stats = await loadStats(result.config, result.properties, selectedYear);
          return { ...result, stats };
        });
        
        const resultsWithStats = await Promise.all(statsPromises);

        // Generate combined popup HTML
        let popupHtml = '<div style="min-width: 280px; font-family: system-ui;">';
        
        resultsWithStats.forEach((result, index) => {
          if (result.stats) {
            popupHtml += generateStatsHtml(
              result.config,
              result.properties,
              result.stats,
              index === 0
            );
          } else {
            // Show basic info if no stats available
            const nameField = result.config.nameField || 'ENAME';
            const nameCNField = result.config.nameCNField || 'CNAME';
            const label = result.config.label || 'Area';
            
            popupHtml += `
              <div style="${index > 0 ? 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #E0E0E0;' : ''}">
                <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${label}</div>
                <div style="font-weight: bold;">${result.properties[nameField] || 'Unknown'}</div>
                <div style="font-size: 12px; color: #666;">${result.properties[nameCNField] || ''}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">No statistics available</div>
              </div>
            `;
          }
        });
        
        popupHtml += '</div>';

        L.popup({
          maxWidth: 450,
          minWidth: 300,
        })
          .setLatLng(e.latlng)
          .setContent(popupHtml)
          .openOn(map);

      } catch (error) {
        console.error('Failed to query GeoServer:', error);
      }
    },
  });

  return null;
}
