"use client"

// 1. Import necessary React Hooks and components
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut,
  Target, Search, FileText, Download, Upload, ChevronDown, ChevronUp, Layers, Settings, Globe, Shield, Eye, EyeOff, PenTool, TrendingUp
} from 'lucide-react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegion } from '@/contexts/RegionContext';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { Map as LeafletMap, LatLngLiteral, LeafletMouseEvent } from 'leaflet';

// Import historical events data
import historicalEventsData from '@/../public/data/historical-events-with-layers.json';

// 2. Dynamically import Leaflet map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const FeatureGroup = dynamic(() => import('react-leaflet').then(mod => mod.FeatureGroup), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });
const DrawControl = dynamic(() => import('@/components/DrawControl'), { ssr: false });
const PortfolioHeatmapLayer = dynamic(() => import('@/components/portfolio/PortfolioHeatmapLayer'), { ssr: false });
import { LocationData } from '@/types/portfolio';
import EPCurveChart, { SAMPLE_EARTHQUAKE_OEP } from '@/components/EPCurveChart';

const GEOSERVER_WMS_URL = process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL || 'http://localhost:8080/geoserver/wms';
const GEOSERVER_GEOSPATIAL_URL = process.env.NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL || GEOSERVER_WMS_URL;

// Import Leaflet for type definitions
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

type HistoricalEvent = {
  id: string;
  name: string;
  type: string;
  date: string;
  year: number;
  maxWindSpeed?: string;
  totalRainfall?: string;
  estimatedLoss?: string;
  affectedPopulation?: string;
  geometry?: {
    type: string;
    coordinates: [number, number] | number[];
  };
  related_layers?: string[];
  [key: string]: any;
};

type StochasticEvent = {
  id: string;
  name: string;
  type: string;
  year: number;
  maxWindSpeed?: string;
  totalRainfall?: string;
  estimatedLoss?: string;
  affectedPopulation?: string;
  geometry?: {
    type: string;
    coordinates: [number, number] | number[];
  };
  [key: string]: any;
};

type AssetInfo = {
  latitude: number;
  longitude: number;
  elevation: number;
  populationDensity: number;
  buildingDensity: string;
  distanceToCoast: number;
  landUse: string;
  worldcover: string;
  address?: string;
  geocodingSource?: string;
};

// 3. WMS Layer Configuration (Composite + Detailed layers)
const defaultWmsLayersConfig: Record<string, { name: string; layer: string }> = {
  // Composite layers (for quick query)
  floodComposite: { name: 'Flood Risk (Composite)', layer: 'COP:Flood_Composite' },
  typhoonComposite: { name: 'Typhoon Risk (Composite)', layer: 'COP:Typhoon_Composite' },
  rainstormComposite: { name: 'Rainstorm Risk (Composite)', layer: 'COP:Rainstorm_Composite' },
  stormSurgeComposite: { name: 'Storm Surge Risk (Composite)', layer: 'COP:StormSurge_Composite' },
  landslideComposite: { name: 'Landslide Risk (Composite)', layer: 'COP:Landslide_Composite' },
  
  // Detailed layers (for advanced view)
  flood500yr: { name: 'Flood depth (500-yr)', layer: 'COP:Flood_Depth _Return_Period_500yr' },
  flood200yr: { name: 'Flood depth (200-yr)', layer: 'COP:Flood_Depth _Return_Period_200yr' },
  flood100yr: { name: 'Flood depth (100-yr)', layer: 'COP:Flood_Depth _Return_Period_100yr' },
  flood50yr: { name: 'Flood depth (50-yr)', layer: 'COP:Flood_Depth _Return_Period_50yr' },
  flood20yr: { name: 'Flood depth (20-yr)', layer: 'COP:Flood_Depth _Return_Period_20yr' },
  
  // Flood layers without drainage (for comparison)
  floodNoDrainage500yr: { name: 'Flood depth (500-yr)', layer: 'COP:Flood_No_Drainage_500yr' },
  floodNoDrainage200yr: { name: 'Flood depth (200-yr)', layer: 'COP:Flood_No_Drainage_200yr' },
  floodNoDrainage100yr: { name: 'Flood depth (100-yr)', layer: 'COP:Flood_Depth _Return_Period_500yr' }, // 🔴 DEMO: Using 500-yr WITH drainage data to show difference
  floodNoDrainage50yr: { name: 'Flood depth (50-yr)', layer: 'COP:Flood_No_Drainage_50yr' },
  floodNoDrainage20yr: { name: 'Flood depth (20-yr)', layer: 'COP:Flood_No_Drainage_20yr' },
  rainstorm500yr: { name: 'Rainstorm intensity (500-yr)', layer: 'COP:Rainstorm_Intensity_500yr' },
  rainstorm200yr: { name: 'Rainstorm intensity (200-yr)', layer: 'COP:Rainstorm_Intensity_200yr' },
  rainstorm100yr: { name: 'Rainstorm intensity (100-yr)', layer: 'COP:Rainstorm_Intensity_100yr' },
  rainstorm50yr: { name: 'Rainstorm intensity (50-yr)', layer: 'COP:Rainstorm_Intensity_50yr' },
  rainstorm20yr: { name: 'Rainstorm intensity (20-yr)', layer: 'COP:Rainstorm_Intensity_20yr' },
  typhoonTD: { name: 'Tropical Depression', layer: 'COP:Typhoon_TD' },
  typhoonTS: { name: 'Tropical Storm', layer: 'COP:Typhoon_TS' },
  typhoonSTS: { name: 'Severe Tropical Storm', layer: 'COP:Typhoon_STS' },
  typhoonTY: { name: 'Typhoon', layer: 'COP:Typhoon_TY' },
  typhoonSTY: { name: 'Severe Typhoon', layer: 'COP:Typhoon_STY' },
  typhoonSuperTY: { name: 'Super Typhoon', layer: 'COP:Typhoon_SuperTY' },
  typhoonTracks: { name: 'Historical Typhoon Tracks', layer: 'COP:Typhoon_Historical_Tracks' },
  geoLandslideHigh: { name: 'Landslide High Risk', layer: 'COP:Landslide_High_Risk' },
  geoLandslideMedium: { name: 'Landslide Medium Risk', layer: 'COP:Landslide_Medium_Risk' },
  geoLandslideLow: { name: 'Landslide Low Risk', layer: 'COP:Landslide_Low_Risk' },

  // Hong Kong Flood Maps (Rain-induced)
  hkFloodRain5: { name: 'Flood (Rain) 5-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R5' },
  hkFloodRain10: { name: 'Flood (Rain) 10-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R10' },
  hkFloodRain20: { name: 'Flood (Rain) 20-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R20' },
  hkFloodRain50: { name: 'Flood (Rain) 50-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R50' },
  hkFloodRain100: { name: 'Flood (Rain) 100-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R100' },
  hkFloodRain200: { name: 'Flood (Rain) 200-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R200' },
  hkFloodRain500: { name: 'Flood (Rain) 500-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R500' },
  hkFloodRain1000: { name: 'Flood (Rain) 1000-yr', layer: 'natcat_platform:HK_Flood_Rain_HK_floodMaxDepth_R1000' },
  // Hong Kong Flood Maps (Storm Surge)
  hkFloodSurgeQ90: { name: 'Storm Surge (Q90)', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q90' },
  hkFloodSurgeQ95: { name: 'Storm Surge (Q95)', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q95' },
  hkFloodSurgeQ98: { name: 'Storm Surge (Q98)', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q98' },
  hkFloodSurgeQ99: { name: 'Storm Surge (Q99)', layer: 'natcat_platform:HK_Flood_Surge_mc_depth_q99' },
  hkFloodSurgeExpected: { name: 'Storm Surge (Expected)', layer: 'natcat_platform:HK_Flood_Surge_mc_expected_depth' },
  // Hong Kong Flood Maps (Wave-induced)
  hkFloodWave5: { name: 'Wave 5-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R5' },
  hkFloodWave10: { name: 'Wave 10-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R10' },
  hkFloodWave20: { name: 'Wave 20-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R20' },
  hkFloodWave50: { name: 'Wave 50-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R50' },
  hkFloodWave100: { name: 'Wave 100-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R100' },
  hkFloodWave200: { name: 'Wave 200-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R200' },
  hkFloodWave500: { name: 'Wave 500-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R500' },
  hkFloodWave1000: { name: 'Wave 1000-yr', layer: 'natcat_platform:HK_Flood_Wave_HK_tideMaxDepth_R1000' },

  // Global Datasets (IBTrACS)
  globalTyphoonTracks: { name: 'Global Typhoon Tracks (IBTrACS Lines)', layer: 'Global:IBTrACS.WP.list.v04r01.lines' },
  globalTyphoonPoints: { name: 'Global Typhoon Analysis Points (IBTrACS)', layer: 'Global:IBTrACS.WP.list.v04r01.point' },
};

// 4. Historical Events Real Data (from Macau Typhoon Events)
const mockHistoricalEvents: HistoricalEvent[] = [
  {
    id: 'TY2017-HATO',
    name: 'Typhoon Hato (天鸽)',
    type: 'Typhoon',
    date: '2017-08-23',
    year: 2017,
    maxWindSpeed: '185 km/h',
    totalRainfall: '320 mm',
    estimatedLoss: '$1.65 Billion',
    affectedPopulation: '680,000',
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  },
  {
    id: 'TY2018-MANGKHUT',
    name: 'Typhoon Mangkhut (山竹)',
    type: 'Typhoon',
    date: '2018-09-16',
    year: 2018,
    maxWindSpeed: '215 km/h',
    totalRainfall: '450 mm',
    estimatedLoss: '$2.83 Billion',
    affectedPopulation: '680,000',
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  },
  {
    id: 'TY2023-RAGASA',
    name: 'Typhoon Ragasa (雷伽萨)',
    type: 'Typhoon',
    date: '2023-09-02',
    year: 2023,
    maxWindSpeed: '165 km/h',
    totalRainfall: '280 mm',
    estimatedLoss: '$950 Million',
    affectedPopulation: '680,000',
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  }
];

// Stochastic Events Mock Data (10,000-year synthetic catalog)
const mockStochasticEvents: StochasticEvent[] = [
  {
    id: 'T-00156',
    name: 'Stochastic Typhoon Event 156',
    type: 'Typhoon',
    year: 156,
    maxWindSpeed: '265 km/h',
    totalRainfall: '320 mm',
    estimatedLoss: '$5.2 Billion',
    affectedPopulation: '2.8 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.1577, 22.2855]
    }
  },
  {
    id: 'R-01234',
    name: 'Stochastic Rainstorm Event 1234',
    type: 'Rainstorm',
    year: 1234,
    maxWindSpeed: 'N/A',
    totalRainfall: '550 mm in 24h',
    estimatedLoss: '$280 Million',
    affectedPopulation: '5.1 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.1722, 22.3193]
    }
  },
  {
    id: 'F-05678',
    name: 'Stochastic Flood Event 5678',
    type: 'Flood',
    year: 5678,
    maxWindSpeed: 'N/A',
    totalRainfall: '450 mm',
    estimatedLoss: '$180 Million',
    affectedPopulation: '450,000',
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  },
  {
    id: 'S-02468',
    name: 'Stochastic Storm Surge Event 2468',
    type: 'Storm Surge',
    year: 2468,
    maxWindSpeed: 'N/A',
    totalRainfall: '180 mm',
    estimatedLoss: '$420 Million',
    affectedPopulation: '1.2 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.2058, 22.3364]
    }
  },
  {
    id: 'T-03579',
    name: 'Stochastic Typhoon Event 3579',
    type: 'Typhoon',
    year: 3579,
    maxWindSpeed: '295 km/h',
    totalRainfall: '400 mm',
    estimatedLoss: '$7.8 Billion',
    affectedPopulation: '4.2 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.0947, 22.2569]
    }
  },
];

// 5. Legend Data
const legendData = [
    { color: "#f0f8ff", label: "0.0 - 0.2" },
    { color: "#d6eaff", label: "0.2 - 0.4" },
    { color: "#bce0ff", label: "0.4 - 0.6" },
    { color: "#a2d5ff", label: "0.6 - 0.8" },
    { color: "#87cefa", label: "0.8 - 1.0" },
    { color: "#6FB9F4", label: "1.0 - 2.0" },
    { color: "#3484E5", label: "2.0 - 3.0" },
    { color: "#0D55B6", label: "3.0 - 4.0" },
    { color: "#07396A", label: "4.0 - 5.0" },
    { color: "#08519c", label: "> 5.0" }
];

// Macau Flood Depth Legend (Classic International Standard - Scheme B)
const macauFloodDepthLegend = [
    { color: "#9B2226", label: "> 3.0m" },
    { color: "#D62828", label: "2.0 - 3.0m" },
    { color: "#E55934", label: "1.5 - 2.0m" },
    { color: "#F9A03F", label: "1.0 - 1.5m" },
    { color: "#FDE74C", label: "0.5 - 1.0m" },
    { color: "#5BC0EB", label: "0.2 - 0.5m" }
];

// 6. Legend Component
const Legend = ({ visibleLayers }: { visibleLayers: any }) => {
  // Determine legend title and data based on active layers
  const getLegendTitle = () => {
    // Check if any flood depth layers are visible (HK + MO)
    const allFloodLayers = [
      'macauDesignScenario', 'macauHistTC', 'macauHistRain',
      'hkFloodRain5', 'hkFloodRain10', 'hkFloodRain20', 'hkFloodRain50',
      'hkFloodRain100', 'hkFloodRain200', 'hkFloodRain500', 'hkFloodRain1000',
      'hkFloodSurgeQ90', 'hkFloodSurgeQ95', 'hkFloodSurgeQ98', 'hkFloodSurgeQ99', 'hkFloodSurgeExpected',
      'hkFloodWave5', 'hkFloodWave10', 'hkFloodWave20', 'hkFloodWave50',
      'hkFloodWave100', 'hkFloodWave200', 'hkFloodWave500', 'hkFloodWave1000',
      'flood500yr', 'flood200yr', 'flood100yr', 'flood50yr', 'flood20yr',
      'floodNoDrainage500yr', 'floodNoDrainage200yr', 'floodNoDrainage100yr',
      'floodNoDrainage50yr', 'floodNoDrainage20yr',
    ];
    if (allFloodLayers.some(layer => visibleLayers[layer])) {
      return 'Flood Depth (m)';
    }

    // Check if any IBTrACS typhoon track layers are visible
    if (visibleLayers.globalTyphoonTracks || visibleLayers.globalTyphoonPoints) {
      return 'Typhoon Category (Saffir-Simpson Scale)';
    }

    // Check if any rainstorm intensity layers are visible
    const rainstormLayers = ['rainstorm500yr', 'rainstorm200yr', 'rainstorm100yr', 'rainstorm50yr', 'rainstorm20yr'];
    if (rainstormLayers.some(layer => visibleLayers[layer])) {
      return 'Rainstorm Intensity (mm/hr)';
    }

    // Check if any typhoon layers are visible
    const typhoonLayers = ['typhoonTD', 'typhoonTS', 'typhoonSTS', 'typhoonTY', 'typhoonSTY', 'typhoonSuperTY'];
    if (typhoonLayers.some(layer => visibleLayers[layer])) {
      return 'Typhoon Intensity';
    }

    // Default to Risk Level for composite layers
    return 'Risk Level';
  };

  // Get legend data based on active layers
  const getLegendData = () => {
    // Flood depth legend (HK + MO - all use same classic style now)
    const allFloodLayers = [
      'macauDesignScenario', 'macauHistTC', 'macauHistRain',
      'hkFloodRain5', 'hkFloodRain10', 'hkFloodRain20', 'hkFloodRain50',
      'hkFloodRain100', 'hkFloodRain200', 'hkFloodRain500', 'hkFloodRain1000',
      'hkFloodSurgeQ90', 'hkFloodSurgeQ95', 'hkFloodSurgeQ98', 'hkFloodSurgeQ99', 'hkFloodSurgeExpected',
      'hkFloodWave5', 'hkFloodWave10', 'hkFloodWave20', 'hkFloodWave50',
      'hkFloodWave100', 'hkFloodWave200', 'hkFloodWave500', 'hkFloodWave1000',
      'flood500yr', 'flood200yr', 'flood100yr', 'flood50yr', 'flood20yr',
      'floodNoDrainage500yr', 'floodNoDrainage200yr', 'floodNoDrainage100yr',
      'floodNoDrainage50yr', 'floodNoDrainage20yr',
    ];
    if (allFloodLayers.some(layer => visibleLayers[layer])) {
      return macauFloodDepthLegend;
    }

    // Typhoon category legend for IBTrACS tracks
    if (visibleLayers.globalTyphoonTracks || visibleLayers.globalTyphoonPoints) {
      return [
        { color: '#8B0000', label: 'Category 5 (≥ 137 kt / 252 km/h)' },
        { color: '#FF0000', label: 'Category 4 (113-136 kt / 209-251 km/h)' },
        { color: '#FF6600', label: 'Category 3 (96-112 kt / 178-208 km/h)' },
        { color: '#FFCC00', label: 'Category 2 (83-95 kt / 154-177 km/h)' },
        { color: '#FFFF00', label: 'Category 1 (64-82 kt / 119-153 km/h)' },
        { color: '#00CED1', label: 'Tropical Storm (34-63 kt / 63-118 km/h)' },
        { color: '#4169E1', label: 'Tropical Depression (< 34 kt / 63 km/h)' },
      ];
    }

    // Default risk level legend
    return legendData;
  };

  return (
    <div className="absolute bottom-6 right-6 z-[1000] bg-white p-4 rounded-lg shadow-lg border border-gray-300 max-w-xs">
      <h3 className="text-sm font-semibold mb-2">{getLegendTitle()}</h3>
      <div className="flex flex-col space-y-1">
        {getLegendData().map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-2">
            <div
              className="w-5 h-4 border border-gray-300 rounded flex-shrink-0"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-xs leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. Create custom marker icon
// Creates a TIV-sized circular marker. If tiv & maxTiv supplied, the radius scales with sqrt(tiv).
// If isTopN is true, uses a gold/orange palette to highlight high-value assets.
const createTIVMarker = (tiv?: number, maxTiv?: number, isTopN?: boolean) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');

  // Size: 14px floor → 44px ceiling, sqrt scaling (proportional to TIV)
  let size = 22;
  if (tiv && maxTiv && maxTiv > 0) {
    const ratio = Math.sqrt(Math.max(0, tiv) / maxTiv); // 0..1
    size = Math.round(14 + ratio * 30);
  }
  const ring = isTopN ? '#f59e0b' : '#ffffff';
  const fill = isTopN
    ? 'radial-gradient(circle at 35% 35%, #fbbf24 0%, #f59e0b 60%, #d97706 100%)'
    : 'radial-gradient(circle at 35% 35%, #a78bfa 0%, #7c3aed 60%, #5b21b6 100%)';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${fill};
      border:2px solid ${ring};
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createCustomIcon = () => {
  if (typeof window === 'undefined') return null;
  
  const L = require('leaflet');
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// 8. Create event marker icon (for historical disasters)
const createEventIcon = (eventType: string) => {
  if (typeof window === 'undefined') return null;
  
  const L = require('leaflet');
  
  // Different colors for different event types
  const colors: { [key: string]: string } = {
    'Typhoon': '#dc2626',
    'Rainstorm': '#2563eb',
    'Flood': '#0891b2',
    'Storm Surge': '#7c3aed',
    'Landslide': '#ea580c'
  };
  
  const color = colors[eventType] || '#f97316';
  
  return L.divIcon({
    className: 'event-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="color: white; font-size: 12px; font-weight: bold;">!</span>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// 8. Vulnerability Curve Chart Component
interface VulnerabilityCurveChartProps {
  curveData: Array<{ depth: number; damage: number }>;
  structureType: string;
  buildingType: string;
  occupancyType: string;
}

const VulnerabilityCurveChart: React.FC<VulnerabilityCurveChartProps> = ({ 
  curveData, 
  structureType, 
  buildingType, 
  occupancyType 
}) => {
  const width = 320;
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Get color based on structure type
  const getColor = () => {
    const colors: Record<string, string> = {
      'concrete-frame': '#10b981', // green (low risk)
      'steel-frame': '#3b82f6',    // blue (low risk)
      'masonry': '#f59e0b',        // amber (medium risk)
      'wood-frame': '#ef4444',     // red (high risk)
    };
    return colors[structureType] || '#6b7280';
  };
  
  // Convert data points to SVG path
  const pathData = curveData.map((point, index) => {
    const x = padding.left + (point.depth / 5) * chartWidth;
    const y = padding.top + chartHeight - (point.damage * chartHeight);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  // Generate grid lines
  const xTicks = [0, 1, 2, 3, 4, 5];
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-800">📈 Vulnerability Curve</p>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor() }}></div>
          <span className="text-xs text-gray-600">{structureType}</span>
        </div>
      </div>
      
      <svg width={width} height={height} className="border border-gray-200 rounded bg-white">
        {/* Grid lines - Y axis */}
        {yTicks.map(tick => {
          const y = padding.top + chartHeight - (tick * chartHeight);
          return (
            <g key={`y-${tick}`}>
              <line 
                x1={padding.left} 
                y1={y} 
                x2={padding.left + chartWidth} 
                y2={y} 
                stroke="#e5e7eb" 
                strokeWidth="1"
              />
              <text 
                x={padding.left - 8} 
                y={y + 4} 
                textAnchor="end" 
                fontSize="10" 
                fill="#6b7280"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* Grid lines - X axis */}
        {xTicks.map(tick => {
          const x = padding.left + (tick / 5) * chartWidth;
          return (
            <g key={`x-${tick}`}>
              <line 
                x1={x} 
                y1={padding.top} 
                x2={x} 
                y2={padding.top + chartHeight} 
                stroke="#e5e7eb" 
                strokeWidth="1"
              />
              <text 
                x={x} 
                y={padding.top + chartHeight + 15} 
                textAnchor="middle" 
                fontSize="10" 
                fill="#6b7280"
              >
                {tick}m
              </text>
            </g>
          );
        })}
        
        {/* Curve path */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={getColor()} 
          strokeWidth="2.5"
        />
        
        {/* Axes */}
        <line 
          x1={padding.left} 
          y1={padding.top + chartHeight} 
          x2={padding.left + chartWidth} 
          y2={padding.top + chartHeight} 
          stroke="#374151" 
          strokeWidth="2"
        />
        <line 
          x1={padding.left} 
          y1={padding.top} 
          x2={padding.left} 
          y2={padding.top + chartHeight} 
          stroke="#374151" 
          strokeWidth="2"
        />
        
        {/* Axis labels */}
        <text 
          x={padding.left + chartWidth / 2} 
          y={height - 5} 
          textAnchor="middle" 
          fontSize="11" 
          fontWeight="600"
          fill="#374151"
        >
          Flood Depth (m)
        </text>
        <text 
          x={15} 
          y={padding.top + chartHeight / 2} 
          textAnchor="middle" 
          fontSize="11" 
          fontWeight="600"
          fill="#374151"
          transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
        >
          Damage Ratio
        </text>
      </svg>
      
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div>
            <p className="text-xs font-semibold text-gray-700">Current Configuration</p>
            <p className="text-xs text-gray-600 mt-1">
              Building: <span className="font-medium">{buildingType}</span> | 
              Structure: <span className="font-medium">{structureType}</span> | 
              Occupancy: <span className="font-medium">{occupancyType}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Curve ID</p>
            <p className="text-sm font-bold text-blue-600">{getMatchedCurve(structureType, buildingType, occupancyType).id}</p>
          </div>
        </div>
        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-900">
            💡 <span className="font-semibold">Interpretation:</span> This curve shows the expected damage ratio (0-100%) 
            for different flood depths (0-5m). Adjust building attributes in the card above to see different vulnerability profiles.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function for curve chart
const getMatchedCurve = (structure: string, building: string, occupancy: string) => {
  const curveKey = `${structure}-${building}-${occupancy}`;
  const curveMap: Record<string, { id: string; name: string; confidence: string }> = {
    'concrete-frame-commercial-office': { id: 'VUL_001', name: 'RC Frame Mid-Rise Office', confidence: 'High' },
    'concrete-frame-residential-apartment': { id: 'VUL_002', name: 'RC Frame Residential Tower', confidence: 'High' },
    'steel-frame-commercial-office': { id: 'VUL_003', name: 'Steel Frame Commercial', confidence: 'High' },
    'masonry-residential-house': { id: 'VUL_004', name: 'Masonry Low-Rise Residential', confidence: 'Medium' },
    'wood-frame-residential-house': { id: 'VUL_005', name: 'Wood Frame Single Family', confidence: 'Medium' },
  };
  return curveMap[curveKey] || { id: 'VUL_DEFAULT', name: 'Default Vulnerability Curve', confidence: 'Low' };
};

// 9. Main Component
export default function RiskMapPage() {
  const router = useRouter();
  const mapRef = useRef<LeafletMap | null>(null);
  const { regionConfig, currentRegion } = useRegion();

  // Macau Design Scenarios State - New flood layers uploaded to natcat_platform workspace
  // Rain-only (R), Surge-only (T), Combined (T+R)
  const MACAU_DESIGN_SCENARIO_FALLBACK_LAYERS = [
    // Rain-only scenarios
    'natcat_platform:MO_Flood_Design_Rain_R002',
    'natcat_platform:MO_Flood_Design_Rain_R005',
    'natcat_platform:MO_Flood_Design_Rain_R010',
    'natcat_platform:MO_Flood_Design_Rain_R020',
    'natcat_platform:MO_Flood_Design_Rain_R025',
    'natcat_platform:MO_Flood_Design_Rain_R050',
    'natcat_platform:MO_Flood_Design_Rain_R100',
    'natcat_platform:MO_Flood_Design_Rain_R200',
    'natcat_platform:MO_Flood_Design_Rain_R250',
    'natcat_platform:MO_Flood_Design_Rain_R500',
    'natcat_platform:MO_Flood_Design_Rain_R1000',
    // Surge-only scenarios
    'natcat_platform:MO_Flood_Design_Surge_T002',
    'natcat_platform:MO_Flood_Design_Surge_T005',
    'natcat_platform:MO_Flood_Design_Surge_T010',
    'natcat_platform:MO_Flood_Design_Surge_T020',
    'natcat_platform:MO_Flood_Design_Surge_T025',
    'natcat_platform:MO_Flood_Design_Surge_T050',
    'natcat_platform:MO_Flood_Design_Surge_T100',
    'natcat_platform:MO_Flood_Design_Surge_T200',
    'natcat_platform:MO_Flood_Design_Surge_T250',
    'natcat_platform:MO_Flood_Design_Surge_T500',
    'natcat_platform:MO_Flood_Design_Surge_T1000',
    // Combined Surge+Rain scenarios (T002 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T002R1000',
    // Combined (T005 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T005R1000',
    // Combined (T010 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T010R1000',
    // Combined (T020 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T020R1000',
    // Combined (T025 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T025R1000',
    // Combined (T050 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T050R1000',
    // Combined (T100 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T100R1000',
    // Combined (T200 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T200R1000',
    // Combined (T250 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T250R1000',
    // Combined (T500 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T500R1000',
    // Combined (T1000 series)
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R002',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R005',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R010',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R020',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R025',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R050',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R100',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R200',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R250',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R500',
    'natcat_platform:MO_Flood_Design_SurgeRain_T1000R1000',
  ];

  const [macauDesignScenarioLayers, setMacauDesignScenarioLayers] = useState<string[]>(MACAU_DESIGN_SCENARIO_FALLBACK_LAYERS);
  const [selectedMacauDesignScenario, setSelectedMacauDesignScenario] = useState<string>('none');
  const [isFetchingMacauLayers, setIsFetchingMacauLayers] = useState(false);

  // Hong Kong Flood Layer Dropdown State
  const [selectedHkRainLayer, setSelectedHkRainLayer] = useState<string>('none');
  const [selectedHkSurgeLayer, setSelectedHkSurgeLayer] = useState<string>('none');
  const [selectedHkWaveLayer, setSelectedHkWaveLayer] = useState<string>('none');

  // Dynamic Layer Configuration State
  const [wmsLayersConfig, setWmsLayersConfig] = useState(defaultWmsLayersConfig);

  // Try to fetch Macau Design Scenario layers from GeoServer (with fallback)
  useEffect(() => {
    const fetchMacauDesignLayers = async () => {
      if (currentRegion !== 'mo') return;
      
      setIsFetchingMacauLayers(true);
      try {
        // Fetch from natcat_platform workspace (new MO_Flood_Design_* layers)
        const workspaceWmsUrl = GEOSERVER_WMS_URL.replace('/geoserver/wms', '/geoserver/natcat_platform/wms');
        const capabilitiesUrl = `${workspaceWmsUrl}?service=WMS&version=1.1.0&request=GetCapabilities`;
        console.log('🔍 [MACAU LAYERS] Fetching from:', capabilitiesUrl);
        
        const response = await fetch(capabilitiesUrl);
        
        if (response.ok) {
          const text = await response.text();
          
          if (text.includes('ServiceException')) {
            console.warn('⚠️ [MACAU LAYERS] GeoServer returned an error, using fallback layer list');
            return;
          }
          
          // Match MO_Flood_Design_* layers from natcat_platform workspace
          const layerMatches = text.match(/<Name>natcat_platform:MO_Flood_Design_[^<]+<\/Name>/g);
          
          if (layerMatches && layerMatches.length > 0) {
            const layers = layerMatches
              .map(match => {
                const nameMatch = match.match(/<Name>([^<]+)<\/Name>/);
                return nameMatch ? nameMatch[1] : null;
              })
              .filter((name): name is string => name !== null)
              .sort();
            
            setMacauDesignScenarioLayers(layers);
            console.log('✅ [MACAU LAYERS] Found', layers.length, 'Design Scenario layers from GeoServer:', layers);
          } else {
            console.warn('⚠️ [MACAU LAYERS] No MO_Flood_Design layers found, using fallback layer list');
          }
        } else {
          console.warn('⚠️ [MACAU LAYERS] Failed to fetch from GeoServer, using fallback layer list');
        }
      } catch (error) {
        console.warn('⚠️ [MACAU LAYERS] Could not fetch layer list from GeoServer, using fallback:', error);
      } finally {
        setIsFetchingMacauLayers(false);
      }
    };

    fetchMacauDesignLayers();
  }, [currentRegion]);

  // Update WMS config based on selected Macau Design Scenario layer
  useEffect(() => {
    if (currentRegion === 'mo' && selectedMacauDesignScenario !== 'none') {
      // Parse layer name for display
      // e.g., "natcat_platform:MO_Flood_Design_SurgeRain_T100R100" → "Surge T100 + Rain R100"
      const layerShortName = selectedMacauDesignScenario.split(':')[1] || selectedMacauDesignScenario;
      let displayName = layerShortName;
      
      const matchCombined = layerShortName.match(/SurgeRain_T(\d+)R(\d+)/);
      const matchSurge = layerShortName.match(/Design_Surge_T(\d+)$/);
      const matchRain = layerShortName.match(/Design_Rain_R(\d+)$/);
      
      if (matchCombined) {
        displayName = `Surge ${matchCombined[1]}yr + Rain ${matchCombined[2]}yr`;
      } else if (matchSurge) {
        displayName = `Surge Only ${matchSurge[1]}yr`;
      } else if (matchRain) {
        displayName = `Rain Only ${matchRain[1]}yr`;
      }

      setWmsLayersConfig({
        ...defaultWmsLayersConfig,
        macauDesignScenario: { 
          name: `Macau Flood (${displayName})`, 
          layer: selectedMacauDesignScenario 
        }
      });
    } else {
      setWmsLayersConfig(defaultWmsLayersConfig);
    }
  }, [currentRegion, selectedMacauDesignScenario]);
  
  // 地图中心和缩放状态 - 默认使用 worldwide 视图
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]); // worldwide center
  const [mapZoom, setMapZoom] = useState(3); // worldwide zoom level
  
  // Base Map State
  const [baseMap, setBaseMap] = useState<'esri' | 'carto' | 'google' | 'amap'>('esri');
  
  // API Keys State
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [amapApiKey, setAmapApiKey] = useState('');
  const [showMapSettings, setShowMapSettings] = useState(false);

  // Load API keys from localStorage on mount
  useEffect(() => {
    // Try to get from environment variables first (with NEXT_PUBLIC_ prefix for client-side)
    const envGoogleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const envAmapKey = process.env.NEXT_PUBLIC_AMAP_API_KEY;

    // Then try localStorage
    const storedGoogleKey = localStorage.getItem('google_maps_api_key');
    const storedAmapKey = localStorage.getItem('amap_api_key');

    // Use environment variable if available, otherwise use localStorage
    const googleKey = envGoogleKey || storedGoogleKey || '';
    const amapKey = envAmapKey || storedAmapKey || '';

    if (googleKey) {
      setGoogleApiKey(googleKey);
      console.log('Google Maps API Key loaded:', googleKey.substring(0, 10) + '...');
    } else {
      console.warn('Google Maps API Key not found in environment or localStorage');
    }

    if (amapKey) {
      setAmapApiKey(amapKey);
      console.log('Amap API Key loaded:', amapKey.substring(0, 10) + '...');
    }
  }, []);

  // Save API keys to localStorage
  const handleSaveApiKeys = () => {
    if (googleApiKey) localStorage.setItem('google_maps_api_key', googleApiKey);
    if (amapApiKey) localStorage.setItem('amap_api_key', amapApiKey);
    alert('API Keys saved successfully!');
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
  // Test GeoServer connection on component mount (silently, non-blocking)
  useEffect(() => {
    const testGeoServerConnection = async () => {
      try {
        // Test Disaster Events GeoServer
        console.log('🔍 [GEOSERVER TEST] Testing Disaster Events GeoServer...');
        console.log('🔍 [GEOSERVER TEST] URL:', GEOSERVER_WMS_URL);

        const getCapabilitiesUrl = `${GEOSERVER_WMS_URL}?service=WMS&version=1.1.0&request=GetCapabilities`;
        console.log('🔍 [GEOSERVER TEST] GetCapabilities URL:', getCapabilitiesUrl);

        const response = await fetch(getCapabilitiesUrl);
        console.log('🔍 [GEOSERVER TEST] Response status:', response.status);

        if (!response.ok) {
          console.warn('⚠️ [GEOSERVER TEST] Failed to connect to Disaster Events GeoServer:', response.status);
        } else {
          const text = await response.text();
          console.log('✅ [GEOSERVER TEST] Disaster Events GeoServer is accessible!');
          console.log('📄 [GEOSERVER TEST] GetCapabilities response length:', text.length, 'characters');

          const macauLayers = text.match(/<Name>Macau:[^<]+<\/Name>/g);
          const globalLayers = text.match(/<Name>Global:[^<]+<\/Name>/g);

          console.log('📋 [GEOSERVER TEST] Disaster Events layers:');
          console.log('  - Macau workspace:', macauLayers?.length || 0, 'layers');
          console.log('  - Global workspace:', globalLayers?.length || 0, 'layers');
          if (macauLayers) console.log('  Macau layers:', macauLayers);
          if (globalLayers) console.log('  Global layers:', globalLayers);
        }

        // Test Geospatial Layers GeoServer
        console.log('\n🔍 [GEOSERVER TEST] Testing Geospatial Layers GeoServer...');
        console.log('🔍 [GEOSERVER TEST] URL:', GEOSERVER_GEOSPATIAL_URL);

        const geoCapabilitiesUrl = `${GEOSERVER_GEOSPATIAL_URL}?service=WMS&version=1.1.0&request=GetCapabilities`;
        console.log('🔍 [GEOSERVER TEST] GetCapabilities URL:', geoCapabilitiesUrl);

        const geoResponse = await fetch(geoCapabilitiesUrl);
        console.log('🔍 [GEOSERVER TEST] Response status:', geoResponse.status);

        if (!geoResponse.ok) {
          console.warn('⚠️ [GEOSERVER TEST] Failed to connect to Geospatial GeoServer:', geoResponse.status);
        } else {
          const geoText = await geoResponse.text();
          console.log('✅ [GEOSERVER TEST] Geospatial GeoServer is accessible!');
          console.log('📄 [GEOSERVER TEST] GetCapabilities response length:', geoText.length, 'characters');

          // Check if COP:Building layer exists
          if (geoText.includes('COP:Building')) {
            console.log('✅ [GEOSERVER TEST] COP:Building layer found in capabilities!');
          } else {
            console.warn('⚠️ [GEOSERVER TEST] COP:Building layer NOT found in capabilities!');
          }

          const copLayers = geoText.match(/<Name>COP:[^<]+<\/Name>/g);
          const itfLayers = geoText.match(/<Name>ITF:[^<]+<\/Name>/g);

          console.log('📋 [GEOSERVER TEST] Geospatial layers:');
          console.log('  - COP workspace:', copLayers?.length || 0, 'layers');
          console.log('  - ITF workspace:', itfLayers?.length || 0, 'layers');
          if (copLayers) console.log('  COP layers:', copLayers.slice(0, 10)); // Show first 10
          if (itfLayers) console.log('  ITF layers:', itfLayers.slice(0, 10)); // Show first 10
        }

      } catch (error) {
        // Silently log network errors (CORS, connection refused, etc.)
        // These are expected in development when GeoServer is not running locally
        console.warn('⚠️ [GEOSERVER TEST] Could not test GeoServer connection (this is normal if GeoServer is on a different network)');
        console.debug('Connection test error details:', error);
      }
    };

    testGeoServerConnection();
  }, []); // Run once on mount

  // 监听地区切换，更新地图中心
  useEffect(() => {
    if (regionConfig && regionConfig.coordinates.center) {
      const newCenter: [number, number] = [
        regionConfig.coordinates.center[0],
        regionConfig.coordinates.center[1]
      ];
      setMapCenter(newCenter);
      
      // 根据地区调整缩放级别
      const zoomLevels: { [key: string]: number } = {
        'worldwide': 3,
        'hk': 11,
        'mo': 12,
        'gba': 9,
        'th': 6,
        'vn': 6,
        'my': 6
      };
      setMapZoom(zoomLevels[currentRegion] || 10);
      
      // 如果地图已经初始化，飞到新位置
      if (mapRef.current) {
        mapRef.current.flyTo(newCenter, zoomLevels[currentRegion] || 10, {
          duration: 1.5
        });
      }
      
      console.log(`✈️ Map center updated to ${regionConfig.nameEn}:`, newCenter);
    }
  }, [regionConfig, currentRegion]);
  
  // ========== Core States ==========
  
  // ========== Portfolio Overlay States ==========
  // Toggle to show/hide portfolio data on map
  const [showPortfolioOverlay, setShowPortfolioOverlay] = useState(false);
  // Portfolio data for overlay visualization
  const [portfolioOverlayData, setPortfolioOverlayData] = useState<LocationData[]>([]);
  // Loading state for portfolio data
  const [portfolioOverlayLoading, setPortfolioOverlayLoading] = useState(false);
  // Selected data tier for portfolio overlay
  const [portfolioTier, setPortfolioTier] = useState<number>(1000);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  // Input mode: 'address' or 'coordinates'
  const [searchInputMode, setSearchInputMode] = useState<'address' | 'coordinates'>('address');
  // Separate lat/lng inputs for coordinates mode
  const [coordinateLat, setCoordinateLat] = useState('');
  const [coordinateLng, setCoordinateLng] = useState('');
  // Search results for selection
  const [searchResults, setSearchResults] = useState<Array<{
    address: string;
    latitude: number;
    longitude: number;
    source: string;
  }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Asset Info (auto-queried from location)
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  
  // Risk Scores (calculated from hazards + asset info)
  const [riskScores, setRiskScores] = useState<any>(null);
  
  // Asset Attributes (for vulnerability curve matching)
  const [assetAttributesOpen, setAssetAttributesOpen] = useState(false);
  const [vulnerabilityCurveChartOpen, setVulnerabilityCurveChartOpen] = useState(false);
  const [riskResultsFloatingOpen, setRiskResultsFloatingOpen] = useState(false);
  const [buildingType, setBuildingType] = useState('commercial');
  const [structureType, setStructureType] = useState('concrete-frame');
  const [occupancyType, setOccupancyType] = useState('office');
  
  // Advanced Options toggle
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  
  // Methodology info toggle
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Portfolio Exposure Overlay info toggle
  const [portfolioOverlayInfoOpen, setPortfolioOverlayInfoOpen] = useState(false);

  // Geospatial Data Hub toggle
  const [geospatialDataOpen, setGeospatialDataOpen] = useState(false);
  
  // Geospatial Data Hub layers (from cityinfo)
  const [urbanElements, setUrbanElements] = useState({
    topography: false,
    geomorphology: false,
    riverNetwork: false,
    boundary: false,
    landCover: false,
    buildingRisk: false,
    roadsAndStreets: false,
    landUse: false,
    drainageConduits: false,
    drainageJunctions: false,
    drainageOutfalls: false,
    defensiveEmbankments: false,
    serviceReservoirs: false,
    populationDensity: false,
    economicData: false,
    industrialCommercial: false,
    nighttimeLightIndex: false,
    poi: false,
    annualRainfall: false,
    annualTemperature: false,
    earthMapIntegration: false,
  });
  
  // Handle Geospatial Data Hub layer toggle
  const handleUrbanElementToggle = (elementKey: keyof typeof urbanElements) => {
    setUrbanElements(prev => {
      const newState = {
        ...prev,
        [elementKey]: !prev[elementKey]
      };
      console.log('🔧 [URBAN ELEMENT TOGGLE]', {
        elementKey,
        oldValue: prev[elementKey],
        newValue: newState[elementKey],
        fullState: newState
      });
      return newState;
    });
  };
  
  // Clear results when search query is cleared
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setAssetInfo(null);
      setRiskScores(null);
      setMarkerPosition(null);
      setRiskResultsFloatingOpen(false);
    }
  }, [searchQuery]);
  
  // Load portfolio data when overlay is enabled or region changes
  useEffect(() => {
    const loadPortfolioData = async () => {
      if (!showPortfolioOverlay) {
        setPortfolioOverlayData([]);
        return;
      }
      
      setPortfolioOverlayLoading(true);
      try {
        // Geographic bounds for valid portfolio data (Hong Kong & Macau only)
        const VALID_BOUNDS = {
          hk: { minLat: 22.15, maxLat: 22.56, minLng: 113.83, maxLng: 114.44 },
          mo: { minLat: 22.10, maxLat: 22.22, minLng: 113.52, maxLng: 113.60 }
        };
        
        // Check if coordinates are within valid bounds (HK or Macau)
        const isValidLocation = (lat: number, lng: number): boolean => {
          const inHK = lat >= VALID_BOUNDS.hk.minLat && lat <= VALID_BOUNDS.hk.maxLat &&
                       lng >= VALID_BOUNDS.hk.minLng && lng <= VALID_BOUNDS.hk.maxLng;
          const inMO = lat >= VALID_BOUNDS.mo.minLat && lat <= VALID_BOUNDS.mo.maxLat &&
                       lng >= VALID_BOUNDS.mo.minLng && lng <= VALID_BOUNDS.mo.maxLng;
          return inHK || inMO;
        };
        
        // Determine which data file to load based on region
        const regionDataConfig: Record<string, { path: string; limit?: number }[]> = {
          'hk': [{ path: '/data/tphk_portfolio_subset_5000.json', limit: portfolioTier }],
          'mo': [{ path: '/data/macau/tpmo-portfolio-enhanced-FULL.json', limit: portfolioTier }],
          'gba': [
            { path: '/data/tphk_portfolio_subset_5000.json', limit: Math.floor(portfolioTier / 2) },
            { path: '/data/macau/tpmo-portfolio-enhanced-FULL.json', limit: Math.floor(portfolioTier / 2) }
          ],
          'worldwide': [
            { path: '/data/tphk_portfolio_subset_5000.json', limit: Math.floor(portfolioTier / 2) },
            { path: '/data/macau/tpmo-portfolio-enhanced-FULL.json', limit: Math.floor(portfolioTier / 2) }
          ]
        };
        
        const filesToLoad = regionDataConfig[currentRegion] || regionDataConfig['worldwide'];
        const allData: LocationData[] = [];
        
        for (const fileConfig of filesToLoad) {
          try {
            const response = await fetch(fileConfig.path);
            if (response.ok) {
              const rawData = await response.json();
              const rows = Array.isArray(rawData) ? rawData : [];
              
              // Transform data to LocationData format with geographic validation
              const transformed: LocationData[] = rows
                .filter((item: any) => {
                  const location = item?.location;
                  if (!location) return false;
                  const lat = Number(location.lat);
                  const lng = Number(location.lng);
                  // Must be valid number AND within HK/Macau bounds
                  return Number.isFinite(lat) && Number.isFinite(lng) && isValidLocation(lat, lng);
                })
                .slice(0, fileConfig.limit || 2000)
                .map((item: any) => {
                  const location = item.location || {};
                  return {
                    lat: Number(location.lat),
                    lng: Number(location.lng),
                    sum_insured: Number(item.公司保额 ?? item.公司保額 ?? item.company_sum_insured ?? item.sum_insured ?? 0),
                    address: String(item.标的位置 ?? item.保險處所 ?? item.address ?? ''),
                    region: String(item.parish ?? item.分區 ?? item.region ?? ''),
                    policy_id: String(item.policyno ?? item.保單號 ?? item.policy_id ?? item.id ?? ''),
                    occupancy: item.occupation_desc ? String(item.occupation_desc) : (item.occupancy ? String(item.occupancy) : undefined),
                    construction: item.construction ? String(item.construction) : undefined,
                  };
                });
              
              allData.push(...transformed);
            }
          } catch (err) {
            console.warn(`Failed to load ${fileConfig.path}:`, err);
          }
        }
        
        setPortfolioOverlayData(allData);
        console.log(`📊 [PORTFOLIO OVERLAY] Loaded ${allData.length} locations for region: ${currentRegion}`);
      } catch (error) {
        console.error('Failed to load portfolio overlay data:', error);
        setPortfolioOverlayData([]);
      } finally {
        setPortfolioOverlayLoading(false);
      }
    };
    
    loadPortfolioData();
  }, [showPortfolioOverlay, currentRegion, portfolioTier]);
  
  // ========== Historical Disaster Repository States ==========
  
  // Layer category toggle (which layer group to show, null = none selected)
  const [activeLayerCategory, setActiveLayerCategory] = useState<'geography' | 'infrastructure' | 'socioeconomic' | 'weather' | null>(null);
  
  // Event Repository toggle (which dataset to show, null = none selected)
  const [activeEventDataset, setActiveEventDataset] = useState<'historical' | 'stochastic' | null>(null);
  
  // Flood Without Drainage selector
  const [selectedFloodNoDrainage, setSelectedFloodNoDrainage] = useState<string>('none');
  
  // Historical Disaster Repository toggle
  const [historicalDisasterOpen, setHistoricalDisasterOpen] = useState(false);
  
  // Historical Events data and filtering
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>(historicalEventsData as HistoricalEvent[]);
  const [filteredHistoricalEvents, setFilteredHistoricalEvents] = useState<HistoricalEvent[]>(historicalEventsData as HistoricalEvent[]);
  const [showHistoricalEvents, setShowHistoricalEvents] = useState(false);
  
  // ========== Area Risk Assessment States ==========
  const [drawMode, setDrawMode] = useState(false); // Toggle drawing mode
  const [drawnShape, setDrawnShape] = useState<any>(null); // Store the drawn shape
  const [areaRiskData, setAreaRiskData] = useState<any>(null); // Store area risk results
  const [isCalculatingArea, setIsCalculatingArea] = useState(false); // Loading state for area calculation
  const [areaCalculationProgress, setAreaCalculationProgress] = useState({ current: 0, total: 0 }); // Progress tracker
  const [areaRiskFloatingOpen, setAreaRiskFloatingOpen] = useState(false); // Toggle floating card display
  
  // Event filter states
  const [eventTypeFilter, setEventTypeFilter] = useState('Typhoon');
  const [eventYearFrom, setEventYearFrom] = useState('');
  const [eventYearTo, setEventYearTo] = useState('');

  // Selected event for details
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  // Selected typhoon event from dropdown
  const [selectedTyphoonEventId, setSelectedTyphoonEventId] = useState<string>('');

  // Selected flood event from dropdown
  const [selectedFloodEventId, setSelectedFloodEventId] = useState<string>('');

  // Macau Historical TC/Rain Event Layers (for Disaster Hub)
  const [selectedHistTCLayer, setSelectedHistTCLayer] = useState<string>('none');
  const [selectedHistRainLayer, setSelectedHistRainLayer] = useState<string>('none');

  // Historical TC event layers (98 events)
  const HIST_TC_LAYERS: { layer: string; display: string; year: string }[] = [
    { layer: 'natcat_platform:MO_Flood_HistTC_1990_0036', display: 'TC 1990-0036', year: '1990' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1990_0038', display: 'TC 1990-0038', year: '1990' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1990_0078', display: 'TC 1990-0078', year: '1990' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0171', display: 'TC 1991-0171', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0172', display: 'TC 1991-0172', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0225', display: 'TC 1991-0225', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0226', display: 'TC 1991-0226', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0227', display: 'TC 1991-0227', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0228', display: 'TC 1991-0228', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0229', display: 'TC 1991-0229', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0230', display: 'TC 1991-0230', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0231', display: 'TC 1991-0231', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1991_0518', display: 'TC 1991-0518', year: '1991' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1994_0138', display: 'TC 1994-0138', year: '1994' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1994_0139', display: 'TC 1994-0139', year: '1994' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1994_0140', display: 'TC 1994-0140', year: '1994' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0202', display: 'TC 1996-0202', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0226', display: 'TC 1996-0226', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0227', display: 'TC 1996-0227', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0228', display: 'TC 1996-0228', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0229', display: 'TC 1996-0229', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1996_0230', display: 'TC 1996-0230', year: '1996' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1999_0301', display: 'TC 1999-0301', year: '1999' },
    { layer: 'natcat_platform:MO_Flood_HistTC_1999_0374', display: 'TC 1999-0374', year: '1999' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2000_0557', display: 'TC 2000-0557', year: '2000' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0322', display: 'TC 2001-0322', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0323', display: 'TC 2001-0323', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0419', display: 'TC 2001-0419', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0796', display: 'TC 2001-0796', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0797', display: 'TC 2001-0797', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2001_0798', display: 'TC 2001-0798', year: '2001' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2003_0346', display: 'TC 2003-0346', year: '2003' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2003_0347', display: 'TC 2003-0347', year: '2003' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2003_0443', display: 'TC 2003-0443', year: '2003' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2005_0420', display: 'TC 2005-0420', year: '2005' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2005_0540', display: 'TC 2005-0540', year: '2005' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2006_0251', display: 'TC 2006-0251', year: '2006' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2006_0388', display: 'TC 2006-0388', year: '2006' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2006_0389', display: 'TC 2006-0389', year: '2006' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2007_0390', display: 'TC 2007-0390', year: '2007' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2008_0155', display: 'TC 2008-0155', year: '2008' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2008_0249', display: 'TC 2008-0249', year: '2008' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2008_0329', display: 'TC 2008-0329', year: '2008' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2008_0369', display: 'TC 2008-0369', year: '2008' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2008_0426', display: 'TC 2008-0426', year: '2008' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0391', display: 'TC 2009-0391', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0392', display: 'TC 2009-0392', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0393', display: 'TC 2009-0393', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0394', display: 'TC 2009-0394', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0395', display: 'TC 2009-0395', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2009_0399', display: 'TC 2009-0399', year: '2009' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2010_0332', display: 'TC 2010-0332', year: '2010' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2010_0333', display: 'TC 2010-0333', year: '2010' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2010_0484', display: 'TC 2010-0484', year: '2010' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2010_0543', display: 'TC 2010-0543', year: '2010' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2011_0576', display: 'TC 2011-0576', year: '2011' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2011_0577', display: 'TC 2011-0577', year: '2011' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2012_0259', display: 'TC 2012-0259', year: '2012' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2012_0294', display: 'TC 2012-0294', year: '2012' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2013_0258', display: 'TC 2013-0258', year: '2013' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2013_0341', display: 'TC 2013-0341', year: '2013' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2013_0342', display: 'TC 2013-0342', year: '2013' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2013_0373', display: 'TC 2013-0373', year: '2013' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2014_0227', display: 'TC 2014-0227', year: '2014' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2014_0390', display: 'TC 2014-0390', year: '2014' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2015_0278', display: 'TC 2015-0278', year: '2015' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2015_0490', display: 'TC 2015-0490', year: '2015' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2015_0491', display: 'TC 2015-0491', year: '2015' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2016_0363', display: 'TC 2016-0363', year: '2016' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2016_0364', display: 'TC 2016-0364', year: '2016' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2016_0379', display: 'TC 2016-0379', year: '2016' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0325', display: 'TC 2017-0325', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0326', display: 'TC 2017-0326', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0327', display: 'TC 2017-0327', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0485', display: 'TC 2017-0485', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0486', display: 'TC 2017-0486', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2017_0487', display: 'TC 2017-0487', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2018_0201', display: 'TC 2018-0201', year: '2018' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2018_0305', display: 'TC 2018-0305', year: '2018' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2018_0342', display: 'TC 2018-0342', year: '2018' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2019_0343', display: 'TC 2019-0343', year: '2019' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2019_0344', display: 'TC 2019-0344', year: '2019' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2019_0345', display: 'TC 2019-0345', year: '2019' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2019_0346', display: 'TC 2019-0346', year: '2019' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2019_0347', display: 'TC 2019-0347', year: '2019' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2022_2203', display: 'TC 2022-2203', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2022_2207', display: 'TC 2022-2207', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2022_2209', display: 'TC 2022-2209', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2022_2222', display: 'TC 2022-2222', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2023_2304', display: 'TC 2023-2304', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2023_2309', display: 'TC 2023-2309', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2023_2314', display: 'TC 2023-2314', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2024_2404', display: 'TC 2024-2404', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2024_2411', display: 'TC 2024-2411', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistTC_2024_2424', display: 'TC 2024-2424', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistTC_Hato', display: 'TC Hato (天鸽) 2017', year: '2017' },
    { layer: 'natcat_platform:MO_Flood_HistTC_Mangkhut', display: 'TC Mangkhut (山竹) 2018', year: '2018' },
    { layer: 'natcat_platform:MO_Flood_HistTC_Ragasa', display: 'TC Ragasa (桦加沙) 2023', year: '2023' },
  ];

  // Historical Rain event layers (29 events)
  const HIST_RAIN_LAYERS: { layer: string; display: string; year: string }[] = [
    { layer: 'natcat_platform:MO_Flood_HistRain_20200908', display: 'Rain 2020-09-08', year: '2020' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210601', display: 'Rain 2021-06-01', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210622', display: 'Rain 2021-06-22', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210623', display: 'Rain 2021-06-23', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210628', display: 'Rain 2021-06-28', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210724', display: 'Rain 2021-07-24', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20210801', display: 'Rain 2021-08-01', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20211008', display: 'Rain 2021-10-08', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20211010', display: 'Rain 2021-10-10', year: '2021' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20220511', display: 'Rain 2022-05-11', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20220512', display: 'Rain 2022-05-12', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20220607', display: 'Rain 2022-06-07', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20220608', display: 'Rain 2022-06-08', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20220811', display: 'Rain 2022-08-11', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20221007', display: 'Rain 2022-10-07', year: '2022' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20230601', display: 'Rain 2023-06-01', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20230614', display: 'Rain 2023-06-14', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20230908', display: 'Rain 2023-09-08', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20230915', display: 'Rain 2023-09-15', year: '2023' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240430', display: 'Rain 2024-04-30', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240504', display: 'Rain 2024-05-04', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240512', display: 'Rain 2024-05-12', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240603', display: 'Rain 2024-06-03', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240615', display: 'Rain 2024-06-15', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240815', display: 'Rain 2024-08-15', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240817', display: 'Rain 2024-08-17', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240818', display: 'Rain 2024-08-18', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20240906', display: 'Rain 2024-09-06', year: '2024' },
    { layer: 'natcat_platform:MO_Flood_HistRain_20250814', display: 'Rain 2025-08-14', year: '2025' },
  ];

  // Update WMS config when a Historical TC or Rain layer is selected in Disaster Events
  useEffect(() => {
    const updates: Record<string, { name: string; layer: string }> = {};
    
    if (selectedHistTCLayer !== 'none') {
      const tcInfo = HIST_TC_LAYERS.find(l => l.layer === selectedHistTCLayer);
      updates.macauHistTC = {
        name: `MO Hist TC Flood (${tcInfo?.display || selectedHistTCLayer})`,
        layer: selectedHistTCLayer
      };
    }
    if (selectedHistRainLayer !== 'none') {
      const rainInfo = HIST_RAIN_LAYERS.find(l => l.layer === selectedHistRainLayer);
      updates.macauHistRain = {
        name: `MO Hist Rain Flood (${rainInfo?.display || selectedHistRainLayer})`,
        layer: selectedHistRainLayer
      };
    }
    
    if (Object.keys(updates).length > 0) {
      setWmsLayersConfig(prev => ({ ...prev, ...updates }));
      // Auto-enable the layers
      setVisibleLayers(prev => ({
        ...prev,
        ...(updates.macauHistTC ? { macauHistTC: true } : {}),
        ...(updates.macauHistRain ? { macauHistRain: true } : {}),
      }));
    } else {
      // Remove hist layers from config + visibility
      setVisibleLayers(prev => {
        const next = { ...prev };
        delete (next as any).macauHistTC;
        delete (next as any).macauHistRain;
        return next;
      });
    }
  }, [selectedHistTCLayer, selectedHistRainLayer]);

  // Disaster event category selection (for dropdown)
  const [selectedDisasterCategory, setSelectedDisasterCategory] = useState<string>('');

  // Black Rain Station Map toggle (HK Rainfall demo)
  const [showBlackRainMap, setShowBlackRainMap] = useState(false);

  // Geospatial layer category selection (for dropdown)
  const [selectedGeospatialCategory, setSelectedGeospatialCategory] = useState<string>('');
  
  // Filter historical events
  useEffect(() => {
    let filtered = historicalEvents;
    
    // Filter by event type
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === eventTypeFilter);
    }
    
    // Filter by year range
    if (eventYearFrom) {
      filtered = filtered.filter(event => event.year >= parseInt(eventYearFrom));
    }
    if (eventYearTo) {
      filtered = filtered.filter(event => event.year <= parseInt(eventYearTo));
    }
    
    setFilteredHistoricalEvents(filtered);
  }, [eventTypeFilter, eventYearFrom, eventYearTo, historicalEvents]);
  
  // ========== Stochastic Events Repository States ==========
  
  // Stochastic Events data and filtering
  const [stochasticEvents] = useState<StochasticEvent[]>(mockStochasticEvents);
  const [filteredStochasticEvents, setFilteredStochasticEvents] = useState<StochasticEvent[]>(mockStochasticEvents);
  const [showStochasticEvents, setShowStochasticEvents] = useState(false);
  
  // Stochastic event filter states
  const [stochasticEventType, setStochasticEventType] = useState('all');
  const [stochasticYearFrom, setStochasticYearFrom] = useState('');
  const [stochasticYearTo, setStochasticYearTo] = useState('');
  
  // Selected stochastic event for details
  const [selectedStochasticEvent, setSelectedStochasticEvent] = useState<StochasticEvent | null>(null);
  
  // Filter stochastic events
  useEffect(() => {
    let filtered = stochasticEvents;
    
    // Filter by event type
    if (stochasticEventType !== 'all') {
      filtered = filtered.filter(event => event.type === stochasticEventType);
    }
    
    // Filter by simulation year range
    if (stochasticYearFrom) {
      filtered = filtered.filter(event => event.year >= parseInt(stochasticYearFrom));
    }
    if (stochasticYearTo) {
      filtered = filtered.filter(event => event.year <= parseInt(stochasticYearTo));
    }
    
    setFilteredStochasticEvents(filtered);
  }, [stochasticEventType, stochasticYearFrom, stochasticYearTo, stochasticEvents]);
  
  // Calculate vulnerability based on structure type
  const getVulnerability = () => {
    if (structureType === 'concrete-frame' || structureType === 'steel-frame') return 'low';
    if (structureType === 'masonry') return 'medium';
    if (structureType === 'wood-frame') return 'high';
    return 'medium';
  };
  
  // Generate vulnerability curve data (Flood Depth vs Damage Ratio)
  const generateVulnerabilityCurve = () => {
    // Base parameters by structure type
    const structureParams: Record<string, { a: number; b: number; c: number }> = {
      'concrete-frame': { a: 0.35, b: 0.15, c: 1.2 },  // Low vulnerability
      'steel-frame': { a: 0.38, b: 0.18, c: 1.1 },      // Low vulnerability
      'masonry': { a: 0.50, b: 0.25, c: 0.9 },          // Medium vulnerability
      'wood-frame': { a: 0.65, b: 0.35, c: 0.7 },       // High vulnerability
    };
    
    // Building type adjustment factor
    const buildingFactors: Record<string, number> = {
      'residential': 1.0,
      'commercial': 0.95,
      'industrial': 1.05,
      'public': 0.90,
    };
    
    // Occupancy type adjustment factor
    const occupancyFactors: Record<string, number> = {
      'office': 0.95,
      'retail': 1.0,
      'warehouse': 1.05,
      'apartment': 1.0,
      'house': 1.05,
      'hospital': 0.85,
      'school': 0.90,
    };
    
    const params = structureParams[structureType] || structureParams['concrete-frame'];
    const buildingFactor = buildingFactors[buildingType] || 1.0;
    const occupancyFactor = occupancyFactors[occupancyType] || 1.0;
    
    // Generate curve points (0-5m flood depth)
    const points: Array<{ depth: number; damage: number }> = [];
    for (let depth = 0; depth <= 5; depth += 0.1) {
      // Sigmoid-like curve: damage = a * (1 - exp(-b * depth^c))
      let damage = params.a * (1 - Math.exp(-params.b * Math.pow(depth, params.c)));
      damage *= buildingFactor * occupancyFactor;
      damage = Math.min(1.0, Math.max(0, damage)); // Clamp between 0-1
      points.push({ depth: Number(depth.toFixed(1)), damage: Number(damage.toFixed(3)) });
    }
    
    return points;
  };
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Map marker position (for location query result)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [typhoonPopup, setTyphoonPopup] = useState<{ position: LatLngLiteral; properties: Record<string, any> } | null>(null);
  const [typhoonInfoLoading, setTyphoonInfoLoading] = useState(false);
  const [typhoonInfoError, setTyphoonInfoError] = useState<string | null>(null);

  // Typhoon wind circle visualization
  const [typhoonWindCircles, setTyphoonWindCircles] = useState<Array<{
    center: LatLngLiteral;
    radius: number;
    label: string;
    color: string;
  }>>([]);
  
  // Query results visibility (collapsible details)
  const [resultsExpanded, setResultsExpanded] = useState(true);
  
  // ========== Batch Portfolio Query States ==========
  
  // Batch query mode toggle
  const [batchQueryMode, setBatchQueryMode] = useState(false);
  
  // Portfolio locations data
  const [portfolioLocations, setPortfolioLocations] = useState<any[]>([]);
  // Portfolio filtering / ranking
  const [portfolioTopN, setPortfolioTopN] = useState<'all' | '10' | '20' | '50' | '100'>('all');
  const [portfolioSortBy, setPortfolioSortBy] = useState<'totalTIV' | 'buildingTIV' | 'contentTIV' | 'biTIV'>('totalTIV');
  const [portfolioOccupancyFilter, setPortfolioOccupancyFilter] = useState<string[]>([]);
  const [occupancyDropdownOpen, setOccupancyDropdownOpen] = useState(false);
  const [occupancySearch, setOccupancySearch] = useState('');
  const [epCurveOpen, setEpCurveOpen] = useState(false);
  // EP curve data parsed from uploaded portfolio file. Key = peril name.
  const [epCurveData, setEpCurveData] = useState<Record<string, {
    points: { prob: number; rp: number; gu: number; gross: number }[];
    aal?: { gu: number; gross: number };
    sd?: { gu: number; gross: number };
    cov?: { gu: number; gross: number };
    modelledExposure?: number;
    currency?: string;
  }>>({});
  const [epCurvePeril, setEpCurvePeril] = useState<string>('Earthquake');

  // Unique occupancy values present in current portfolio (for filter chips)
  const portfolioOccupancyOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    portfolioLocations.forEach(l => { if (l.occupancy) set.add(String(l.occupancy)); });
    return Array.from(set).sort();
  }, [portfolioLocations]);

  // Filtered + sorted + top-N portfolio used by both markers and list panel
  const filteredPortfolioLocations = useMemo<any[]>(() => {
    let arr = portfolioLocations.filter(l =>
      Number.isFinite(l.latitude) && Number.isFinite(l.longitude) && l.status !== 'error'
    );
    if (portfolioOccupancyFilter.length > 0) {
      arr = arr.filter(l => portfolioOccupancyFilter.includes(String(l.occupancy || '')));
    }
    arr = [...arr].sort((a, b) => (b[portfolioSortBy] || 0) - (a[portfolioSortBy] || 0));
    if (portfolioTopN !== 'all') {
      arr = arr.slice(0, parseInt(portfolioTopN, 10));
    }
    return arr;
  }, [portfolioLocations, portfolioTopN, portfolioSortBy, portfolioOccupancyFilter]);

  // Max TIV across the filtered set, used for proportional marker sizing
  const filteredMaxTIV = useMemo<number>(() => {
    let m = 0;
    filteredPortfolioLocations.forEach(l => {
      const v = l[portfolioSortBy] || 0;
      if (v > m) m = v;
    });
    return m;
  }, [filteredPortfolioLocations, portfolioSortBy]);

  // IDs of the visible top-N for highlighting in both markers and list
  const visibleIdSet = useMemo<Set<string>>(
    () => new Set(filteredPortfolioLocations.map(l => String(l.id))),
    [filteredPortfolioLocations]
  );
  
  // Batch query progress
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // Selected portfolio item for details view
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any>(null);
  
  // Visible WMS layers
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    // Composite layers (default: all hidden until query)
    floodComposite: false,
    typhoonComposite: false,
    rainstormComposite: false,
    stormSurgeComposite: false,
    landslideComposite: false,
    
    // Detailed layers (for advanced view)
    flood500yr: false,
    flood200yr: false,
    flood100yr: false,
    flood50yr: false,
    flood20yr: false,
    floodNoDrainage500yr: false,
    floodNoDrainage200yr: false,
    floodNoDrainage100yr: false,
    floodNoDrainage50yr: false,
    floodNoDrainage20yr: false,
    rainstorm500yr: false,
    rainstorm200yr: false,
    rainstorm100yr: false,
    rainstorm50yr: false,
    rainstorm20yr: false,
    typhoonTD: false,
    typhoonTS: false,
    typhoonSTS: false,
    typhoonTY: false,
    typhoonSTY: false,
    typhoonSuperTY: false,
    typhoonTracks: false,
    geoLandslideHigh: false,
    geoLandslideMedium: false,
    geoLandslideLow: false,

    // Macau Flood Layers (Design Scenarios + Historical Events)
    macauDesignScenario: false,
    macauHistTC: false,
    macauHistRain: false,

    // Global Datasets
    globalTyphoonTracks: false,
    globalTyphoonPoints: false,
  });
  
  // ========== Helper Functions ==========
  
  // Detect if query contains Chinese characters
  const containsChinese = (text: string) => {
    return /[\u4e00-\u9fa5]/.test(text);
  };
  
  // Try Google Maps Geocoding
  const geocodeWithGoogle = async (query: string) => {
    if (!googleApiKey) throw new Error('Google Maps API Key not configured');
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          address: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          source: 'Google Maps',
        };
      }
      throw new Error(data.error_message || 'No results from Google Maps');
    } catch (error) {
      console.warn('Google Maps geocoding failed:', error);
      throw error;
    }
  };

  // Try Amap (高德地图) Geocoding - Best for Chinese addresses
  const geocodeWithAmap = async (query: string) => {
    if (!amapApiKey) throw new Error('Amap API Key not configured');

    try {
      // Detect Hong Kong addresses and add city parameter
      let city = '';
      const hongkongKeywords = ['香港', '港島', '九龍', '新界', 'Hong Kong', 'HK', '北角', '中環', '尖沙咀', '銅鑼灣'];
      const isHongKong = hongkongKeywords.some(keyword => query.includes(keyword));

      if (isHongKong) {
        city = '香港';
      }

      // Build URL with city parameter if detected
      let url = `https://restapi.amap.com/v3/geocode/geo?key=${amapApiKey}&address=${encodeURIComponent(query)}`;
      if (city) {
        url += `&city=${encodeURIComponent(city)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Amap API unavailable');
      }

      const data = await response.json();

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const result = data.geocodes[0];
        const [lon, lat] = result.location.split(',').map(parseFloat);

        return {
          address: result.formatted_address,
          latitude: lat,
          longitude: lon,
          source: 'Amap (高德地图)',
        };
      }

      throw new Error('No results from Amap');
    } catch (error) {
      console.warn('Amap geocoding failed:', error);
      throw error;
    }
  };
  
  // Try Baidu Maps Geocoding - Alternative for Chinese addresses
  const geocodeWithBaidu = async (query: string) => {
    try {
      // Baidu Maps API Key (register at https://lbsyun.baidu.com/)
      const BAIDU_KEY = 'YOUR_BAIDU_KEY_HERE'; // TODO: Replace with your Baidu API key
      
      const url = `https://api.map.baidu.com/geocoding/v3/?address=${encodeURIComponent(query)}&output=json&ak=${BAIDU_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Baidu API unavailable');
      }
      
      const data = await response.json();
      
      if (data.status === 0 && data.result && data.result.location) {
        return {
          address: query,
          latitude: data.result.location.lat,
          longitude: data.result.location.lng,
          source: 'Baidu Maps (百度地图)',
        };
      }
      
      throw new Error('No results from Baidu');
    } catch (error) {
      console.warn('Baidu geocoding failed:', error);
      throw error;
    }
  };
  
  // Try Nominatim (OpenStreetMap) - Good for international addresses
  const geocodeWithNominatim = async (query: string) => {
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'NatCatRiskPlatform/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Nominatim service unavailable');
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('No results from Nominatim');
      }
      
      const result = data[0];
      return {
        address: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        source: 'OpenStreetMap Nominatim',
      };
    } catch (error) {
      console.warn('Nominatim geocoding failed:', error);
      throw error;
    }
  };
  
  // Main geocoding function with fallback strategy
  const geocodeAddress = async (query: string) => {
    try {
      // Check if input is already coordinates (format: lat,lon or lat, lon)
      const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
      const coordMatch = query.trim().match(coordPattern);
      
      if (coordMatch) {
        // Direct coordinates input
        const latitude = parseFloat(coordMatch[1]);
        const longitude = parseFloat(coordMatch[2]);
        
        // Validate coordinates
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
        }
        
        // Reverse geocode to get address
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const reverseResponse = await fetch(reverseUrl, {
          headers: {
            'User-Agent': 'NatCatRiskPlatform/1.0'
          }
        });
        
        if (!reverseResponse.ok) {
          return {
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
            source: 'Direct Coordinates',
          };
        }
        
        const reverseData = await reverseResponse.json();
        return {
          address: reverseData.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          latitude,
          longitude,
          source: 'Direct Coordinates',
        };
      }
      
      // For address queries, use intelligent fallback strategy
      const isChinese = containsChinese(query);

      // Detect Hong Kong/Macau addresses
      const hongkongKeywords = ['香港', '港島', '九龍', '新界', 'Hong Kong', 'HK', '北角', '中環', '尖沙咀', '銅鑼灣', '旺角', '灣仔'];
      const macauKeywords = ['澳門', 'Macau', '氹仔', '路環', 'Taipa', 'Coloane'];
      const isHongKong = hongkongKeywords.some(keyword => query.includes(keyword));
      const isMacau = macauKeywords.some(keyword => query.includes(keyword));
      const isHKMO = isHongKong || isMacau;

      // For Hong Kong/Macau addresses, prioritize Google Maps over Amap
      if (isHKMO) {
        // 1. Try Google Maps first (best for HK/Macau)
        if (googleApiKey) {
          try {
            console.log('🔍 Trying Google Maps geocoding for HK/Macau address...');
            return await geocodeWithGoogle(query);
          } catch (e) {
            console.warn('Google Maps failed, falling back...');
          }
        }

        // 2. Try Nominatim (better than Amap for HK/Macau)
        console.log('🔍 Trying Nominatim (OpenStreetMap) geocoding for HK/Macau...');
        try {
          const result = await geocodeWithNominatim(query);
          console.log('✅ Geocoding success with Nominatim:', result);
          return result;
        } catch (nominatimError: any) {
          console.warn('Nominatim geocoding failed:', nominatimError?.message || nominatimError);
        }

        // 3. Try Amap as last resort for HK/Macau
        if (amapApiKey) {
          try {
            console.log('🔍 Trying Amap geocoding (with city parameter)...');
            return await geocodeWithAmap(query);
          } catch (e) {
            console.warn('Amap failed');
          }
        }
      } else {
        // For mainland China and other addresses
        // 1. Try Google Maps if Key exists
        if (googleApiKey) {
          try {
            console.log('🔍 Trying Google Maps geocoding...');
            return await geocodeWithGoogle(query);
          } catch (e) {
            console.warn('Google Maps failed, falling back...');
          }
        }

        // 2. Try Amap if Key exists and is Chinese
        if (amapApiKey && isChinese) {
          try {
            console.log('🔍 Trying Amap geocoding...');
            return await geocodeWithAmap(query);
          } catch (e) {
            console.warn('Amap failed, falling back...');
          }
        }

        // 3. Fallback to Nominatim (OpenStreetMap)
        console.log('🔍 Trying Nominatim (OpenStreetMap) geocoding for query:', query);
        try {
          const result = await geocodeWithNominatim(query);
          console.log('✅ Geocoding success with Nominatim:', result);
          return result;
        } catch (nominatimError: any) {
          console.warn('Nominatim geocoding failed:', nominatimError?.message || nominatimError);
        }
      }
      

      // 所有服务都失败
      console.error('❌ All geocoding services failed for query:', query);
      throw new Error(`❌ Geocoding failed for "${query}". Please try:\n1. Using English address (e.g., "Central, Hong Kong")\n2. Adding more specific details (city, district)\n3. Using Lat/Lng mode to enter coordinates directly`);
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };

  // Search for multiple address results from all available services
  const searchAddressMultiple = async (query: string): Promise<Array<{
    address: string;
    latitude: number;
    longitude: number;
    source: string;
  }>> => {
    const results: Array<{
      address: string;
      latitude: number;
      longitude: number;
      source: string;
    }> = [];

    // Check if input is coordinates
    const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
    const coordMatch = query.trim().match(coordPattern);
    if (coordMatch) {
      const latitude = parseFloat(coordMatch[1]);
      const longitude = parseFloat(coordMatch[2]);
      results.push({
        address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        latitude,
        longitude,
        source: 'Direct Coordinates'
      });
      return results;
    }

    const isChinese = containsChinese(query);

    // 1. Try Nominatim (returns multiple results) - Good for Hong Kong
    try {
      console.log('🔍 Searching Nominatim...');
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'NatCatRiskPlatform/1.0' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          data.forEach((item: any) => {
            results.push({
              address: item.display_name,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              source: 'OpenStreetMap'
            });
          });
        }
      }
    } catch (e) {
      console.warn('Nominatim search failed:', e);
    }

    // 2. Try Google Maps if available (returns multiple results)
    if (googleApiKey) {
      try {
        console.log('🔍 Searching Google Maps...');
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results) {
          data.results.slice(0, 5).forEach((result: any) => {
            // Avoid duplicates
            const lat = result.geometry.location.lat;
            const lng = result.geometry.location.lng;
            const isDuplicate = results.some(r => 
              Math.abs(r.latitude - lat) < 0.0001 && Math.abs(r.longitude - lng) < 0.0001
            );
            if (!isDuplicate) {
              results.push({
                address: result.formatted_address,
                latitude: lat,
                longitude: lng,
                source: 'Google Maps'
              });
            }
          });
        }
      } catch (e) {
        console.warn('Google search failed:', e);
      }
    }

    // 3. Try Amap if available (supports both Chinese and English for HK/MO)
    if (amapApiKey) {
      try {
        console.log('🔍 Searching Amap...');

        // Detect Hong Kong/Macau keywords
        const hkKeywords = ['香港', '九龍', '九龙', '新界', 'hong kong', 'hongkong', 'hk', '中環', '中环', '銅鑼灣', '铜锣湾', '尖沙咀', '旺角', '北角', 'north point', 'central', 'causeway bay', 'tsim sha tsui', 'mong kok'];
        const moKeywords = ['澳門', '澳门', 'macau', 'macao', '氹仔', '路環', '路环', 'taipa', 'coloane'];
        const isHKQuery = hkKeywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()));
        const isMOQuery = moKeywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()));

        // Build Amap URL with city parameter if HK/MO detected
        let url = `https://restapi.amap.com/v3/geocode/geo?key=${amapApiKey}&address=${encodeURIComponent(query)}`;
        if (isHKQuery) {
          url += '&city=香港';
          console.log('🇭🇰 Hong Kong query detected, adding city parameter');
        } else if (isMOQuery) {
          url += '&city=澳门';
          console.log('🇲🇴 Macau query detected, adding city parameter');
        }

        const response = await fetch(url);
        const data = await response.json();
        if (data.status === '1' && data.geocodes) {
          data.geocodes.slice(0, 5).forEach((result: any) => {
            const [lon, lat] = result.location.split(',').map(parseFloat);
            // Avoid duplicates
            const isDuplicate = results.some(r =>
              Math.abs(r.latitude - lat) < 0.0001 && Math.abs(r.longitude - lon) < 0.0001
            );
            if (!isDuplicate) {
              results.push({
                address: result.formatted_address,
                latitude: lat,
                longitude: lon,
                source: isHKQuery ? 'Amap (高德-香港)' : isMOQuery ? 'Amap (高德-澳门)' : 'Amap (高德)'
              });
            }
          });
        }
      } catch (e) {
        console.warn('Amap search failed:', e);
      }
    }

    // Sort results: prioritize Hong Kong/Macau locations
    results.sort((a, b) => {
      const isHKMO_A = (a.latitude >= 22.1 && a.latitude <= 22.6 && a.longitude >= 113.5 && a.longitude <= 114.5);
      const isHKMO_B = (b.latitude >= 22.1 && b.latitude <= 22.6 && b.longitude >= 113.5 && b.longitude <= 114.5);
      if (isHKMO_A && !isHKMO_B) return -1;
      if (!isHKMO_A && isHKMO_B) return 1;
      return 0;
    });

    return results;
  };

  // Handle search with results selection
  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(false);
    
    try {
      const results = await searchAddressMultiple(searchQuery);
      
      if (results.length === 0) {
        alert(`No results found for "${searchQuery}". Try using Lat/Lng mode.`);
      } else if (results.length === 1) {
        // Only one result, use it directly
        handleSelectSearchResult(results[0]);
      } else {
        // Multiple results, show selection
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      alert(error.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle selecting an address from autocomplete
  const handleSelectAutocompleteAddress = async (suggestion: any) => {
    if (!suggestion.location) {
      alert('No location data available for this address');
      return;
    }

    setIsLoading(true);

    try {
      const { lat, lng } = suggestion.location;
      const position: [number, number] = [lat, lng];

      // Set marker on map and move to location
      setMarkerPosition(position);

      // Move map to location
      if (mapRef.current) {
        const map = (mapRef.current as any);
        if (map && map.setView) {
          map.setView(position, 15, { animate: true, duration: 1 });
        }
      }

      // Query asset info (but don't calculate risk yet)
      const asset = await queryAssetInfo(lat, lng);
      asset.address = suggestion.description;
      (asset as any).geocodingSource = suggestion.source === 'google' ? 'Google Maps' :
                                       suggestion.source === 'amap' ? 'Amap' : 'OpenStreetMap Nominatim';
      setAssetInfo(asset);

      console.log('Location set from autocomplete:', { asset });

      // Clear previous risk scores since this is a new location
      setRiskScores(null);
      setRiskResultsFloatingOpen(false);
    } catch (error: any) {
      console.error('Error setting location:', error);
      alert(error.message || 'Failed to set location');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = async (result: {
    address: string;
    latitude: number;
    longitude: number;
    source: string;
  }) => {
    setShowSearchResults(false);
    setSearchResults([]);
    setIsLoading(true);

    try {
      // Set marker on map and move to location
      const position: [number, number] = [result.latitude, result.longitude];
      setMarkerPosition(position);

      // Move map to location
      if (mapRef.current) {
        const map = (mapRef.current as any);
        if (map && map.setView) {
          map.setView(position, 15, { animate: true, duration: 1 });
        }
      }

      // Query asset info (but don't calculate risk yet)
      const asset = await queryAssetInfo(result.latitude, result.longitude);
      asset.address = result.address;
      (asset as any).geocodingSource = result.source;
      setAssetInfo(asset);

      console.log('Location set:', { asset });

      // Clear previous risk scores since this is a new location
      setRiskScores(null);
      setRiskResultsFloatingOpen(false);
    } catch (error: any) {
      console.error('Query failed:', error);
      alert(error.message || 'Failed to query location');
      setAssetInfo(null);
      setRiskScores(null);
      setMarkerPosition(null);
      setRiskResultsFloatingOpen(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Query Asset Info from location
  const queryAssetInfo = async (lat: number, lon: number): Promise<AssetInfo> => {
    // TODO: Query real data sources
    // For now, return simulated data
    return {
      latitude: lat,
      longitude: lon,
      elevation: Math.floor(Math.random() * 100) + 20, // meters
      populationDensity: Math.floor(Math.random() * 2000) + 500, // people/km²
      buildingDensity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      distanceToCoast: Math.floor(Math.random() * 50) + 5, // km
      landUse: ['Residential', 'Commercial', 'Industrial', 'Mixed Use'][Math.floor(Math.random() * 4)],
      worldcover: ['Built-up', 'Cropland', 'Tree cover', 'Grassland'][Math.floor(Math.random() * 4)],
    };
  };
  
  // Query Hazard data from WMS
  const queryHazards = async (lat: number, lon: number) => {
    // TODO: Implement WMS GetFeatureInfo queries
    // For now, return simulated scores
    return {
      flood: { depth: Math.random() * 3, returnPeriod: '100-year', zone: Math.floor(Math.random() * 5) },
      typhoon: { windSpeed: Math.random() * 60 + 20, intensity: 'Typhoon', zone: Math.floor(Math.random() * 5) },
      rainstorm: { intensity: Math.random() * 150 + 50, returnPeriod: '50-year', zone: Math.floor(Math.random() * 5) },
      stormSurge: { height: Math.random() * 2, returnPeriod: '100-year', zone: Math.floor(Math.random() * 5) },
      landslide: { risk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)], zone: Math.floor(Math.random() * 4) },
    };
  };
  
  // Calculate Risk Scores based on hazards + asset info + vulnerability
  const calculateRiskScores = (hazards: any, assetInfo: any, vulnerability: string) => {
    // Determine vulnerability factor
    let vulnFactor = 1.0;
    if (vulnerability === 'auto') {
      // Auto-determine from land use
      if (assetInfo.landUse === 'Residential') vulnFactor = 1.0;
      else if (assetInfo.landUse === 'Commercial') vulnFactor = 0.8;
      else if (assetInfo.landUse === 'Industrial') vulnFactor = 1.2;
    } else if (vulnerability === 'low') vulnFactor = 0.7;
    else if (vulnerability === 'high') vulnFactor = 1.3;
    
    // Calculate individual scores (0-10 scale, similar to Munich Re)
    const floodScore = Math.min(10, hazards.flood.zone * 2 * vulnFactor);
    const typhoonScore = Math.min(10, hazards.typhoon.zone * 2 * vulnFactor);
    const rainstormScore = Math.min(10, hazards.rainstorm.zone * 2 * vulnFactor);
    const stormSurgeScore = Math.min(10, hazards.stormSurge.zone * 2 * vulnFactor);
    const landslideScore = Math.min(10, hazards.landslide.zone * 2.5 * vulnFactor);
    
    // Calculate overall (defended) score
    const overallScore = Math.round(
      (floodScore * 0.30 + 
       typhoonScore * 0.25 + 
       rainstormScore * 0.20 + 
       stormSurgeScore * 0.15 + 
       landslideScore * 0.10) * 10
    ) / 10;
    
    // Determine risk level
    let overallLevel = 'Low';
    if (overallScore >= 8) overallLevel = 'Extreme';
    else if (overallScore >= 6) overallLevel = 'High';
    else if (overallScore >= 4) overallLevel = 'Medium';
    
    return {
      flood: { 
        score: Math.round(floodScore * 10) / 10, 
        zone: hazards.flood.zone, 
        returnPeriod: hazards.flood.returnPeriod,
        level: floodScore >= 8 ? 'Extreme' : floodScore >= 6 ? 'High' : floodScore >= 4 ? 'Medium' : 'Low'
      },
      typhoon: { 
        score: Math.round(typhoonScore * 10) / 10, 
        zone: hazards.typhoon.zone, 
        intensity: hazards.typhoon.intensity,
        level: typhoonScore >= 8 ? 'Extreme' : typhoonScore >= 6 ? 'High' : typhoonScore >= 4 ? 'Medium' : 'Low'
      },
      rainstorm: { 
        score: Math.round(rainstormScore * 10) / 10, 
        zone: hazards.rainstorm.zone, 
        returnPeriod: hazards.rainstorm.returnPeriod,
        level: rainstormScore >= 8 ? 'Extreme' : rainstormScore >= 6 ? 'High' : rainstormScore >= 4 ? 'Medium' : 'Low'
      },
      stormSurge: { 
        score: Math.round(stormSurgeScore * 10) / 10, 
        zone: hazards.stormSurge.zone, 
        returnPeriod: hazards.stormSurge.returnPeriod,
        level: stormSurgeScore >= 8 ? 'Extreme' : stormSurgeScore >= 6 ? 'High' : stormSurgeScore >= 4 ? 'Medium' : 'Low'
      },
      landslide: { 
        score: Math.round(landslideScore * 10) / 10, 
        zone: hazards.landslide.zone, 
        risk: hazards.landslide.risk,
        level: landslideScore >= 8 ? 'Extreme' : landslideScore >= 6 ? 'High' : landslideScore >= 4 ? 'Medium' : 'Low'
      },
      overall: {
        score: overallScore,
        level: overallLevel,
        riskIndex: Math.round(overallScore * 10), // 0-100 scale
        defended: true, // Assuming standard flood defenses
      },
    };

  };
  
  // Get color for risk level
  const getRiskColor = (level: string) => {
    if (level === 'Extreme') return 'text-red-700 bg-red-100 border-red-300';
    if (level === 'High') return 'text-orange-700 bg-orange-100 border-orange-300';
    if (level === 'Medium') return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-green-700 bg-green-100 border-green-300';
  };
  
  const getFirstAvailableAttribute = (props: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = props?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  };

  const queryIbtracsFeatureInfo = useCallback(async (latlng: LatLngLiteral) => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    try {
      setTyphoonInfoLoading(true);
      setTyphoonInfoError(null);

      const size = mapInstance.getSize();
      const bounds = mapInstance.getBounds();
      const point = mapInstance.latLngToContainerPoint(latlng);
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      // Query both lines and points for comprehensive info
      const layersToQuery = [
        wmsLayersConfig.globalTyphoonPoints.layer,
        wmsLayersConfig.globalTyphoonTracks.layer
      ].filter(layer =>
        visibleLayers.globalTyphoonPoints || visibleLayers.globalTyphoonTracks
      );

      if (layersToQuery.length === 0) return;

      const params = new URLSearchParams({
        service: 'WMS',
        request: 'GetFeatureInfo',
        version: '1.1.1',
        layers: layersToQuery.join(','),
        query_layers: layersToQuery.join(','),
        info_format: 'application/json',
        feature_count: '10', // Increased to get more results
        srs: 'EPSG:4326',
        width: `${size.x}`,
        height: `${size.y}`,
        x: `${Math.round(point.x)}`,
        y: `${Math.round(point.y)}`,
        bbox: `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`,
      });

      console.log('🔍 Querying IBTrACS at:', latlng, 'with layers:', layersToQuery);

      const response = await fetch(`${GEOSERVER_WMS_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`GeoServer responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 GeoServer response:', data);

      const feature = data?.features?.[0];

      if (feature) {
        const coordinates = feature.geometry?.coordinates;
        const lon = Array.isArray(coordinates) ? coordinates[0] : latlng.lng;
        const lat = Array.isArray(coordinates) ? coordinates[1] : latlng.lat;

        console.log('✅ Found IBTrACS feature:', feature.properties);

        setTyphoonPopup({
          position: { lat, lng: lon },
          properties: feature.properties || {},
        });

        // Extract wind circle data from typhoon properties
        const props = feature.properties || {};
        const circles: Array<{ center: LatLngLiteral; radius: number; label: string; color: string }> = [];

        // RMW (Radius of Maximum Wind) - innermost circle
        const rmw = getFirstAvailableAttribute(props, ['usa_rmw', 'radmaxwind', 'rmax', 'radius_max_wind', 'rmw']);
        if (rmw && rmw > 0) {
          circles.push({
            center: { lat, lng: lon },
            radius: Number(rmw) * 1852, // Convert nautical miles to meters
            label: 'RMW (最大风速半径)',
            color: '#8B0000' // Dark red for maximum wind
          });
        }

        // 64-knot wind circle (hurricane force) - average of 4 quadrants
        const r64_ne = getFirstAvailableAttribute(props, ['usa_r64_ne', 'r64_ne', 'ne64']);
        const r64_se = getFirstAvailableAttribute(props, ['usa_r64_se', 'r64_se', 'se64']);
        const r64_sw = getFirstAvailableAttribute(props, ['usa_r64_sw', 'r64_sw', 'sw64']);
        const r64_nw = getFirstAvailableAttribute(props, ['usa_r64_nw', 'r64_nw', 'nw64']);
        const r64Values = [r64_ne, r64_se, r64_sw, r64_nw].filter(v => v !== null && v !== undefined && v > 0);
        if (r64Values.length > 0) {
          const r64_avg = r64Values.reduce((sum: number, val: any) => sum + Number(val), 0) / r64Values.length;
          circles.push({
            center: { lat, lng: lon },
            radius: r64_avg * 1852,
            label: '64 kt 风圈 (飓风级)',
            color: '#FF0000' // Red for hurricane force
          });
        }

        // 50-knot wind circle (storm force) - average of 4 quadrants
        const r50_ne = getFirstAvailableAttribute(props, ['usa_r50_ne', 'r50_ne', 'ne50']);
        const r50_se = getFirstAvailableAttribute(props, ['usa_r50_se', 'r50_se', 'se50']);
        const r50_sw = getFirstAvailableAttribute(props, ['usa_r50_sw', 'r50_sw', 'sw50']);
        const r50_nw = getFirstAvailableAttribute(props, ['usa_r50_nw', 'r50_nw', 'nw50']);
        const r50Values = [r50_ne, r50_se, r50_sw, r50_nw].filter(v => v !== null && v !== undefined && v > 0);
        if (r50Values.length > 0) {
          const r50_avg = r50Values.reduce((sum: number, val: any) => sum + Number(val), 0) / r50Values.length;
          circles.push({
            center: { lat, lng: lon },
            radius: r50_avg * 1852,
            label: '50 kt 风圈 (狂风级)',
            color: '#FF6600' // Orange for storm force
          });
        }

        // 34-knot wind circle (gale force) - average of 4 quadrants
        const r34_ne = getFirstAvailableAttribute(props, ['usa_r34_ne', 'r34_ne', 'ne34']);
        const r34_se = getFirstAvailableAttribute(props, ['usa_r34_se', 'r34_se', 'se34']);
        const r34_sw = getFirstAvailableAttribute(props, ['usa_r34_sw', 'r34_sw', 'sw34']);
        const r34_nw = getFirstAvailableAttribute(props, ['usa_r34_nw', 'r34_nw', 'nw34']);
        const r34Values = [r34_ne, r34_se, r34_sw, r34_nw].filter(v => v !== null && v !== undefined && v > 0);
        if (r34Values.length > 0) {
          const r34_avg = r34Values.reduce((sum: number, val: any) => sum + Number(val), 0) / r34Values.length;
          circles.push({
            center: { lat, lng: lon },
            radius: r34_avg * 1852,
            label: '34 kt 风圈 (烈风级)',
            color: '#FFCC00' // Yellow for gale force
          });
        }

        setTyphoonWindCircles(circles);
        console.log('🌀 Wind circles generated:', circles);
      } else {
        setTyphoonPopup(null);
        setTyphoonWindCircles([]);
        setTyphoonInfoError('附近没有IBTrACS台风节点，请靠近路径再试一次。');
        console.warn('⚠️ No IBTrACS features found at this location');
      }
    } catch (error: any) {
      console.error('❌ IBTrACS feature info error:', error);
      setTyphoonInfoError(`无法读取台风节点属性: ${error.message || '请检查GeoServer连接'}`);
    } finally {
      setTyphoonInfoLoading(false);
    }
  }, [visibleLayers.globalTyphoonPoints, visibleLayers.globalTyphoonTracks]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const handleMapClick = (event: LeafletMouseEvent) => {
      // Only trigger if either IBTrACS layer is visible
      if (visibleLayers.globalTyphoonPoints || visibleLayers.globalTyphoonTracks) {
        queryIbtracsFeatureInfo(event.latlng);
      }
    };

    mapInstance.on('click', handleMapClick);
    return () => {
      mapInstance.off('click', handleMapClick);
    };
  }, [visibleLayers.globalTyphoonPoints, visibleLayers.globalTyphoonTracks, queryIbtracsFeatureInfo]);

  useEffect(() => {
    if (!visibleLayers.globalTyphoonPoints && !visibleLayers.globalTyphoonTracks) {
      setTyphoonPopup(null);
      setTyphoonWindCircles([]);
      setTyphoonInfoError(null);
    }
  }, [visibleLayers.globalTyphoonPoints, visibleLayers.globalTyphoonTracks]);

  // Debug visibleLayers state changes for Macau flood layers
  useEffect(() => {
    const macauFloodLayers = Object.entries(visibleLayers)
      .filter(([key]) => key.startsWith('macau'))
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

    console.log('🔄 [VISIBLE LAYERS STATE CHANGED - Macau Flood Layers]', macauFloodLayers);
  }, [visibleLayers]);

  // ========== Area Risk Assessment Functions ==========
  
  // Generate sampling points within a shape
  const generateSamplingPoints = (layer: any, type: string, count: number = 100): [number, number][] => {
    const points: [number, number][] = [];
    
    if (type === 'circle') {
      const center = layer.getLatLng();
      const radius = layer.getRadius(); // in meters
      
      // Generate points in a grid pattern within the circle
      const gridSize = Math.ceil(Math.sqrt(count));
      const latStep = (radius / 111320) * 2 / gridSize; // roughly 111320 meters per degree latitude
      const lngStep = (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * 2 / gridSize;
      
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const lat = center.lat - (radius / 111320) + (i * latStep);
          const lng = center.lng - (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) + (j * lngStep);
          
          // Check if point is within circle
          const distance = center.distanceTo(L.latLng(lat, lng));
          if (distance <= radius) {
            points.push([lat, lng]);
          }
        }
      }
    } else if (type === 'rectangle' || type === 'polygon') {
      const bounds = layer.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();
      
      // Generate grid points
      const gridSize = Math.ceil(Math.sqrt(count));
      const latStep = (north - south) / gridSize;
      const lngStep = (east - west) / gridSize;
      
      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          const lat = south + (i * latStep);
          const lng = west + (j * lngStep);
          
          // For polygon, check if point is inside
          if (type === 'polygon') {
            const point = L.latLng(lat, lng);
            // Simple point-in-polygon check using Leaflet
            const latlngs = layer.getLatLngs()[0];
            if (isPointInPolygon(point, latlngs)) {
              points.push([lat, lng]);
            }
          } else {
            points.push([lat, lng]);
          }
        }
      }
    }
    
    return points.slice(0, count); // Limit to requested count
  };
  
  // Simple point-in-polygon algorithm
  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      
      const intersect = ((yi > point.lng) !== (yj > point.lng))
          && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };
  
  // Calculate area risk by sampling points
  const calculateAreaRisk = async (layer: any, type: string) => {
    setIsCalculatingArea(true);
    setAreaRiskData(null);
    
    try {
      // Generate sampling points
      const samplingPoints = generateSamplingPoints(layer, type, 100);
      setAreaCalculationProgress({ current: 0, total: samplingPoints.length });
      
      console.log(`🔍 Analyzing ${samplingPoints.length} sampling points in ${type}...`);
      
      const riskResults: any[] = [];
      
      // Query each sampling point
      for (let i = 0; i < samplingPoints.length; i++) {
        const [lat, lng] = samplingPoints[i];
        
        try {
          // Query asset info and hazards
          const asset = await queryAssetInfo(lat, lng);
          const hazards = await queryHazards(lat, lng);
          const scores = calculateRiskScores(hazards, asset, getVulnerability());
          
          riskResults.push({
            lat,
            lng,
            scores,
            asset,
            hazards
          });
        } catch (error) {
          console.warn(`Failed to query point [${lat}, ${lng}]:`, error);
        }
        
        // Update progress
        setAreaCalculationProgress({ current: i + 1, total: samplingPoints.length });
        
        // Small delay to prevent overwhelming the server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Calculate statistics
      const validResults = riskResults.filter(r => r.scores);
      
      if (validResults.length === 0) {
        throw new Error('No valid data points found in the selected area');
      }
      
      // Calculate average, max, min scores
      const overallScores = validResults.map(r => r.scores.overall.score);
      const floodScores = validResults.map(r => r.scores.flood.score);
      const typhoonScores = validResults.map(r => r.scores.typhoon.score);
      const rainstormScores = validResults.map(r => r.scores.rainstorm.score);
      
      const stats = {
        overall: {
          avg: (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(2),
          max: Math.max(...overallScores).toFixed(2),
          min: Math.min(...overallScores).toFixed(2),
          maxPoint: validResults[overallScores.indexOf(Math.max(...overallScores))],
          minPoint: validResults[overallScores.indexOf(Math.min(...overallScores))]
        },
        flood: {
          avg: (floodScores.reduce((a, b) => a + b, 0) / floodScores.length).toFixed(2),
          max: Math.max(...floodScores).toFixed(2),
          min: Math.min(...floodScores).toFixed(2)
        },
        typhoon: {
          avg: (typhoonScores.reduce((a, b) => a + b, 0) / typhoonScores.length).toFixed(2),
          max: Math.max(...typhoonScores).toFixed(2),
          min: Math.min(...typhoonScores).toFixed(2)
        },
        rainstorm: {
          avg: (rainstormScores.reduce((a, b) => a + b, 0) / rainstormScores.length).toFixed(2),
          max: Math.max(...rainstormScores).toFixed(2),
          min: Math.min(...rainstormScores).toFixed(2)
        }
      };
      
      // Calculate risk level distribution
      const distribution = {
        extreme: validResults.filter(r => r.scores.overall.level === 'Extreme').length,
        high: validResults.filter(r => r.scores.overall.level === 'High').length,
        medium: validResults.filter(r => r.scores.overall.level === 'Medium').length,
        low: validResults.filter(r => r.scores.overall.level === 'Low').length
      };
      
      const areaData = {
        type,
        sampledPoints: validResults.length,
        totalPoints: samplingPoints.length,
        stats,
        distribution,
        bounds: layer.getBounds(),
        area: type === 'circle' ? 
          (Math.PI * Math.pow(layer.getRadius(), 2) / 1000000).toFixed(2) + ' km²' :
          'N/A' // TODO: Calculate polygon area
      };
      
      setAreaRiskData(areaData);
      setAreaRiskFloatingOpen(true); // Auto-open floating card
      console.log('✅ Area risk calculation complete:', areaData);
      
    } catch (error: any) {
      console.error('Area risk calculation failed:', error);
      alert(error.message || 'Failed to calculate area risk');
    } finally {
      setIsCalculatingArea(false);
      setAreaCalculationProgress({ current: 0, total: 0 });
    }
  };
  
  // Handle shape drawn event
  const handleShapeDrawn = (layer: L.Layer, type: string, bounds: L.LatLngBounds) => {
    console.log(`🎨 Shape drawn: ${type}`, bounds);
    setDrawnShape({ layer, type, bounds });
    
    // Auto-calculate area risk
    calculateAreaRisk(layer, type);
  };
  
  // Toggle draw mode
  const toggleDrawMode = () => {
    setDrawMode(!drawMode);
    if (drawMode) {
      // Clear drawn shape when exiting draw mode
      setDrawnShape(null);
      setAreaRiskData(null);
    }
  };

  // ========== End of Area Risk Assessment Functions ==========

  // Calculate risk for current marker position
  const handleCalculateRisk = async () => {
    if (!markerPosition) {
      alert('Please search for a location first or click on the map to place a marker');
      return;
    }

    setIsLoading(true);

    try {
      const [lat, lng] = markerPosition;

      // Step 1: Query asset info
      const asset = await queryAssetInfo(lat, lng);
      setAssetInfo(asset);

      // Step 2: Query hazards
      const hazards = await queryHazards(lat, lng);

      // Step 3: Calculate risk scores
      const scores = calculateRiskScores(hazards, asset, getVulnerability());
      setRiskScores(scores);

      // Step 4: Auto-open floating risk results on map
      setRiskResultsFloatingOpen(true);

      console.log('Risk calculation complete:', { asset, hazards, scores });
    } catch (error: any) {
      console.error('Risk calculation failed:', error);
      alert(error.message || 'Failed to calculate risk. Please try again.');

      // Clear risk results on error (but keep marker and asset info)
      setRiskScores(null);
      setRiskResultsFloatingOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Main query handler
  const handleSearchAndCalculate = async () => {
    // Determine the query based on input mode
    let queryString = '';
    
    if (searchInputMode === 'coordinates') {
      // Validate coordinates
      const lat = parseFloat(coordinateLat);
      const lng = parseFloat(coordinateLng);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude values');
        return;
      }
      
      if (lat < -90 || lat > 90) {
        alert('Latitude must be between -90 and 90');
        return;
      }
      
      if (lng < -180 || lng > 180) {
        alert('Longitude must be between -180 and 180');
        return;
      }
      
      queryString = `${lat}, ${lng}`;
    } else {
      if (!searchQuery.trim()) {
        alert('Please enter an address');
        return;
      }
      queryString = searchQuery;
    }
    
    setIsLoading(true);
    
    try {
      // Step 1: Geocode address
      const location = await geocodeAddress(queryString);
      
      // Step 2: Set marker on map and move to location
      const position: [number, number] = [location.latitude, location.longitude];
      setMarkerPosition(position);
      
      // Step 3: Move map to location
      if (mapRef.current) {
        const map = (mapRef.current as any);
        if (map && map.setView) {
          map.setView(position, 13, { animate: true, duration: 1 });
        }
      }
      
      // Step 4: Query asset info
      const asset = await queryAssetInfo(location.latitude, location.longitude);
      asset.address = location.address;
      (asset as any).geocodingSource = location.source; // Store which service was used
      setAssetInfo(asset);
      
      // Step 5: Query hazards
      const hazards = await queryHazards(location.latitude, location.longitude);
      
      // Step 6: Calculate risk scores
      const scores = calculateRiskScores(hazards, asset, getVulnerability());
      setRiskScores(scores);
      
      // Step 7: Auto-open floating risk results on map
      setRiskResultsFloatingOpen(true);
      
      console.log('Query complete:', { asset, hazards, scores });
    } catch (error: any) {
      console.error('Query failed:', error);
      alert(error.message || 'Failed to query location. Please check your input and try again.');
      
      // Clear previous results on error
      setAssetInfo(null);
      setRiskScores(null);
      setMarkerPosition(null);
      setRiskResultsFloatingOpen(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Download PDF report
  const handleDownloadReport = () => {
    // TODO: Generate PDF report (similar to Munich Re format)
    alert('PDF report generation will be implemented soon');
  };
  
  // Export data as JSON
  const handleExportData = () => {
    if (!assetInfo || !riskScores) {
      alert('No data to export. Please run a query first.');
      return;
    }
    
    const exportData = {
      assetInfo,
      riskScores,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-assessment-${assetInfo.latitude}-${assetInfo.longitude}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // ========== Batch Portfolio Query Handlers ==========

  // Download an Excel template (.xlsx) with the expected columns + example rows.
  // Using XLSX avoids the CSV delimiter / encoding pitfalls (semicolon vs comma, BOM, etc.).
  const handleDownloadPortfolioTemplate = () => {
    const headers = [
      'id', 'name', 'address', 'longitude', 'latitude',
      'BuildingTIV', 'ContentTIV', 'BITIV', 'TIV', 'Currency',
      'Occupancy', 'YearOfBuild', 'Constructure', 'Stories', 'Basement',
    ];
    const sampleRows = [
      ['LOC-001', 'IFC Tower 2',  'Central, Hong Kong', 114.15769, 22.28552,
       500000000, 80000000, 40000000, 620000000, 'HKD', 'Office',  2003, 'RC',         88, 'Yes'],
      ['LOC-002', 'Macau Tower',  'Sé, Macau',          113.53875, 22.18747,
       300000000, 50000000, 25000000, 375000000, 'MOP', 'Hotel',   2001, 'Steel',      58, 'Yes'],
      ['LOC-003', 'Warehouse A',  'Tsim Sha Tsui, HK',  114.17200, 22.29800,
        80000000, 15000000,  5000000, 100000000, 'HKD', 'Warehouse', 1995, 'Masonry',   3, 'No'],
      ['LOC-004', 'Residential',  '',                   114.16083, 22.30389,
        60000000, 12000000,        0,  72000000, 'HKD', 'Residential', 2010, 'RC',     20, 'No'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    (ws as any)['!cols'] = [
      { wch: 10 }, { wch: 22 }, { wch: 32 }, { wch: 11 }, { wch: 11 },
      { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 9 },  { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'portfolio');

    // ---- EP Curve sheets (one per peril, optional) ----
    // Standard columns: Probability(%) | ReturnPeriod | GroundUp | Gross
    const epHeaders = ['Probability(%)', 'ReturnPeriod', 'GroundUp', 'Gross'];
    const earthquakeRows = [
      [0.01,  10000, 2215370996, 2204732213],
      [0.02,   5000, 1894343516, 1878792721],
      [0.05,   2000, 1430074965, 1414080788],
      [0.10,   1000, 1067155977, 1052537052],
      [0.20,    500,  720115185,  702465644],
      [0.40,    250,  352115946,  335206103],
      [0.50,    200,  277168256,  260088416],
      [1.00,    100,  109585095,   92144634],
      [2.00,     50,   40799957,   24176678],
      [4.00,     25,   12033916,    1278849],
      [10.0,     10,    1455693,          0],
      [20.0,      5,     140438,          0],
    ];
    // Empty placeholder sheets for other perils
    const emptyEpRows = [
      [0.01,  10000, '', ''],
      [0.10,  1000,  '', ''],
      [1.00,  100,   '', ''],
      [10.0,  10,    '', ''],
    ];
    const epColWidths = [{ wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];

    const addEpSheet = (name: string, rows: any[][]) => {
      const s = XLSX.utils.aoa_to_sheet([epHeaders, ...rows]);
      (s as any)['!cols'] = epColWidths;
      XLSX.utils.book_append_sheet(wb, s, name);
    };
    addEpSheet('EP_Earthquake', earthquakeRows);
    addEpSheet('EP_Typhoon',    emptyEpRows);
    addEpSheet('EP_Flood',      emptyEpRows);

    // ---- Stats sheet (AAL / SD / CoV per peril) ----
    const statsRows = [
      ['Peril',       'AAL_GU',  'AAL_Gross', 'SD_GU',    'SD_Gross', 'CoV_GU', 'CoV_Gross', 'ModelledExposure', 'Currency'],
      ['Earthquake',  6016559,   5049758,     63517797,   62176490,   10.56,    12.31,       32187860889,        'USD'],
      ['Typhoon',     '',        '',          '',         '',         '',       '',          '',                 'USD'],
      ['Flood',       '',        '',          '',         '',         '',       '',          '',                 'USD'],
    ];
    const statsSheet = XLSX.utils.aoa_to_sheet(statsRows);
    (statsSheet as any)['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 9 }, { wch: 11 }, { wch: 18 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, statsSheet, 'EP_Stats');

    XLSX.writeFile(wb, 'portfolio_template.xlsx');
  };

  // Handle portfolio file upload
  const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setBatchProgress({ current: 0, total: 0 });
    
    try {
      let locations: any[] = [];
      const fileName = file.name.toLowerCase();

      // Helper: parse a single CSV line, respecting quoted fields ("a, b" stays as one cell)
      const parseCsvLine = (line: string, delim: string): string[] => {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (ch === delim && !inQuotes) {
            out.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        out.push(cur);
        return out.map(c => c.trim().replace(/^"|"$/g, ''));
      };

      // Helper: parse a numeric cell, tolerating ',', '$', '%', blank, etc.
      const num = (v: any): number => {
        if (v === '' || v === null || v === undefined) return NaN;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/[,\s$]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
      };
      const str = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());

      // Helper: build location records from a 2D array of rows (rows[0] = headers)
      const rowsToLocations = (rows: any[][]): any[] => {
        if (!rows.length) return [];
        const headers = rows[0].map(h => String(h ?? '').trim().toLowerCase());
        const findIdx = (matcher: (h: string) => boolean) => headers.findIndex(matcher);

        // Core geocoding columns
        const addressIdx = findIdx(h => h.includes('address') || h.includes('location'));
        const latIdx     = findIdx(h => h === 'latitude' || h === 'lat' || h.startsWith('lat'));
        const lonIdx     = findIdx(h => h === 'longitude' || h === 'lon' || h === 'lng' || h.startsWith('lon') || h.startsWith('lng'));
        const nameIdx    = findIdx(h => h === 'name' || h.includes('asset') || h.includes('name'));
        const idIdx      = headers.findIndex(h => h === 'id' || h.endsWith('_id') || h.endsWith('id'));

        // TIV columns (flexible matching)
        const buildingTivIdx = findIdx(h => (h.includes('build') && h.includes('tiv')) || h === 'building' || h === 'building_value' || h === 'buildingvalue');
        const contentTivIdx  = findIdx(h => (h.includes('content') && h.includes('tiv')) || h === 'content' || h === 'contents' || h === 'content_value');
        const biTivIdx       = findIdx(h => h.includes('bi') && (h.includes('tiv') || h.includes('value') || h.includes('interrupt')) || h === 'bi' || h === 'businessinterruption');
        // Explicit total TIV column (just "TIV", "TotalTIV", "Total TIV", "SumInsured", etc.)
        const totalTivIdx    = findIdx(h => h === 'tiv' || h === 'totaltiv' || h === 'total_tiv' || h === 'total tiv' || h === 'sumtiv' || h === 'totalinsured' || h === 'suminsured' || (h.includes('total') && h.includes('tiv')));
        const currencyIdx    = findIdx(h => h === 'currency' || h === 'ccy' || h.includes('curr'));

        // Asset attribute columns
        const occupancyIdx = findIdx(h => h.includes('occupanc') || h === 'usage' || h === 'use');
        const yearIdx      = findIdx(h => h.includes('year') && (h.includes('build') || h.includes('construct')) || h === 'yob' || h === 'yearbuilt');
        const structureIdx = findIdx(h => h.includes('constructure') || h.includes('structure') || (h.includes('construction') && !h.includes('year')));
        const storiesIdx   = findIdx(h => h === 'stories' || h === 'storey' || h === 'storeys' || h.includes('floor') || h === 'stores');
        const basementIdx  = findIdx(h => h.includes('basement') || h === 'underground');

        if (addressIdx < 0 && (latIdx < 0 || lonIdx < 0)) {
          throw new Error(
            `Could not find required columns in headers: [${headers.join(', ')}].\n` +
            `Expected at least an "address" column, or both "latitude" and "longitude" columns.`
          );
        }

        const result: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || cols.every(c => c === '' || c === null || c === undefined)) continue;
          const lat = latIdx >= 0 ? num(cols[latIdx]) : NaN;
          const lon = lonIdx >= 0 ? num(cols[lonIdx]) : NaN;

          const buildingTIV = buildingTivIdx >= 0 ? num(cols[buildingTivIdx]) : NaN;
          const contentTIV  = contentTivIdx  >= 0 ? num(cols[contentTivIdx])  : NaN;
          const biTIV       = biTivIdx       >= 0 ? num(cols[biTivIdx])       : NaN;
          const explicitTotal = totalTivIdx >= 0 ? num(cols[totalTivIdx]) : NaN;
          const computedTotal =
            (Number.isFinite(buildingTIV) ? buildingTIV : 0) +
            (Number.isFinite(contentTIV)  ? contentTIV  : 0) +
            (Number.isFinite(biTIV)       ? biTIV       : 0);
          // Prefer explicit TIV column when provided, otherwise fall back to the sum of B+C+BI
          const totalTIV = Number.isFinite(explicitTotal) && explicitTotal > 0 ? explicitTotal : computedTotal;

          result.push({
            id:        idIdx      >= 0 ? str(cols[idIdx])      || `LOC-${i}`     : `LOC-${i}`,
            name:      nameIdx    >= 0 ? str(cols[nameIdx])    || `Location ${i}` : `Location ${i}`,
            address:   addressIdx >= 0 ? str(cols[addressIdx]) : '',
            latitude:  Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lon) ? lon : null,
            // TIV fields
            buildingTIV: Number.isFinite(buildingTIV) ? buildingTIV : null,
            contentTIV:  Number.isFinite(contentTIV)  ? contentTIV  : null,
            biTIV:       Number.isFinite(biTIV)       ? biTIV       : null,
            totalTIV:    totalTIV > 0 ? totalTIV : null,
            currency:    currencyIdx  >= 0 ? str(cols[currencyIdx])  : '',
            // Asset attributes
            occupancy:   occupancyIdx >= 0 ? str(cols[occupancyIdx]) : '',
            yearBuilt:   yearIdx      >= 0 ? (num(cols[yearIdx]) || str(cols[yearIdx])) : '',
            structure:   structureIdx >= 0 ? str(cols[structureIdx]) : '',
            stories:     storiesIdx   >= 0 ? (num(cols[storiesIdx]) || str(cols[storiesIdx])) : '',
            basement:    basementIdx  >= 0 ? str(cols[basementIdx])  : '',
          });
        }
        return result;
      };

      // ---- Excel branch (.xlsx / .xls) ----
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        // Prefer a sheet literally named "portfolio"; else use the first sheet.
        const portfolioSheetName =
          wb.SheetNames.find(n => n.toLowerCase() === 'portfolio') || wb.SheetNames[0];
        const ws = wb.Sheets[portfolioSheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', blankrows: false });
        locations = rowsToLocations(rows as any[][]);

        // ---- Parse optional EP curve sheets (EP_Earthquake, EP_Typhoon, EP_Flood, ...) ----
        const parsedEp: Record<string, any> = {};
        for (const sheetName of wb.SheetNames) {
          const m = sheetName.match(/^EP[_\s-]?(.+)$/i);
          if (!m || sheetName.toLowerCase() === 'ep_stats') continue;
          const peril = m[1].trim();
          const epRows = XLSX.utils.sheet_to_json<any[]>(
            wb.Sheets[sheetName], { header: 1, defval: '', blankrows: false }
          ) as any[][];
          if (epRows.length < 2) continue;
          const epHeaders = epRows[0].map(h => String(h ?? '').trim().toLowerCase());
          const probIdx  = epHeaders.findIndex(h => h.includes('prob'));
          const rpIdx    = epHeaders.findIndex(h => h.includes('return') || h === 'rp');
          const guIdx    = epHeaders.findIndex(h => h.includes('ground') || h === 'gu');
          const grossIdx = epHeaders.findIndex(h => h.includes('gross'));
          if (probIdx < 0 && rpIdx < 0) continue;
          const points: { prob: number; rp: number; gu: number; gross: number }[] = [];
          for (let i = 1; i < epRows.length; i++) {
            const r = epRows[i];
            const prob = probIdx >= 0 ? num(r[probIdx]) : NaN;
            const rp   = rpIdx   >= 0 ? num(r[rpIdx])   : NaN;
            const gu   = guIdx   >= 0 ? num(r[guIdx])   : NaN;
            const gross = grossIdx >= 0 ? num(r[grossIdx]) : NaN;
            // Require at least one of prob/rp and a GU value
            if (!Number.isFinite(gu)) continue;
            const finalProb = Number.isFinite(prob) ? prob : (Number.isFinite(rp) ? 100 / rp : NaN);
            const finalRp   = Number.isFinite(rp) ? rp : (Number.isFinite(prob) ? 100 / prob : NaN);
            if (!Number.isFinite(finalProb) || !Number.isFinite(finalRp)) continue;
            points.push({
              prob: finalProb,
              rp: finalRp,
              gu,
              gross: Number.isFinite(gross) ? gross : 0,
            });
          }
          if (points.length > 0) parsedEp[peril] = { points };
        }

        // ---- Parse optional EP_Stats sheet to attach AAL/SD/CoV ----
        const statsSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'ep_stats' || n.toLowerCase() === 'stats');
        if (statsSheetName) {
          const sRows = XLSX.utils.sheet_to_json<any[]>(
            wb.Sheets[statsSheetName], { header: 1, defval: '', blankrows: false }
          ) as any[][];
          if (sRows.length >= 2) {
            const sh = sRows[0].map(h => String(h ?? '').trim().toLowerCase());
            const idx = (matcher: (h: string) => boolean) => sh.findIndex(matcher);
            const perilIdx     = idx(h => h === 'peril' || h.includes('hazard'));
            const aalGuIdx     = idx(h => h.includes('aal') && h.includes('gu'));
            const aalGrIdx     = idx(h => h.includes('aal') && h.includes('gross'));
            const sdGuIdx      = idx(h => h.includes('sd') && h.includes('gu'));
            const sdGrIdx      = idx(h => h.includes('sd') && h.includes('gross'));
            const covGuIdx     = idx(h => h.includes('cov') && h.includes('gu'));
            const covGrIdx     = idx(h => h.includes('cov') && h.includes('gross'));
            const exposureIdx  = idx(h => h.includes('exposure'));
            const currencyIdx2 = idx(h => h.includes('curr'));
            for (let i = 1; i < sRows.length; i++) {
              const r = sRows[i];
              const peril = perilIdx >= 0 ? str(r[perilIdx]) : '';
              if (!peril || !parsedEp[peril]) continue;
              const aalGu = aalGuIdx >= 0 ? num(r[aalGuIdx]) : NaN;
              const aalGr = aalGrIdx >= 0 ? num(r[aalGrIdx]) : NaN;
              const sdGu  = sdGuIdx  >= 0 ? num(r[sdGuIdx])  : NaN;
              const sdGr  = sdGrIdx  >= 0 ? num(r[sdGrIdx])  : NaN;
              const covGu = covGuIdx >= 0 ? num(r[covGuIdx]) : NaN;
              const covGr = covGrIdx >= 0 ? num(r[covGrIdx]) : NaN;
              if (Number.isFinite(aalGu) && Number.isFinite(aalGr)) parsedEp[peril].aal = { gu: aalGu, gross: aalGr };
              if (Number.isFinite(sdGu)  && Number.isFinite(sdGr))  parsedEp[peril].sd  = { gu: sdGu,  gross: sdGr };
              if (Number.isFinite(covGu) && Number.isFinite(covGr)) parsedEp[peril].cov = { gu: covGu, gross: covGr };
              if (exposureIdx >= 0)  parsedEp[peril].modelledExposure = num(r[exposureIdx]);
              if (currencyIdx2 >= 0) parsedEp[peril].currency = str(r[currencyIdx2]);
            }
          }
        }

        setEpCurveData(parsedEp);
        // Auto-select first available peril
        const availablePerils = Object.keys(parsedEp);
        if (availablePerils.length > 0) setEpCurvePeril(availablePerils[0]);
      }
      // ---- JSON branch ----
      else if (fileName.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text.replace(/^\uFEFF/, ''));
        const raw = Array.isArray(data) ? data : data.locations || [];
        locations = raw.map((loc: any, idx: number) => {
          const bt = parseFloat(loc.BuildingTIV ?? loc.buildingTIV ?? loc.buildingTiv ?? '');
          const ct = parseFloat(loc.ContentTIV  ?? loc.contentTIV  ?? loc.contentTiv  ?? '');
          const bi = parseFloat(loc.BITIV       ?? loc.biTIV       ?? loc.biTiv       ?? loc.BusinessInterruption ?? '');
          const explicit = parseFloat(loc.TIV ?? loc.tiv ?? loc.totalTIV ?? loc.TotalTIV ?? loc.SumInsured ?? '');
          const computed = (Number.isFinite(bt) ? bt : 0) + (Number.isFinite(ct) ? ct : 0) + (Number.isFinite(bi) ? bi : 0);
          const tot = Number.isFinite(explicit) && explicit > 0 ? explicit : computed;
          return {
            id: loc.id || loc.ID || `LOC-${idx + 1}`,
            name: loc.name || loc.Name || loc.assetName || `Location ${idx + 1}`,
            address: loc.address || loc.Address || '',
            latitude: loc.latitude ?? loc.lat ?? loc.Latitude ?? null,
            longitude: loc.longitude ?? loc.lon ?? loc.lng ?? loc.Longitude ?? null,
            buildingTIV: Number.isFinite(bt) ? bt : null,
            contentTIV:  Number.isFinite(ct) ? ct : null,
            biTIV:       Number.isFinite(bi) ? bi : null,
            totalTIV:    tot > 0 ? tot : null,
            currency:    loc.Currency || loc.currency || '',
            occupancy:   loc.Occupancy || loc.occupancy || '',
            yearBuilt:   loc.YearOfBuild ?? loc.yearBuilt ?? loc.YearBuilt ?? '',
            structure:   loc.Structure || loc.structure || '',
            stories:     loc.Stories ?? loc.stories ?? loc.Stores ?? '',
            basement:    loc.Basement || loc.basement || '',
          };
        });
      }
      // ---- CSV / TSV / text branch (auto-detect delimiter) ----
      else if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
        // Strip UTF-8 BOM that Excel often prepends
        let text = (await file.text()).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('File appears to be empty or has only a header row.');
        }
        // Auto-detect delimiter from the header line: try , ; \t |
        const candidates = [',', ';', '\t', '|'];
        const header = lines[0];
        let delim = ',';
        let maxCount = 0;
        for (const d of candidates) {
          const count = header.split(d).length - 1;
          if (count > maxCount) { maxCount = count; delim = d; }
        }
        if (maxCount === 0) {
          throw new Error(
            'Could not detect a column delimiter (tried , ; tab |). ' +
            'When saving in Excel, choose "CSV UTF-8 (Comma delimited)" format.'
          );
        }
        const rows = lines.map(l => parseCsvLine(l, delim));
        locations = rowsToLocations(rows);
      } else {
        throw new Error('Unsupported file format. Please upload CSV, XLSX, or JSON file.');
      }
      
      if (locations.length === 0) {
        throw new Error('No valid locations found in file.');
      }

      // ---- Auto-detect & fix swapped latitude/longitude columns ----
      // Latitude must be in [-90, 90]. If any rows have |lat| > 90, columns are clearly swapped.
      // Also heuristic: if every row has |lat| > |lon|, that's almost always a swap
      // (very few real portfolios are entirely in high-latitude regions).
      const withCoords = locations.filter(l =>
        Number.isFinite(l.latitude) && Number.isFinite(l.longitude)
      );
      const definitelySwapped = withCoords.some(l => Math.abs(l.latitude) > 90);
      const likelySwapped =
        !definitelySwapped &&
        withCoords.length > 0 &&
        withCoords.every(l => Math.abs(l.latitude) > Math.abs(l.longitude)) &&
        withCoords.every(l => Math.abs(l.longitude) <= 90);

      if (definitelySwapped || likelySwapped) {
        const reason = definitelySwapped
          ? 'latitude values exceeded ±90°'
          : 'latitude values look like longitudes';
        console.warn(`[Portfolio Upload] Auto-swapping lat/lon columns — ${reason}.`);
        locations = locations.map(l => {
          if (Number.isFinite(l.latitude) && Number.isFinite(l.longitude)) {
            return { ...l, latitude: l.longitude, longitude: l.latitude };
          }
          return l;
        });
        // Inform the user once — non-blocking
        setTimeout(() => {
          alert(
            `Note: your file's "latitude" and "longitude" columns appear to be swapped ` +
            `(${reason}). I auto-corrected them.\n\n` +
            `If the markers still look wrong, please double-check your source data.`
          );
        }, 0);
      }

      console.log(`Loaded ${locations.length} locations from portfolio`);
      
      // Batch geocode and query
      setBatchProgress({ current: 0, total: locations.length });
      const results: any[] = [];
      
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        setBatchProgress({ current: i + 1, total: locations.length });
        
        try {
          let lat = loc.latitude;
          let lon = loc.longitude;
          
          // Geocode if no coordinates
          if (!lat || !lon) {
            if (!loc.address) {
              console.warn(`Skipping ${loc.id}: No address or coordinates`);
              results.push({ ...loc, status: 'error', error: 'No address or coordinates' });
              continue;
            }
            
            const geocoded = await geocodeAddress(loc.address);
            lat = geocoded.latitude;
            lon = geocoded.longitude;
          }
          
          // Query asset info and hazards
          const asset = await queryAssetInfo(lat, lon);
          const hazards = await queryHazards(lat, lon);
          const scores = calculateRiskScores(hazards, asset, getVulnerability());
          
          results.push({
            ...loc,
            latitude: lat,
            longitude: lon,
            assetInfo: asset,
            riskScores: scores,
            status: 'success',
          });
          
          // Small delay to avoid overwhelming server
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          console.error(`Failed to query ${loc.id}:`, error);
          results.push({
            ...loc,
            status: 'error',
            error: error.message,
          });
        }
      }
      
      setPortfolioLocations(results);
      setBatchQueryMode(true);
      setIsLoading(false);
      
      console.log('Batch query complete:', results);
      
      // Show summary
      const successCount = results.filter(r => r.status === 'success').length;
      alert(`Portfolio query complete!\n\nSuccess: ${successCount}/${results.length}\nFailed: ${results.length - successCount}`);
      
    } catch (error: any) {
      console.error('Portfolio upload failed:', error);
      alert(error.message || 'Failed to process portfolio file.');
      setIsLoading(false);
      setBatchProgress({ current: 0, total: 0 });
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  // Export batch results
  const handleExportBatchResults = () => {
    if (portfolioLocations.length === 0) {
      alert('No portfolio data to export.');
      return;
    }
    
    const exportData = {
      portfolioLocations,
      summary: {
        totalLocations: portfolioLocations.length,
        successfulQueries: portfolioLocations.filter(l => l.status === 'success').length,
        failedQueries: portfolioLocations.filter(l => l.status === 'error').length,
      },
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-risk-assessment-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Clear batch query mode
  const handleClearBatchQuery = () => {
    setPortfolioLocations([]);
    setBatchQueryMode(false);
    setSelectedPortfolioItem(null);
    setBatchProgress({ current: 0, total: 0 });
  };
  
  
  // ========== Render ==========
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-white shadow-lg overflow-y-auto p-4">
          
          {/* ========== Main Query Module ========== */}
          <Card className="mb-6 border shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800 font-bold">
                  <Target className="w-5 h-5 text-gray-700" />
                  Risk Query
                </CardTitle>
                <button
                  onClick={() => setMethodologyOpen(!methodologyOpen)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Toggle methodology info"
                >
                  {methodologyOpen ? (
                    <EyeOff className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </div>
              
              {/* Methodology Info - Collapsible */}
              {methodologyOpen && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="text-xs font-bold text-gray-800 mb-2">ℹ️ Calculation Methodology</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><span className="font-semibold">Hazard Source:</span> WMS composite layers (max risk across return periods)</p>
                    <p><span className="font-semibold">Exposure:</span> Auto-queried from elevation, population, building density</p>
                    <p><span className="font-semibold">Vulnerability:</span> Auto-determined from land use, or user-overridden</p>
                    <p><span className="font-semibold">Risk Formula:</span> Risk = Hazard × Exposure × Vulnerability</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {/* Input Mode Toggle */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Address or Coordinates</Label>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setSearchInputMode('address')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        searchInputMode === 'address' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Address
                    </button>
                    <button
                      onClick={() => setSearchInputMode('coordinates')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        searchInputMode === 'coordinates' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Lat/Lng
                    </button>
                  </div>
                </div>
                
                {/* Address Input */}
                {searchInputMode === 'address' && (
                  <Input
                    type="text"
                    placeholder="e.g. 中国太平金融中心香港 / China Taiping Tower"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchAddress()}
                    disabled={isLoading}
                  />
                )}
                
                {/* Coordinates Input */}
                {searchInputMode === 'coordinates' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="coord-lat" className="text-xs text-gray-500">Latitude</Label>
                      <Input
                        id="coord-lat"
                        type="number"
                        step="any"
                        placeholder="e.g. 22.28868"
                        value={coordinateLat}
                        onChange={(e) => setCoordinateLat(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchAndCalculate()}
                        disabled={isLoading}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coord-lng" className="text-xs text-gray-500">Longitude</Label>
                      <Input
                        id="coord-lng"
                        type="number"
                        step="any"
                        placeholder="e.g. 114.19135"
                        value={coordinateLng}
                        onChange={(e) => setCoordinateLng(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchAndCalculate()}
                        disabled={isLoading}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mb-3 border rounded-lg overflow-hidden shadow-lg bg-white max-h-60 overflow-y-auto">
                  <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between sticky top-0">
                    <span className="text-xs font-semibold text-gray-600">
                      {searchResults.length} results found - Select one:
                    </span>
                    <button
                      onClick={() => { setShowSearchResults(false); setSearchResults([]); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {searchResults.map((result, index) => {
                    const isHKMO = (result.latitude >= 22.1 && result.latitude <= 22.6 && result.longitude >= 113.5 && result.longitude <= 114.5);
                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 line-clamp-2">{result.address}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-400">
                                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                result.source.includes('Google') ? 'bg-blue-100 text-blue-700' :
                                result.source.includes('Amap') ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {result.source}
                              </span>
                              {isHKMO && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                  HK/MO
                                </span>
                              )}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Search and Calculate Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={searchInputMode === 'address' ? handleSearchAddress : handleSearchAndCalculate}
                  disabled={isLoading || isSearching || batchQueryMode}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search Location'}
                </Button>
                <Button
                  onClick={handleCalculateRisk}
                  disabled={!markerPosition || isLoading || batchQueryMode}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Calculating...' : 'Calculate Risk'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!assetInfo || !riskScores}
                  onClick={() => {
                    if (!assetInfo || !riskScores) {
                      return;
                    }
                    const exportData = {
                      location: assetInfo,
                      riskScores: riskScores,
                      timestamp: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `risk-query-${assetInfo.address?.replace(/[^a-z0-9]/gi, '_') || 'result'}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3"
                  title="Export Single Location Result"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Area Risk Assessment Toggle */}
              <div className="mt-3">
                <Separator className="my-3" />
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Area Risk Assessment</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={toggleDrawMode}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || isCalculatingArea}
                  >
                    {drawMode ? '✓ Drawing Mode Active' : 'Draw Area'}
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Add calculate area risk function
                      console.log('Calculate area risk');
                    }}
                    disabled={!drawMode || isLoading || isCalculatingArea}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCalculatingArea ? 'Calculating...' : 'Calculate Risk'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!areaRiskData}
                    onClick={() => {
                      const exportData = {
                        analysisType: 'area-risk-assessment',
                        timestamp: new Date().toISOString(),
                        areaInfo: {
                          type: areaRiskData.type,
                          area: areaRiskData.area,
                          sampledPoints: areaRiskData.sampledPoints,
                          bounds: areaRiskData.bounds
                        },
                        statistics: areaRiskData.stats,
                        distribution: areaRiskData.distribution
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `area-risk-assessment-${areaRiskData.type}-${new Date().toISOString().slice(0,10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3"
                    title="Export Area Risk Results"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                {drawMode && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <p className="font-semibold">📍 Draw on the map:</p>
                    <ul className="mt-1 ml-4 list-disc space-y-0.5">
                      <li>Circle: Click the circle icon, then click center & drag</li>
                      <li>Rectangle: Click rectangle icon, then drag</li>
                      <li>Polygon: Click polygon icon, click points, double-click to finish</li>
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Area Calculation Progress */}
              {isCalculatingArea && areaCalculationProgress.total > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Analyzing area...</span>
                    <span className="font-semibold">{areaCalculationProgress.current}/{areaCalculationProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(areaCalculationProgress.current / areaCalculationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Sampling {areaCalculationProgress.total} points in the selected area...
                  </p>
                </div>
              )}
              
              {/* Area Risk Results Summary (Simple notification) */}
              {areaRiskData && !isCalculatingArea && (
                <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-green-800">✓ Area Analysis Complete</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {areaRiskData.sampledPoints} points analyzed → View results on map
                      </p>
                    </div>
                    <Button
                      onClick={() => setAreaRiskFloatingOpen(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Batch Upload Section */}
              <div className="mt-3">
                <Separator className="my-3" />
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-700">Batch Portfolio Query</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPortfolioTemplate}
                      className="text-xs h-7"
                      title="Download Excel template with example rows"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Template
                    </Button>
                    {batchQueryMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearBatchQuery}
                        className="text-xs h-7"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
                    onChange={handlePortfolioUpload}
                    disabled={isLoading}
                    className="hidden"
                    id="portfolio-upload"
                  />
                  <label htmlFor="portfolio-upload" className="flex-1">
                    <Button
                      disabled={isLoading}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      asChild
                    >
                      <span className="flex items-center justify-center">
                        Upload Portfolio
                      </span>
                    </Button>
                  </label>
                  <Button
                    onClick={() => {
                      // TODO: Add calculate portfolio risk function
                      console.log('Calculate portfolio risk');
                    }}
                    disabled={portfolioLocations.length === 0 || isLoading}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Calculating...' : 'Calculate Risk'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={portfolioLocations.length === 0}
                    onClick={handleExportBatchResults}
                    className="px-3"
                    title="Export Batch Results"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                {/* ===== TIV Ranking & Filter Panel ===== */}
                {portfolioLocations.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-amber-900">
                        TIV Ranking &amp; Filter
                      </Label>
                      <span className="text-[10px] text-amber-700">
                        Showing {filteredPortfolioLocations.length} / {portfolioLocations.length}
                      </span>
                    </div>

                    {/* Row 1: Top N + Sort By */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-600">Top N</Label>
                        <Select value={portfolioTopN} onValueChange={(v) => setPortfolioTopN(v as any)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All locations</SelectItem>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="20">Top 20</SelectItem>
                            <SelectItem value="50">Top 50</SelectItem>
                            <SelectItem value="100">Top 100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-600">Rank by</Label>
                        <Select value={portfolioSortBy} onValueChange={(v) => setPortfolioSortBy(v as any)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="totalTIV">Total TIV</SelectItem>
                            <SelectItem value="buildingTIV">Building TIV</SelectItem>
                            <SelectItem value="contentTIV">Content TIV</SelectItem>
                            <SelectItem value="biTIV">BI TIV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Occupancy multi-select dropdown (only if data has values) */}
                    {portfolioOccupancyOptions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-gray-600">
                            Occupancy
                            {portfolioOccupancyFilter.length > 0 && (
                              <span className="ml-1 text-amber-700">
                                ({portfolioOccupancyFilter.length} selected)
                              </span>
                            )}
                          </Label>
                          {portfolioOccupancyFilter.length > 0 && (
                            <button
                              onClick={() => setPortfolioOccupancyFilter([])}
                              className="text-[10px] text-amber-700 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="relative mt-1">
                          <button
                            type="button"
                            onClick={() => setOccupancyDropdownOpen(o => !o)}
                            className="w-full text-left text-xs px-2 py-1.5 bg-white border border-amber-300 rounded hover:border-amber-500 flex items-center justify-between"
                          >
                            <span className="truncate text-gray-700">
                              {portfolioOccupancyFilter.length === 0
                                ? `All occupancies (${portfolioOccupancyOptions.length})`
                                : portfolioOccupancyFilter.length <= 2
                                  ? portfolioOccupancyFilter.join(', ')
                                  : `${portfolioOccupancyFilter.slice(0, 2).join(', ')} +${portfolioOccupancyFilter.length - 2} more`
                              }
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${occupancyDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {occupancyDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white border border-amber-300 rounded shadow-lg max-h-56 flex flex-col">
                              <div className="p-1.5 border-b border-amber-100">
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={occupancySearch}
                                  onChange={e => setOccupancySearch(e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="flex items-center justify-between px-2 py-1 text-[10px] text-amber-700 border-b border-amber-100 bg-amber-50">
                                <button
                                  onClick={() => setPortfolioOccupancyFilter(portfolioOccupancyOptions)}
                                  className="hover:underline"
                                >
                                  Select all
                                </button>
                                <button
                                  onClick={() => setPortfolioOccupancyFilter([])}
                                  className="hover:underline"
                                >
                                  None
                                </button>
                              </div>
                              <div className="overflow-y-auto flex-1">
                                {portfolioOccupancyOptions
                                  .filter(opt => opt.toLowerCase().includes(occupancySearch.toLowerCase()))
                                  .map(opt => {
                                    const active = portfolioOccupancyFilter.includes(opt);
                                    const count = portfolioLocations.filter(l => String(l.occupancy || '') === opt).length;
                                    return (
                                      <label
                                        key={opt}
                                        className={`flex items-center justify-between gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-amber-50 ${active ? 'bg-amber-100' : ''}`}
                                      >
                                        <span className="flex items-center gap-1.5 truncate">
                                          <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => setPortfolioOccupancyFilter(prev =>
                                              active ? prev.filter(x => x !== opt) : [...prev, opt]
                                            )}
                                            className="accent-amber-600"
                                          />
                                          <span className="truncate">{opt}</span>
                                        </span>
                                        <span className="text-[10px] text-gray-500">{count}</span>
                                      </label>
                                    );
                                  })}
                                {portfolioOccupancyOptions.filter(opt => opt.toLowerCase().includes(occupancySearch.toLowerCase())).length === 0 && (
                                  <div className="px-2 py-3 text-[11px] text-gray-400 text-center">No match</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total TIV summary line */}
                    {(() => {
                      const sum = filteredPortfolioLocations.reduce((s, l) => s + (l[portfolioSortBy] || 0), 0);
                      if (sum === 0) return null;
                      const fmt = (n: number) =>
                        n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
                        : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
                        : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K`
                        : n.toFixed(0);
                      return (
                        <div className="text-[11px] text-amber-900 pt-1 border-t border-amber-200">
                          Sum of {portfolioSortBy.replace('TIV', ' TIV')}: <b>{fmt(sum)}</b>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Batch Progress */}
                {isLoading && batchProgress.total > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                      <span>Processing locations...</span>
                      <span className="font-semibold">{batchProgress.current}/{batchProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Batch Results Summary */}
                {batchQueryMode && portfolioLocations.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Portfolio Loaded: {portfolioLocations.length} locations
                    </p>
                    <div className="text-xs text-green-700 space-y-0.5">
                      <p>✅ Success: {portfolioLocations.filter(l => l.status === 'success').length}</p>
                      <p>❌ Failed: {portfolioLocations.filter(l => l.status === 'error').length}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Querying location data...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Separator className="my-10" />
          
          {/* ========== Detailed Hazard Layers ========== */}
          <div className="mb-6">
            <button
              onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg border-2 border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-bold text-gray-800">Detailed Hazard Layers</span>
              </div>
              {advancedOptionsOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            {advancedOptionsOpen && (
              <div className="mt-3 p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">
                {/* Detailed Hazard Layers */}
                <div>
                  <p className="text-xs text-gray-600 mb-3">
                    View individual return period maps. Risk calculation uses composite layers by default.
                  </p>
                  
                  {/* Flood Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">🌊 Flood (River/Coastal/Flash) - With Drainage System</p>
                    {currentRegion === 'mo' ? (
                      <div className="pl-2 space-y-3">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="space-y-3">
                            {/* Macau Design Scenario Layer Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                Flood Design Scenario Layer
                              </Label>
                              <Select 
                                value={selectedMacauDesignScenario} 
                                onValueChange={(value) => {
                                  setSelectedMacauDesignScenario(value);
                                  if (value !== 'none') {
                                    setVisibleLayers(prev => ({ ...prev, macauDesignScenario: true }));
                                  } else {
                                    setVisibleLayers(prev => ({ ...prev, macauDesignScenario: false }));
                                  }
                                }}
                                disabled={isFetchingMacauLayers}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder={isFetchingMacauLayers ? "Loading layers..." : "Select a scenario layer"} />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[400px]">
                                  <SelectItem value="none" className="text-xs text-gray-500">
                                    -- No Layer Selected --
                                  </SelectItem>
                                  {/* Rain-Only Scenarios */}
                                  {macauDesignScenarioLayers.filter(l => l.includes('Design_Rain_')).length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 uppercase tracking-wider border-t border-blue-100">
                                        🌧️ Rain Only
                                      </div>
                                      {macauDesignScenarioLayers.filter(l => l.includes('Design_Rain_')).map(layer => {
                                        const matchR = layer.match(/Rain_R(\d+)$/);
                                        const displayName = matchR ? `Rain ${matchR[1]}yr Return Period` : layer.split(':')[1];
                                        return (
                                          <SelectItem key={layer} value={layer} className="text-xs">
                                            🌧️ {displayName}
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  )}
                                  {/* Surge-Only Scenarios */}
                                  {macauDesignScenarioLayers.filter(l => l.includes('Design_Surge_')).length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 uppercase tracking-wider border-t border-teal-100">
                                        🌊 Storm Surge Only
                                      </div>
                                      {macauDesignScenarioLayers.filter(l => l.includes('Design_Surge_')).map(layer => {
                                        const matchT = layer.match(/Surge_T(\d+)$/);
                                        const displayName = matchT ? `Surge ${matchT[1]}yr Return Period` : layer.split(':')[1];
                                        return (
                                          <SelectItem key={layer} value={layer} className="text-xs">
                                            🌊 {displayName}
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  )}
                                  {/* Combined Surge+Rain Scenarios */}
                                  {macauDesignScenarioLayers.filter(l => l.includes('SurgeRain_')).length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 uppercase tracking-wider border-t border-indigo-100">
                                        🌊🌧️ Combined Surge + Rain
                                      </div>
                                      {macauDesignScenarioLayers.filter(l => l.includes('SurgeRain_')).map(layer => {
                                        const matchTR = layer.match(/SurgeRain_T(\d+)R(\d+)$/);
                                        const displayName = matchTR ? `Surge ${matchTR[1]}yr + Rain ${matchTR[2]}yr` : layer.split(':')[1];
                                        return (
                                          <SelectItem key={layer} value={layer} className="text-xs">
                                            🌊🌧️ {displayName}
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              {isFetchingMacauLayers && (
                                <p className="text-[10px] text-blue-600 flex items-center gap-1">
                                  <span className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                  Loading layers from GeoServer...
                                </p>
                              )}
                              {!isFetchingMacauLayers && macauDesignScenarioLayers.length === 0 && (
                                <p className="text-[10px] text-amber-600">
                                  ⚠️ No layers found. Check GeoServer connection.
                                </p>
                              )}
                              {!isFetchingMacauLayers && macauDesignScenarioLayers.length > 0 && (
                                <p className="text-[10px] text-gray-500">
                                  {macauDesignScenarioLayers.length} scenario layers available
                                  ({macauDesignScenarioLayers.filter(l => l.includes('Design_Rain_')).length} rain, {macauDesignScenarioLayers.filter(l => l.includes('Design_Surge_')).length} surge, {macauDesignScenarioLayers.filter(l => l.includes('SurgeRain_')).length} combined)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentRegion === 'hk' ? (
                      <div className="pl-2 space-y-3">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="space-y-3">
                            {/* Rain-induced Flood Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌧️ Rain-induced Flood
                              </Label>
                              <Select
                                value={selectedHkRainLayer}
                                onValueChange={(value) => {
                                  const rainLayers = ['hkFloodRain5', 'hkFloodRain10', 'hkFloodRain20', 'hkFloodRain50', 'hkFloodRain100', 'hkFloodRain200', 'hkFloodRain500', 'hkFloodRain1000'];
                                  setSelectedHkRainLayer(value);
                                  setVisibleLayers(prev => {
                                    const updated = { ...prev };
                                    rainLayers.forEach(l => updated[l] = false);
                                    if (value !== 'none') updated[value] = true;
                                    return updated;
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Select a rain flood layer" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {['hkFloodRain5', 'hkFloodRain10', 'hkFloodRain20', 'hkFloodRain50', 'hkFloodRain100', 'hkFloodRain200', 'hkFloodRain500', 'hkFloodRain1000'].map(layer => (
                                    <SelectItem key={layer} value={layer} className="text-xs">
                                      🌧️ {wmsLayersConfig[layer]?.name || layer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Storm Surge Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌊 Storm Surge
                              </Label>
                              <Select
                                value={selectedHkSurgeLayer}
                                onValueChange={(value) => {
                                  const surgeLayers = ['hkFloodSurgeQ90', 'hkFloodSurgeQ95', 'hkFloodSurgeQ98', 'hkFloodSurgeQ99', 'hkFloodSurgeExpected'];
                                  setSelectedHkSurgeLayer(value);
                                  setVisibleLayers(prev => {
                                    const updated = { ...prev };
                                    surgeLayers.forEach(l => updated[l] = false);
                                    if (value !== 'none') updated[value] = true;
                                    return updated;
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Select a storm surge layer" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {['hkFloodSurgeQ90', 'hkFloodSurgeQ95', 'hkFloodSurgeQ98', 'hkFloodSurgeQ99', 'hkFloodSurgeExpected'].map(layer => (
                                    <SelectItem key={layer} value={layer} className="text-xs">
                                      🌊 {wmsLayersConfig[layer]?.name || layer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Wave-induced Flood Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌊 Wave-induced Flood
                              </Label>
                              <Select
                                value={selectedHkWaveLayer}
                                onValueChange={(value) => {
                                  const waveLayers = ['hkFloodWave5', 'hkFloodWave10', 'hkFloodWave20', 'hkFloodWave50', 'hkFloodWave100', 'hkFloodWave200', 'hkFloodWave500', 'hkFloodWave1000'];
                                  setSelectedHkWaveLayer(value);
                                  setVisibleLayers(prev => {
                                    const updated = { ...prev };
                                    waveLayers.forEach(l => updated[l] = false);
                                    if (value !== 'none') updated[value] = true;
                                    return updated;
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Select a wave flood layer" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {['hkFloodWave5', 'hkFloodWave10', 'hkFloodWave20', 'hkFloodWave50', 'hkFloodWave100', 'hkFloodWave200', 'hkFloodWave500', 'hkFloodWave1000'].map(layer => (
                                    <SelectItem key={layer} value={layer} className="text-xs">
                                      🌊 {wmsLayersConfig[layer]?.name || layer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <p className="text-[10px] text-gray-500">
                              21 flood layers available (8 rain, 5 surge, 8 wave)
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 pl-2">
                        {['flood500yr', 'flood200yr', 'flood100yr', 'flood50yr', 'flood20yr'].map(layer => (
                          <div key={layer} className="flex items-center">
                            <Checkbox
                              id={layer}
                              checked={visibleLayers[layer]}
                              onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [layer]: !!checked }))}
                            />
                            <Label htmlFor={layer} className="ml-2 text-xs cursor-pointer">
                              {wmsLayersConfig[layer]?.name || layer}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Flood Layers Without Drainage (for comparison) */}
                  <div className="mb-3">
                    <Select 
                      value={selectedFloodNoDrainage} 
                      onValueChange={(value) => {
                        // Clear all flood no drainage layers first
                        setVisibleLayers(prev => ({
                          ...prev,
                          floodNoDrainage500yr: false,
                          floodNoDrainage200yr: false,
                          floodNoDrainage100yr: false,
                          floodNoDrainage50yr: false,
                          floodNoDrainage20yr: false
                        }));
                        
                        // Set selected layer if not 'none'
                        if (value !== 'none') {
                          setVisibleLayers(prev => ({ ...prev, [value]: true }));
                        }
                        
                        setSelectedFloodNoDrainage(value);
                      }}
                    >
                      <SelectTrigger className="w-full h-7 text-xs">
                        <SelectValue placeholder="Select return period" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="none" className="text-xs">🌊 Flood Without Drainage (Comparison Baseline)</SelectItem>
                        <SelectItem value="floodNoDrainage500yr" className="text-xs">500-year Return Period</SelectItem>
                        <SelectItem value="floodNoDrainage200yr" className="text-xs">200-year Return Period</SelectItem>
                        <SelectItem value="floodNoDrainage100yr" className="text-xs">100-year Return Period</SelectItem>
                        <SelectItem value="floodNoDrainage50yr" className="text-xs">50-year Return Period</SelectItem>
                        <SelectItem value="floodNoDrainage20yr" className="text-xs">20-year Return Period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Rainstorm Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">🌧️ Rainstorm Intensity</p>
                    <div className="space-y-1 pl-2">
                      {['rainstorm500yr', 'rainstorm200yr', 'rainstorm100yr', 'rainstorm50yr', 'rainstorm20yr'].map(layer => (
                        <div key={layer} className="flex items-center">
                          <Checkbox
                            id={layer}
                            checked={visibleLayers[layer]}
                            onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [layer]: !!checked }))}
                          />
                          <Label htmlFor={layer} className="ml-2 text-xs cursor-pointer">
                            {wmsLayersConfig[layer].name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Typhoon Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Tropical Cyclone</p>
                    <div className="space-y-1 pl-2">
                      {['typhoonTD', 'typhoonTS', 'typhoonSTS', 'typhoonTY', 'typhoonSTY', 'typhoonSuperTY'].map(layer => (
                        <div key={layer} className="flex items-center">
                          <Checkbox
                            id={layer}
                            checked={visibleLayers[layer]}
                            onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [layer]: !!checked }))}
                          />
                          <Label htmlFor={layer} className="ml-2 text-xs cursor-pointer">
                            {wmsLayersConfig[layer].name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Landslide Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Landslide</p>
                    <div className="space-y-1 pl-2">
                      {['geoLandslideHigh', 'geoLandslideMedium', 'geoLandslideLow'].map(layer => (
                        <div key={layer} className="flex items-center">
                          <Checkbox
                            id={layer}
                            checked={visibleLayers[layer]}
                            onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [layer]: !!checked }))}
                          />
                          <Label htmlFor={layer} className="ml-2 text-xs cursor-pointer">
                            {wmsLayersConfig[layer].name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Separator className="my-6" />
          
          {/* ========== Geospatial & Disaster Data Hub ========== */}
          <div className="mb-6">
            <button
              onClick={() => setGeospatialDataOpen(!geospatialDataOpen)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg border-2 border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-bold text-gray-800">Geospatial & Disaster Data Hub</span>
              </div>
              {geospatialDataOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            {geospatialDataOpen && (
              <div className="mt-3 p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">

                {/* Geospatial Layers Dropdown */}
                <div>
                  {/* Category Dropdown */}
                  <div className="mb-3">
                    <Select
                      value={selectedGeospatialCategory || 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setSelectedGeospatialCategory('');
                        } else {
                          setSelectedGeospatialCategory(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select geospatial category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-gray-500 italic">-- Please select a Geospatial Layers --</SelectItem>
                        <SelectItem value="geography" className="text-xs">🗺️ Geography</SelectItem>
                        <SelectItem value="infrastructure" className="text-xs">🏗️ Infrastructure</SelectItem>
                        <SelectItem value="socioeconomic" className="text-xs">👥 Socioeconomic</SelectItem>
                        <SelectItem value="weather" className="text-xs">🌤️ Weather</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Content */}
                  {selectedGeospatialCategory && selectedGeospatialCategory !== 'none' && (
                    <div className="mt-3">
                      {/* Geography Category */}
                      {selectedGeospatialCategory === 'geography' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="topography" checked={urbanElements.topography} onCheckedChange={() => handleUrbanElementToggle('topography')} />
                              <Label htmlFor="topography" className="text-xs cursor-pointer font-normal">Topography</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="geomorphology" checked={urbanElements.geomorphology} onCheckedChange={() => handleUrbanElementToggle('geomorphology')} />
                              <Label htmlFor="geomorphology" className="text-xs cursor-pointer font-normal">Geomorphology</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="riverNetwork" checked={urbanElements.riverNetwork} onCheckedChange={() => handleUrbanElementToggle('riverNetwork')} />
                              <Label htmlFor="riverNetwork" className="text-xs cursor-pointer font-normal">River Network</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="boundary" checked={urbanElements.boundary} onCheckedChange={() => handleUrbanElementToggle('boundary')} />
                              <Label htmlFor="boundary" className="text-xs cursor-pointer font-normal">Administrative Boundary</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="landCover" checked={urbanElements.landCover} onCheckedChange={() => handleUrbanElementToggle('landCover')} />
                              <Label htmlFor="landCover" className="text-xs cursor-pointer font-normal">Land Cover (2019)</Label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Infrastructure Category */}
                      {selectedGeospatialCategory === 'infrastructure' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="buildingRisk" checked={urbanElements.buildingRisk} onCheckedChange={() => handleUrbanElementToggle('buildingRisk')} />
                              <Label htmlFor="buildingRisk" className="text-xs cursor-pointer font-normal">Building</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="roadsAndStreets" checked={urbanElements.roadsAndStreets} onCheckedChange={() => handleUrbanElementToggle('roadsAndStreets')} />
                              <Label htmlFor="roadsAndStreets" className="text-xs cursor-pointer font-normal">Roads & Streets</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="landUse" checked={urbanElements.landUse} onCheckedChange={() => handleUrbanElementToggle('landUse')} />
                              <Label htmlFor="landUse" className="text-xs cursor-pointer font-normal">Land Use</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="drainageConduits" checked={urbanElements.drainageConduits} onCheckedChange={() => handleUrbanElementToggle('drainageConduits')} />
                              <Label htmlFor="drainageConduits" className="text-xs cursor-pointer font-normal">Drainage Conduits</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="drainageJunctions" checked={urbanElements.drainageJunctions} onCheckedChange={() => handleUrbanElementToggle('drainageJunctions')} />
                              <Label htmlFor="drainageJunctions" className="text-xs cursor-pointer font-normal">Drainage Junctions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="drainageOutfalls" checked={urbanElements.drainageOutfalls} onCheckedChange={() => handleUrbanElementToggle('drainageOutfalls')} />
                              <Label htmlFor="drainageOutfalls" className="text-xs cursor-pointer font-normal">Drainage Outfalls</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="defensiveEmbankments" checked={urbanElements.defensiveEmbankments} onCheckedChange={() => handleUrbanElementToggle('defensiveEmbankments')} />
                              <Label htmlFor="defensiveEmbankments" className="text-xs cursor-pointer font-normal">Defensive Embankments</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="serviceReservoirs" checked={urbanElements.serviceReservoirs} onCheckedChange={() => handleUrbanElementToggle('serviceReservoirs')} />
                              <Label htmlFor="serviceReservoirs" className="text-xs cursor-pointer font-normal">Service Reservoirs</Label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Socioeconomic Category */}
                      {selectedGeospatialCategory === 'socioeconomic' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="populationDensity" checked={urbanElements.populationDensity} onCheckedChange={() => handleUrbanElementToggle('populationDensity')} />
                              <Label htmlFor="populationDensity" className="text-xs cursor-pointer font-normal">Population Density</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="economicData" checked={urbanElements.economicData} onCheckedChange={() => handleUrbanElementToggle('economicData')} />
                              <Label htmlFor="economicData" className="text-xs cursor-pointer font-normal">Economic Data</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="industrialCommercial" checked={urbanElements.industrialCommercial} onCheckedChange={() => handleUrbanElementToggle('industrialCommercial')} />
                              <Label htmlFor="industrialCommercial" className="text-xs cursor-pointer font-normal">Industrial & Commercial</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="nighttimeLightIndex" checked={urbanElements.nighttimeLightIndex} onCheckedChange={() => handleUrbanElementToggle('nighttimeLightIndex')} />
                              <Label htmlFor="nighttimeLightIndex" className="text-xs cursor-pointer font-normal">Nighttime Light Index</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="poi" checked={urbanElements.poi} onCheckedChange={() => handleUrbanElementToggle('poi')} />
                              <Label htmlFor="poi" className="text-xs cursor-pointer font-normal">Points of Interest (POI)</Label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Weather Category */}
                      {selectedGeospatialCategory === 'weather' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="annualRainfall" checked={urbanElements.annualRainfall} onCheckedChange={() => handleUrbanElementToggle('annualRainfall')} />
                              <Label htmlFor="annualRainfall" className="text-xs cursor-pointer font-normal">Annual Rainfall</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="annualTemperature" checked={urbanElements.annualTemperature} onCheckedChange={() => handleUrbanElementToggle('annualTemperature')} />
                              <Label htmlFor="annualTemperature" className="text-xs cursor-pointer font-normal">Annual Temperature</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="earthMapIntegration" checked={urbanElements.earthMapIntegration} onCheckedChange={() => handleUrbanElementToggle('earthMapIntegration')} />
                              <Label htmlFor="earthMapIntegration" className="text-xs cursor-pointer font-normal">Earth Map Integration</Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Disaster Events Section */}
                <div>
                  {/* Disaster Category Dropdown */}
                  <div className="mb-3">
                    <Select
                      value={selectedDisasterCategory || 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setSelectedDisasterCategory('');
                        } else {
                          setSelectedDisasterCategory(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select disaster category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-gray-500 italic">-- Please select a Disaster Events --</SelectItem>
                        <SelectItem value="typhoon" className="text-xs">🌀 Typhoon</SelectItem>
                        <SelectItem value="rainfall" className="text-xs">🌧️ Rainfall</SelectItem>
                        <SelectItem value="flood" className="text-xs">🌊 Flood</SelectItem>
                        <SelectItem value="landslide" className="text-xs">⛰️ Landslide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Content */}
                  {selectedDisasterCategory && selectedDisasterCategory !== 'none' && (
                    <div className="mt-3">
                      {/* Typhoon Category - IBTrACS */}
                      {selectedDisasterCategory === 'typhoon' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <p className="text-xs font-bold text-indigo-900 mb-2">
                              🌏 IBTrACS Global Typhoon Database
                            </p>
                            <p className="text-[11px] text-indigo-700 mb-3">
                              点击地图上的台风路径可查看详细信息，包括最大风速、最低气压、风圈半径等。
                            </p>

                            <div className="space-y-2">
                              <div className="flex items-start">
                                <Checkbox
                                  id="globalTyphoonTracks"
                                  checked={visibleLayers.globalTyphoonTracks}
                                  onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, globalTyphoonTracks: !!checked }))}
                                />
                                <div className="ml-2">
                                  <Label htmlFor="globalTyphoonTracks" className="text-xs cursor-pointer font-medium text-gray-800">
                                    {wmsLayersConfig.globalTyphoonTracks.name}
                                  </Label>
                                  <p className="text-[11px] text-gray-500 mt-1">
                                    💡 显示全球台风移动路径线
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rainfall Category - HK Black Rain Station Map */}
                      {selectedDisasterCategory === 'rainfall' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                            <p className="text-xs font-bold text-sky-900 mb-2">
                              🌧️ HK Black Rainstorm Events
                            </p>
                            <p className="text-[11px] text-sky-700 mb-3">
                              HKO observed Black Rainstorm events — station-level rainfall data across Hong Kong
                            </p>
                            <button
                              onClick={() => setShowBlackRainMap(true)}
                              className="w-full px-3 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors flex items-center justify-center gap-1.5"
                            >
                              🗺️ Open Black Rain Station Map
                            </button>
                            <p className="text-[10px] text-gray-500 mt-1.5">
                              Interactive map with all historical Black Rainstorm events and station observations
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Flood Category - Macau Historical Flood Events (TC + Rain) */}
                      {selectedDisasterCategory === 'flood' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-bold text-blue-900 mb-2">
                              🌊 Macau Historical Flood Simulation
                            </p>
                            <p className="text-[11px] text-blue-700 mb-3">
                              {HIST_TC_LAYERS.length + HIST_RAIN_LAYERS.length} flood depth maps: {HIST_TC_LAYERS.length} TC-induced + {HIST_RAIN_LAYERS.length} Rain-induced events
                            </p>

                            {/* ── TC-induced Flood ── */}
                            <div className="mb-4">
                              <Label className="text-xs font-semibold mb-1.5 block text-gray-700">🌀 TC-Induced Flood ({HIST_TC_LAYERS.length} events, 1990-2024)</Label>
                              <Select
                                value={selectedHistTCLayer}
                                onValueChange={(value) => {
                                  setSelectedHistTCLayer(value);
                                  if (value !== 'none') {
                                    setVisibleLayers(prev => ({ ...prev, macauHistTC: true }));
                                  } else {
                                    setVisibleLayers(prev => ({ ...prev, macauHistTC: false }));
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Choose a TC flood event..." />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[400px]">
                                  <SelectItem value="none" className="text-xs text-gray-500">
                                    -- No Event Selected --
                                  </SelectItem>
                                  {/* Named storms first */}
                                  <div className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-50 uppercase tracking-wider border-t border-red-100">
                                    🌀 Named Storms
                                  </div>
                                  {HIST_TC_LAYERS.filter(l => !l.layer.match(/_\d{4}_\d+$/)).map(l => (
                                    <SelectItem key={l.layer} value={l.layer} className="text-xs">
                                      🌀 {l.display}
                                    </SelectItem>
                                  ))}
                                  {/* Year-grouped events */}
                                  {(() => {
                                    const yearLayers = HIST_TC_LAYERS.filter(l => l.layer.match(/_\d{4}_\d+$/));
                                    const years = [...new Set(yearLayers.map(l => l.year))].sort();
                                    return years.map(year => (
                                      <React.Fragment key={year}>
                                        <div className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 uppercase tracking-wider border-t border-blue-100">
                                          📅 {year} ({yearLayers.filter(l => l.year === year).length} events)
                                        </div>
                                        {yearLayers.filter(l => l.year === year).map(l => (
                                          <SelectItem key={l.layer} value={l.layer} className="text-xs">
                                            🌊 {l.display}
                                          </SelectItem>
                                        ))}
                                      </React.Fragment>
                                    ));
                                  })()}
                                </SelectContent>
                              </Select>
                              {selectedHistTCLayer !== 'none' && (
                                <div className="mt-1.5 p-2 bg-white rounded border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-blue-800">
                                      🌊 {HIST_TC_LAYERS.find(l => l.layer === selectedHistTCLayer)?.display}
                                    </span>
                                    <Checkbox
                                      checked={visibleLayers.macauHistTC || false}
                                      onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, macauHistTC: !!checked }))}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ── Rain-induced Flood ── */}
                            <div className="mb-2">
                              <Label className="text-xs font-semibold mb-1.5 block text-gray-700">🌧️ Rain-Induced Flood ({HIST_RAIN_LAYERS.length} events, 2020-2025)</Label>
                              <Select
                                value={selectedHistRainLayer}
                                onValueChange={(value) => {
                                  setSelectedHistRainLayer(value);
                                  if (value !== 'none') {
                                    setVisibleLayers(prev => ({ ...prev, macauHistRain: true }));
                                  } else {
                                    setVisibleLayers(prev => ({ ...prev, macauHistRain: false }));
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-sky-200">
                                  <SelectValue placeholder="Choose a rain-induced flood event..." />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[400px]">
                                  <SelectItem value="none" className="text-xs text-gray-500">
                                    -- No Event Selected --
                                  </SelectItem>
                                  {(() => {
                                    const years = [...new Set(HIST_RAIN_LAYERS.map(l => l.year))].sort();
                                    return years.map(year => (
                                      <React.Fragment key={year}>
                                        <div className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 uppercase tracking-wider border-t border-sky-100">
                                          📅 {year}
                                        </div>
                                        {HIST_RAIN_LAYERS.filter(l => l.year === year).map(l => (
                                          <SelectItem key={l.layer} value={l.layer} className="text-xs">
                                            🌧️ {l.display}
                                          </SelectItem>
                                        ))}
                                      </React.Fragment>
                                    ));
                                  })()}
                                </SelectContent>
                              </Select>
                              {selectedHistRainLayer !== 'none' && (
                                <div className="mt-1.5 p-2 bg-white rounded border border-sky-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-sky-800">
                                      🌧️ {HIST_RAIN_LAYERS.find(l => l.layer === selectedHistRainLayer)?.display}
                                    </span>
                                    <Checkbox
                                      checked={visibleLayers.macauHistRain || false}
                                      onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, macauHistRain: !!checked }))}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <p className="text-[10px] text-gray-500 mt-2">
                              💡 可同时选择一个TC事件和一个Rain事件叠加显示在地图上
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Landslide Category */}
                      {selectedDisasterCategory === 'landslide' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs font-bold text-amber-900 mb-2">
                              ⛰️ Landslide Data
                            </p>
                            <p className="text-[11px] text-amber-700 mb-3">
                              Geological hazard and slope stability information
                            </p>
                            <p className="text-xs text-gray-600 italic">
                              Landslide datasets will be available soon
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Separator className="my-6" />
          
          {/* ========== Portfolio Exposure Overlay ========== */}
          <div className="mb-6">
            <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-800">Portfolio Exposure Overlay</span>
                  <button
                    onClick={() => setPortfolioOverlayInfoOpen(!portfolioOverlayInfoOpen)}
                    className="p-1 hover:bg-indigo-100 rounded transition-colors"
                    title="Toggle info"
                  >
                    {portfolioOverlayInfoOpen ? (
                      <EyeOff className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showPortfolioOverlay}
                    onChange={(e) => setShowPortfolioOverlay(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Info Section - Collapsible */}
              {portfolioOverlayInfoOpen && (
                <div className="mt-3 p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                  <p className="text-xs text-indigo-700">
                    Visualize portfolio concentration to identify high-exposure areas against hazard layers.
                  </p>
                </div>
              )}

              {portfolioOverlayLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 mt-3">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading portfolio data...</span>
                </div>
              )}

              {/* Data Tier Selection */}
              {showPortfolioOverlay && (
                <div className="mt-3 p-2 bg-white rounded border border-indigo-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Select Data Tier</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000, 5000, 10000, 50000].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setPortfolioTier(tier)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          portfolioTier === tier
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Top {tier >= 1000 ? `${tier / 1000}k` : tier}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showPortfolioOverlay && portfolioOverlayData.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded border border-indigo-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    📊 {portfolioOverlayData.length} Locations Loaded
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-700"></div>
                      <span>High (top 10%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Medium (50-90%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-200"></div>
                      <span>Low (bottom 50%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* ========== Asset Vulnerability Curves ========== */}
          <div className="mb-6">
            <button
              onClick={() => setAssetAttributesOpen(!assetAttributesOpen)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg border-2 border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-bold text-gray-800">Asset Vulnerability Curves</span>
              </div>
              {assetAttributesOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            {assetAttributesOpen && (
              <div className="mt-3 p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">
                
                {/* Info Box */}
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-600">
                    Define building characteristics for automatic vulnerability curve matching
                  </p>
                </div>
                
                {/* Building Type */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold whitespace-nowrap min-w-[100px]">Building Type</Label>
                  <Select value={buildingType} onValueChange={setBuildingType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">🏠 Residential</SelectItem>
                      <SelectItem value="commercial">🏢 Commercial</SelectItem>
                      <SelectItem value="industrial">🏭 Industrial</SelectItem>
                      <SelectItem value="public">🏛️ Public Building</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Structure Type */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold whitespace-nowrap min-w-[100px]">Structure Type</Label>
                  <Select value={structureType} onValueChange={setStructureType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concrete-frame">Concrete Frame - Low Risk</SelectItem>
                      <SelectItem value="steel-frame">Steel Frame - Low Risk</SelectItem>
                      <SelectItem value="masonry">Masonry - Medium Risk</SelectItem>
                      <SelectItem value="wood-frame">Wood Frame - High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Occupancy Type */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold whitespace-nowrap min-w-[100px]">Occupancy Type</Label>
                  <Select value={occupancyType} onValueChange={setOccupancyType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">Single Family House</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator className="my-3" />
                
                {/* Visualization Button */}
                <Button 
                  onClick={() => setVulnerabilityCurveChartOpen(true)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Show Vulnerability Curve Visualization
                </Button>
                
              </div>
            )}
          </div>
          
          {/* ========== Batch Portfolio Results List ========== */}
          {batchQueryMode && portfolioLocations.length > 0 && (
            <div className="mt-6">
              <Separator className="my-6" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Portfolio Locations</h3>
                <span className="text-xs text-gray-500">
                  {filteredPortfolioLocations.length} shown · sorted by {portfolioSortBy.replace('TIV', ' TIV')}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPortfolioLocations.map((location, idx) => {
                  const tivValue = location[portfolioSortBy] || 0;
                  const isTopN = idx < Math.min(10, filteredPortfolioLocations.length);
                  const fmt = (n: any) =>
                    !Number.isFinite(n) || n === 0 ? '—'
                    : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
                    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
                    : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K`
                    : String(n);
                  return (
                  <Card
                    key={location.id || idx}
                    className={`cursor-pointer transition-all ${
                      selectedPortfolioItem?.id === location.id
                        ? 'border-2 border-purple-500 bg-purple-50'
                        : isTopN
                          ? 'border-2 border-amber-300 hover:border-amber-500 bg-amber-50'
                          : 'border hover:border-gray-400 hover:bg-gray-50'
                    } ${location.status === 'error' ? 'opacity-60' : ''}`}
                    onClick={() => {
                      setSelectedPortfolioItem(location);
                      if (location.latitude && location.longitude && mapRef.current) {
                        mapRef.current.flyTo([location.latitude, location.longitude], 13, { duration: 1.5 });
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            {isTopN && (
                              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                            )}
                            {location.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{location.id}</p>
                          {location.occupancy && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {location.occupancy}
                              {location.yearBuilt && ` · ${location.yearBuilt}`}
                              {location.structure && ` · ${location.structure}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {tivValue > 0 && (
                            <div className="text-xs font-bold text-amber-700">
                              {fmt(tivValue)}
                              {location.currency && <span className="text-gray-500 font-normal"> {location.currency}</span>}
                            </div>
                          )}
                          {location.status === 'success' ? (
                            <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold ${getRiskColor(location.riskScores?.overall?.level || 'Low')}`}>
                              {location.riskScores?.overall?.level || 'N/A'}
                            </div>
                          ) : location.status === 'error' ? (
                            <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                              Error
                            </div>
                          ) : null}
                        </div>
                      </div>
                      
                      {location.status === 'success' && location.riskScores && (
                        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Overall:</span>
                            <span className="ml-1 font-semibold">{location.riskScores.overall.score}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Flood:</span>
                            <span className="ml-1 font-semibold">{location.riskScores.flood.score}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Typhoon:</span>
                            <span className="ml-1 font-semibold">{location.riskScores.typhoon.score}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rainstorm:</span>
                            <span className="ml-1 font-semibold">{location.riskScores.rainstorm.score}/10</span>
                          </div>
                        </div>
                      )}
                      
                      {location.status === 'error' && (
                        <p className="text-xs text-red-600 mt-2">⚠️ {location.error}</p>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              {/* ========== Loss EP Curve — open in centered modal ========== */}
              <div className="mt-4">
                <Button
                  onClick={() => setEpCurveOpen(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Loss EP Curve (Earthquake OEP)
                </Button>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Click to view exceedance probability curve in detail
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Map Area */}
        <div className="flex-1 relative">
          {/* Loading indicator for IBTrACS query */}
          {typhoonInfoLoading && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1200] bg-white/95 border border-indigo-300 shadow-lg px-4 py-2 rounded-lg text-xs text-gray-700 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">读取台风节点属性...</span>
            </div>
          )}

          {/* Error message for IBTrACS query */}
          {typhoonInfoError && (visibleLayers.globalTyphoonPoints || visibleLayers.globalTyphoonTracks) && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[1200] bg-amber-50 border border-amber-300 shadow-lg px-4 py-2 rounded-lg text-xs max-w-sm">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 text-sm">⚠️</span>
                <div>
                  <p className="font-medium text-amber-800">{typhoonInfoError}</p>
                  <button
                    onClick={() => setTyphoonInfoError(null)}
                    className="mt-1 text-[10px] text-amber-600 hover:text-amber-800 underline"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            ref={mapRef}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            {/* Base Map Layers - Always at bottom with zIndex */}
            {baseMap === 'esri' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                zIndex={1}
              />
            )}
            {baseMap === 'carto' && (
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                zIndex={1}
              />
            )}
            {baseMap === 'google' && (
              <TileLayer
                attribution='&copy; Google Maps'
                url="http://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                zIndex={1}
              />
            )}
            {baseMap === 'amap' && (
              <TileLayer
                attribution='&copy; Amap (Gaode)'
                url="http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
                zIndex={1}
              />
            )}
            
            {/* Composite WMS Layers (used for quick query) */}
            {Object.entries(visibleLayers).map(([key, visible]) => {
              if (visible && wmsLayersConfig[key]) {
                const layerName = wmsLayersConfig[key].layer;
                console.log('🗺️ [WMS LAYER RENDERING]', {
                  key,
                  layerName: layerName,
                  url: GEOSERVER_WMS_URL,
                  visible: true
                });
                return (
                  <WMSTileLayer
                    key={`${key}-${layerName}`}
                    url={GEOSERVER_WMS_URL}
                    layers={layerName}
                    format="image/png"
                    transparent={true}
                    version="1.1.0"
                    opacity={0.7}
                  />
                );
              }
              return null;
            })}
            
            {/* Geospatial Data Hub Layers */}
            {urbanElements.buildingRisk && (
              <WMSTileLayer
                key="buildingRisk"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Building"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] Building layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] Building layer loaded successfully'),
                  tileerror: (error: any) => {
                    console.error('❌ [WMS ERROR] Building layer tile error:', error);
                    console.error('❌ [WMS ERROR] Error details:', {
                      tile: error.tile,
                      coords: error.coords,
                      url: error.tile?.src || 'No URL available'
                    });
                  }
                }}
              />
            )}
            {(() => {
              console.log('🗺️ [BUILDING LAYER CHECK]', {
                buildingRiskState: urbanElements.buildingRisk,
                shouldRender: urbanElements.buildingRisk,
                geoserverUrl: GEOSERVER_GEOSPATIAL_URL,
                layerName: 'COP:Building'
              });
              return null;
            })()}
            {urbanElements.boundary && (
              <WMSTileLayer
                key="boundary"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:taiping_boundary"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] Boundary layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] Boundary layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] Boundary layer tile error:', error)
                }}
              />
            )}
            {urbanElements.annualRainfall && (
              <WMSTileLayer
                key="annualRainfall"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:taiping_Annual_rainfall"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] Annual Rainfall layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] Annual Rainfall layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] Annual Rainfall layer tile error:', error)
                }}
              />
            )}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.drainageConduits && (
              <WMSTileLayer
                key="conduits"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Conduits"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.drainageJunctions && (
              <WMSTileLayer
                key="junctions"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Junctions"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.drainageOutfalls && (
              <WMSTileLayer
                key="outfalls"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Outfalls"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.populationDensity && (
              <WMSTileLayer
                key="populationDensity"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:PopulationDensity_per_30_arcseconds"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.landCover && (
              <WMSTileLayer
                key="landCover"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:LandCover_ProbaV_2019"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.serviceReservoirs && (
              <WMSTileLayer
                key="serviceReservoirs"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Service_Reservoirs"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.roadsAndStreets && (
              <WMSTileLayer
                key="roadsAndStreets"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Roads_Streets"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.landUse && (
              <WMSTileLayer
                key="landUse"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Land_Use"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.defensiveEmbankments && (
              <WMSTileLayer
                key="defensiveEmbankments"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Defensive_Embankments"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.topography && (
              <WMSTileLayer
                key="topography"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Topography"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.geomorphology && (
              <WMSTileLayer
                key="geomorphology"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Geomorphology"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.riverNetwork && (
              <WMSTileLayer
                key="riverNetwork"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:River_Network"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.economicData && (
              <WMSTileLayer
                key="economicData"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Economic_Data"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.industrialCommercial && (
              <WMSTileLayer
                key="industrialCommercial"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Industrial_Commercial"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.nighttimeLightIndex && (
              <WMSTileLayer
                key="nighttimeLightIndex"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:Nighttime_Light_Index"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* ENABLED: Using COP:ENTLI (Nighttime Light Index) */}
            {urbanElements.nighttimeLightIndex && (
              <WMSTileLayer
                key="nighttimeLightIndex"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:ENTLI"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] Nighttime Light Index layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] Nighttime Light Index layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] Nighttime Light Index layer tile error:', error)
                }}
              />
            )}
            {/* DISABLED: ITF workspace does not exist on remote GeoServer
            {urbanElements.poi && (
              <WMSTileLayer
                key="poi"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="ITF:POI"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* DISABLED: Layer does not exist on remote GeoServer
            {urbanElements.annualTemperature && (
              <WMSTileLayer
                key="annualTemperature"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:Annual_Temperature"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}
            {/* ENABLED: Using COP:hkSAR satellite imagery */}
            {urbanElements.earthMapIntegration && (
              <WMSTileLayer
                key="earthMapIntegration"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="COP:hkSAR"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] Earth Map layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] Earth Map layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] Earth Map layer tile error:', error)
                }}
              />
            )}
            
            {/* Location Marker (shown after query) */}
            {markerPosition && (
              <Marker position={markerPosition} icon={createCustomIcon()}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800 mb-1">
                      {assetInfo?.address || 'Query Location'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lat: {markerPosition[0].toFixed(5)}<br />
                      Lon: {markerPosition[1].toFixed(5)}
                    </p>
                    {riskScores && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700">
                          Overall Risk: <span className={`font-bold ${
                            riskScores.overall.level === 'Extreme' ? 'text-red-600' :
                            riskScores.overall.level === 'High' ? 'text-orange-600' :
                            riskScores.overall.level === 'Medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>{riskScores.overall.level}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Score: {riskScores.overall.score}/10
                        </p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Typhoon Wind Circles Visualization */}
            {typhoonWindCircles.length > 0 && typhoonWindCircles.map((circle, index) => (
              <Circle
                key={`wind-circle-${index}`}
                center={circle.center}
                radius={circle.radius}
                pathOptions={{
                  color: circle.color,
                  fillColor: circle.color,
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: index === 0 ? '5, 5' : undefined // RMW is dashed
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800">{circle.label}</p>
                    <p className="text-gray-600 mt-1">
                      半径: {(circle.radius / 1852).toFixed(1)} nm ({(circle.radius / 1000).toFixed(1)} km)
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {typhoonPopup && (
              <Popup
                position={typhoonPopup.position}
                eventHandlers={{ remove: () => setTyphoonPopup(null) }}
              >
                {(() => {
                  const props = typhoonPopup.properties || {};

                  // Extract key attributes with fallbacks
                  const nameValue = getFirstAvailableAttribute(props, ['name', 'stormname', 'tc_name', 'sid']);
                  const timeValue = getFirstAvailableAttribute(props, ['iso_time', 'datetime', 'time', 'date_time']);
                  const maxWind = getFirstAvailableAttribute(props, ['usa_wind', 'max_wind', 'wmo_wind', 'wind']);
                  const minPressure = getFirstAvailableAttribute(props, ['usa_pres', 'min_press', 'pressure', 'pres']);
                  const radiusMaxWind = getFirstAvailableAttribute(props, ['usa_rmw', 'radmaxwind', 'rmax', 'radius_max_wind', 'rmw']);

                  // Determine typhoon category based on max wind speed (Saffir-Simpson Scale)
                  const getTyphoonCategory = (windKt: number) => {
                    if (windKt >= 137) return { name: 'Category 5', color: '#8B0000', icon: '💨' };
                    if (windKt >= 113) return { name: 'Category 4', color: '#FF0000', icon: '🌪️' };
                    if (windKt >= 96) return { name: 'Category 3', color: '#FF6600', icon: '🌀' };
                    if (windKt >= 83) return { name: 'Category 2', color: '#FFCC00', icon: '🌀' };
                    if (windKt >= 64) return { name: 'Category 1', color: '#FFFF00', icon: '🌀' };
                    if (windKt >= 34) return { name: 'Tropical Storm', color: '#00CED1', icon: '⛈️' };
                    return { name: 'Tropical Depression', color: '#4169E1', icon: '☁️' };
                  };

                  const category = maxWind ? getTyphoonCategory(Number(maxWind)) : null;

                  // 34-knot wind radii (gale force winds)
                  const windRadii34 = [
                    { label: 'NE', value: getFirstAvailableAttribute(props, ['usa_r34_ne', 'r34_ne', 'ne34']) },
                    { label: 'SE', value: getFirstAvailableAttribute(props, ['usa_r34_se', 'r34_se', 'se34']) },
                    { label: 'SW', value: getFirstAvailableAttribute(props, ['usa_r34_sw', 'r34_sw', 'sw34']) },
                    { label: 'NW', value: getFirstAvailableAttribute(props, ['usa_r34_nw', 'r34_nw', 'nw34']) },
                  ].filter(item => item.value !== null && item.value !== undefined && item.value > 0);

                  // 50-knot wind radii (storm force winds)
                  const windRadii50 = [
                    { label: 'NE', value: getFirstAvailableAttribute(props, ['usa_r50_ne', 'r50_ne', 'ne50']) },
                    { label: 'SE', value: getFirstAvailableAttribute(props, ['usa_r50_se', 'r50_se', 'se50']) },
                    { label: 'SW', value: getFirstAvailableAttribute(props, ['usa_r50_sw', 'r50_sw', 'sw50']) },
                    { label: 'NW', value: getFirstAvailableAttribute(props, ['usa_r50_nw', 'r50_nw', 'nw50']) },
                  ].filter(item => item.value !== null && item.value !== undefined && item.value > 0);

                  // 64-knot wind radii (hurricane force winds)
                  const windRadii64 = [
                    { label: 'NE', value: getFirstAvailableAttribute(props, ['usa_r64_ne', 'r64_ne', 'ne64']) },
                    { label: 'SE', value: getFirstAvailableAttribute(props, ['usa_r64_se', 'r64_se', 'se64']) },
                    { label: 'SW', value: getFirstAvailableAttribute(props, ['usa_r64_sw', 'r64_sw', 'sw64']) },
                    { label: 'NW', value: getFirstAvailableAttribute(props, ['usa_r64_nw', 'r64_nw', 'nw64']) },
                  ].filter(item => item.value !== null && item.value !== undefined && item.value > 0);

                  return (
                    <div className="text-xs space-y-2 min-w-[280px]">
                      {/* Header with Category Badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{nameValue || props.sid || 'IBTrACS 台风节点'}</p>
                          {timeValue && (
                            <p className="text-[11px] text-gray-500 mt-0.5">{timeValue}</p>
                          )}
                        </div>
                        {category && (
                          <div
                            className="ml-2 px-2 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 whitespace-nowrap"
                            style={{ backgroundColor: category.color }}
                          >
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Metrics */}
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-2">
                        {maxWind && (
                          <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                            <p className="text-[11px] text-gray-600">最大风速 (kt)</p>
                            <p className="text-base font-bold text-indigo-700">{maxWind}</p>
                            <p className="text-[10px] text-gray-500">≈ {Math.round(Number(maxWind) * 1.852)} km/h</p>
                          </div>
                        )}
                        {minPressure && (
                          <div className="p-2 bg-purple-50 rounded border border-purple-200">
                            <p className="text-[11px] text-gray-600">最低气压 (hPa)</p>
                            <p className="text-base font-bold text-purple-700">{minPressure}</p>
                          </div>
                        )}
                      </div>

                      {/* Radius of Maximum Wind */}
                      {radiusMaxWind && (
                        <div className="p-2 bg-teal-50 rounded border border-teal-200">
                          <p className="text-[11px] text-gray-600">最大风速半径 (nm)</p>
                          <p className="text-sm font-bold text-teal-700">{radiusMaxWind} nm</p>
                          <p className="text-[10px] text-gray-500">≈ {Math.round(Number(radiusMaxWind) * 1.852)} km</p>
                        </div>
                      )}

                      {/* 34-knot Wind Radii (Gale Force) */}
                      {windRadii34.length > 0 && (
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                            🌪️ 34 kt 风圈半径 (nm) - 烈风区
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {windRadii34.map(radius => (
                              <div key={radius.label} className="flex items-center justify-between p-1.5 bg-yellow-50 rounded border border-yellow-200">
                                <span className="text-[11px] font-semibold text-gray-700">{radius.label}</span>
                                <span className="text-[11px] text-gray-800 font-medium">{radius.value} nm</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">34 kt ≈ 63 km/h (烈风)</p>
                        </div>
                      )}

                      {/* 50-knot Wind Radii (Storm Force) */}
                      {windRadii50.length > 0 && (
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                            🌀 50 kt 风圈半径 (nm) - 狂风区
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {windRadii50.map(radius => (
                              <div key={radius.label} className="flex items-center justify-between p-1.5 bg-orange-50 rounded border border-orange-200">
                                <span className="text-[11px] font-semibold text-gray-700">{radius.label}</span>
                                <span className="text-[11px] text-gray-800 font-medium">{radius.value} nm</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">50 kt ≈ 93 km/h (狂风)</p>
                        </div>
                      )}

                      {/* 64-knot Wind Radii (Hurricane Force) */}
                      {windRadii64.length > 0 && (
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                            💨 64 kt 风圈半径 (nm) - 飓风区
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {windRadii64.map(radius => (
                              <div key={radius.label} className="flex items-center justify-between p-1.5 bg-red-50 rounded border border-red-200">
                                <span className="text-[11px] font-semibold text-gray-700">{radius.label}</span>
                                <span className="text-[11px] text-gray-800 font-medium">{radius.value} nm</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">64 kt ≈ 119 km/h (飓风)</p>
                        </div>
                      )}

                      {/* Basin/Source Info */}
                      {props.basin && (
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-600">海域 Basin:</span>
                            <span className="font-semibold text-gray-800 uppercase">{props.basin}</span>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-2">
                        <p className="text-[10px] text-gray-500 italic">
                          💡 数据来源: IBTrACS (International Best Track Archive for Climate Stewardship)
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </Popup>
            )}

            {/* Drawing Control for Area Risk Assessment */}
            {typeof window !== 'undefined' && DrawControl && (
              <DrawControl 
                onShapeDrawn={handleShapeDrawn}
                onDrawStart={() => {
                  setAreaRiskData(null);
                  setDrawnShape(null);
                }}
                enabled={drawMode}
              />
            )}

            {/* Historical Event Markers */}
            {showHistoricalEvents && filteredHistoricalEvents.map(event => {
              if (!event.geometry?.coordinates) return null;
              
              const position: [number, number] = [
                event.geometry.coordinates[1],
                event.geometry.coordinates[0]
              ];
              
              return (
                <Marker
                  key={event.id}
                  position={position}
                  icon={createEventIcon(event.type)}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-900">{event.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          event.type === 'Typhoon' ? 'bg-red-100 text-red-800' :
                          event.type === 'Rainstorm' ? 'bg-blue-100 text-blue-800' :
                          event.type === 'Flood' ? 'bg-cyan-100 text-cyan-800' :
                          event.type === 'Storm Surge' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">📅 {event.date}</p>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-semibold">Max Wind Speed:</span> {event.maxWindSpeed}</p>
                        <p><span className="font-semibold">Total Rainfall:</span> {event.totalRainfall}</p>
                        <p><span className="font-semibold">Estimated Loss:</span> <span className="text-red-600 font-bold">{event.estimatedLoss}</span></p>
                        <p><span className="font-semibold">Affected Population:</span> {event.affectedPopulation}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Stochastic Event Markers */}
            {showStochasticEvents && filteredStochasticEvents.map(event => {
              if (!event.geometry?.coordinates) return null;
              
              const position: [number, number] = [
                event.geometry.coordinates[1],
                event.geometry.coordinates[0]
              ];
              
              return (
                <Marker
                  key={event.id}
                  position={position}
                  icon={createEventIcon(event.type)}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-900">{event.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          event.type === 'Typhoon' ? 'bg-purple-100 text-purple-800' :
                          event.type === 'Rainstorm' ? 'bg-indigo-100 text-indigo-800' :
                          event.type === 'Flood' ? 'bg-teal-100 text-teal-800' :
                          event.type === 'Storm Surge' ? 'bg-violet-100 text-violet-800' :
                          'bg-fuchsia-100 text-fuchsia-800'
                        }`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-xs text-purple-600 mb-2">🔮 Synthetic Event • Year {event.year}</p>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-semibold">Max Wind Speed:</span> {event.maxWindSpeed}</p>
                        <p><span className="font-semibold">Total Rainfall:</span> {event.totalRainfall}</p>
                        <p><span className="font-semibold">Estimated Loss:</span> <span className="text-red-600 font-bold">{event.estimatedLoss}</span></p>
                        <p><span className="font-semibold">Affected Population:</span> {event.affectedPopulation}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">
                          Part of 10,000-year stochastic catalog for probabilistic modeling
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Batch Portfolio Location Markers */}
            {batchQueryMode && filteredPortfolioLocations.map((location, idx) => {
              if (!location.latitude || !location.longitude) return null;

              const position: [number, number] = [location.latitude, location.longitude];
              const tivValue = location[portfolioSortBy] || location.totalTIV || 0;
              // Top-10 highlighted in gold (within the visible filtered list)
              const isTopN = idx < Math.min(10, filteredPortfolioLocations.length);
              const fmt = (n: any) => {
                if (!Number.isFinite(n) || n === 0) return '—';
                return n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
                     : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
                     : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K`
                     : String(n);
              };

              return (
                <Marker
                  key={location.id || idx}
                  position={position}
                  icon={createTIVMarker(tivValue, filteredMaxTIV, isTopN)}
                  eventHandlers={{
                    click: () => {
                      setSelectedPortfolioItem(location);
                    }
                  }}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="mb-2">
                        <p className="font-bold text-gray-900">
                          {isTopN && <span className="inline-block bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-1">#{idx + 1}</span>}
                          {location.name}
                        </p>
                        <p className="text-xs text-gray-600">{location.id}</p>
                        {location.address && (
                          <p className="text-xs text-gray-500 mt-1">{location.address}</p>
                        )}
                      </div>

                      {/* TIV breakdown */}
                      {(location.totalTIV || location.buildingTIV || location.contentTIV || location.biTIV) && (
                        <div className="mt-2 pt-2 border-t border-gray-300 text-xs">
                          <div className="font-semibold text-amber-700 mb-1">
                            TIV {location.currency && <span className="text-gray-500 font-normal">({location.currency})</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <span className="text-gray-600">Total:</span>     <b className="text-right">{fmt(location.totalTIV)}</b>
                            <span className="text-gray-600">Building:</span>  <span className="text-right">{fmt(location.buildingTIV)}</span>
                            <span className="text-gray-600">Content:</span>   <span className="text-right">{fmt(location.contentTIV)}</span>
                            <span className="text-gray-600">BI:</span>        <span className="text-right">{fmt(location.biTIV)}</span>
                          </div>
                        </div>
                      )}

                      {/* Asset attributes */}
                      {(location.occupancy || location.yearBuilt || location.structure || location.stories || location.basement) && (
                        <div className="mt-2 pt-2 border-t border-gray-300 text-xs grid grid-cols-2 gap-x-2 gap-y-0.5">
                          {location.occupancy && (<><span className="text-gray-600">Occupancy:</span><span className="text-right">{location.occupancy}</span></>)}
                          {location.yearBuilt && (<><span className="text-gray-600">Year built:</span><span className="text-right">{location.yearBuilt}</span></>)}
                          {location.structure && (<><span className="text-gray-600">Structure:</span><span className="text-right">{location.structure}</span></>)}
                          {location.stories  && (<><span className="text-gray-600">Stories:</span><span className="text-right">{location.stories}</span></>)}
                          {location.basement && (<><span className="text-gray-600">Basement:</span><span className="text-right">{location.basement}</span></>)}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Lat: {location.latitude.toFixed(5)} | Lon: {location.longitude.toFixed(5)}
                      </p>

                      {location.riskScores && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">Overall Risk:</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRiskColor(location.riskScores.overall.level)}`}>
                              {location.riskScores.overall.level}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Score: {location.riskScores.overall.score}/10
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Flood:</span>
                              <span className="ml-1 font-semibold">{location.riskScores.flood.score}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Typhoon:</span>
                              <span className="ml-1 font-semibold">{location.riskScores.typhoon.score}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Rainstorm:</span>
                              <span className="ml-1 font-semibold">{location.riskScores.rainstorm.score}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Landslide:</span>
                              <span className="ml-1 font-semibold">{location.riskScores.landslide.score}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Portfolio Exposure Overlay Layer */}
            {showPortfolioOverlay && portfolioOverlayData.length > 0 && (
              <PortfolioHeatmapLayer data={portfolioOverlayData} />
            )}

            {/* Coordinate Display */}
            <MapCoordinateDisplay />

          </MapContainer>
          
          {/* Floating Map Style Selector - Munich Re Risk Suite Style */}
          <div className="absolute bottom-4 left-4 z-[1000]">
            {/* Collapsed State: Show current map thumbnail using real tile */}
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
                  <Settings className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </button>
            )}
            
            {/* Expanded State: Show map gallery with real tiles */}
            {showMapSettings && (
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-4 w-[380px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Base Map</span>
                  </div>
                  <button
                    onClick={() => setShowMapSettings(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Map Thumbnails Grid - Using Real Tiles */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Satellite */}
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
                  
                  {/* Light / Carto */}
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
                      Amap
                    </span>
                  </button>
                </div>
                
                {/* API Keys Section */}
                <details className="mt-4 pt-3 border-t border-gray-100 group">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    API Keys Configuration
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="google-key-float" className="text-[10px] text-gray-500">Google Maps</Label>
                      <Input 
                        id="google-key-float" 
                        type="password" 
                        value={googleApiKey} 
                        onChange={(e) => setGoogleApiKey(e.target.value)}
                        placeholder="API Key"
                        className="h-7 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amap-key-float" className="text-[10px] text-gray-500">Amap</Label>
                      <Input 
                        id="amap-key-float" 
                        type="password" 
                        value={amapApiKey} 
                        onChange={(e) => setAmapApiKey(e.target.value)}
                        placeholder="API Key"
                        className="h-7 text-xs mt-1"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveApiKeys} 
                      size="sm" 
                      className="col-span-2 bg-gray-600 hover:bg-gray-700 text-white h-7 text-xs"
                    >
                      Save API Keys
                    </Button>
                  </div>
                </details>
              </div>
            )}
          </div>
          
          {/* Floating Vulnerability Curve Chart */}
          {vulnerabilityCurveChartOpen && (
            <div className="absolute top-4 left-4 z-[1000] w-96 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <Card className="shadow-2xl border-2 border-gray-300">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-sm">Vulnerability Curve Visualization</CardTitle>
                    </div>
                    <button
                      onClick={() => setVulnerabilityCurveChartOpen(false)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <VulnerabilityCurveChart 
                    curveData={generateVulnerabilityCurve()} 
                    structureType={structureType}
                    buildingType={buildingType}
                    occupancyType={occupancyType}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Floating Risk Assessment Results */}
          {riskResultsFloatingOpen && assetInfo && riskScores && (
            <div className="absolute top-4 right-4 z-[1000] w-[420px] max-h-[calc(100vh-8rem)] overflow-y-auto">
              <Card className="shadow-2xl border-2 border-green-300">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-sm">Risk Assessment Results</CardTitle>
                    </div>
                    <button
                      onClick={() => setRiskResultsFloatingOpen(false)}
                      className="p-1 hover:bg-green-100 rounded transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Location Info */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <p className="text-sm font-bold text-gray-800">{assetInfo.address}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {assetInfo.latitude.toFixed(5)}, {assetInfo.longitude.toFixed(5)}
                    </p>
                    {(assetInfo as any).geocodingSource && (
                      <div className="mt-1">
                        <p className="text-xs text-blue-600">
                          Located via {(assetInfo as any).geocodingSource}
                        </p>
                        {((assetInfo as any).geocodingSource === 'OpenStreetMap Nominatim' && !googleApiKey && !amapApiKey) && (
                          <p className="text-[10px] text-gray-500 mt-0.5 italic">
                            💡 Tip: Configure Google/Amap API keys in "Map Settings" for better accuracy.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Asset Info */}
                  <div className="mb-4">
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent mb-2">📍 Asset Information</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Elevation</span>
                        <span className="font-semibold">{assetInfo.elevation}m</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Distance to Coast</span>
                        <span className="font-semibold">{assetInfo.distanceToCoast}km</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Population Density</span>
                        <span className="font-semibold">{assetInfo.populationDensity}/km²</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Building Density</span>
                        <span className="font-semibold">{assetInfo.buildingDensity}</span>
                      </div>
                      <div className="col-span-2 p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Land Use</span>
                        <span className="font-semibold">{assetInfo.landUse}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Overall Risk Score */}
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-800 mb-2">📊 Overall Risk Score</p>
                    <div className={`p-4 rounded-lg border-2 ${getRiskColor(riskScores.overall.level)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">Overall (Defended)</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getRiskColor(riskScores.overall.level)}`}>
                          {riskScores.overall.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl font-bold">{riskScores.overall.score}</span>
                        <span className="text-xs text-gray-600">Risk Index: {riskScores.overall.riskIndex}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            riskScores.overall.score >= 8 ? 'bg-red-600' :
                            riskScores.overall.score >= 6 ? 'bg-orange-500' :
                            riskScores.overall.score >= 4 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${riskScores.overall.score * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual Hazards */}
                  <div className="space-y-2">
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent mb-2">🌍 Multi-Peril Breakdown</p>
                    
                    {/* Flood */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">🌊 Flood (Defended)</p>
                        <p className="text-xs text-gray-600">{riskScores.flood.returnPeriod}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.flood.level)}`}>
                          {riskScores.flood.level}
                        </span>
                        <p className="text-sm font-bold mt-1">Zone {riskScores.flood.zone}</p>
                      </div>
                    </div>
                    
                    {/* Typhoon */}
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">🌀 Tropical Cyclone</p>
                        <p className="text-xs text-gray-600">{riskScores.typhoon.intensity}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.typhoon.level)}`}>
                          {riskScores.typhoon.level}
                        </span>
                        <p className="text-sm font-bold mt-1">Zone {riskScores.typhoon.zone}</p>
                      </div>
                    </div>
                    
                    {/* Rainstorm */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded border border-indigo-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">⛈️ Flash Flood</p>
                        <p className="text-xs text-gray-600">{riskScores.rainstorm.returnPeriod}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.rainstorm.level)}`}>
                          {riskScores.rainstorm.level}
                        </span>
                        <p className="text-sm font-bold mt-1">Zone {riskScores.rainstorm.zone}</p>
                      </div>
                    </div>
                    
                    {/* Storm Surge */}
                    <div className="flex items-center justify-between p-3 bg-cyan-50 rounded border border-cyan-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">🌊 Storm Surge (Defended)</p>
                        <p className="text-xs text-gray-600">{riskScores.stormSurge.returnPeriod}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.stormSurge.level)}`}>
                          {riskScores.stormSurge.level}
                        </span>
                        <p className="text-sm font-bold mt-1">Zone {riskScores.stormSurge.zone}</p>
                      </div>
                    </div>
                    
                    {/* Landslide */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">⛰️ Landslide</p>
                        <p className="text-xs text-gray-600">{riskScores.landslide.risk} Risk</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.landslide.level)}`}>
                          {riskScores.landslide.level}
                        </span>
                        <p className="text-sm font-bold mt-1">Zone {riskScores.landslide.zone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Floating Area Risk Assessment Results */}
          {areaRiskFloatingOpen && areaRiskData && (
            <div className="absolute top-4 right-4 z-[1000] w-[420px] max-h-[calc(100vh-8rem)] overflow-y-auto">
              <Card className="shadow-2xl border-2 border-blue-300">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-gray-700" />
                      <CardTitle className="text-sm text-gray-800">Area Risk Assessment</CardTitle>
                    </div>
                    <button
                      onClick={() => setAreaRiskFloatingOpen(false)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Area Coverage Info */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <p className="text-sm font-bold text-gray-800 mb-2">📐 Coverage Area</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Shape Type</span>
                        <span className="font-semibold capitalize">{areaRiskData.type}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Area</span>
                        <span className="font-semibold">{areaRiskData.area}</span>
                      </div>
                      <div className="col-span-2 p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Sampled Points</span>
                        <span className="font-semibold">{areaRiskData.sampledPoints} of {areaRiskData.totalPoints}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Overall Risk Statistics */}
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-800 mb-2">📊 Overall Risk Statistics</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">Average Risk</span>
                          <span className="text-lg font-bold text-blue-600">{areaRiskData.stats.overall.avg}/10</span>
                        </div>
                        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600"
                            style={{ width: `${(parseFloat(areaRiskData.stats.overall.avg) / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <span className="text-xs text-gray-600 block">Maximum</span>
                          <span className="text-lg font-bold text-red-600">{areaRiskData.stats.overall.max}/10</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <span className="text-xs text-gray-600 block">Minimum</span>
                          <span className="text-lg font-bold text-green-600">{areaRiskData.stats.overall.min}/10</span>
                        </div>
                      </div>
                      
                      {areaRiskData.stats.overall.maxPoint && (
                        <div className="p-2 bg-amber-50 rounded border border-amber-200 text-xs">
                          <p className="font-semibold text-amber-800">⚠️ Highest Risk Location:</p>
                          <p className="text-gray-600 mt-1">
                            📍 {areaRiskData.stats.overall.maxPoint.lat.toFixed(5)}, {areaRiskData.stats.overall.maxPoint.lng.toFixed(5)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Risk Distribution - Only show for non-typhoon track layers */}
                  {!visibleLayers.globalTyphoonTracks && !visibleLayers.globalTyphoonPoints && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-800 mb-2">📈 Risk Level Distribution</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-700">Extreme</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-red-700">{areaRiskData.distribution.extreme}</span>
                            <span className="text-xs text-gray-600 ml-1">
                              ({((areaRiskData.distribution.extreme/areaRiskData.sampledPoints)*100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-700">High</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-orange-700">{areaRiskData.distribution.high}</span>
                            <span className="text-xs text-gray-600 ml-1">
                              ({((areaRiskData.distribution.high/areaRiskData.sampledPoints)*100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-700">Medium</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-yellow-700">{areaRiskData.distribution.medium}</span>
                            <span className="text-xs text-gray-600 ml-1">
                              ({((areaRiskData.distribution.medium/areaRiskData.sampledPoints)*100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-700">Low</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-green-700">{areaRiskData.distribution.low}</span>
                            <span className="text-xs text-gray-600 ml-1">
                              ({((areaRiskData.distribution.low/areaRiskData.sampledPoints)*100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Hazard Breakdown */}
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-800 mb-2">🌍 Hazard Breakdown (Average Scores)</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">🌊 Flood</p>
                          <div className="flex gap-3 text-xs text-gray-600 mt-1">
                            <span>Avg: {areaRiskData.stats.flood.avg}</span>
                            <span>Max: {areaRiskData.stats.flood.max}</span>
                            <span>Min: {areaRiskData.stats.flood.min}</span>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{areaRiskData.stats.flood.avg}/10</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">🌀 Typhoon</p>
                          <div className="flex gap-3 text-xs text-gray-600 mt-1">
                            <span>Avg: {areaRiskData.stats.typhoon.avg}</span>
                            <span>Max: {areaRiskData.stats.typhoon.max}</span>
                            <span>Min: {areaRiskData.stats.typhoon.min}</span>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-purple-600">{areaRiskData.stats.typhoon.avg}/10</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded border border-indigo-200">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">⛈️ Rainstorm</p>
                          <div className="flex gap-3 text-xs text-gray-600 mt-1">
                            <span>Avg: {areaRiskData.stats.rainstorm.avg}</span>
                            <span>Max: {areaRiskData.stats.rainstorm.max}</span>
                            <span>Min: {areaRiskData.stats.rainstorm.min}</span>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">{areaRiskData.stats.rainstorm.avg}/10</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Legend (conditional) */}
          {Object.values(visibleLayers).some(v => v) && <Legend visibleLayers={visibleLayers} />}
        </div>
      </div>

      {/* Black Rain Station Map Modal */}
      {showBlackRainMap && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2 bg-sky-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌧️</span>
              <div>
                <h3 className="text-sm font-bold">HK Black Rainstorm Events — Station Map</h3>
                <p className="text-[11px] text-sky-200">HKO Observed Historical Black Rain Data (All Events)</p>
              </div>
            </div>
            <button
              onClick={() => setShowBlackRainMap(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sky-600 transition-colors text-white text-lg font-bold"
            >
              ✕
            </button>
          </div>
          {/* Iframe - full remaining space */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <iframe
              src="/data/hk_blackrain_station_map.html"
              className="w-full h-full border-0"
              title="HK Black Rain Station Map"
            />
          </div>
        </div>
      )}

      {/* ========== EP Curve Modal ========== */}
      {epCurveOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEpCurveOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold">Loss Exceedance Probability Curve</h3>
                  <p className="text-[11px] text-purple-100">Ground Up vs Gross Loss · from uploaded portfolio file</p>
                </div>
              </div>
              <button
                onClick={() => setEpCurveOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-700 transition-colors text-white text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Peril Tabs */}
            {Object.keys(epCurveData).length > 0 && (
              <div className="flex items-center gap-1 px-4 py-2 bg-purple-50 border-b border-purple-200 shrink-0">
                <span className="text-xs text-gray-600 mr-2">Peril:</span>
                {Object.keys(epCurveData).map(p => (
                  <button
                    key={p}
                    onClick={() => setEpCurvePeril(p)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      epCurvePeril === p
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-white text-gray-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-auto p-5 bg-gray-50">
              {(() => {
                const ep = epCurveData[epCurvePeril];
                if (!ep || !ep.points || ep.points.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">No EP Curve Data Uploaded</h3>
                      <p className="text-sm text-gray-600 max-w-md mb-4">
                        To display your loss exceedance curve, download the portfolio template and fill the
                        <code className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">EP_Earthquake</code>,
                        <code className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">EP_Typhoon</code>,
                        <code className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">EP_Flood</code>
                        sheets (and optionally <code className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">EP_Stats</code>) with your modelling results.
                      </p>
                      <p className="text-xs text-gray-500 max-w-md mb-4">
                        Required columns per EP sheet: <b>Probability(%)</b>, <b>ReturnPeriod</b>, <b>GroundUp</b>, <b>Gross</b>
                      </p>
                      <Button
                        onClick={handleDownloadPortfolioTemplate}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template with EP Sheets
                      </Button>
                      <details className="mt-6 text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-purple-700">View demo curve with sample data</summary>
                        <div className="mt-3">
                          <EPCurveChart
                            peril="Earthquake"
                            metric="OEP"
                            data={SAMPLE_EARTHQUAKE_OEP}
                            modelledExposure={32187860889}
                            averageAnnualLoss={{ gu: 6016559, gross: 5049758 }}
                            standardDeviation={{ gu: 63517797, gross: 62176490 }}
                            coefficientOfVariation={{ gu: 10.56, gross: 12.31 }}
                            currency="USD"
                            height={460}
                          />
                        </div>
                      </details>
                    </div>
                  );
                }
                return (
                  <EPCurveChart
                    peril={epCurvePeril}
                    metric="OEP"
                    data={ep.points}
                    modelledExposure={ep.modelledExposure}
                    averageAnnualLoss={ep.aal}
                    standardDeviation={ep.sd}
                    coefficientOfVariation={ep.cov}
                    currency={ep.currency || ''}
                    height={520}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
