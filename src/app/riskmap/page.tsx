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
  Target, Search, Download, Upload, ChevronDown, ChevronUp, Layers, Settings, Globe, Shield, Eye, EyeOff, PenTool, TrendingUp, Loader2, History, Trash2
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
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const FeatureGroup = dynamic(() => import('react-leaflet').then(mod => mod.FeatureGroup), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });
const DrawControl = dynamic(() => import('@/components/DrawControl'), { ssr: false });
const PortfolioHeatmapLayer = dynamic(() => import('@/components/portfolio/PortfolioHeatmapLayer'), { ssr: false });
const TerrainProfileChart = dynamic(() => import('@/components/TerrainProfileChart'), { ssr: false });
import { LocationData } from '@/types/portfolio';
import EPCurveChart, { SAMPLE_EARTHQUAKE_OEP } from '@/components/EPCurveChart';
import type {
  AreaFloodHazardResult,
  AreaFloodGeometry,
  AssetInfo,
  HistoricalEvent,
  StochasticEvent,
} from '@/features/risk-map/types';
import { GEOSERVER_GEOSPATIAL_URL, GEOSERVER_WMS_URL, GEOSERVER_LULC_URL } from '@/features/risk-map/config/geoserver';

// WMS 同源 BFF URL — 备用绕过 GeoServer CORS 的方法。
// GeoServer OPTIONS preflight 403,GetMap 响应没 ACAO 头 → 浏览器跨域拒绝。
// 走 /api/geoserver/getfeatureinfo 是同源,BFF 服务端 fetch GeoServer 无 CORS。
// 当前与 MO 管网走同一 GEOSERVER_LULC_URL(MO 已知 OK)—
// 若 HK 仍不可见,问题在 Leaflet WMSTileLayer 或 React 渲染��非 CORS。
const WMS_BFF_URL = '/api/geoserver/getfeatureinfo';
import { defaultWmsLayersConfig } from '@/features/risk-map/config/wmsLayers';
import {
  formatMacauScenarioName,
  MACAU_DESIGN_SCENARIO_FALLBACK_LAYERS as MACAU_SCENARIO_CONFIG,
  parseMacauScenario,
} from '@/features/risk-map/config/macauScenarios';
import {
  HK_NON_TYPHOON_SCENARIOS,
  HK_TYPHOON_COMPOUND_SCENARIOS,
  parseHongKongScenario,
} from '@/features/risk-map/config/hongKongScenarios';
import { getRiskMapRegionalCapabilities } from '@/features/risk-map/config/regionalCapabilities';
import { MapLegend } from '@/features/risk-map/components/MapLegend';
import { AreaFloodHazardResults } from '@/features/risk-map/components/AreaFloodHazardResults';
import { MacauDriverAssessmentCards } from '@/features/risk-map/components/MacauDriverAssessmentCards';
import { VulnerabilityCurveChart as RiskVulnerabilityCurveChart } from '@/features/risk-map/components/VulnerabilityCurveChart';
import {
  createCustomIcon as createRiskLocationIcon,
  createEventIcon as createRiskEventIcon,
  createTIVMarker as createRiskTIVMarker,
} from '@/features/risk-map/utils/markerIcons';
import {
  queryFloodHazard,
  queryHistoricalAreaFloodHazard,
  queryHistoricalFloodHazard,
} from '@/features/risk-map/services/hazardQuery';
import { generateFloodRiskPdf } from '@/features/risk-map/utils/floodRiskPdf';
import { generateAreaFloodRiskPdf } from '@/features/risk-map/utils/areaFloodRiskPdf';
import {
  generatePortfolioFloodRiskPdf,
  generatePortfolioFloodRiskWorkbook,
} from '@/features/risk-map/utils/portfolioFloodRiskReport';
import {
  captureFloodMapsForPdf,
  buildFloodMapPanelSpecs,
  captureMapLayerFromLeaflet,
} from '@/features/risk-map/utils/leafletFloodSnapshot';
import { useReportDownload } from '@/hooks/useReportDownload';
import { useToast } from '@/components/ui/toast';

// Import Leaflet for type definitions
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

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
  const regionalCapabilities = getRiskMapRegionalCapabilities(currentRegion);
  const toast = useToast();

  // Final Macau catalog: 11 non-typhoon rainfall and 11 typhoon compound layers.
  const [macauDesignScenarioLayers, setMacauDesignScenarioLayers] = useState<string[]>(MACAU_SCENARIO_CONFIG);
  const [selectedMacauNonTyphoonLayer, setSelectedMacauNonTyphoonLayer] = useState<string>('none');
  const [selectedMacauTyphoonLayer, setSelectedMacauTyphoonLayer] = useState<string>('none');
  const [isFetchingMacauLayers, setIsFetchingMacauLayers] = useState(false);

  // Hong Kong Flood Layer Dropdown State
  const [selectedHkRainLayer, setSelectedHkRainLayer] = useState<string>('none');
  const [selectedHkCompoundLayer, setSelectedHkCompoundLayer] = useState<string>('none');

  // Dynamic Layer Configuration State
  const [wmsLayersConfig, setWmsLayersConfig] = useState(defaultWmsLayersConfig);

  // Try to fetch Macau Design Scenario layers from GeoServer (with fallback)
  useEffect(() => {
    const fetchMacauDesignLayers = async () => {
      if (currentRegion !== 'mo') return;
      
      setIsFetchingMacauLayers(true);
      try {
        // Fetch final Macau RP layers from the natcat_platform workspace.
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
          
          const layerMatches = text.match(/<Name>natcat_platform:MO_Flood_(?:NONTC|Compound)_R\d+<\/Name>/g);
          
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
            console.warn('⚠️ [MACAU LAYERS] No final Macau RP layers found, using fallback layer list');
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

  // Update WMS config based on selected design scenario layers.
  useEffect(() => {
    setWmsLayersConfig(prev => {
      const next = { ...prev };
      if (currentRegion === 'mo' && selectedMacauNonTyphoonLayer !== 'none') {
        const displayName = formatMacauScenarioName(selectedMacauNonTyphoonLayer);
        next.macauNonTyphoonScenario = {
          name: `Macau Non-typhoon Flood (${displayName})`,
          layer: selectedMacauNonTyphoonLayer,
        };
      } else {
        delete (next as any).macauNonTyphoonScenario;
      }
      if (currentRegion === 'mo' && selectedMacauTyphoonLayer !== 'none') {
        const displayName = formatMacauScenarioName(selectedMacauTyphoonLayer);
        next.macauTyphoonScenario = {
          name: `Macau Typhoon Compound Flood (${displayName})`,
          layer: selectedMacauTyphoonLayer,
        };
      } else {
        delete (next as any).macauTyphoonScenario;
      }
      return next;
    });
  }, [currentRegion, selectedMacauNonTyphoonLayer, selectedMacauTyphoonLayer]);

  useEffect(() => {
    const rainScenario = parseHongKongScenario(selectedHkRainLayer);
    const compoundScenario = parseHongKongScenario(selectedHkCompoundLayer);
    setWmsLayersConfig(prev => {
      const next = { ...prev };
      if (currentRegion === 'hk' && rainScenario) {
        next.hkDesignScenario = { name: rainScenario.label, layer: rainScenario.layerName };
      } else {
        delete (next as any).hkDesignScenario;
      }
      if (currentRegion === 'hk' && compoundScenario) {
        next.hkCompoundScenario = { name: compoundScenario.label, layer: compoundScenario.layerName };
      } else {
        delete (next as any).hkCompoundScenario;
      }
      return next;
    });
  }, [currentRegion, selectedHkRainLayer, selectedHkCompoundLayer]);
  
  // 地图中心和缩放状态 - 默认使用 worldwide 视图
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]); // worldwide center
  const [mapZoom, setMapZoom] = useState(3); // worldwide zoom level
  
  // Base Map State
  const [baseMap, setBaseMap] = useState<'esri' | 'esri-imagery' | 'osm' | 'google' | 'amap' | 'esri-gray'>('esri-imagery');
  
  // API Keys State
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [amapApiKey, setAmapApiKey] = useState('');
  const [showMapSettings, setShowMapSettings] = useState(false);

  // 后端报告下载 hook(OSS 未配置 / 后端宕机时自动降级到 jsPDF fallback)
  const { requestDownload, isDownloading: isDownloadingBackendReport } = useReportDownload({
    onToast: (kind, title) => toast.push({ variant: kind, title }),
    onFallbackPoint: ({ asset, flood, profile, capturedFloodMaps, drainageSnapshot, roadSnapshot }) =>
      generateFloodRiskPdf({ asset, flood, profile, capturedFloodMaps, drainageSnapshot, roadSnapshot }),
    onFallbackArea: ({ result }) =>
      generateAreaFloodRiskPdf({ result }),
    onFallbackPortfolio: (locations, onProgress) =>
      generatePortfolioFloodRiskPdf(locations, onProgress),
  });

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
    toast.push({ variant: 'success', title: 'API Keys saved successfully!' });
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
  // Autocomplete 输入提示(高德 assistant/inputtips)
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ name: string; address: string; location: string; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  // Input mode: 'address' or 'coordinates'
  const [searchInputMode, setSearchInputMode] = useState<'address' | 'coordinates'>('address');
  // Separate lat/lng inputs for coordinates mode
  const [coordinateLat, setCoordinateLat] = useState('');
  const [coordinateLng, setCoordinateLng] = useState('');
  // Asset Info (auto-queried from location)
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  
  // Risk Scores (calculated from hazards + asset info)
  const [riskScores, setRiskScores] = useState<any>(null);
  
  // Asset Attributes (for vulnerability curve matching)
  const [assetAttributesOpen, setAssetAttributesOpen] = useState(false);
  const [vulnerabilityCurveChartOpen, setVulnerabilityCurveChartOpen] = useState(false);
  const [riskResultsFloatingOpen, setRiskResultsFloatingOpen] = useState(false);
  const [isGeneratingRiskPdf, setIsGeneratingRiskPdf] = useState(false);
  // PDF 截图模式:截图期间隐藏所有 UI 控件(layer panel / sidebar / toolbar),
  // 避免被截到 PDF 里;截图完成后恢复。Leaflet 容器本身始终可见。
  const [isUiHiddenForPdf, setIsUiHiddenForPdf] = useState(false);
  // 截图前保存用户当前底图,截图完成后恢复
  const [pdfCaptureBaseMap, setPdfCaptureBaseMap] = useState<'esri' | 'esri-imagery' | 'osm' | 'google' | 'amap' | 'esri-gray' | null>(null);

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
        populationDensity: false,
    economicData: false,
    industrialCommercial: false,
    nighttimeLightIndex: false,
    poi: false,
    annualRainfall: false,
    annualTemperature: false,
    earthMapIntegration: false,
    // Hong Kong Advertising underlying layers (TIF coverages)
    hkDem: false,
    hkLulc: false,
    hkSoil: false,
    // Macau underlying layers
    moDem: false,
    moDistrictBoundary: false,
    // Macau Infrastructure layers (CDROM_C 14 个原始层, 上传到 natcat_platform workspace)
    moInBoundary: false,
    moInCenterline: false,
    moInDoorNo: false,
    moInLake: false,
    moInLote: false,
    moInMonte: false,
    moInPlace: false,
    moInPonte: false,
    moInPredio: false,
    moInRua: false,
    moInTerra: false,
    moInTower: false,
    moInVerde: false,
    moInBldgClass: false,
    // Macau Pipe Network (管網)
    moInPipeLink: false,
    moInPipeManhole: false,
    moInPipeOutlet: false,
    // Hong Kong Drainage Network (HK-MO-Deliverable/HK/Advertising/drainage_river/,SWMM inp → shapefile 上传)
    // 与澳门管网是不同数据源、不同的字段命名,保留 HK 原始结构。
    hkDrainageConduits: false,
    hkDrainageJunctions: false,
    hkDrainageOutfalls: false,
    hkStorageTanks: false,
    // Hong Kong Buildings & Roads (HK-MO-Deliverable/HK/Advertising/{building,road}/)
    hkBuilding: false,
    hkRoadCenterline: false,
    hkRoadIntersection: false,
    hkRoadSpeedLimit: false,
    hkRoadTurn: false,
    hkRoadPedestrianZone: false,
    hkRoadRoundabout: false,
    hkRoadBusOnlyLane: false,
    hkRoadProhibition: false,
    hkRoadVehicleRestriction: false,
    hkRoadPermit: false,
    hkRoadOnStreetPark: false,
    hkRoadNsr: false,
    hkRoadRunInOut: false,
    hkRoadTrafficFeatures: false,
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
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setAutocompleteLoading(false);
    }
  }, [searchQuery]);

  // Autocomplete:输入变化时 debounce 300ms 后拉高德 assistant/inputtips
  useEffect(() => {
    if (searchInputMode !== 'address') return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      // 自动检测 HK/MO 给 city 参数
      const hkKeywords = ['香港', '港島', '九龍', '新界', 'hong kong', 'hongkong', 'hk'];
      const moKeywords = ['澳門', '澳门', 'macau', 'macao', '氹仔', '路環', '路环', 'taipa'];
      const ql = q.toLowerCase();
      const city = hkKeywords.some((k) => ql.includes(k.toLowerCase())) ? '香港'
        : moKeywords.some((k) => ql.includes(k.toLowerCase())) ? '澳门'
        : undefined;
      setAutocompleteLoading(true);
      try {
        const results = await getAmapAutocomplete(q, city);
        setSearchSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchInputMode, amapApiKey]);
  
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
  
  // Event Repository toggle (which dataset to show, null = none selected)
  const [activeEventDataset, setActiveEventDataset] = useState<'historical' | 'stochastic' | null>(null);
  
  // Historical Disaster Repository toggle
  const [historicalDisasterOpen, setHistoricalDisasterOpen] = useState(false);
  
  // Historical Events data and filtering
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>(historicalEventsData as HistoricalEvent[]);
  const [filteredHistoricalEvents, setFilteredHistoricalEvents] = useState<HistoricalEvent[]>(historicalEventsData as HistoricalEvent[]);
  const [showHistoricalEvents, setShowHistoricalEvents] = useState(false);
  
  // ========== Area Risk Assessment States ==========
  const [drawMode, setDrawMode] = useState(false); // Toggle drawing mode
  const [drawnShape, setDrawnShape] = useState<any>(null); // Store the drawn shape
  const [areaRiskData, setAreaRiskData] = useState<(AreaFloodHazardResult & {
    type: string;
    geometry: AreaFloodGeometry;
    bounds: { north: number; south: number; east: number; west: number };
  }) | null>(null);
  const [isCalculatingArea, setIsCalculatingArea] = useState(false); // Loading state for area calculation
  const [isGeneratingAreaPdf, setIsGeneratingAreaPdf] = useState(false);
  const areaRequestIdRef = useRef(0);
  const [areaCalculationProgress, setAreaCalculationProgress] = useState({ current: 0, total: 0 }); // Progress tracker
  const [areaRiskFloatingOpen, setAreaRiskFloatingOpen] = useState(false); // Toggle floating card display

  // ========== Terrain Profile States ==========
  const [profileMode, setProfileMode] = useState(false); // two-click line mode
  const [profilePoints, setProfilePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [profileSamples, setProfileSamples] = useState<Array<{ distance: number; elevation: number | null }> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileChartOpen, setProfileChartOpen] = useState(false);
  // 双向联动:剖面线 / 剖面图 hover 时共享的样本 index
  const [profileHoverIndex, setProfileHoverIndex] = useState<number | null>(null);
  // 联动高亮的 rAF 节流:避免快速移动时连续 setState 引发闪烁
  const profileHoverRafRef = useRef<number | null>(null);
  const profileHoverPendingRef = useRef<number | null>(null);
  // 命令式更新:高亮 marker 一旦挂载就保留,坐标/样式通过 ref 直接调 Leaflet API
  const highlightDotRef = useRef<L.CircleMarker | null>(null);
  const highlightHaloRef = useRef<L.CircleMarker | null>(null);
  const highlightTickRef = useRef<L.Polyline | null>(null);

  // Portfolio batch cancel support
  const batchAbortRef = useRef<AbortController | null>(null);
  const [isBatchCancelling, setIsBatchCancelling] = useState(false);
  
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
  // HK 历史事件从 BFF 拉取后,需要按 family 拆分为 TC 下拉和 Rain 下拉。
  const [hkHistoricalLayers, setHkHistoricalLayers] = useState<{
    layer: string;
    display: string;
    year: number | null;
    family: 'rainfall' | 'typhoon-compound';
  }[]>([]);
  const [isFetchingHkHistoricalLayers, setIsFetchingHkHistoricalLayers] = useState(false);
  // HK TC 下拉选中项(独立于 MO 的 selectedHistTCLayer,避免两区域互相干扰)
  const [selectedHkHistTCLayer, setSelectedHkHistTCLayer] = useState<string>('none');

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

  // 按当前 region 从 BFF(MO 用静态数组 / HK 用 useState)切出对应的图层列表。
  // HK 需按 family 过滤;TC 仅在 typhoon-compound 下、Rain 仅在 rainfall 下显示。
  // 必须 useMemo 包装:每次 render 都 filter() 会得到新引用,放进 useEffect 依赖会触发 setState 死循环。
  const activeHistoricalTCLayers = useMemo(
    () => currentRegion === 'mo'
      ? HIST_TC_LAYERS
      : currentRegion === 'hk'
        ? hkHistoricalLayers.filter(l => l.family === 'typhoon-compound')
        : [],
    [currentRegion, hkHistoricalLayers],
  );
  const activeHistoricalRainLayers = useMemo(
    () => currentRegion === 'hk'
      ? hkHistoricalLayers.filter(l => l.family === 'rainfall')
      : currentRegion === 'mo'
        ? HIST_RAIN_LAYERS
        : [],
    [currentRegion, hkHistoricalLayers],
  );

  useEffect(() => {
    if (currentRegion !== 'hk') return;
    const controller = new AbortController();
    setIsFetchingHkHistoricalLayers(true);
    // Combine manual abort (unmount / region change) + 20s safety timeout
    const signal = typeof AbortSignal.any === 'function'
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)])
      : controller.signal;
    fetch('/api/hazards/historical-flood-query?region=hk', { signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Hong Kong historical catalog failed');
        setHkHistoricalLayers(payload.events || []);
      })
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to load Hong Kong historical flood catalog:', error);
          toast.push({
            variant: 'error',
            title: 'Failed to load Hong Kong historical flood catalog',
            description: error.message,
          });
        }
      })
      .finally(() => setIsFetchingHkHistoricalLayers(false));
    return () => controller.abort();
  }, [currentRegion, toast]);

  useEffect(() => {
    setSelectedHistTCLayer('none');
    setSelectedHistRainLayer('none');
    setSelectedHkRainLayer('none');
    setSelectedHkCompoundLayer('none');
    setSelectedHkHistTCLayer('none');
    setVisibleLayers(prev => ({
      ...prev,
      macauHistTC: false,
      macauHistRain: false,
      hkHistEvent: false,
      hkHistTC: false,
      hkDesignScenario: false,
      hkCompoundScenario: false,
    }));
  }, [currentRegion]);

  // Update WMS config when a Historical TC or Rain layer is selected in Disaster Events
  useEffect(() => {
    const updates: Record<string, { name: string; layer: string }> = {};

    // MO TC(MO 静态 HIST_TC_LAYERS)
    if (selectedHistTCLayer !== 'none') {
      const tcInfo = HIST_TC_LAYERS.find(l => l.layer === selectedHistTCLayer);
      updates.macauHistTC = {
        name: `MO Hist TC Flood (${tcInfo?.display || selectedHistTCLayer})`,
        layer: selectedHistTCLayer,
      };
    }
    // HK TC(从 BFF 拉,只在 HK region 下生效)
    if (selectedHkHistTCLayer !== 'none') {
      const tcInfo = hkHistoricalLayers.find(l => l.layer === selectedHkHistTCLayer);
      updates.hkHistTC = {
        name: `HK Historical Typhoon Compound Flood (${tcInfo?.display || selectedHkHistTCLayer})`,
        layer: selectedHkHistTCLayer,
      };
    }
    if (selectedHistRainLayer !== 'none') {
      const rainInfo = activeHistoricalRainLayers.find(l => l.layer === selectedHistRainLayer);
      const layerKey = currentRegion === 'hk' ? 'hkHistEvent' : 'macauHistRain';
      updates[layerKey] = {
        name: `${currentRegion === 'hk' ? 'HK Historical Rainfall Flood' : 'MO Hist Rain Flood'} (${rainInfo?.display || selectedHistRainLayer})`,
        layer: selectedHistRainLayer,
      };
    }

    if (Object.keys(updates).length > 0) {
      setWmsLayersConfig(prev => ({ ...prev, ...updates }));
      // Auto-enable the layers
      setVisibleLayers(prev => ({
        ...prev,
        ...(updates.macauHistTC ? { macauHistTC: true } : {}),
        ...(updates.macauHistRain ? { macauHistRain: true } : {}),
        ...(updates.hkHistEvent ? { hkHistEvent: true } : {}),
        ...(updates.hkHistTC ? { hkHistTC: true } : {}),
      }));
    } else {
      // Remove hist layers from config + visibility
      setVisibleLayers(prev => {
        const next = { ...prev };
        delete (next as any).macauHistTC;
        delete (next as any).macauHistRain;
        delete (next as any).hkHistEvent;
        delete (next as any).hkHistTC;
        return next;
      });
    }
  }, [currentRegion, selectedHistTCLayer, selectedHkHistTCLayer, selectedHistRainLayer, hkHistoricalLayers]);
  // 注:activeHistoricalRainLayers / activeHistoricalTCLayers 已 useMemo 包装,
  // 这里依赖只需原始值(currentRegion / hkHistoricalLayers)避免不必要的 re-trigger。

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
  const [portfolioPdfProgress, setPortfolioPdfProgress] = useState({ current: 0, total: 0, location: '' });
  const [isGeneratingPortfolioPdf, setIsGeneratingPortfolioPdf] = useState(false);
  const [isGeneratingPortfolioWorkbook, setIsGeneratingPortfolioWorkbook] = useState(false);
  
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
    macauNonTyphoonScenario: false,
    macauTyphoonScenario: false,
    macauHistTC: false,
    macauHistRain: false,
    hkDesignScenario: false,
    hkHistEvent: false,
    hkHistTC: false,

    // Global Datasets
    globalTyphoonTracks: false,
    globalTyphoonPoints: false,
  });
  
  // ========== Helper Functions ==========
  
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
        // 高德返回 GCJ-02(火星坐标),转回 WGS-84 才能与卫星图/GeoServer 对齐
        const [wgsLat, wgsLng] = gcj02ToWgs84(lat, lon);

        return {
          address: result.formatted_address,
          latitude: wgsLat,
          longitude: wgsLng,
          source: 'Amap (高德地图)',
        };
      }

      throw new Error('No results from Amap');
    } catch (error) {
      console.warn('Amap geocoding failed:', error);
      throw error;
    }
  };
  
  // 输入提示(autocomplete):边输边出备选项
  const getAmapAutocomplete = async (
    query: string,
    city?: string,
  ): Promise<Array<{ name: string; address: string; location: string; type: string }>> => {
    if (!amapApiKey || !query.trim()) return [];
    try {
      let url = `https://restapi.amap.com/v3/assistant/inputtips?key=${amapApiKey}&keywords=${encodeURIComponent(query.trim())}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      if (data.status !== '1' || !data.tips) return [];
      return data.tips
        .filter((t: any) => typeof t.location === 'string' && t.location.includes(','))
        .map((t: any) => ({
          name: t.name || '',
          address: t.address || t.district || '',
          location: t.location,
          type: t.type || '',
        }));
    } catch (e) {
      console.warn('Amap autocomplete failed:', e);
      return [];
    }
  };

  // WGS-84 → GCJ-02(火星坐标) — 高德内部用 GCJ-02,我们 map 是 WGS-84
  const wgs84ToGcj02 = (latitude: number, longitude: number): [number, number] => {
    const outOfChina = (lat: number, lng: number) =>
      lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
    if (outOfChina(latitude, longitude)) return [latitude, longitude];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    const transformLat = (x: number, y: number): number => {
      let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y;
      ret += 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
      return ret;
    };
    const transformLng = (x: number, y: number): number => {
      let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y;
      ret += 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
      return ret;
    };
    let dLat = transformLat(longitude - 105.0, latitude - 35.0);
    let dLng = transformLng(longitude - 105.0, latitude - 35.0);
    const radLat = (latitude / 180.0) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 + ee * (magic - Math.sin(radLat));
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
    dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
    return [latitude + dLat, longitude + dLng];
  };

  // GCJ-02 → WGS-84(反向转换):高德/腾讯/Google中国区 返回的火星坐标 → 国际 GPS 坐标
  // 注:火星坐标系不可精确逆推,需迭代逼近。3 次迭代精度 <0.5 米,足够用。
  const gcj02ToWgs84 = (latitude: number, longitude: number): [number, number] => {
    const outOfChina = (lat: number, lng: number) =>
      lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
    if (outOfChina(latitude, longitude)) return [latitude, longitude];
    // 迭代:把待转换坐标当作 WGS-84,代入正向公式,得到"假设的 GCJ-02"
    // 与真实 GCJ-02 之差即为 WGS-84 偏移量
    let wgsLat = latitude;
    let wgsLng = longitude;
    for (let i = 0; i < 5; i++) {
      const [predGcjLat, predGcjLng] = wgs84ToGcj02(wgsLat, wgsLng);
      const dLat = latitude - predGcjLat;
      const dLng = longitude - predGcjLng;
      if (Math.abs(dLat) < 1e-7 && Math.abs(dLng) < 1e-7) break;
      wgsLat += dLat;
      wgsLng += dLng;
    }
    return [wgsLat, wgsLng];
  };

  // 底图坐标系适配:marker 数据层存 WGS-84,渲染时按当前底图决定要不要再转
  // - baseMap='amap' → Amap 底图是 GCJ-02,WGS-84 marker 要先转成 GCJ-02 才能在底图上对齐
  // - 其他底图(Google/Satellite/ESRI/OSM)都用 WGS-84,直接透传
  const toMapCRS = (latitude: number, longitude: number): [number, number] => {
    if (baseMap === 'amap') {
      return wgs84ToGcj02(latitude, longitude);
    }
    return [latitude, longitude];
  };

  // Main geocoding function: only Amap (高德地图).
  const geocodeAddress = async (query: string) => {
    try {
      // Check if input is already coordinates (format: lat,lon or lat, lon)
      const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
      const coordMatch = query.trim().match(coordPattern);

      if (coordMatch) {
        // Direct coordinates input — return as-is, no reverse lookup
        const latitude = parseFloat(coordMatch[1]);
        const longitude = parseFloat(coordMatch[2]);

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
        }

        return {
          address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          latitude,
          longitude,
          source: 'Direct Coordinates',
        };
      }

      // Only Amap is used for address geocoding
      if (amapApiKey) {
        try {
          console.log('🔍 Trying Amap geocoding for:', query);
          return await geocodeWithAmap(query);
        } catch (e: any) {
          console.warn('Amap failed:', e?.message || e);
        }
      }

      console.error('❌ Amap geocoding failed for query:', query);
      throw new Error(`❌ Geocoding failed for "${query}". Please make sure the address is in mainland China / Hong Kong / Macau and try again, or use Lat/Lng mode to enter coordinates directly.`);
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };

  // Search Location button:对当前 searchQuery 做单次精确 geocode,然后定位
  const handleSearchLocation = async () => {
    const query = searchQuery.trim();
    if (!query) {
      toast.push({ variant: 'info', title: '请输入地址或坐标' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await geocodeAddress(query);
      await handleSelectSearchResult(result);
    } catch (error: any) {
      console.error('Search location failed:', error);
      toast.push({ variant: 'error', title: '搜索失败', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting an address from autocomplete
  const handleSelectAutocompleteAddress = async (suggestion: any) => {
    if (!suggestion.location) {
      toast.push({ variant: 'info', title: 'No location data available for this address' });
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
      (asset as any).geocodingSource = suggestion.source === 'amap' ? 'Amap' : 'Amap';
      setAssetInfo(asset);

      console.log('Location set from autocomplete:', { asset });

      // Clear previous risk scores since this is a new location
      setRiskScores(null);
      setRiskResultsFloatingOpen(false);
    } catch (error: any) {
      console.error('Error setting location:', error);
      toast.push({ variant: 'error', title: 'Failed to set location', description: error.message });
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
      toast.push({ variant: 'error', title: 'Failed to query location', description: error.message });
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
    return {
      latitude: lat,
      longitude: lon,
      elevation: null,
      populationDensity: null,
      buildingDensity: 'Not queried',
      distanceToCoast: null,
      landUse: 'Not queried',
      worldcover: 'Not queried',
    };
  };
  
  // Query Hazard data from WMS
  const resolveHazardRegion = (lat: number, lon: number) => {
    // Coordinate routing takes precedence over the header selector so that a
    // Macau address cannot accidentally query the worldwide COP layers.
    if (lat >= 22.05 && lat <= 22.23 && lon >= 113.48 && lon <= 113.65) return 'mo';
    if (lat >= 22.14 && lat <= 22.58 && lon >= 113.80 && lon <= 114.52) return 'hk';
    return currentRegion;
  };

  const queryHazards = async (lat: number, lon: number) => {
    const hazardRegion = resolveHazardRegion(lat, lon);
    const hazardCapabilities = getRiskMapRegionalCapabilities(hazardRegion);
    if (!hazardCapabilities.data.pointFlood) {
      throw new Error(`${hazardCapabilities.name} point flood data not connected`);
    }
    const historicalFloodPromise = hazardCapabilities.data.historicalFlood
      ? queryHistoricalFloodHazard(lat, lon, hazardRegion).catch(error => ({
      available: false,
      reason: error instanceof Error ? error.message : 'Historical flood query failed',
      thresholdMeters: 0.15,
      samplingRadiusMeters: 100,
      totalEvents: 0,
      queriedEvents: 0,
      inundationCount: 0,
      typhoonCount: 0,
      rainfallCount: 0,
      events: [],
      queriedAt: new Date().toISOString(),
    }))
      : Promise.resolve({
        available: false,
        reason: 'Historical flood layers have not been connected for this region',
        thresholdMeters: 0.15,
        samplingRadiusMeters: 100,
        totalEvents: 0,
        queriedEvents: 0,
        inundationCount: 0,
        typhoonCount: 0,
        rainfallCount: 0,
        events: [],
        queriedAt: new Date().toISOString(),
      });
    const resolveRegionScenario = (region: string): {
      family: 'non-typhoon-rainfall' | 'typhoon-compound';
      stormSurgeReturnPeriod: number | null;
      rainfallReturnPeriod: number | null;
    } | null => {
      if (region === 'mo') {
        const macauLayer = selectedMacauTyphoonLayer !== 'none'
          ? selectedMacauTyphoonLayer
          : selectedMacauNonTyphoonLayer !== 'none' ? selectedMacauNonTyphoonLayer : 'none';
        if (macauLayer !== 'none') {
          const scenario = parseMacauScenario(macauLayer);
          return scenario ? {
            family: scenario.family,
            stormSurgeReturnPeriod: scenario.stormSurgeReturnPeriod,
            rainfallReturnPeriod: scenario.rainfallReturnPeriod,
          } : null;
        }
      }
      if (region === 'hk') {
        const layer = selectedHkCompoundLayer !== 'none'
          ? selectedHkCompoundLayer
          : selectedHkRainLayer !== 'none' ? selectedHkRainLayer : 'none';
        if (layer !== 'none') {
          const scenario = parseHongKongScenario(layer);
          return scenario ? {
            family: scenario.family,
            stormSurgeReturnPeriod: scenario.family === 'typhoon-compound' ? scenario.returnPeriod : null,
            rainfallReturnPeriod: scenario.family === 'non-typhoon-rainfall' ? scenario.returnPeriod : null,
          } : null;
        }
      }
      return null;
    };
    const selectedScenario = resolveRegionScenario(hazardRegion);
    const supportsCompoundSeries = hazardRegion === 'mo' || hazardRegion === 'hk';
    const driverAssessments = supportsCompoundSeries && !selectedScenario
      ? await Promise.all([
        queryFloodHazard(lat, lon, hazardRegion, undefined, 'non-typhoon-rainfall'),
        queryFloodHazard(lat, lon, hazardRegion, undefined, 'typhoon-compound'),
      ])
      : [await queryFloodHazard(
        lat,
        lon,
        hazardRegion,
        selectedScenario || undefined,
      )];
    const floodResult = driverAssessments[0];
    const historicalFlood = await historicalFloodPromise;
    const returnPeriod = floodResult.minimumInundationReturnPeriod;
    const floodZone = floodResult.assessmentMode === 'selected-scenario'
      ? floodResult.classification === 'inundated' ? 1 : 0
      : returnPeriod === null
        ? 0
      : returnPeriod <= 5
        ? 5
        : returnPeriod <= 20
          ? 4
          : returnPeriod <= 100
            ? 3
            : returnPeriod <= 200
              ? 2
              : 1;

    return {
      flood: {
        depth: floodResult.maximumDepth,
        returnPeriod: floodResult.selectedScenario?.label
          || (returnPeriod ? `${returnPeriod}-year` : floodResult.classification === 'no-data' ? 'No data' : 'Not inundated'),
        zone: floodZone,
        ...floodResult,
        driverAssessments,
        historicalFlood,
      },
      typhoon: { windSpeed: null, intensity: 'Not queried', zone: 0, available: false },
      rainstorm: { intensity: null, returnPeriod: 'Not queried', zone: 0, available: false },
      stormSurge: { height: null, returnPeriod: 'Not queried', zone: 0, available: false },
      landslide: { risk: 'Not queried', zone: 0, available: false },
    };
  };
  
  // Calculate Risk Scores based on hazards + asset info + vulnerability
  const getInundationSusceptibility = (returnPeriod: number | null) => {
    if (returnPeriod === null) return { label: 'Not reached', detail: 'No tested scenario exceeds 0.15 m' };
    if (returnPeriod <= 5) return { label: 'Very high-frequency inundation', detail: `Onset at R${returnPeriod} (${(100 / returnPeriod).toFixed(returnPeriod === 2 ? 0 : 1)}% AEP)` };
    if (returnPeriod <= 20) return { label: 'High-frequency inundation', detail: `Onset at R${returnPeriod} (${(100 / returnPeriod).toFixed(1)}% AEP)` };
    if (returnPeriod <= 100) return { label: 'Moderate-frequency inundation', detail: `Onset at R${returnPeriod} (${(100 / returnPeriod).toFixed(1)}% AEP)` };
    if (returnPeriod <= 200) return { label: 'Low-frequency inundation', detail: `Onset at R${returnPeriod} (${(100 / returnPeriod).toFixed(2)}% AEP)` };
    return { label: 'Very low-frequency inundation', detail: `Onset at R${returnPeriod} (${(100 / returnPeriod).toFixed(2)}% AEP)` };
  };

  const getDepthSeverity = (depth: number | null) => {
    if (depth === null) return { label: 'No data', color: 'text-gray-600 bg-gray-100 border-gray-300' };
    if (depth < 0.15) return { label: 'Below threshold', color: 'text-green-700 bg-green-100 border-green-300' };
    if (depth < 0.5) return { label: 'Shallow', color: 'text-cyan-700 bg-cyan-100 border-cyan-300' };
    if (depth < 1) return { label: 'Moderate depth', color: 'text-yellow-700 bg-yellow-100 border-yellow-300' };
    if (depth < 2) return { label: 'Deep', color: 'text-orange-700 bg-orange-100 border-orange-300' };
    if (depth < 3) return { label: 'Very deep', color: 'text-red-700 bg-red-100 border-red-300' };
    return { label: 'Extreme depth', color: 'text-red-800 bg-red-200 border-red-400' };
  };

  const getReturnPeriodDepth = (assessment: any, returnPeriod: number) =>
    assessment?.results?.find((result: any) => result.returnPeriod === returnPeriod)?.depth ?? null;

  const calculateRiskScores = (hazards: any, assetInfo: any, vulnerability: string) => {
    // Until exposure vulnerability is sourced from verified input data, the
    // assessment score is based only on the observed flood return period.
    const floodScore = Math.min(10, hazards.flood.zone * 2);
    const typhoonScore = 0;
    const rainstormScore = 0;
    const stormSurgeScore = 0;
    const landslideScore = 0;
    const rainfallAssessment = hazards.flood.driverAssessments?.find((assessment: any) =>
      assessment.results?.some((result: any) => result.scenarioFamily === 'non-typhoon-rainfall')
    );
    const compoundAssessment = hazards.flood.driverAssessments?.find((assessment: any) =>
      assessment.results?.some((result: any) => result.scenarioFamily === 'typhoon-compound')
    );
    const compoundReturnPeriod = compoundAssessment?.minimumInundationReturnPeriod ?? null;
    const compoundProxyZone = compoundReturnPeriod === null
      ? 0
      : compoundReturnPeriod <= 5
        ? 5
        : compoundReturnPeriod <= 20
          ? 4
          : compoundReturnPeriod <= 100
            ? 3
            : compoundReturnPeriod <= 200
              ? 2
              : 1;
    const compoundProxyScore = Math.min(10, compoundProxyZone * 2);
    
    return {
      flood: { 
        score: Math.round(floodScore * 10) / 10, 
        zone: hazards.flood.zone, 
        returnPeriod: hazards.flood.returnPeriod,
        depth: hazards.flood.depth,
        classification: hazards.flood.classification,
        thresholdMeters: hazards.flood.thresholdMeters,
        samplingMethod: hazards.flood.samplingMethod,
        samplingRadiusMeters: hazards.flood.samplingRadiusMeters,
        region: hazards.flood.region,
        layerResults: hazards.flood.driverAssessments?.length === 2
          ? hazards.flood.driverAssessments.flatMap((assessment: any) => assessment.results || [])
          : hazards.flood.results,
        queriedAt: hazards.flood.queriedAt,
        source: hazards.flood.source,
        assessmentMode: hazards.flood.assessmentMode,
        selectedScenario: hazards.flood.selectedScenario,
        driverAssessments: hazards.flood.driverAssessments,
        historicalFlood: hazards.flood.historicalFlood,
        rainfallOnsetReturnPeriod: rainfallAssessment?.minimumInundationReturnPeriod ?? null,
        rainfallR50Depth: getReturnPeriodDepth(rainfallAssessment, 50),
        rainfallR1000Depth: getReturnPeriodDepth(rainfallAssessment, 1000),
        compoundMaximumDepth: compoundAssessment?.maximumDepth ?? null,
        compoundProxyOnsetReturnPeriod: compoundReturnPeriod,
        compoundR50Depth: getReturnPeriodDepth(compoundAssessment, 50),
        compoundR1000Depth: getReturnPeriodDepth(compoundAssessment, 1000),
        compoundProxyZone,
        compoundProxyScore,
        compoundProxyLevel: compoundProxyScore >= 8 ? 'Extreme' : compoundProxyScore >= 6 ? 'High' : compoundProxyScore >= 4 ? 'Medium' : 'Low',
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
        score: Math.max(floodScore, compoundProxyScore),
        level: Math.max(floodScore, compoundProxyScore) >= 8 ? 'Extreme' : Math.max(floodScore, compoundProxyScore) >= 6 ? 'High' : Math.max(floodScore, compoundProxyScore) >= 4 ? 'Medium' : 'Low',
        riskIndex: Math.max(floodScore, compoundProxyScore) * 10,
        defended: false,
        basis: hazards.flood.driverAssessments?.length === 2
          ? 'Highest family inundation-frequency susceptibility index; screening only, not total flood risk'
          : 'Selected GeoServer flood scenario screening',
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

    const handleMapClick = async (event: LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;

      // ====== Terrain Profile: intercept clicks for 2-point line ======
      if (profileMode) {
        setProfilePoints((prev) => {
          const next = [...prev, { lat, lng }];
          if (next.length === 2) {
            // 第二次点击 → 计算剖面
            computeTerrainProfile(next[0], next[1]);
            // 用完两点后保留画线,不立刻清;让用户看到 line 再点切换/重画
            setProfileMode(false);
          }
          return next;
        });
        return; // profile 模式下不触发逆地理
      }

      // IBTrACS 层:查询台风节点属性
      if (visibleLayers.globalTyphoonPoints || visibleLayers.globalTyphoonTracks) {
        queryIbtracsFeatureInfo(event.latlng);
      }
      // 地图点击只更新悬浮坐标显示和地图上的标记,不再弹位置详情面板
    };

    mapInstance.on('click', handleMapClick);
    return () => {
      mapInstance.off('click', handleMapClick);
    };
  }, [visibleLayers.globalTyphoonPoints, visibleLayers.globalTyphoonTracks, queryIbtracsFeatureInfo, profileMode]);

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

  const shapeToAreaGeometry = (layer: any, type: string) => {
    if (type === 'circle') {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      const ring: [number, number][] = [];
      for (let index = 0; index < 64; index += 1) {
        const angle = (index / 64) * Math.PI * 2;
        const latitude = center.lat + (radius * Math.cos(angle)) / 110_540;
        const longitude = center.lng
          + (radius * Math.sin(angle)) / (111_320 * Math.cos(center.lat * Math.PI / 180));
        ring.push([longitude, latitude]);
      }
      ring.push(ring[0]);
      return { type: 'Polygon' as const, coordinates: [ring] };
    }
    const geometry = layer.toGeoJSON()?.geometry;
    if (geometry?.type !== 'Polygon' && geometry?.type !== 'MultiPolygon') {
      throw new Error('The drawn shape could not be converted to an area geometry');
    }
    return geometry;
  };

  const calculateAreaRisk = async (layer: any, type: string) => {
    if (!regionalCapabilities.data.areaFlood) {
      toast.push({
        variant: 'warning',
        title: `${regionalCapabilities.name} area flood data not connected`,
      });
      return;
    }
    const requestId = areaRequestIdRef.current + 1;
    areaRequestIdRef.current = requestId;
    setIsCalculatingArea(true);
    setAreaRiskData(null);

    try {
      setAreaCalculationProgress({ current: 0, total: 1 });
      const geometry = shapeToAreaGeometry(layer, type) as AreaFloodGeometry;
      const positions: [number, number][] = geometry.type === 'Polygon'
        ? geometry.coordinates.flat()
        : geometry.coordinates.flat(2);
      const longitudes = positions.map(position => position[0]);
      const latitudes = positions.map(position => position[1]);
      if (!positions.length
        || Math.max(...longitudes) <= Math.min(...longitudes)
        || Math.max(...latitudes) <= Math.min(...latitudes)) {
        return;
      }
      const historicalFloodPromise = queryHistoricalAreaFloodHazard(geometry, currentRegion).catch(error => ({
        available: false,
        reason: error instanceof Error ? error.message : 'Historical area flood query failed',
        thresholdMeters: 0.15,
        samplingRadiusMeters: 0,
        totalEvents: 0,
        queriedEvents: 0,
        inundationCount: 0,
        typhoonCount: 0,
        rainfallCount: 0,
        events: [],
        queriedAt: new Date().toISOString(),
      }));
      const response = await fetch('/api/hazards/flood-area-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry, region: currentRegion }),
        signal: AbortSignal.timeout(180_000), // Area queries may span 26+ WCS layers
      });
      if (requestId !== areaRequestIdRef.current) return;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Area flood service returned ${response.status} ${response.statusText || 'without JSON'}`);
      }
      const payload = await response.json();
      if (requestId !== areaRequestIdRef.current) return;
      if (!response.ok) throw new Error(payload.error || 'Area flood hazard query failed');
      if (!Array.isArray(payload.families) || payload.families.length !== 2
        || !Number.isFinite(payload.areaSquareKilometers)
        || !Number.isFinite(payload.approximatePixelSizeMeters)) {
        throw new Error('Area flood service returned an incomplete result');
      }
      const result = payload as AreaFloodHazardResult;
      const historicalFlood = await historicalFloodPromise;
      const bounds = layer.getBounds();
      setAreaCalculationProgress({ current: 1, total: 1 });
      const areaData = {
        ...result,
        historicalFlood,
        type,
        geometry,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
      };
      setAreaRiskData(areaData);
      setAreaRiskFloatingOpen(true);
      console.log('Area flood hazard calculation complete:', areaData);
    } catch (error: any) {
      if (requestId !== areaRequestIdRef.current) return;
      console.error('Area flood hazard calculation failed:', error);
      toast.push({ variant: 'error', title: 'Failed to calculate area flood hazard', description: error.message });
    } finally {
      if (requestId === areaRequestIdRef.current) {
        setIsCalculatingArea(false);
        setAreaCalculationProgress({ current: 0, total: 0 });
      }
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

  // ========== Terrain Profile Functions ==========
  // 大圆距离 (米) — 用于把剖面归一化距离换算成实际里程
  const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371008.8;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  // WMS GetFeatureInfo 单点采样 — 返回 elevation (米),失败返回 null。
  // 走 WMS 而非 WCS 的原因:HK_DEM_5m / MO_DEM_TIF_clipped 这���个 coverage
  // 的 WCS 1.0.0 不支持 GeoTIFF 输出(DescribeCoverage 不列出 formats 段,
  // GetCoverage 会回 "format GeoTIFF is not supported for this coverage")。
  // WMS GetFeatureInfo + info_format=application/json 直接返回 GRAY_INDEX,
  // 浏览器端拿 JSON.parse 即可,避开 WCS 输出格式问题。
  //  - HK_DEM_5m: 1 个 band → properties.GRAY_INDEX
  //  - MO_DEM_TIF_clipped: 2 个 band → properties.GRAY_INDEX(第一个 band 即高程)
  // 走 WMS_BFF_URL 而非直接 fetch GeoServer,浏览器 → GeoServer 跨域被拦
  // (无 Access-Control-Allow-Origin),BFF 服务端代理后回前端(带 ACAO: *)。
  // bbox 用小框(±0.0005° ≈ 55 m)再 width/height=101 取中心点,
  // 保证命中 DEM 5m 像素(且采样点轻微抖动不影响中心像素)。
  const sampleDemAt = async (lat: number, lng: number): Promise<number | null> => {
    const layerName = currentRegion === 'mo'
      ? 'MO_DEM_TIF_clipped'
      : 'HK_DEM_5m';
    const eps = 0.0005;
    const half = 50; // 101×101 中心 = (50,50)
    const params = new URLSearchParams({
      service: 'WMS',
      version: '1.1.0',
      request: 'GetFeatureInfo',
      layers: `natcat_platform:${layerName}`,
      query_layers: `natcat_platform:${layerName}`,
      bbox: `${lng - eps},${lat - eps},${lng + eps},${lat + eps}`,
      width: '101',
      height: '101',
      srs: 'EPSG:4326',
      format: 'image/png',
      info_format: 'application/json',
      x: String(half),
      y: String(half),
      styles: '',
    });
    // 单点 fetch 加 8s 超时,防止 GeoServer / BFF 卡住导致整个 batch hang,
    // 进而让 profileLoading 永远为 true、剖面图小圈圈一直转。
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`${WMS_BFF_URL}?${params.toString()}`, {
        signal: ctrl.signal,
      });
      if (!r.ok) return null;
      const text = await r.text();
      // BFF 在 raster info_format 失败时可能回 JSON {error} 或 XML/HTML,先过滤
      if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        return null;
      }
      const json = JSON.parse(text);
      // BFF 错误透传格式: { error: '...', status: ... },需与 FeatureCollection 区分
      if (json && typeof json === 'object' && 'error' in json && !('features' in json)) {
        return null;
      }
      const feat = json?.features?.[0];
      const props = feat?.properties;
      const v = props?.GRAY_INDEX;
      if (v === undefined || v === null) return null;
      const num = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(num)) return null;
      // 过滤 nodata sentinel(DEM 用 -3.4028e+38 当 nodata,5m HK DEM 也用同一值)
      if (num <= -1e30) return null;
      return num;
    } catch {
      // 包括 AbortError (超时) / network error / JSON parse error
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  // 沿线剖面:200 个采样点,并发 16 个请求一批,降低 WMS 压力
  const computeTerrainProfile = async (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const N = 200;
    const totalDist = haversineMeters(p1, p2);
    setProfileLoading(true);
    setProfileSamples(null);
    setProfileChartOpen(true);

    const points: Array<{ lat: number; lng: number }> = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      points.push({
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lng: p1.lng + (p2.lng - p1.lng) * t,
      });
    }

    const elevations: Array<number | null> = new Array(points.length).fill(null);
    const batchSize = 16;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((p) => sampleDemAt(p.lat, p.lng)));
      for (let j = 0; j < results.length; j++) elevations[i + j] = results[j];
      // 把进度推到 UI
      const done = Math.min(i + batchSize, points.length);
      setProfileSamples(
        Array.from({ length: done }, (_, k) => ({
          distance: (k / N) * totalDist,
          elevation: elevations[k],
        })),
      );
    }

    // 最终完整结果
    setProfileSamples(
      points.map((_, k) => ({ distance: (k / N) * totalDist, elevation: elevations[k] })),
    );
    setProfileLoading(false);
  };

  const toggleProfileMode = () => {
    setProfileMode(!profileMode);
    setProfilePoints([]);
    setProfileSamples(null);
    setProfileChartOpen(false);
    setProfileHoverIndex(null);
    // 清理 rAF 节流引用,避免下次画线时残留回调
    if (profileHoverRafRef.current !== null) {
      cancelAnimationFrame(profileHoverRafRef.current);
      profileHoverRafRef.current = null;
    }
    profileHoverPendingRef.current = null;
    if (!profileMode) {
      // 进入 profile mode 时,退出 draw mode 以免冲突
      setDrawMode(false);
    }
  };

  // 把样本 index 反推回 (lat, lng):基于 p1-p2 等间距线性插值
  const getSampleLatLng = (idx: number): [number, number] | null => {
    if (!profileSamples || !profilePoints || profilePoints.length !== 2) return null;
    if (idx < 0 || idx >= profileSamples.length) return null;
    const [p1, p2] = profilePoints;
    const N = profileSamples.length - 1;
    const t = idx / N;
    return [p1.lat + (p2.lat - p1.lat) * t, p1.lng + (p2.lng - p1.lng) * t];
  };

  // 给定 (lat, lng),找最近样本 index(平方欧氏距离,经纬度差在小范围内足够)
  const findNearestSampleIndex = (lat: number, lng: number): number | null => {
    if (!profileSamples || !profilePoints || profilePoints.length !== 2) return null;
    const [p1, p2] = profilePoints;
    const N = profileSamples.length - 1;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < profileSamples.length; i++) {
      const t = i / N;
      const sLat = p1.lat + (p2.lat - p1.lat) * t;
      const sLng = p1.lng + (p2.lng - p1.lng) * t;
      const dLat = sLat - lat;
      const dLng = sLng - lng;
      const d = dLat * dLat + dLng * dLng;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
  };

  // 命令式同步:profileHoverIndex 变化时,直接调 Leaflet 的 setLatLng/setStyle,
  // 不再走 React 重渲染 -> 双向联动延迟近乎 0
  useEffect(() => {
    const dot = highlightDotRef.current;
    const halo = highlightHaloRef.current;
    const tick = highlightTickRef.current;
    if (!dot || !halo || !tick) return;

    const geom = computeHighlightGeometry(profileHoverIndex, profilePoints);
    if (!geom) {
      // 没有高亮,设置成完全透明,marker 仍在图层中但不渲染
      dot.setStyle({ opacity: 0, fillOpacity: 0 });
      halo.setStyle({ opacity: 0, fillOpacity: 0 });
      tick.setStyle({ opacity: 0 });
      return;
    }

    dot.setLatLng(geom.point);
    dot.setStyle({ color: '#b45309', fillColor: '#fbbf24', fillOpacity: 1, opacity: 1, weight: 2 });

    halo.setLatLng(geom.point);
    halo.setStyle({ color: 'transparent', fillColor: '#fbbf24', fillOpacity: 0.35, opacity: 0, weight: 0 });

    tick.setLatLngs(geom.tick);
    tick.setStyle({ color: '#f59e0b', opacity: 1, weight: 3 });
  }, [profileHoverIndex, profilePoints]);

  // 计算高亮几何:点位置 + 垂直于剖面线的短线两端
  const computeHighlightGeometry = (
    hoverIdx: number | null,
    pts: Array<{ lat: number; lng: number }>,
  ): { point: [number, number]; tick: [number, number][] } | null => {
    if (hoverIdx === null || pts.length !== 2) return null;
    const ll = getSampleLatLng(hoverIdx);
    if (!ll) return null;
    const [p1, p2] = pts;
    const dLat = p2.lat - p1.lat;
    const dLng = p2.lng - p1.lng;
    const len = Math.hypot(dLat, dLng) || 1;
    const px = -dLng / len;
    const py = dLat / len;
    const tickLen = 0.0006; // ≈ 60 m
    return {
      point: ll,
      tick: [
        [ll[0] - py * tickLen, ll[1] - px * tickLen] as [number, number],
        [ll[0] + py * tickLen, ll[1] + px * tickLen] as [number, number],
      ],
    };
  };

  // ========== End of Terrain Profile Functions ==========

  // Calculate risk for current marker position
  const handleCalculateRisk = async () => {
    if (!markerPosition) {
      toast.push({ variant: 'warning', title: 'Please search for a location first or click on the map to place a marker' });
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
      toast.push({ variant: 'error', title: 'Failed to calculate risk. Please try again.', description: error.message });

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
        toast.push({ variant: 'warning', title: 'Please enter valid latitude and longitude values' });
        return;
      }
      
      if (lat < -90 || lat > 90) {
        toast.push({ variant: 'info', title: 'Latitude must be between -90 and 90' });
        return;
      }
      
      if (lng < -180 || lng > 180) {
        toast.push({ variant: 'info', title: 'Longitude must be between -180 and 180' });
        return;
      }
      
      queryString = `${lat}, ${lng}`;
    } else {
      if (!searchQuery.trim()) {
        toast.push({ variant: 'warning', title: 'Please enter an address' });
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
      toast.push({ variant: 'error', title: 'Failed to query location. Please check your input and try again.', description: error.message });
      
      // Clear previous results on error
      setAssetInfo(null);
      setRiskScores(null);
      setMarkerPosition(null);
      setRiskResultsFloatingOpen(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Download a native vector PDF rather than a rasterized screenshot of the result panel.
  // 优先走后端(中文真实显示 + OSS 存档);503 或网络错误时 hook 内部降级到 jsPDF。
  //
  // Page 3 的 6 张水深图改用前端 Leaflet 实时截图(capturedFloodMaps),
  // 绕过底图 XYZ tile 网格 vs WMS EPSG:4326 bbox 的坐标系不一致问题。
  // 截图失败 → 降级到原 jsPDF 合成路径。
  const handleDownloadReport = async () => {
    if (!assetInfo || !riskScores || isGeneratingRiskPdf || isDownloadingBackendReport) {
      return;
    }

    setIsGeneratingRiskPdf(true);

    // 截图前保存用户当前底图,截图完成后恢复
    const originalBaseMap = baseMap;
    let capturedFloodMaps: Awaited<ReturnType<typeof captureFloodMapsForPdf>> | null = null;
    // Page 2.5a drainage-only + 2.5b road-only:必须从 Leaflet DOM 截屏
    // (LULC GeoServer 直连,BFF 代理不了,且要分开截才能各自加 legend)。
    let capturedDrainage: Awaited<ReturnType<typeof captureMapLayerFromLeaflet>> = null;
    let capturedRoad: Awaited<ReturnType<typeof captureMapLayerFromLeaflet>> = null;

    // 保存并临时开启 drainage + road layer(用户可能没勾)→ 截图后恢复。
    // 同时把 Leaflet flyTo 到 zoom 17(与 Page 1 卫星图一致),截完恢复 zoom。
    // Transportation 子类(road intersection / speed limit / turn 等 14 类)也都临时打开,
    // 完整呈现"我平台里显示什么,PDF 就截什么"。
    const originalUrbanElements = urbanElements;
    const originalZoom = mapZoom;
    const pdfRegion = resolveRegionForPdf(assetInfo.latitude, assetInfo.longitude);
    const drainageKeys = pdfRegion === 'mo'
      ? ['moInPipeLink', 'moInPipeManhole', 'moInPipeOutlet'] as const
      : ['hkDrainageConduits', 'hkDrainageJunctions', 'hkDrainageOutfalls', 'hkStorageTanks'] as const;
    const roadKeys = pdfRegion === 'mo'
      ? ['moInCenterline'] as const
      : [
          'hkRoadCenterline', 'hkRoadIntersection', 'hkRoadSpeedLimit', 'hkRoadTurn',
          'hkRoadPedestrianZone', 'hkRoadRoundabout', 'hkRoadBusOnlyLane',
          'hkRoadProhibition', 'hkRoadVehicleRestriction', 'hkRoadPermit',
          'hkRoadOnStreetPark', 'hkRoadNsr', 'hkRoadRunInOut', 'hkRoadTrafficFeatures',
        ] as const;
    const allTransportKeys = [...drainageKeys, ...roadKeys] as const;
    const hadAnyTransport = allTransportKeys.some((k) => originalUrbanElements[k as keyof typeof originalUrbanElements]);
    if (!hadAnyTransport) {
      setUrbanElements((prev) => ({
        ...prev,
        ...Object.fromEntries(allTransportKeys.map((k) => [k, true])),
      }));
    }

    try {
      // 0. 临时切到 esri-gray 底图(底图与 Page 4 洪水图一致),等 Gray tile + drainage tile 加载
      //    完后再截 drainage(Page 2.5a)。这样 Page 2.5a/b 视觉风格与 Page 4 一致 ——
      //    灰色底图上叠加彩色管线,层次清晰。
      //    必须先 setPdfCaptureBaseMap 标记 PDF 截图模式(底图切换不依赖 setBaseMap,
      //    由 LayerStack 内部根据 pdfCaptureBaseMap 决定渲染哪张底图)。
      setPdfCaptureBaseMap(baseMap);
      setBaseMap('esri-gray');
      // flyTo 到 zoom 17(与 Page 1 卫星图范围一致 — fetchMapSnapshot 用 zoom 17)。
      // 无动画 duration:0 让 Leaflet 立即重置视图,节省等待时间。
      if (mapRef.current) {
        mapRef.current.setView(
          [assetInfo.latitude, assetInfo.longitude],
          17,
          { animate: false },
        );
      }
      // 等 Gray 底图 tile + drainage WMS tile + 缩放视图 都加载完(各 ~1-2s)
      await new Promise((r) => setTimeout(r, 3000));

      // 1a. 截 drainage-only(Page 2.5a)— 当前所有 transport keys 都开着,所以图上
      //     既有 drainage 又有 road。截完后立即关掉 road keys,再等 1s 截图,这样
      //     第二张就只剩 drainage。
      try {
        // 先截第一张(此时 drainage + road 全开)— 作为 drainage-only 占位也行
        // 但我们要的是"只显示 drainage",所以这里选择先关掉所有 road keys 再截。
        setUrbanElements((prev) => ({
          ...prev,
          ...Object.fromEntries(roadKeys.map((k) => [k, false])),
        }));
        await new Promise((r) => setTimeout(r, 1500)); // 等 layer 移除 + tile 取消
        capturedDrainage = await captureMapLayerFromLeaflet(mapRef.current, { waitMs: 800 });
        if (!capturedDrainage) {
          toast.push({
            variant: 'warning',
            title: 'Drainage snapshot unavailable; Page 2.5a will show placeholder.',
          });
        }

        // 1b. 截 road-only(Page 2.5b)— 关掉 drainage,打开 road keys
        setUrbanElements((prev) => ({
          ...prev,
          ...Object.fromEntries(drainageKeys.map((k) => [k, false])),
          ...Object.fromEntries(roadKeys.map((k) => [k, true])),
        }));
        await new Promise((r) => setTimeout(r, 1500));
        capturedRoad = await captureMapLayerFromLeaflet(mapRef.current, { waitMs: 800 });
        if (!capturedRoad) {
          toast.push({
            variant: 'warning',
            title: 'Road snapshot unavailable; Page 2.5b will show placeholder.',
          });
        }
      } catch (e) {
        console.warn('[PDF] drainage/road capture failed:', e);
        toast.push({
          variant: 'warning',
          title: 'Drainage/road capture failed; Page 2.5 will show placeholder.',
        });
      }

      // 1c. 恢复原 urbanElements(后文如果还要截图 6 张洪水图,不依赖 urbanElements,
      //     但保持状态干净有助于 finally 里的恢复逻辑不出错)。
      setUrbanElements(originalUrbanElements);
      await new Promise((r) => setTimeout(r, 200));

      // 2. 截图 6 张水深图(底图已是 esri-gray,隐藏 UI、按需开 WMS 洪水层)
      const region = resolveRegionForPdf(assetInfo.latitude, assetInfo.longitude);
      const panels = buildFloodMapPanelSpecs(
        riskScores.flood.rainfallOnsetReturnPeriod ?? null,
        riskScores.flood.compoundProxyOnsetReturnPeriod ?? null,
        region,
      );

      try {
        capturedFloodMaps = await captureFloodMapsForPdf(
          {
            lat: assetInfo.latitude,
            lng: assetInfo.longitude,
            region,
            baseMapSetter: (b) => setBaseMap(b),
            baseMapRestore: () => setBaseMap(originalBaseMap),
            layerToggle: (key, visible) =>
              setVisibleLayers((prev) => ({ ...prev, [key]: visible })),
            hideUi: () => setIsUiHiddenForPdf(true),
            showUi: () => setIsUiHiddenForPdf(false),
            onProgress: (current, total, _key, label) => {
              toast.push({
                variant: 'info',
                title: `Generating flood maps ${current}/${total}: ${label}`,
              });
            },
          },
          panels,
        );
      } catch (captureErr) {
        // 截图整体失败(Leaflet 未挂载等)→ 降级到原合成路径
        console.warn('[PDF] Leaflet capture failed, falling back to offline compose:', captureErr);
        capturedFloodMaps = null;
        toast.push({
          variant: 'warning',
          title: 'Flood map capture unavailable; using offline composite.',
        });
      } finally {
        // 兜底:无论成功失败都恢复 UI 和底图
        setIsUiHiddenForPdf(false);
        setBaseMap(originalBaseMap);
        setPdfCaptureBaseMap(null);
      }

      // 2. 把用户画的 terrain profile 一起传给 PDF:
      // - jsPDF fallback (useReportDownload → generateFloodRiskPdf) 消费 profile 章节
      // - 后端 FastAPI (render_point_pdf) 也会消费 profile,渲染"地形剖面"章节
      const profilePayload = profileSamples && profilePoints.length === 2
        ? { points: profilePoints, samples: profileSamples }
        : undefined;
      await requestDownload({
        kind: 'point',
        asset: assetInfo,
        flood: riskScores.flood,
        label: assetInfo.address || `单点 ${assetInfo.latitude?.toFixed?.(4)}, ${assetInfo.longitude?.toFixed?.(4)}`,
        profile: profilePayload,
        capturedFloodMaps: capturedFloodMaps ?? undefined,
        drainageSnapshot: capturedDrainage ?? undefined,
        roadSnapshot: capturedRoad ?? undefined,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.push({ variant: 'error', title: 'PDF generation failed. Please retry.' });
    } finally {
      setIsGeneratingRiskPdf(false);
      setIsUiHiddenForPdf(false);
      setPdfCaptureBaseMap(null);
      // 恢复用户原底图 + zoom + urbanElements(我们临时改了这些 state 截屏)
      setBaseMap(originalBaseMap);
      if (mapRef.current) {
        mapRef.current.setView(
          [assetInfo.latitude, assetInfo.longitude],
          originalZoom,
          { animate: false },
        );
      }
      if (!hadAnyTransport) {
        // 用户原本没勾 drainage / road,截屏后恢复默认 false
        setUrbanElements(originalUrbanElements);
      }
    }
  };

  // resolveRegion:本地 helper(供 handleDownloadReport 独立调用,不依赖其他代码)
  // 与 floodRiskPdf 内的同名函数语义一致
  function resolveRegionForPdf(lat: number, lng: number): 'hk' | 'mo' {
    if (lat >= 22.05 && lat <= 22.23 && lng >= 113.48 && lng <= 113.65) return 'mo';
    return 'hk';
  }
  
  // Export data as JSON
  const buildSingleLocationExport = () => {
    if (!assetInfo || !riskScores) return null;

    const assessments = riskScores.flood.driverAssessments || [];
    const isAllScenarioAssessment = assessments.length === 2;
    const { driverAssessments, layerResults, ...floodSummary } = riskScores.flood;
    const normalizedRiskScores = {
      ...riskScores,
      flood: floodSummary,
    };

    return {
      schemaVersion: '1.0',
      query: {
        mode: isAllScenarioAssessment ? 'all-22-stochastic-catalog-scenarios' : 'selected-scenario',
        selectedScenario: riskScores.flood.selectedScenario || null,
        inundationThresholdMeters: riskScores.flood.thresholdMeters,
        note: isAllScenarioAssessment
          ? 'Two eleven-layer return-period series plus event-catalog annual probability and annualized excess depth are reported from the 10,000-year stochastic catalogs.'
          : 'The result represents the selected design scenario only.',
      },
      location: assetInfo,
      riskScores: normalizedRiskScores,
      hazardResults: isAllScenarioAssessment ? {
        nonTyphoonRainfall: assessments.find((assessment: any) =>
          assessment.results?.some((result: any) => result.scenarioFamily === 'non-typhoon-rainfall')
        ) || null,
        typhoonCompound: assessments.find((assessment: any) =>
          assessment.results?.some((result: any) => result.scenarioFamily === 'typhoon-compound')
        ) || null,
      } : {
        selectedScenario: {
          ...riskScores.flood.selectedScenario,
          results: layerResults,
        },
      },
      timestamp: new Date().toISOString(),
    };
  };

  const stringifyExportData = (value: unknown) => JSON.stringify(
    value,
    (key, item) => typeof item === 'number'
      ? Number(item.toFixed(key === 'latitude' || key === 'longitude' ? 6 : 3))
      : item,
    2,
  );

  const handleExportData = () => {
    if (!assetInfo || !riskScores) {
      toast.push({ variant: 'warning', title: 'No data to export. Please run a query first.' });
      return;
    }
    
    const exportData = buildSingleLocationExport();
    
    const blob = new Blob([stringifyExportData(exportData)], { type: 'application/json' });
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
    const regionalSamples: Record<string, { slug: string; rows: any[][] }> = {
      mo: {
        slug: 'macau',
        rows: [
          ['MO-001', 'Grand Lisboa', 'Avenida de Lisboa, Macau', 113.54975, 22.18964, 420000000, 90000000, 35000000, 545000000, 'MOP', 'Hotel', 2007, 'Steel', 47, 'Yes'],
          ['MO-002', 'Macau Tower', 'Largo da Torre de Macau, Macau', 113.53745, 22.18002, 300000000, 50000000, 25000000, 375000000, 'MOP', 'Tourism', 2001, 'Steel', 58, 'Yes'],
          ['MO-003', 'Cotai Resort', 'Estrada do Istmo, Cotai, Macau', 113.55955, 22.14832, 680000000, 150000000, 70000000, 900000000, 'MOP', 'Hotel', 2008, 'RC', 39, 'Yes'],
          ['MO-004', 'Coloane Warehouse', 'Estrada de Seac Pai Van, Coloane, Macau', 113.55620, 22.11945, 85000000, 22000000, 8000000, 115000000, 'MOP', 'Warehouse', 2012, 'RC', 4, 'No'],
        ],
      },
      hk: {
        slug: 'hong_kong',
        rows: [
          ['HK-001', 'Central Office Tower', '8 Finance Street, Central, Hong Kong', 114.15884, 22.28502, 500000000, 80000000, 40000000, 620000000, 'HKD', 'Office', 2003, 'RC', 88, 'Yes'],
          ['HK-002', 'Kowloon Commercial Centre', '1 Austin Road West, Kowloon, Hong Kong', 114.16592, 22.30336, 360000000, 70000000, 30000000, 460000000, 'HKD', 'Retail', 2010, 'Steel', 30, 'Yes'],
          ['HK-003', 'Sha Tin Residential Tower', 'Sha Tin Centre Street, Sha Tin, Hong Kong', 114.18890, 22.38245, 180000000, 35000000, 10000000, 225000000, 'HKD', 'Residential', 2006, 'RC', 35, 'No'],
          ['HK-004', 'Kwai Chung Warehouse', 'Kwai Chung Container Port Road, Hong Kong', 114.12810, 22.35070, 90000000, 30000000, 12000000, 132000000, 'HKD', 'Warehouse', 1998, 'Steel', 6, 'No'],
        ],
      },
      vn: {
        slug: 'vietnam',
        rows: [
          ['VN-001', 'Hanoi Office', 'Hoan Kiem District, Hanoi, Vietnam', 105.85420, 21.02850, 18000000, 4000000, 2000000, 24000000, 'VND', 'Office', 2015, 'RC', 20, 'Yes'],
          ['VN-002', 'Hai Phong Factory', 'Dinh Vu Industrial Zone, Hai Phong, Vietnam', 106.79050, 20.84490, 32000000, 12000000, 6000000, 50000000, 'VND', 'Industrial', 2018, 'Steel', 3, 'No'],
          ['VN-003', 'Da Nang Hotel', 'Vo Nguyen Giap Street, Da Nang, Vietnam', 108.24620, 16.05980, 26000000, 7000000, 5000000, 38000000, 'VND', 'Hotel', 2017, 'RC', 25, 'Yes'],
          ['VN-004', 'Ho Chi Minh Warehouse', 'Cat Lai Industrial Zone, Ho Chi Minh City, Vietnam', 106.78550, 10.77020, 22000000, 9000000, 4000000, 35000000, 'VND', 'Warehouse', 2014, 'Steel', 2, 'No'],
        ],
      },
      th: {
        slug: 'thailand',
        rows: [
          ['TH-001', 'Bangkok Office', 'Sathon Road, Bangkok, Thailand', 100.53510, 13.72190, 24000000, 5000000, 3000000, 32000000, 'THB', 'Office', 2016, 'RC', 32, 'Yes'],
          ['TH-002', 'Ayutthaya Factory', 'Rojana Industrial Park, Ayutthaya, Thailand', 100.62720, 14.33280, 38000000, 14000000, 7000000, 59000000, 'THB', 'Industrial', 2012, 'Steel', 3, 'No'],
          ['TH-003', 'Chonburi Warehouse', 'Laem Chabang, Chonburi, Thailand', 100.88340, 13.08270, 18000000, 8000000, 3000000, 29000000, 'THB', 'Warehouse', 2019, 'Steel', 2, 'No'],
          ['TH-004', 'Phuket Resort', 'Patong Beach, Phuket, Thailand', 98.29650, 7.89640, 30000000, 9000000, 5000000, 44000000, 'THB', 'Hotel', 2015, 'RC', 12, 'Yes'],
        ],
      },
      my: {
        slug: 'malaysia',
        rows: [
          ['MY-001', 'Kuala Lumpur Office', 'Jalan Ampang, Kuala Lumpur, Malaysia', 101.71230, 3.15880, 28000000, 6000000, 3000000, 37000000, 'MYR', 'Office', 2014, 'RC', 35, 'Yes'],
          ['MY-002', 'Shah Alam Factory', 'HICOM Industrial Estate, Shah Alam, Malaysia', 101.53120, 3.03150, 36000000, 13000000, 6000000, 55000000, 'MYR', 'Industrial', 2011, 'Steel', 3, 'No'],
          ['MY-003', 'Penang Electronics Plant', 'Bayan Lepas Free Industrial Zone, Penang, Malaysia', 100.27310, 5.31210, 42000000, 18000000, 8000000, 68000000, 'MYR', 'Industrial', 2017, 'Steel', 4, 'No'],
          ['MY-004', 'Johor Logistics Centre', 'Tanjung Pelepas, Johor, Malaysia', 103.54990, 1.36420, 23000000, 10000000, 4000000, 37000000, 'MYR', 'Warehouse', 2020, 'Steel', 2, 'No'],
        ],
      },
      gba: {
        slug: 'greater_bay_area',
        rows: [
          ['GBA-001', 'Guangzhou Office', 'Zhujiang New Town, Guangzhou, China', 113.32450, 23.11990, 280000000, 50000000, 25000000, 355000000, 'CNY', 'Office', 2016, 'RC', 45, 'Yes'],
          ['GBA-002', 'Shenzhen Technology Campus', 'Nanshan District, Shenzhen, China', 113.94300, 22.54050, 420000000, 100000000, 50000000, 570000000, 'CNY', 'Office', 2018, 'RC', 30, 'Yes'],
          ['GBA-003', 'Dongguan Factory', 'Songshan Lake, Dongguan, China', 113.89500, 22.93600, 180000000, 70000000, 30000000, 280000000, 'CNY', 'Industrial', 2014, 'Steel', 4, 'No'],
          ['GBA-004', 'Zhuhai Logistics Centre', 'Gaolan Port, Zhuhai, China', 113.19100, 21.95000, 130000000, 45000000, 20000000, 195000000, 'CNY', 'Warehouse', 2019, 'Steel', 3, 'No'],
        ],
      },
      worldwide: {
        slug: 'worldwide',
        rows: [
          ['WW-001', 'Macau Hotel', 'Estrada do Istmo, Cotai, Macau', 113.55955, 22.14832, 300000000, 70000000, 30000000, 400000000, 'USD', 'Hotel', 2008, 'RC', 39, 'Yes'],
          ['WW-002', 'London Office', 'Canary Wharf, London, United Kingdom', -0.01950, 51.50540, 250000000, 50000000, 25000000, 325000000, 'USD', 'Office', 2012, 'Steel', 45, 'Yes'],
          ['WW-003', 'Bangkok Factory', 'Bang Na, Bangkok, Thailand', 100.64180, 13.66820, 80000000, 30000000, 12000000, 122000000, 'USD', 'Industrial', 2015, 'Steel', 3, 'No'],
          ['WW-004', 'Ho Chi Minh Warehouse', 'Cat Lai, Ho Chi Minh City, Vietnam', 106.78550, 10.77020, 60000000, 25000000, 10000000, 95000000, 'USD', 'Warehouse', 2014, 'Steel', 2, 'No'],
        ],
      },
    };
    const headers = [
      'id', 'name', 'address', 'longitude', 'latitude',
      'BuildingTIV', 'ContentTIV', 'BITIV', 'TIV', 'Currency',
      'Occupancy', 'YearOfBuild', 'Constructure', 'Stories', 'Basement',
    ];
    const selectedTemplate = regionalSamples[currentRegion] || regionalSamples.worldwide;
    const sampleRows = selectedTemplate.rows;

    const wb = XLSX.utils.book_new();
    const infoSheet = XLSX.utils.aoa_to_sheet([
      ['Portfolio Template Region', regionConfig?.nameEn || 'Worldwide'],
      ['Region Code', currentRegion],
      ['Coordinate Order', 'longitude, latitude'],
      ['Instructions', 'Replace the example rows in the portfolio sheet with your own locations.'],
    ]);
    (infoSheet as any)['!cols'] = [{ wch: 28 }, { wch: 72 }];
    XLSX.utils.book_append_sheet(wb, infoSheet, 'README');
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

    XLSX.writeFile(wb, `portfolio_template_${selectedTemplate.slug}.xlsx`);
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
          toast.push({
            variant: 'warning',
            title: 'Coordinate columns appear swapped',
            description:
              `Your file's "latitude" and "longitude" columns appear to be swapped ` +
              `(${reason}). They were auto-corrected.\n\n` +
              `If the markers still look wrong, please double-check your source data.`,
            durationMs: 8000,
          });
        }, 0);
      }

      const readyLocations = locations.map(location => ({
        ...location,
        status: 'ready',
        error: undefined,
        assetInfo: undefined,
        riskScores: undefined,
      }));

      console.log(`Loaded ${readyLocations.length} locations from portfolio`);
      setPortfolioLocations(readyLocations);
      setBatchQueryMode(true);
      setSelectedPortfolioItem(null);
      setBatchProgress({ current: 0, total: readyLocations.length });
      setIsLoading(false);
      toast.push({ variant: 'success', title: `${readyLocations.length} portfolio locations loaded. Click Calculate Risk to start the flood assessment.` });
      
    } catch (error: any) {
      console.error('Portfolio upload failed:', error);
      toast.push({ variant: 'error', title: 'Failed to process portfolio file.', description: error.message });
      setIsLoading(false);
      setBatchProgress({ current: 0, total: 0 });
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleCalculatePortfolioRisk = async () => {
    if (portfolioLocations.length === 0 || isLoading) return;
    if (!regionalCapabilities.data.pointFlood) {
      toast.push({
        variant: 'warning',
        title: `${regionalCapabilities.name} point flood data not connected`,
      });
      return;
    }

    // Cancel any previous run before starting a new one
    batchAbortRef.current?.abort();
    const controller = new AbortController();
    batchAbortRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);
    setSelectedPortfolioItem(null);
    setBatchProgress({ current: 0, total: portfolioLocations.length });

    const results = new Array<any>(portfolioLocations.length);
    let nextIndex = 0;
    let completed = 0;
    let cancelled = false;

    const calculateLocation = async (location: any) => {
      if (signal.aborted) {
        throw new Error('Cancelled');
      }
      try {
        let latitude = Number(location.latitude);
        let longitude = Number(location.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          if (!location.address) throw new Error('No address or coordinates');
          const geocoded = await geocodeAddress(location.address);
          if (signal.aborted) throw new Error('Cancelled');
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error('Coordinates are outside the valid latitude/longitude range');
        }

        const asset = await queryAssetInfo(latitude, longitude);
        if (signal.aborted) throw new Error('Cancelled');
        const hazards = await queryHazards(latitude, longitude);
        if (signal.aborted) throw new Error('Cancelled');
        const scores = calculateRiskScores(hazards, asset, getVulnerability());

        return {
          ...location,
          latitude,
          longitude,
          assetInfo: asset,
          riskScores: scores,
          status: 'success',
          error: undefined,
        };
      } catch (error: any) {
        if (error?.message === 'Cancelled') {
          throw error; // bubble up so worker loop can stop
        }
        console.warn(`Portfolio risk query failed for ${location.id}:`, error);
        return {
          ...location,
          status: 'error',
          error: error?.message || 'Risk query failed',
          assetInfo: undefined,
          riskScores: undefined,
        };
      }
    };

    try {
      const workers = Array.from(
        { length: Math.min(3, portfolioLocations.length) },
        async () => {
          while (nextIndex < portfolioLocations.length) {
            if (signal.aborted) break;
            const index = nextIndex;
            nextIndex += 1;
            try {
              results[index] = await calculateLocation(portfolioLocations[index]);
            } catch (error: any) {
              if (error?.message === 'Cancelled') {
                cancelled = true;
                break;
              }
              // Should not reach here — calculateLocation swallows non-cancel errors.
              results[index] = {
                ...portfolioLocations[index],
                status: 'error',
                error: error?.message || 'Risk query failed',
              };
            }
            completed += 1;
            setBatchProgress({ current: completed, total: portfolioLocations.length });
            setPortfolioLocations(current => current.map((location, locationIndex) =>
              locationIndex === index ? results[index] : location
            ));
            if (signal.aborted) break;
          }
        },
      );
      await Promise.all(workers);

      if (!cancelled) {
        setPortfolioLocations(results);
        const successCount = results.filter(location => location.status === 'success').length;
        toast.push({
          variant: successCount === results.length ? 'success' : 'info',
          title: 'Portfolio risk calculation complete',
          description: `Success: ${successCount}/${results.length}\nFailed: ${results.length - successCount}`,
        });
      } else {
        toast.push({
          variant: 'warning',
          title: 'Portfolio risk calculation cancelled',
          description: `${completed}/${portfolioLocations.length} locations processed before cancellation.`,
        });
      }
    } finally {
      if (batchAbortRef.current === controller) {
        batchAbortRef.current = null;
      }
      setIsLoading(false);
      setIsBatchCancelling(false);
    }
  };

  const handleCancelBatch = () => {
    if (!batchAbortRef.current) return;
    setIsBatchCancelling(true);
    batchAbortRef.current.abort();
  };
  
  const ensurePortfolioHistoricalFloodData = async (locations: any[]) => {
    const enriched = [...locations];
    const pendingIndexes = enriched
      .map((location, index) => ({ location, index }))
      .filter(({ location }) => location.status === 'success'
        && Number.isFinite(Number(location.latitude))
        && Number.isFinite(Number(location.longitude))
        && !location.riskScores?.flood?.historicalFlood?.available);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(3, pendingIndexes.length) }, async () => {
      while (nextIndex < pendingIndexes.length) {
        const pending = pendingIndexes[nextIndex];
        nextIndex += 1;
        try {
          const historicalFlood = await queryHistoricalFloodHazard(
            Number(pending.location.latitude),
            Number(pending.location.longitude),
            resolveHazardRegion(
              Number(pending.location.latitude),
              Number(pending.location.longitude),
            ),
          );
          enriched[pending.index] = {
            ...pending.location,
            riskScores: {
              ...pending.location.riskScores,
              flood: { ...pending.location.riskScores.flood, historicalFlood },
            },
          };
        } catch (error) {
          console.warn(`Historical export backfill failed for ${pending.location.id}:`, error);
        }
      }
    });
    await Promise.all(workers);
    if (pendingIndexes.length > 0) setPortfolioLocations(enriched);
    return enriched;
  };

  const handleDownloadPortfolioPdf = async () => {
    if (!portfolioLocations.some(location => location.status === 'success')) {
      toast.push({ variant: 'warning', title: 'Please calculate portfolio risk before downloading the report.' });
      return;
    }
    if (isDownloadingBackendReport) return;
    const total = portfolioLocations.filter(location => location.status === 'success').length;
    setIsGeneratingPortfolioPdf(true);
    setPortfolioPdfProgress({ current: 0, total, location: '' });
    try {
      const exportLocations = await ensurePortfolioHistoricalFloodData(portfolioLocations);
      // 优先走后端:中文真实显示 + OSS 存档。
      // 后端生成的进度条没有细粒度逐地点信息,所以这里只在提交前显示一次"共 N 个标的"。
      await requestDownload({
        kind: 'portfolio',
        locations: exportLocations,
        meta: {
          title: `组合风险评估 (${total} 个标的)`,
          label: `Portfolio flood risk assessment`,
          generatedAt: new Date().toISOString(),
        },
        label: `Portfolio flood risk assessment (${total} locations)`,
      });
    } catch (error) {
      console.error('Portfolio PDF generation failed:', error);
      toast.push({ variant: 'error', title: `Portfolio PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsGeneratingPortfolioPdf(false);
    }
  };

  const handleDownloadPortfolioWorkbook = async () => {
    if (!portfolioLocations.some(location => location.status === 'success')) {
      toast.push({ variant: 'warning', title: 'Please calculate portfolio risk before downloading the detailed workbook.' });
      return;
    }
    setIsGeneratingPortfolioWorkbook(true);
    try {
      const exportLocations = await ensurePortfolioHistoricalFloodData(portfolioLocations);
      const historicalEventCount = exportLocations.reduce(
        (total, location) => total + (location.riskScores?.flood?.historicalFlood?.events?.length || 0),
        0,
      );
      if (historicalEventCount === 0) {
        toast.push({ variant: 'success', title: 'No historical inundation events were returned for the successful portfolio locations. The workbook will include the historical summary columns and an empty event-detail sheet.' });
      }
      generatePortfolioFloodRiskWorkbook(exportLocations);
    } catch (error) {
      console.error('Portfolio workbook generation failed:', error);
      toast.push({ variant: 'error', title: `Portfolio workbook generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsGeneratingPortfolioWorkbook(false);
    }
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
      {/* PDF 截图模式:
         之前的方案是用 CSS .pdf-capture-active 隐藏非 Leaflet UI,
         但因 ancestor 的 display:none 会让 Leaflet 容器也消失,html2canvas 截到空 canvas。
         现改用 html2canvas 的 ignoreElements 选项主动跳过非 Leaflet 元素,
         UI 仍然可见(用户能看到截图过程),但不会画到 canvas 上。 */}
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
                    {currentRegion === 'mo' ? (
                      <>
                        <p><span className="font-semibold">Raster dataset:</span> 22 stochastic-catalog RP layers — 11 NONTC and 11 typhoon compound rasters</p>
                        <p><span className="font-semibold">Annual metrics:</span> exact 10,000-year annual probability and annualized excess depth above 0.15 m</p>
                        <p><span className="font-semibold">Reading method:</span> WCS reads the original raster pixels from each named layer; it does not query a separate GeoServer risk value</p>
                        <p><span className="font-semibold">Sampling:</span> maximum valid external flood depth within a 100 m circular neighborhood</p>
                        <p><span className="font-semibold">Screening:</span> compare each raster depth with the configured 0.15 m threshold</p>
                      </>
                    ) : (
                      <p><span className="font-semibold">Hazard source:</span> configured regional flood-depth raster layers</p>
                    )}
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
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="e.g. 中国太平金融中心香港 / China Taiping Tower"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || isLoading) return;
                        // Enter:有候选就选第一条,否则什么都不做(让用户点击候选)
                        if (searchSuggestions.length > 0) {
                          const first = searchSuggestions[0];
                          if (typeof first.location !== 'string') return;
                          const [lon, lat] = first.location.split(',').map(parseFloat);
                          const [wgsLat, wgsLng] = gcj02ToWgs84(lat, lon);
                          handleSelectSearchResult({
                            address: first.address ? `${first.name} — ${first.address}` : first.name,
                            latitude: wgsLat,
                            longitude: wgsLng,
                            source: 'Amap 输入提示',
                          });
                          setShowSuggestions(false);
                        }
                      }}
                      disabled={isLoading}
                    />
                    {autocompleteLoading && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">搜索中…</div>
                    )}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchSuggestions.map((s, idx) => (
                          <button
                            key={`${s.location}-${idx}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-xs"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (typeof s.location !== 'string') return;
                              const [lon, lat] = s.location.split(',').map(parseFloat);
                              // 高德返回 GCJ-02,转回 WGS-84 后才能与卫星图对齐
                              const [wgsLat, wgsLng] = gcj02ToWgs84(lat, lon);
                              handleSelectSearchResult({
                                address: s.address ? `${s.name} — ${s.address}` : s.name,
                                latitude: wgsLat,
                                longitude: wgsLng,
                                source: 'Amap 输入提示',
                              });
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-gray-800 truncate">{s.name}</div>
                            {s.address && (
                              <div className="text-[10px] text-gray-500 truncate">{s.address}</div>
                            )}
                            {s.type && (
                              <div className="text-[10px] text-blue-600 mt-0.5">{s.type}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

              {/* Search and Calculate Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSearchLocation}
                  disabled={isLoading || !searchQuery.trim()}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Searching...' : 'Search Location'}
                </Button>
                <Button
                  onClick={handleCalculateRisk}
                  disabled={!markerPosition || isLoading || batchQueryMode || !regionalCapabilities.data.pointFlood}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Calculating...' : 'Calculate Risk'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!assetInfo || !riskScores || isGeneratingRiskPdf}
                  onClick={handleDownloadReport}
                  className="px-3"
                  title="Download Single Location PDF Report"
                >
                  {isGeneratingRiskPdf
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                    : <Download className="w-4 h-4" />}
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
                    {drawMode ? 'Draw Mode' : 'Draw Area'}
                  </Button>
                  <Button
                    onClick={() => drawnShape && calculateAreaRisk(drawnShape.layer, drawnShape.type)}
                    disabled={!drawnShape || isLoading || isCalculatingArea || !regionalCapabilities.data.areaFlood}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCalculatingArea ? 'Calculating...' : 'Calculate Risk'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!areaRiskData || isGeneratingAreaPdf || isDownloadingBackendReport}
                    onClick={async () => {
                      if (!areaRiskData || isGeneratingAreaPdf || isDownloadingBackendReport) return;
                      setIsGeneratingAreaPdf(true);
                      try {
                        await requestDownload({
                          kind: 'area',
                          result: areaRiskData,
                          label: areaRiskData.title || areaRiskData.label || '区域洪涝风险评估',
                        });
                      } catch (error) {
                        console.error('Area flood PDF generation failed:', error);
                        toast.push({ variant: 'error', title: 'Area flood PDF generation failed. Please retry.' });
                      } finally {
                        setIsGeneratingAreaPdf(false);
                      }
                    }}
                    className="px-3"
                    title="Download Area Flood Hazard PDF Report"
                  >
                    {isGeneratingAreaPdf
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                      : <Download className="w-4 h-4" />}
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
                    <span>Analyzing flood rasters...</span>
                    <span className="font-semibold">22 scenarios + 4 annual metrics</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(areaCalculationProgress.current / areaCalculationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Applying the drawn geometry as a raster mask and calculating zonal statistics.
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
                        {areaRiskData.areaSquareKilometers.toFixed(3)} km² analyzed at approximately {areaRiskData.approximatePixelSizeMeters.toFixed(1)} m resolution
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
                      disabled={isLoading || isGeneratingPortfolioPdf || isGeneratingPortfolioWorkbook}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      asChild
                    >
                      <span className="flex items-center justify-center">
                        Upload Portfolio
                      </span>
                    </Button>
                  </label>
                  <Button
                    onClick={handleCalculatePortfolioRisk}
                    disabled={portfolioLocations.length === 0 || isLoading || isGeneratingPortfolioPdf || isGeneratingPortfolioWorkbook || !regionalCapabilities.data.pointFlood}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Calculating...' : 'Calculate Risk'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!portfolioLocations.some(location => location.status === 'success') || isLoading || isGeneratingPortfolioPdf || isGeneratingPortfolioWorkbook}
                    onClick={handleDownloadPortfolioPdf}
                    className="px-3"
                    title="Download detailed portfolio PDF with six flood maps and depth charts per location"
                  >
                    {isGeneratingPortfolioPdf
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                  </Button>
                </div>
                {isGeneratingPortfolioPdf && portfolioPdfProgress.total > 0 && (
                  <div className="mt-2 text-[11px] text-teal-700">
                    Generating detailed PDF: {portfolioPdfProgress.current}/{portfolioPdfProgress.total}
                    {portfolioPdfProgress.location ? ` · ${portfolioPdfProgress.location}` : ''}
                  </div>
                )}
                {isGeneratingPortfolioWorkbook && (
                  <div className="mt-2 text-[11px] text-teal-700">
                    Preparing historical event details for Excel...
                  </div>
                )}
                {portfolioLocations.length > 0 && (
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
                    <span>
                      Ready: <b>{portfolioLocations.filter(location => location.status === 'ready').length}</b>
                    </span>
                    <span className="text-green-700">
                      Completed: <b>{portfolioLocations.filter(location => location.status === 'success').length}</b>
                    </span>
                    <span className="text-red-700">
                      Failed: <b>{portfolioLocations.filter(location => location.status === 'error').length}</b>
                    </span>
                  </div>
                )}

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
                    <div className="w-full bg-gray-300 rounded-full h-2 mb-2">
                      <div
                        className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelBatch}
                        disabled={isBatchCancelling}
                        className="text-xs h-7"
                      >
                        {isBatchCancelling ? 'Cancelling...' : 'Cancel'}
                      </Button>
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
                    Select one of the configured design rasters to display and sample its original pixel values.
                  </p>
                  
                  {/* Flood Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      {currentRegion === 'mo' ? '🌊 Macau Flood Design Rasters (22 layers)' : '🌊 Flood (River/Coastal/Flash) - With Drainage System'}
                    </p>
                    {currentRegion === 'mo' ? (
                      <div className="pl-2 space-y-3">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="space-y-3">
                            {/* Non-typhoon Monsoon Rainfall Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌧️ Non-typhoon Monsoon Rainfall
                              </Label>
                              <Select
                                value={selectedMacauNonTyphoonLayer}
                                onValueChange={(value) => {
                                  setSelectedMacauNonTyphoonLayer(value);
                                  setVisibleLayers(prev => ({ ...prev, macauNonTyphoonScenario: value !== 'none' }));
                                }}
                                disabled={isFetchingMacauLayers}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder={isFetchingMacauLayers ? "Loading layers..." : "Select a non-typhoon rainfall layer"} />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[400px]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {macauDesignScenarioLayers.filter(layer => parseMacauScenario(layer)?.family === 'non-typhoon-rainfall').map(layer => {
                                    const displayName = formatMacauScenarioName(layer);
                                    return (
                                      <SelectItem key={layer} value={layer} className="text-xs">
                                        🌧️ {displayName}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {!isFetchingMacauLayers && macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'non-typhoon-rainfall').length > 0 && (
                                <p className="text-[10px] text-gray-500">
                                  {macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'non-typhoon-rainfall').length} non-typhoon rainfall return-period layers available
                                </p>
                              )}
                            </div>

                            {/* Typhoon Compound Flood Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌊 Typhoon Compound Flood
                              </Label>
                              <Select
                                value={selectedMacauTyphoonLayer}
                                onValueChange={(value) => {
                                  setSelectedMacauTyphoonLayer(value);
                                  setVisibleLayers(prev => ({ ...prev, macauTyphoonScenario: value !== 'none' }));
                                }}
                                disabled={isFetchingMacauLayers}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder={isFetchingMacauLayers ? "Loading layers..." : "Select a typhoon compound layer"} />
                                </SelectTrigger>
                                <SelectContent className="z-[9999] max-h-[400px]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {macauDesignScenarioLayers.filter(layer => parseMacauScenario(layer)?.family === 'typhoon-compound').map(layer => {
                                    const displayName = formatMacauScenarioName(layer);
                                    return (
                                      <SelectItem key={layer} value={layer} className="text-xs">
                                        🌊 {displayName}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {!isFetchingMacauLayers && macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'typhoon-compound').length > 0 && (
                                <p className="text-[10px] text-gray-500">
                                  {macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'typhoon-compound').length} typhoon compound return-period layers available
                                </p>
                              )}
                            </div>

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
                                {macauDesignScenarioLayers.length} flood layers available
                                ({macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'non-typhoon-rainfall').length} non-typhoon rain, {macauDesignScenarioLayers.filter(l => parseMacauScenario(l)?.family === 'typhoon-compound').length} typhoon compound)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : currentRegion === 'hk' ? (
                      <div className="pl-2 space-y-3">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="space-y-3">
                            {/* Non-typhoon rainfall Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌧️ Non-typhoon Rainfall
                              </Label>
                              <Select
                                value={selectedHkRainLayer}
                                onValueChange={(value) => {
                                  setSelectedHkRainLayer(value);
                                  setVisibleLayers(prev => ({ ...prev, hkDesignScenario: value !== 'none' }));
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Select a non-typhoon rainfall layer" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {HK_NON_TYPHOON_SCENARIOS.map(scenario => (
                                    <SelectItem key={scenario.layerName} value={scenario.layerName} className="text-xs">
                                      🌧️ {scenario.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-[10px] text-gray-500">
                                {HK_NON_TYPHOON_SCENARIOS.length} non-typhoon rainfall return-period layers available
                              </p>
                            </div>

                            {/* Typhoon compound flood Dropdown */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                🌊 Typhoon Compound Flood
                              </Label>
                              <Select
                                value={selectedHkCompoundLayer}
                                onValueChange={(value) => {
                                  setSelectedHkCompoundLayer(value);
                                  setVisibleLayers(prev => ({ ...prev, hkCompoundScenario: value !== 'none' }));
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                  <SelectValue placeholder="Select a typhoon compound layer" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  <SelectItem value="none" className="text-xs text-gray-500">-- No Layer Selected --</SelectItem>
                                  {HK_TYPHOON_COMPOUND_SCENARIOS.map(scenario => (
                                    <SelectItem key={scenario.layerName} value={scenario.layerName} className="text-xs">
                                      🌊 {scenario.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-[10px] text-gray-500">
                                {HK_TYPHOON_COMPOUND_SCENARIOS.length} typhoon compound return-period layers available
                              </p>
                            </div>

                            <p className="text-[10px] text-gray-500">
                              22 flood layers available (11 non-typhoon rain, 11 typhoon compound)
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

                  {/* Rainstorm Layers */}
                  {currentRegion === 'worldwide' && <>
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
                  </>}
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
                        <SelectItem value="transportation" className="text-xs">🛣️ Transportation</SelectItem>
                        <SelectItem value="buildings" className="text-xs">🏢 Buildings</SelectItem>
                        <SelectItem value="pipe" className="text-xs">🚰 Pipe Network</SelectItem>
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
                            {/* Hong Kong items - shown only in HK mode */}
                            {currentRegion === 'hk' && (
                              <>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="boundary" checked={urbanElements.boundary} onCheckedChange={() => handleUrbanElementToggle('boundary')} />
                                  <Label htmlFor="boundary" className="text-xs cursor-pointer font-normal">Administrative Boundary</Label>
                                </div>
                                {/* Hong Kong Advertising underlying TIF coverages */}
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkDem" checked={urbanElements.hkDem} onCheckedChange={() => handleUrbanElementToggle('hkDem')} />
                                  <Label htmlFor="hkDem" className="text-xs cursor-pointer font-normal">Digital Elevation Model</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkLulc" checked={urbanElements.hkLulc} onCheckedChange={() => handleUrbanElementToggle('hkLulc')} />
                                  <Label htmlFor="hkLulc" className="text-xs cursor-pointer font-normal">LULC (DynamicWorld)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkSoil" checked={urbanElements.hkSoil} onCheckedChange={() => handleUrbanElementToggle('hkSoil')} />
                                  <Label htmlFor="hkSoil" className="text-xs cursor-pointer font-normal">Soil (OpenLandMap)</Label>
                                </div>
                              </>
                            )}
                            {/* Macau items - shown only in MO mode, using HK-style labels */}
                            {currentRegion === 'mo' && (
                              <>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moDistrictBoundary" checked={urbanElements.moDistrictBoundary} onCheckedChange={() => handleUrbanElementToggle('moDistrictBoundary')} />
                                  <Label htmlFor="moDistrictBoundary" className="text-xs cursor-pointer font-normal">Administrative Boundary</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moDem" checked={urbanElements.moDem} onCheckedChange={() => handleUrbanElementToggle('moDem')} />
                                  <Label htmlFor="moDem" className="text-xs cursor-pointer font-normal">Digital Elevation Model</Label>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Transportation Category */}
                      {selectedGeospatialCategory === 'transportation' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            {currentRegion === 'hk' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Hong Kong Road Network (Road.gdb,14 子层)
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadCenterline" checked={urbanElements.hkRoadCenterline} onCheckedChange={() => handleUrbanElementToggle('hkRoadCenterline')} />
                                  <Label htmlFor="hkRoadCenterline" className="text-xs cursor-pointer font-normal">Road Centerlines</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadIntersection" checked={urbanElements.hkRoadIntersection} onCheckedChange={() => handleUrbanElementToggle('hkRoadIntersection')} />
                                  <Label htmlFor="hkRoadIntersection" className="text-xs cursor-pointer font-normal">Intersections</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadSpeedLimit" checked={urbanElements.hkRoadSpeedLimit} onCheckedChange={() => handleUrbanElementToggle('hkRoadSpeedLimit')} />
                                  <Label htmlFor="hkRoadSpeedLimit" className="text-xs cursor-pointer font-normal">Speed Limit</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadTurn" checked={urbanElements.hkRoadTurn} onCheckedChange={() => handleUrbanElementToggle('hkRoadTurn')} />
                                  <Label htmlFor="hkRoadTurn" className="text-xs cursor-pointer font-normal">Turn Restrictions</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadPedestrianZone" checked={urbanElements.hkRoadPedestrianZone} onCheckedChange={() => handleUrbanElementToggle('hkRoadPedestrianZone')} />
                                  <Label htmlFor="hkRoadPedestrianZone" className="text-xs cursor-pointer font-normal">Pedestrian Zone</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadRoundabout" checked={urbanElements.hkRoadRoundabout} onCheckedChange={() => handleUrbanElementToggle('hkRoadRoundabout')} />
                                  <Label htmlFor="hkRoadRoundabout" className="text-xs cursor-pointer font-normal">Roundabouts</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadBusOnlyLane" checked={urbanElements.hkRoadBusOnlyLane} onCheckedChange={() => handleUrbanElementToggle('hkRoadBusOnlyLane')} />
                                  <Label htmlFor="hkRoadBusOnlyLane" className="text-xs cursor-pointer font-normal">Bus-Only Lane</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadProhibition" checked={urbanElements.hkRoadProhibition} onCheckedChange={() => handleUrbanElementToggle('hkRoadProhibition')} />
                                  <Label htmlFor="hkRoadProhibition" className="text-xs cursor-pointer font-normal">Prohibitions</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadVehicleRestriction" checked={urbanElements.hkRoadVehicleRestriction} onCheckedChange={() => handleUrbanElementToggle('hkRoadVehicleRestriction')} />
                                  <Label htmlFor="hkRoadVehicleRestriction" className="text-xs cursor-pointer font-normal">Vehicle Restrictions</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadPermit" checked={urbanElements.hkRoadPermit} onCheckedChange={() => handleUrbanElementToggle('hkRoadPermit')} />
                                  <Label htmlFor="hkRoadPermit" className="text-xs cursor-pointer font-normal">Permits</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadOnStreetPark" checked={urbanElements.hkRoadOnStreetPark} onCheckedChange={() => handleUrbanElementToggle('hkRoadOnStreetPark')} />
                                  <Label htmlFor="hkRoadOnStreetPark" className="text-xs cursor-pointer font-normal">On-Street Parking</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadNsr" checked={urbanElements.hkRoadNsr} onCheckedChange={() => handleUrbanElementToggle('hkRoadNsr')} />
                                  <Label htmlFor="hkRoadNsr" className="text-xs cursor-pointer font-normal">NSR (No Stopping Restriction)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadRunInOut" checked={urbanElements.hkRoadRunInOut} onCheckedChange={() => handleUrbanElementToggle('hkRoadRunInOut')} />
                                  <Label htmlFor="hkRoadRunInOut" className="text-xs cursor-pointer font-normal">Run In / Out</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkRoadTrafficFeatures" checked={urbanElements.hkRoadTrafficFeatures} onCheckedChange={() => handleUrbanElementToggle('hkRoadTrafficFeatures')} />
                                  <Label htmlFor="hkRoadTrafficFeatures" className="text-xs cursor-pointer font-normal">Traffic Features</Label>
                                </div>
                              </>
                            )}
                            {currentRegion === 'mo' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Macau LULC (CDROM_C)
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInCenterline" checked={urbanElements.moInCenterline} onCheckedChange={() => handleUrbanElementToggle('moInCenterline')} />
                                  <Label htmlFor="moInCenterline" className="text-xs cursor-pointer font-normal" title="MO_centerline 路网中心线">Street Centerlines</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInRua" checked={urbanElements.moInRua} onCheckedChange={() => handleUrbanElementToggle('moInRua')} />
                                  <Label htmlFor="moInRua" className="text-xs cursor-pointer font-normal" title="MO_rua 街道线">Streets (Ruas)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPonte" checked={urbanElements.moInPonte} onCheckedChange={() => handleUrbanElementToggle('moInPonte')} />
                                  <Label htmlFor="moInPonte" className="text-xs cursor-pointer font-normal">Bridges</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPlace" checked={urbanElements.moInPlace} onCheckedChange={() => handleUrbanElementToggle('moInPlace')} />
                                  <Label htmlFor="moInPlace" className="text-xs cursor-pointer font-normal">Plazas (Points)</Label>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Buildings Category */}
                      {selectedGeospatialCategory === 'buildings' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            {currentRegion === 'hk' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Hong Kong Buildings
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkBuilding" checked={urbanElements.hkBuilding} onCheckedChange={() => handleUrbanElementToggle('hkBuilding')} />
                                  <Label htmlFor="hkBuilding" className="text-xs cursor-pointer font-normal" title="HK_Building_Shapefile (D:\HK-MO-Deliverable\HK\Advertising\building\building.shp)">Building Footprints</Label>
                                </div>
                              </>
                            )}
                            {currentRegion === 'mo' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Macau LULC (CDROM_C)
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPredio" checked={urbanElements.moInPredio} onCheckedChange={() => handleUrbanElementToggle('moInPredio')} />
                                  <Label htmlFor="moInPredio" className="text-xs cursor-pointer font-normal">Buildings (Predios)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInBldgClass" checked={urbanElements.moInBldgClass} onCheckedChange={() => handleUrbanElementToggle('moInBldgClass')} />
                                  <Label htmlFor="moInBldgClass" className="text-xs cursor-pointer font-normal">Building Classification</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInDoorNo" checked={urbanElements.moInDoorNo} onCheckedChange={() => handleUrbanElementToggle('moInDoorNo')} />
                                  <Label htmlFor="moInDoorNo" className="text-xs cursor-pointer font-normal">Door Numbers</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInLote" checked={urbanElements.moInLote} onCheckedChange={() => handleUrbanElementToggle('moInLote')} />
                                  <Label htmlFor="moInLote" className="text-xs cursor-pointer font-normal">Cadastral Lots</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInTower" checked={urbanElements.moInTower} onCheckedChange={() => handleUrbanElementToggle('moInTower')} />
                                  <Label htmlFor="moInTower" className="text-xs cursor-pointer font-normal">Towers</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInBoundary" checked={urbanElements.moInBoundary} onCheckedChange={() => handleUrbanElementToggle('moInBoundary')} />
                                  <Label htmlFor="moInBoundary" className="text-xs cursor-pointer font-normal" title="CDROM_C 单个澳门外边界, 与 Geography 下的 7 堂区边界不同">Administrative Boundary (CDROM_C)</Label>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pipe Network Category */}
                      {selectedGeospatialCategory === 'pipe' && (
                        <div>
                          <div className="space-y-1.5 pl-2">
                            {currentRegion === 'mo' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Macau Pipe Network
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPipeLink" checked={urbanElements.moInPipeLink} onCheckedChange={() => handleUrbanElementToggle('moInPipeLink')} />
                                  <Label htmlFor="moInPipeLink" className="text-xs cursor-pointer font-normal">Pipe Links</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPipeManhole" checked={urbanElements.moInPipeManhole} onCheckedChange={() => handleUrbanElementToggle('moInPipeManhole')} />
                                  <Label htmlFor="moInPipeManhole" className="text-xs cursor-pointer font-normal">Manholes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="moInPipeOutlet" checked={urbanElements.moInPipeOutlet} onCheckedChange={() => handleUrbanElementToggle('moInPipeOutlet')} />
                                  <Label htmlFor="moInPipeOutlet" className="text-xs cursor-pointer font-normal">Outlets</Label>
                                </div>
                              </>
                            )}
                            {currentRegion === 'hk' && (
                              <>
                                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Hong Kong Underground Drainage Network (SWMM)
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkDrainageConduits" checked={urbanElements.hkDrainageConduits} onCheckedChange={() => handleUrbanElementToggle('hkDrainageConduits')} />
                                  <Label htmlFor="hkDrainageConduits" className="text-xs cursor-pointer font-normal" title="SWMM conduits / 排水管 (HK_Drainage_Conduits shapefile)">Drainage Conduits</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkDrainageJunctions" checked={urbanElements.hkDrainageJunctions} onCheckedChange={() => handleUrbanElementToggle('hkDrainageJunctions')} />
                                  <Label htmlFor="hkDrainageJunctions" className="text-xs cursor-pointer font-normal" title="SWMM [JUNCTIONS] section / 检查井 (119,572 manholes, HK_Drainage_Junctions shapefile)">Drainage Junctions</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkDrainageOutfalls" checked={urbanElements.hkDrainageOutfalls} onCheckedChange={() => handleUrbanElementToggle('hkDrainageOutfalls')} />
                                  <Label htmlFor="hkDrainageOutfalls" className="text-xs cursor-pointer font-normal" title="SWMM [OUTFALLS] section / 排放口 (869 discharge points, HK_Drainage_Outfalls shapefile)">Drainage Outfalls</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="hkStorageTanks" checked={urbanElements.hkStorageTanks} onCheckedChange={() => handleUrbanElementToggle('hkStorageTanks')} />
                                  <Label htmlFor="hkStorageTanks" className="text-xs cursor-pointer font-normal" title="Storage tanks / 蓄水池 (HK_Storage_Tanks shapefile)">Storage Tanks</Label>
                                </div>
                              </>
                            )}
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

                      {/* Flood Category - Regional Historical Flood Events */}
                      {selectedDisasterCategory === 'flood' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-bold text-blue-900 mb-2">
                              🌊 {regionalCapabilities.name} Historical Flood Simulation
                            </p>
                            <p className="text-[11px] text-blue-700 mb-3">
                              {regionalCapabilities.data.historicalFlood
                                ? `${activeHistoricalTCLayers.length + activeHistoricalRainLayers.length} flood depth maps`
                                : 'Historical flood catalog pending'}
                              {currentRegion === 'mo'
                                ? `: ${activeHistoricalTCLayers.length} TC-induced + ${activeHistoricalRainLayers.length} Rain-induced events`
                                : currentRegion === 'hk'
                                  ? ' from the Hong Kong historical rainfall catalog'
                                  : ''}
                            </p>

                            {/* ── TC-induced Flood (MO + HK) ── */}
                            {(currentRegion === 'mo' || currentRegion === 'hk') && (() => {
                              // MO 用本地 HIST_TC_LAYERS + selectedHistTCLayer;HK 用 BFF 返回的 hkHistoricalLayers + selectedHkHistTCLayer
                              const isHk = currentRegion === 'hk';
                              const tcSelected = isHk ? selectedHkHistTCLayer : selectedHistTCLayer;
                              const setTcSelected = isHk ? setSelectedHkHistTCLayer : setSelectedHistTCLayer;
                              const tcVisKey: 'hkHistTC' | 'macauHistTC' = isHk ? 'hkHistTC' : 'macauHistTC';
                              const tcLayers = activeHistoricalTCLayers;
                              const tcYearKey = isHk ? 'year' : 'year';
                              // HK layer shape { year: number | null }, MO { year: string } → 都按 string 比较
                              const yearLayers = tcLayers.filter(l => String(l.year).match(/^\d{4}$/));
                              const namedLayers = isHk ? [] : tcLayers.filter(l => !l.layer.match(/_\d{4}_\d+$/));
                              return (
                                <div className="mb-4">
                                  <Label className="text-xs font-semibold mb-1.5 block text-gray-700">
                                    🌀 {isHk ? 'Historical Typhoon Compound Flood' : 'TC-Induced Flood'} ({tcLayers.length} events)
                                  </Label>
                                  <Select
                                    value={tcSelected}
                                    onValueChange={(value) => {
                                      setTcSelected(value);
                                      setVisibleLayers(prev => ({ ...prev, [tcVisKey]: value !== 'none' }));
                                    }}
                                  >
                                    <SelectTrigger className="w-full h-8 text-xs bg-white border-blue-200">
                                      <SelectValue placeholder="Choose a TC flood event..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999] max-h-[400px]">
                                      <SelectItem value="none" className="text-xs text-gray-500">
                                        -- No Event Selected --
                                      </SelectItem>
                                      {namedLayers.length > 0 && (
                                        <>
                                          <div className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-50 uppercase tracking-wider border-t border-red-100">
                                            🌀 Named Storms
                                          </div>
                                          {namedLayers.map(l => (
                                            <SelectItem key={l.layer} value={l.layer} className="text-xs">
                                              🌀 {l.display}
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                      {(() => {
                                        const years = [...new Set(yearLayers.map(l => String(l[tcYearKey])))].sort();
                                        return years.map(year => (
                                          <React.Fragment key={year}>
                                            <div className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 uppercase tracking-wider border-t border-blue-100">
                                              📅 {year} ({yearLayers.filter(l => String(l[tcYearKey]) === year).length} events)
                                            </div>
                                            {yearLayers.filter(l => String(l[tcYearKey]) === year).map(l => (
                                              <SelectItem key={l.layer} value={l.layer} className="text-xs">
                                                🌊 {l.display}
                                              </SelectItem>
                                            ))}
                                          </React.Fragment>
                                        ));
                                      })()}
                                    </SelectContent>
                                  </Select>
                                  {tcSelected !== 'none' && (
                                    <div className="mt-1.5 p-2 bg-white rounded border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-blue-800">
                                          🌊 {tcLayers.find(l => l.layer === tcSelected)?.display}
                                        </span>
                                        <Checkbox
                                          checked={visibleLayers[tcVisKey] || false}
                                          onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [tcVisKey]: !!checked }))}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* ── Rain-induced Flood ── */}
                            <div className="mb-2">
                              <Label className="text-xs font-semibold mb-1.5 block text-gray-700">
                                🌧️ {currentRegion === 'hk' ? 'Historical Rainfall Flood' : 'Rain-Induced Flood'} ({activeHistoricalRainLayers.length} events)
                              </Label>
                              <Select
                                value={selectedHistRainLayer}
                                onValueChange={(value) => {
                                  const layerKey = currentRegion === 'hk' ? 'hkHistEvent' : 'macauHistRain';
                                  setSelectedHistRainLayer(value);
                                  setVisibleLayers(prev => ({ ...prev, [layerKey]: value !== 'none' }));
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
                                    // HK layer.year 是 number;MO HIST_RAIN_LAYERS.year 是 string — 统一转 string 再 sort/filter
                                    const years = [...new Set(activeHistoricalRainLayers.map(l => String(l.year)))].sort();
                                    return years.map(year => (
                                      <React.Fragment key={year}>
                                        <div className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 uppercase tracking-wider border-t border-sky-100">
                                          📅 {year}
                                        </div>
                                        {activeHistoricalRainLayers.filter(l => String(l.year) === year).map(l => (
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
                                      🌧️ {activeHistoricalRainLayers.find(l => l.layer === selectedHistRainLayer)?.display}
                                    </span>
                                    <Checkbox
                                      checked={visibleLayers[currentRegion === 'hk' ? 'hkHistEvent' : 'macauHistRain'] || false}
                                      onCheckedChange={(checked) => {
                                        const layerKey = currentRegion === 'hk' ? 'hkHistEvent' : 'macauHistRain';
                                        setVisibleLayers(prev => ({ ...prev, [layerKey]: !!checked }));
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {currentRegion === 'hk' && isFetchingHkHistoricalLayers && (
                              <p className="text-[10px] text-blue-600">Loading Hong Kong historical catalog...</p>
                            )}

                            <p className="text-[10px] text-gray-500 mt-2">
                              {currentRegion === 'mo'
                                ? '💡 可同时选择一个TC事件和一个Rain事件叠加显示在地图上'
                                : 'Select one historical event to display its simulated maximum flood depth.'}
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
          
          {/* ========== Portfolio Exposure Overlay ========== */}
          {/* 临时隐藏:产品还没想清楚 Portfolio Exposure Overlay 怎么用,先全地区隐藏入口。
              - 隐藏整个 Card 块(用 {false && ...} 包住,代码保留便于以后恢复)
              - state / useEffect / Leaflet 渲染分支全部保留不动(运行时不会被触发)
              - 恢复方法:把 `{false && (` 改成 `{`、对应 `)}` 改成 `}` 即可 */}
          {false && (
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
          )}

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
                          ) : location.status === 'ready' ? (
                            <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                              Ready
                            </div>
                          ) : null}
                        </div>
                      </div>
                      
                      {location.status === 'success' && location.riskScores && (
                        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Flood susceptibility:</span>
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
                          <div className="col-span-2 border-t border-gray-200 pt-2">
                            <span className="text-gray-600">Historical simulated inundations:</span>
                            <span className="ml-1 font-semibold text-teal-700">
                              {location.riskScores.flood.historicalFlood?.available
                                ? `${location.riskScores.flood.historicalFlood.inundationCount} / ${location.riskScores.flood.historicalFlood.queriedEvents}`
                                : 'Not available'}
                            </span>
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
                attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                zIndex={1}
                maxZoom={19}
              />
            )}
            {baseMap === 'esri-imagery' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                zIndex={1}
                maxZoom={19}
              />
            )}
            {baseMap === 'esri-gray' && (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                zIndex={1}
                maxZoom={16}
              />
            )}
            {baseMap === 'osm' && (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                zIndex={1}
                maxZoom={19}
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
                    styles={['macauNonTyphoonScenario', 'macauTyphoonScenario', 'hkDesignScenario', 'hkCompoundScenario', 'hkHistEvent', 'hkHistTC'].includes(key) ? 'flood-depth-blue-satellite' : ''}
                    format="image/png"
                    transparent={true}
                    version="1.1.0"
                    opacity={1}
                  />
                );
              }
              return null;
            })}
            
            {/* Geospatial Data Hub Layers */}
                        {urbanElements.boundary && (
              <WMSTileLayer
                key="boundary"
                url={GEOSERVER_LULC_URL}
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
                url={GEOSERVER_LULC_URL}
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
            {urbanElements.populationDensity && (
              <WMSTileLayer
                key="populationDensity"
                url={GEOSERVER_LULC_URL}
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
                url={GEOSERVER_LULC_URL}
                layers="ITF:LandCover_ProbaV_2019"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            */}

            {/* === Macau CDROM_C 14 个原始土地利用图层 === native CRS = ESRI:102159, WMS 自动 reproject 到目标 SRS, 仅 MO 模式显示 */}
            {currentRegion === 'mo' && (
              <>
            {urbanElements.moInBoundary && (
              <WMSTileLayer key="moInBoundary" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_boundary_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.55}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInCenterline && (
              <WMSTileLayer key="moInCenterline" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_centerline_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.5}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInDoorNo && (
              <WMSTileLayer key="moInDoorNo" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_doorNo_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInLote && (
              <WMSTileLayer key="moInLote" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_lote_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.32}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInMonte && (
              <WMSTileLayer key="moInMonte" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_monte_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.38}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPlace && (
              <WMSTileLayer key="moInPlace" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_place_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.55}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPonte && (
              <WMSTileLayer key="moInPonte" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_ponte_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.55}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPredio && (
              <WMSTileLayer key="moInPredio" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_predio_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.42}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInRua && (
              <WMSTileLayer key="moInRua" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_rua_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.5}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInTerra && (
              <WMSTileLayer key="moInTerra" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_terra_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.3}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInTower && (
              <WMSTileLayer key="moInTower" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_tower_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.55}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInVerde && (
              <WMSTileLayer key="moInVerde" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_verde_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.4}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInLake && (
              <WMSTileLayer key="moInLake" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_lake_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.5}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInBldgClass && (
              <WMSTileLayer key="moInBldgClass" url={GEOSERVER_LULC_URL}
                layers="natcat_platform:MO_building_classification_project_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.45}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPipeLink && (
              // 走 BFF(?geoserver=lulc 转发到 LULC server 并加 ACAO 头),
              // html2canvas 截屏 PDF Page 2.5 时能正确捕获彩色管线样式。
              <WMSTileLayer key="moInPipeLink" url={`${WMS_BFF_URL}?geoserver=lulc`}
                layers="natcat_platform:MO_pipe_link_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.55}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPipeManhole && (
              <WMSTileLayer key="moInPipeManhole" url={`${WMS_BFF_URL}?geoserver=lulc`}
                layers="natcat_platform:MO_pipe_manhole_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.moInPipeOutlet && (
              <WMSTileLayer key="moInPipeOutlet" url={`${WMS_BFF_URL}?geoserver=lulc`}
                layers="natcat_platform:MO_pipe_outlet_WGS84" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
              </>)}
            {/* Hong Kong Drainage Network / Buildings / Roads
                GeoServer 没开 CORS,浏览器在 10.253.22.15:3004 上 fetch 8080/wms
                会因 preflight 403 + 缺 ACAO 被拒 → WMSTileLayer 拿不到 tile。
                走同源 BFF /api/geoserver/getfeatureinfo 绕过 CORS(BFF 服务端 fetch
                GeoServer 无 CORS,再把 PNG 透传回前端,已支持 binary)。
                仅 HK 模式渲染 — 历史原因这段代码被误放在 currentRegion === 'mo' 块内,
                导致 HK 勾选 checkbox 后 WMS layer 永远没渲染。 */}
            {currentRegion === 'hk' && (
              <>
            {urbanElements.hkDrainageConduits && (
              <WMSTileLayer key="hkDrainageConduits" url={WMS_BFF_URL}
                layers="natcat_platform:conduits" format="image/png" transparent={true} version="1.1.0" opacity={0.6}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkDrainageJunctions && (
              <WMSTileLayer key="hkDrainageJunctions" url={WMS_BFF_URL}
                layers="natcat_platform:junctions" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkDrainageOutfalls && (
              <WMSTileLayer key="hkDrainageOutfalls" url={WMS_BFF_URL}
                layers="natcat_platform:outfalls" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkStorageTanks && (
              <WMSTileLayer key="hkStorageTanks" url={WMS_BFF_URL}
                layers="natcat_platform:storage_tanks" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkBuilding && (
              <WMSTileLayer key="hkBuilding" url={WMS_BFF_URL}
                layers="natcat_platform:building" format="image/png" transparent={true} version="1.1.0" opacity={0.4}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadCenterline && (
              <WMSTileLayer key="hkRoadCenterline" url={WMS_BFF_URL}
                layers="natcat_platform:CENTERLINE" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadIntersection && (
              <WMSTileLayer key="hkRoadIntersection" url={WMS_BFF_URL}
                layers="natcat_platform:INTERSECTION" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadSpeedLimit && (
              <WMSTileLayer key="hkRoadSpeedLimit" url={WMS_BFF_URL}
                layers="natcat_platform:SPEED_LIMIT" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadTurn && (
              <WMSTileLayer key="hkRoadTurn" url={WMS_BFF_URL}
                layers="natcat_platform:TURN" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadPedestrianZone && (
              <WMSTileLayer key="hkRoadPedestrianZone" url={WMS_BFF_URL}
                layers="natcat_platform:PEDESTRIAN_ZONE" format="image/png" transparent={true} version="1.1.0" opacity={0.7}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadRoundabout && (
              <WMSTileLayer key="hkRoadRoundabout" url={WMS_BFF_URL}
                layers="natcat_platform:ROUNDABOUT" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadBusOnlyLane && (
              <WMSTileLayer key="hkRoadBusOnlyLane" url={WMS_BFF_URL}
                layers="natcat_platform:BUS_ONLY_LANE" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadProhibition && (
              <WMSTileLayer key="hkRoadProhibition" url={WMS_BFF_URL}
                layers="natcat_platform:PROHIBITION" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadVehicleRestriction && (
              <WMSTileLayer key="hkRoadVehicleRestriction" url={WMS_BFF_URL}
                layers="natcat_platform:VEHICLE_RESTRICTION" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadPermit && (
              <WMSTileLayer key="hkRoadPermit" url={WMS_BFF_URL}
                layers="natcat_platform:PERMIT" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadOnStreetPark && (
              <WMSTileLayer key="hkRoadOnStreetPark" url={WMS_BFF_URL}
                layers="natcat_platform:ONSTREETPARK" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadNsr && (
              <WMSTileLayer key="hkRoadNsr" url={WMS_BFF_URL}
                layers="natcat_platform:NSR" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadRunInOut && (
              <WMSTileLayer key="hkRoadRunInOut" url={WMS_BFF_URL}
                layers="natcat_platform:RUN_IN_OUT" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
            {urbanElements.hkRoadTrafficFeatures && (
              <WMSTileLayer key="hkRoadTrafficFeatures" url={WMS_BFF_URL}
                layers="natcat_platform:TRAFFIC_FEATURES" format="image/png" transparent={true} version="1.1.0" opacity={0.85}
                params={{ _: Date.now() }} />
            )}
              </>)}
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

            {/* Hong Kong Advertising underlying TIF coverages (natcat_platform workspace) */}
            {urbanElements.hkDem && (
              <WMSTileLayer
                key="hkDem"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="natcat_platform:HK_DEM_5m"
                styles="dem_hk"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] HK DEM (5m) layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] HK DEM (5m) layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] HK DEM (5m) tile error:', error)
                }}
              />
            )}
            {urbanElements.hkLulc && (
              <WMSTileLayer
                key="hkLulc"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="natcat_platform:HK_LULC_DynamicWorld"
                styles="lulc_dw_hk"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                params={{
                  mask: 'natcat_platform:Hong_Kong_18_Districts',
                }}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] HK LULC (DynamicWorld) layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] HK LULC (DynamicWorld) layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] HK LULC (DynamicWorld) tile error:', error)
                }}
              />
            )}
            {urbanElements.hkSoil && (
              <WMSTileLayer
                key="hkSoil"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="natcat_platform:HK_SOIL_OpenLandMap"
                styles="soil_olm_hk"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
                params={{
                  mask: 'natcat_platform:Hong_Kong_18_Districts',
                }}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] HK Soil (OpenLandMap) layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] HK Soil (OpenLandMap) layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] HK Soil (OpenLandMap) tile error:', error)
                }}
              />
            )}
            {/* Macau DEM (5m, clipped to Macau district boundary) */}
            {urbanElements.moDem && (
              <WMSTileLayer
                key="moDem"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="natcat_platform:MO_DEM_TIF_clipped"
                styles="dem_macau"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.75}
                eventHandlers={{
                  loading: () => console.log('🔄 [WMS LOADING] MO DEM (5m) layer is loading...'),
                  load: () => console.log('✅ [WMS LOADED] MO DEM (5m) layer loaded successfully'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] MO DEM (5m) tile error:', error)
                }}
              />
            )}

            
            {/* Macau District Boundary (7 parishes + Cotai) */}
            {urbanElements.moDistrictBoundary && (
              <WMSTileLayer
                key="moDistrictBoundary"
                url={GEOSERVER_GEOSPATIAL_URL}
                layers="natcat_platform:MO_DistrictBoundary_WGS84"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.6}
                eventHandlers={{
                  load: () => console.log('✅ [WMS LOADED] MO District Boundary'),
                  tileerror: (error: any) => console.error('❌ [WMS ERROR] MO District Boundary:', error)
                }}
              />
            )}
            
            {/* Location Marker (shown after query) */}
            {markerPosition && (
              <Marker position={toMapCRS(markerPosition[0], markerPosition[1])} icon={createRiskLocationIcon()}>
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
                          Inundation susceptibility: <span className={`font-bold ${
                            riskScores.overall.level === 'Extreme' ? 'text-red-600' :
                            riskScores.overall.level === 'High' ? 'text-orange-600' :
                            riskScores.overall.level === 'Medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>{riskScores.overall.level}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Screening index: {riskScores.overall.score}/10
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
                  areaRequestIdRef.current += 1;
                  setAreaRiskData(null);
                  setDrawnShape(null);
                  setIsCalculatingArea(false);
                  setAreaCalculationProgress({ current: 0, total: 0 });
                }}
                enabled={drawMode}
              />
            )}

            {/* Terrain Profile: drawn line + endpoint markers */}
            {profilePoints.length >= 2 && (() => {
              const linePositions = profilePoints.map((p) => [p.lat, p.lng] as [number, number]);
              return (
                <>
                  {/* 1) 可见剖面线(虚线,纯装饰,interactive:false 不抢鼠标) */}
                  <Polyline
                    positions={linePositions}
                    pathOptions={{ color: '#10B981', weight: 4, opacity: 0.9, dashArray: '8 4', interactive: false }}
                  />
                  {/* 2) 不可见加宽 hit target:weight=24 + opacity≈0,
                         实际捕捉鼠标事件,这样不会因为 4px 虚线 + 间隙导致鼠标"找不准" */}
                  <Polyline
                    positions={linePositions}
                    pathOptions={{ color: '#10B981', weight: 24, opacity: 0, interactive: true }}
                    eventHandlers={{
                      mousemove: (e: any) => {
                        const { lat, lng } = e.latlng;
                        const idx = findNearestSampleIndex(lat, lng);
                        if (idx === null) return;
                        // rAF 节流:同一帧内多次 mousemove 只触发一次 setState,避免闪烁
                        profileHoverPendingRef.current = idx;
                        if (profileHoverRafRef.current !== null) return;
                        profileHoverRafRef.current = requestAnimationFrame(() => {
                          profileHoverRafRef.current = null;
                          if (profileHoverPendingRef.current !== null) {
                            setProfileHoverIndex(profileHoverPendingRef.current);
                          }
                        });
                      },
                      mouseout: () => {
                        if (profileHoverRafRef.current !== null) {
                          cancelAnimationFrame(profileHoverRafRef.current);
                          profileHoverRafRef.current = null;
                        }
                        profileHoverPendingRef.current = null;
                        setProfileHoverIndex(null);
                      },
                    }}
                  />
                  {/* 端点标记 */}
                  <CircleMarker
                    center={[profilePoints[0].lat, profilePoints[0].lng]}
                    radius={7}
                    pathOptions={{ color: '#065F46', fillColor: '#10B981', fillOpacity: 1, weight: 2, interactive: false }}
                  />
                  <CircleMarker
                    center={[profilePoints[1].lat, profilePoints[1].lng]}
                    radius={7}
                    pathOptions={{ color: '#065F46', fillColor: '#F59E0B', fillOpacity: 1, weight: 2, interactive: false }}
                  />
                  {/* 3) 联动高亮(命令式):三个 marker 一次性挂载,���过 ref + Leaflet API 更新坐标/可见性,
                         避免 React 每次 hover 重建 CircleMarker/Polyline */}
                  <Polyline
                    ref={(r) => { highlightTickRef.current = r; }}
                    positions={[[0, 0], [0, 0]]}
                    pathOptions={{ color: 'transparent', opacity: 0, interactive: false }}
                  />
                  <CircleMarker
                    ref={(r) => { highlightHaloRef.current = r; }}
                    center={[0, 0]}
                    radius={11}
                    pathOptions={{ color: 'transparent', fillColor: 'transparent', fillOpacity: 0, opacity: 0, interactive: false }}
                  />
                  <CircleMarker
                    ref={(r) => { highlightDotRef.current = r; }}
                    center={[0, 0]}
                    radius={6}
                    pathOptions={{ color: 'transparent', fillColor: 'transparent', fillOpacity: 0, opacity: 0, interactive: false }}
                  />
                </>
              );
            })()}
            {profilePoints.length === 1 && profileMode && (
              <CircleMarker
                center={[profilePoints[0].lat, profilePoints[0].lng]}
                radius={7}
                pathOptions={{ color: '#065F46', fillColor: '#10B981', fillOpacity: 1, weight: 2 }}
              />
            )}

            {/* Historical Event Markers */}
            {showHistoricalEvents && filteredHistoricalEvents.map(event => {
              if (!event.geometry?.coordinates) return null;
              
              const position: [number, number] = toMapCRS(
                event.geometry.coordinates[1],
                event.geometry.coordinates[0]
              );

              return (
                <Marker
                  key={event.id}
                  position={position}
                  icon={createRiskEventIcon(event.type)}
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
              
              const position: [number, number] = toMapCRS(
                event.geometry.coordinates[1],
                event.geometry.coordinates[0]
              );

              return (
                <Marker
                  key={event.id}
                  position={position}
                  icon={createRiskEventIcon(event.type)}
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

              const position: [number, number] = toMapCRS(location.latitude, location.longitude);
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
              const rainfallAssessment = location.riskScores?.flood?.driverAssessments?.find((assessment: any) =>
                assessment.results?.some((result: any) => result.scenarioFamily === 'non-typhoon-rainfall')
              );
              const compoundAssessment = location.riskScores?.flood?.driverAssessments?.find((assessment: any) =>
                assessment.results?.some((result: any) => result.scenarioFamily === 'typhoon-compound')
              );
              const metric = (value: number | null | undefined, digits = 2, suffix = '') =>
                value === null || value === undefined || !Number.isFinite(value)
                  ? 'No data'
                  : `${value.toFixed(digits)}${suffix}`;

              return (
                <Marker
                  key={location.id || idx}
                  position={position}
                  icon={createRiskTIVMarker(tivValue, filteredMaxTIV, isTopN)}
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
                            <span className="text-xs font-semibold text-gray-700">Flood susceptibility:</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRiskColor(location.riskScores.overall.level)}`}>
                              {location.riskScores.overall.level}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Screening index: {location.riskScores.overall.score}/10
                          </p>
                          <div className="mt-2 space-y-2 text-xs">
                            <div className="rounded border border-blue-200 bg-blue-50 p-2">
                              <p className="font-semibold text-blue-900">Non-typhoon rainfall</p>
                              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                                <span className="text-gray-600">Onset:</span>
                                <b>{rainfallAssessment?.minimumInundationReturnPeriod ? `R${rainfallAssessment.minimumInundationReturnPeriod}` : 'Not reached'}</b>
                                <span className="text-gray-600">Annual probability:</span>
                                <b>{metric(rainfallAssessment?.annualMetrics?.annualFloodProbability === null
                                  || rainfallAssessment?.annualMetrics?.annualFloodProbability === undefined
                                  ? null
                                  : rainfallAssessment.annualMetrics.annualFloodProbability * 100, 2, '%')}</b>
                                <span className="text-gray-600">R50 depth:</span>
                                <b>{metric(getReturnPeriodDepth(rainfallAssessment, 50), 2, ' m')}</b>
                                <span className="text-gray-600">R1000 depth:</span>
                                <b>{metric(getReturnPeriodDepth(rainfallAssessment, 1000), 2, ' m')}</b>
                              </div>
                            </div>
                            <div className="rounded border border-violet-200 bg-violet-50 p-2">
                              <p className="font-semibold text-violet-900">Typhoon compound</p>
                              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                                <span className="text-gray-600">Onset:</span>
                                <b>{compoundAssessment?.minimumInundationReturnPeriod ? `R${compoundAssessment.minimumInundationReturnPeriod}` : 'Not reached'}</b>
                                <span className="text-gray-600">Annual probability:</span>
                                <b>{metric(compoundAssessment?.annualMetrics?.annualFloodProbability === null
                                  || compoundAssessment?.annualMetrics?.annualFloodProbability === undefined
                                  ? null
                                  : compoundAssessment.annualMetrics.annualFloodProbability * 100, 2, '%')}</b>
                                <span className="text-gray-600">R50 depth:</span>
                                <b>{metric(getReturnPeriodDepth(compoundAssessment, 50), 2, ' m')}</b>
                                <span className="text-gray-600">R1000 depth:</span>
                                <b>{metric(getReturnPeriodDepth(compoundAssessment, 1000), 2, ' m')}</b>
                              </div>
                            </div>
                            <div className="rounded border border-teal-200 bg-teal-50 p-2">
                              <p className="font-semibold text-teal-900">Historical simulated inundation</p>
                              <p className="mt-1 text-[11px] text-gray-700">
                                {location.riskScores.flood.historicalFlood?.available
                                  ? `${location.riskScores.flood.historicalFlood.inundationCount} events (TC ${location.riskScores.flood.historicalFlood.typhoonCount} · Rain ${location.riskScores.flood.historicalFlood.rainfallCount})`
                                  : location.riskScores.flood.historicalFlood?.reason || 'Not available'}
                              </p>
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

            {/* Terrain Profile Floating Chart - top-right of map, below the toggle button */}
            {profileChartOpen && profileSamples && profileSamples.length > 0 && (() => {
              const valid = profileSamples.filter((s) => s.elevation !== null) as Array<{ distance: number; elevation: number }>;
              const stats = valid.length
                ? {
                    minElev: Math.min(...valid.map((s) => s.elevation)),
                    maxElev: Math.max(...valid.map((s) => s.elevation)),
                    totalDist: profileSamples[profileSamples.length - 1].distance,
                  }
                : null;
              const totalDrop = stats ? stats.maxElev - stats.minElev : 0;
              const avgSlope = stats && stats.totalDist > 0 ? (totalDrop / stats.totalDist) * 100 : 0;
              return (
                <div className="absolute top-20 right-4 z-[1000] w-[460px] bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-200 pointer-events-auto">
                  <div className="flex items-center justify-between p-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📏</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Terrain Profile (DEM 5m)</div>
                        <div className="text-[11px] text-gray-500">
                          {profileLoading ? 'Sampling elevation...' : `${valid.length}/${profileSamples.length} samples`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setProfileChartOpen(false);
                        setProfilePoints([]);
                        setProfileSamples(null);
                        setProfileHoverIndex(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title="Close"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-3 pt-2 pb-3 relative">
                    {profileLoading && (
                      <div className="absolute right-12 top-12">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent inline-block" />
                      </div>
                    )}
                    {/* 联动高程徽章:鼠标在剖面线或剖面图上 hover 时显示当前位置 */}
                    {profileHoverIndex !== null && profileSamples[profileHoverIndex] && (
                      <div className="absolute left-3 top-2 z-10 bg-amber-100 border border-amber-300 rounded px-2 py-1 text-[11px] font-mono text-amber-800 shadow-sm pointer-events-none">
                        📍 {(profileSamples[profileHoverIndex].distance / 1000).toFixed(3)} km ·{' '}
                        <span className="font-semibold">
                          {profileSamples[profileHoverIndex].elevation !== null
                            ? `${profileSamples[profileHoverIndex].elevation!.toFixed(1)} m`
                            : '— m'}
                        </span>
                      </div>
                    )}
                    <TerrainProfileChart
                      data={profileSamples}
                      hoverIndex={profileHoverIndex}
                      onHoverIndexChange={setProfileHoverIndex}
                    />
                  </div>
                  {stats && !profileLoading && (
                    <div className="grid grid-cols-4 gap-2 px-3 pb-3 text-center">
                      <div className="bg-emerald-50 rounded p-1.5">
                        <div className="text-[10px] text-gray-500">Max Elev</div>
                        <div className="text-sm font-semibold text-emerald-700">{stats.maxElev.toFixed(0)} m</div>
                      </div>
                      <div className="bg-amber-50 rounded p-1.5">
                        <div className="text-[10px] text-gray-500">Min Elev</div>
                        <div className="text-sm font-semibold text-amber-700">{stats.minElev.toFixed(0)} m</div>
                      </div>
                      <div className="bg-blue-50 rounded p-1.5">
                        <div className="text-[10px] text-gray-500">Δ Drop</div>
                        <div className="text-sm font-semibold text-blue-700">{totalDrop.toFixed(0)} m</div>
                      </div>
                      <div className="bg-purple-50 rounded p-1.5">
                        <div className="text-[10px] text-gray-500">Avg Slope</div>
                        <div className="text-sm font-semibold text-purple-700">{avgSlope.toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                  <div className="px-3 pb-3 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                        Start
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
                        End
                      </span>
                      <span className="ml-auto">Total: {(stats?.totalDist ?? 0).toFixed(0)} m</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* HK Layer Legends - Floating bottom-right of map */}
            {(urbanElements.hkDem || urbanElements.moDem || urbanElements.hkLulc || urbanElements.hkSoil) && (
              <div className="absolute bottom-4 right-4 z-[1000] max-w-[280px] space-y-2 pointer-events-none">
                {urbanElements.hkDem && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-lg border border-gray-200 p-3 pointer-events-auto">
                    <div className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">🏔️</span><span>Digital Elevation Model - Elevation</span>
                    </div>
                    {/* 港澳统一使用 viridis 配色(浅黄→绿→青→紫),HK 高程范围 0–1000 m */}
                    <div className="h-3 rounded-sm" style={{
                      background: 'linear-gradient(to right, #FDE725 0%, #B5DE2B 12%, #6DCD59 25%, #1F9E89 38%, #26828E 50%, #3E4989 75%, #482878 88%, #440154 100%)'
                    }} />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>0m</span>
                      <span>500m</span>
                      <span>1000m+</span>
                    </div>
                  </div>
                )}
                {urbanElements.moDem && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-lg border border-gray-200 p-3 pointer-events-auto">
                    <div className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">🏔️</span><span>Digital Elevation Model - Elevation</span>
                    </div>
                    <div className="h-3 rounded-sm" style={{
                      background: 'linear-gradient(to right, #FDE725 0%, #B5DE2B 12%, #6DCD59 25%, #1F9E89 38%, #26828E 50%, #3E4989 75%, #482878 88%, #440154 100%)'
                    }} />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>0m</span>
                      <span>50m</span>
                      <span>100m</span>
                      <span>200m+</span>
                    </div>
                  </div>
                )}
                {urbanElements.hkLulc && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-lg border border-gray-200 p-3 pointer-events-auto">
                    <div className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="text-sm">🌳</span><span>LULC (DynamicWorld)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#1F6F3B' }} />
                        <span className="text-xs text-gray-700">Trees</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#D7301F' }} />
                        <span className="text-xs text-gray-700">Built</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#7CC76A' }} />
                        <span className="text-xs text-gray-700">Grass</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#BFB69C' }} />
                        <span className="text-xs text-gray-700">Bare</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#91A0C0' }} />
                        <span className="text-xs text-gray-700">Flooded</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#F2D545' }} />
                        <span className="text-xs text-gray-700">Crops</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#C5B280' }} />
                        <span className="text-xs text-gray-700">Shrub</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: '#FFFFFF' }} />
                        <span className="text-xs text-gray-700">Snow</span>
                      </div>
                    </div>
                  </div>
                )}

                {urbanElements.hkSoil && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-lg border border-gray-200 p-3 pointer-events-auto">
                    <div className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm">🌱</span><span>Soil (OpenLandMap)</span>
                    </div>
                    <div className="h-3 rounded-sm" style={{
                      background: 'linear-gradient(to right, #FFFFE5 0%, #FFF7BC 11%, #FEE391 22%, #FEC44F 33%, #FE9929 44%, #EC7014 56%, #CC4C02 67%, #993404 78%, #662506 100%)'
                    }} />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>sandy</span>
                      <span>loam</span>
                      <span>clay</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </MapContainer>

          {/* Floating Terrain Profile Button - left-middle of map area */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 z-[1001] flex flex-col items-center gap-2">
            {/* Toggle button */}
            <button
              onClick={toggleProfileMode}
              className={`group relative w-14 h-14 rounded-lg overflow-hidden shadow-lg border-2 border-white hover:scale-105 transition-all flex flex-col items-center justify-center text-white ${
                profileMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 border-emerald-200'
                  : 'bg-gray-700 hover:bg-gray-800'
              }`}
              title={profileMode ? 'Click 2 points on the map...' : 'Terrain Profile (DEM 5m cross-section)'}
            >
              <span className="text-lg leading-none">📏</span>
              <span className="text-xs font-bold mt-0.5 leading-none">Profile</span>
              {profileLoading && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
              )}
            </button>

            {/* Instructions overlay while in profile mode */}
            {profileMode && (
              <div className="w-64 bg-emerald-50/95 backdrop-blur-sm border border-emerald-300 rounded-lg shadow-lg p-2.5 text-xs text-emerald-800 pointer-events-auto">
                <div className="flex items-start gap-2">
                  <span className="text-base">📏</span>
                  <div className="flex-1">
                    <p className="font-semibold">Draw a line on the map</p>
                    <ul className="mt-1 ml-3 list-disc space-y-0.5 text-emerald-700">
                      <li>Click the 1st point</li>
                      <li>Click the 2nd point</li>
                      <li>Chart appears below</li>
                    </ul>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProfileMode();
                    }}
                    className="p-0.5 hover:bg-emerald-200 rounded"
                    title="Cancel"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Clear mini button (shown only when a profile is drawn) */}
            {(profilePoints.length > 0 || profileSamples) && !profileMode && (
              <button
                onClick={() => {
                  setProfilePoints([]);
                  setProfileSamples(null);
                  setProfileChartOpen(false);
                }}
                className="w-14 h-7 bg-white/95 backdrop-blur-sm border border-gray-200 rounded shadow text-[10px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                title="Clear profile"
              >
                Clear
              </button>
            )}
          </div>

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
                      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/13'
                      : baseMap === 'esri-imagery'
                      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/13'
                      : baseMap === 'esri-gray'
                      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/13'
                      : baseMap === 'osm'
                      ? 'https://tile.openstreetmap.org/4/13/6.png'
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
                <div className="grid grid-cols-6 gap-2">
                  {/* Satellite (Esri World Imagery) */}
                  <button
                    onClick={() => { setBaseMap('esri-imagery'); setShowMapSettings(false); }}
                    className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                      baseMap === 'esri-imagery'
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                      baseMap === 'esri-imagery' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                    }`}>
                      <img
                        src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/13"
                        alt="Satellite"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${baseMap === 'esri-imagery' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Satellite
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

                  {/* Topo (Esri World Topo Map) */}
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
                        src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/13"
                        alt="Topo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${baseMap === 'esri' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Topo
                    </span>
                  </button>

                  {/* Light / OSM */}
                  <button
                    onClick={() => { setBaseMap('osm'); setShowMapSettings(false); }}
                    className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                      baseMap === 'osm'
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                      baseMap === 'osm' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                    }`}>
                      <img
                        src="https://tile.openstreetmap.org/4/13/6.png"
                        alt="Light"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${baseMap === 'osm' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Light
                    </span>
                  </button>

                  {/* Gray (Esri World Gray Canvas) */}
                  <button
                    onClick={() => { setBaseMap('esri-gray'); setShowMapSettings(false); }}
                    className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                      baseMap === 'esri-gray'
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-[72px] h-[54px] rounded-md overflow-hidden shadow-sm border-2 transition-all ${
                      baseMap === 'esri-gray' ? 'border-blue-500' : 'border-gray-200 group-hover:border-gray-400'
                    }`}>
                      <img
                        src="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/13"
                        alt="Gray"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${baseMap === 'esri-gray' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Gray
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
                  <RiskVulnerabilityCurveChart
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
            <div
              className="absolute top-4 right-4 z-[1000] w-[420px] max-h-[calc(100vh-8rem)] overflow-y-auto"
            >
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
                      </div>
                    )}
                  </div>
                  
                  {/* Asset Info */}
                  <div className="mb-4">
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent mb-2">📍 Asset Information</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Elevation</span>
                        <span className="font-semibold">{assetInfo.elevation === null ? 'Not queried' : `${assetInfo.elevation}m`}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Distance to Coast</span>
                        <span className="font-semibold">{assetInfo.distanceToCoast === null ? 'Not queried' : `${assetInfo.distanceToCoast}km`}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 block">Population Density</span>
                        <span className="font-semibold">{assetInfo.populationDensity === null ? 'Not queried' : `${assetInfo.populationDensity}/km²`}</span>
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
                  
                  {/* Individual Hazards */}
                  <div className="space-y-2">
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent mb-2">🌊 Flood Return-Period Results</p>

                    {riskScores.flood.driverAssessments?.length === 2 ? (
                      <div className="grid grid-cols-1 gap-2">
                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                          <div>
                            <p className="text-xs font-semibold text-blue-800">🌧️ NON-Typhoon Rainfall</p>
                            <p className="mt-1 text-sm font-bold text-blue-900">{getInundationSusceptibility(riskScores.flood.rainfallOnsetReturnPeriod).label}</p>
                            <p className="text-[10px] text-gray-600">{getInundationSusceptibility(riskScores.flood.rainfallOnsetReturnPeriod).detail}</p>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded bg-white p-2 border border-blue-100">
                              <p className="text-gray-500">R50 · 2% AEP</p>
                              <p className="font-bold text-gray-800">{riskScores.flood.rainfallR50Depth === null ? 'No data' : `${riskScores.flood.rainfallR50Depth.toFixed(2)} m`}</p>
                              <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 ${getDepthSeverity(riskScores.flood.rainfallR50Depth).color}`}>{getDepthSeverity(riskScores.flood.rainfallR50Depth).label}</span>
                            </div>
                            <div className="rounded bg-white p-2 border border-blue-100">
                              <p className="text-gray-500">R1000 · 0.1% AEP</p>
                              <p className="font-bold text-gray-800">{riskScores.flood.rainfallR1000Depth === null ? 'No data' : `${riskScores.flood.rainfallR1000Depth.toFixed(2)} m`}</p>
                              <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 ${getDepthSeverity(riskScores.flood.rainfallR1000Depth).color}`}>{getDepthSeverity(riskScores.flood.rainfallR1000Depth).label}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-gray-500">Frequency susceptibility and scenario depth severity are reported separately.</p>
                        </div>

                        <div className="p-3 bg-violet-50 rounded border border-violet-200">
                          <div>
                            <p className="text-xs font-semibold text-violet-800">🌊 Typhoon Compound</p>
                            <p className="mt-1 text-sm font-bold text-violet-900">{getInundationSusceptibility(riskScores.flood.compoundProxyOnsetReturnPeriod).label}</p>
                            <p className="text-[10px] text-gray-600">{getInundationSusceptibility(riskScores.flood.compoundProxyOnsetReturnPeriod).detail}</p>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded bg-white p-2 border border-violet-100">
                              <p className="text-gray-500">R50 · 2% AEP</p>
                              <p className="font-bold text-gray-800">{riskScores.flood.compoundR50Depth === null ? 'No data' : `${riskScores.flood.compoundR50Depth.toFixed(2)} m`}</p>
                              <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 ${getDepthSeverity(riskScores.flood.compoundR50Depth).color}`}>{getDepthSeverity(riskScores.flood.compoundR50Depth).label}</span>
                            </div>
                            <div className="rounded bg-white p-2 border border-violet-100">
                              <p className="text-gray-500">R1000 · 0.1% AEP</p>
                              <p className="font-bold text-gray-800">{riskScores.flood.compoundR1000Depth === null ? 'No data' : `${riskScores.flood.compoundR1000Depth.toFixed(2)} m`}</p>
                              <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 ${getDepthSeverity(riskScores.flood.compoundR1000Depth).color}`}>{getDepthSeverity(riskScores.flood.compoundR1000Depth).label}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-gray-500">Frequency susceptibility and scenario depth severity are reported separately.</p>
                        </div>

                        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-600">
                          <strong>Total flood hazard is not yet scored.</strong> A defensible combined return-period curve requires merging both 10,000-year event families by annual maxima or exceedance rates; the two family scores are not added, averaged or maximized.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-800">🌊 Selected Flood Raster Query</p>
                            <p className="text-xs text-gray-600">Selected scenario: {riskScores.flood.returnPeriod}</p>
                            <p className="text-xs text-gray-600">Maximum queried depth: {riskScores.flood.depth === null ? 'No data' : `${riskScores.flood.depth.toFixed(2)} m`}</p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Threshold: {riskScores.flood.thresholdMeters} m · {riskScores.flood.samplingRadiusMeters > 0
                                ? `Maximum valid depth within ${riskScores.flood.samplingRadiusMeters} m`
                                : 'Point sample'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getDepthSeverity(riskScores.flood.depth).color}`}>
                              {getDepthSeverity(riskScores.flood.depth).label}
                            </span>
                            <p className="text-[10px] text-gray-500 mt-1">Scenario severity</p>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded overflow-hidden">
                          <div className="grid grid-cols-[70px_1fr_70px] gap-2 px-2 py-1.5 bg-gray-100 text-[10px] font-semibold text-gray-600">
                            <span>Return period</span>
                            <span>Raster layer</span>
                            <span className="text-right">Depth</span>
                          </div>
                          {riskScores.flood.layerResults.map((result: any) => (
                            <div key={result.layer} className="grid grid-cols-[70px_1fr_70px] gap-2 px-2 py-1.5 border-t border-gray-100 text-[10px]">
                              <span>R{result.returnPeriod}</span>
                              <span className="truncate" title={result.layer}>{result.layer}</span>
                              <span className={`text-right font-medium ${result.inundated ? 'text-blue-700' : 'text-gray-500'}`}>
                                {result.depth === null ? result.status : `${result.depth.toFixed(2)} m max`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {riskScores.flood.driverAssessments?.length === 2 && (
                      <>
                        <MacauDriverAssessmentCards assessments={riskScores.flood.driverAssessments} />
                        <p className="text-[10px] text-gray-500">
                          Hover over either response curve to view the sampled water depth at each return period.
                        </p>
                      </>
                    )}

                    <div className="rounded border border-teal-200 bg-teal-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-teal-900">Historical simulated inundation</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                            GeoServer historical event depth maps · depth &gt; {riskScores.flood.historicalFlood?.thresholdMeters ?? 0.15} m within {riskScores.flood.historicalFlood?.samplingRadiusMeters ?? 100} m
                          </p>
                        </div>
                        <strong className="text-xl text-teal-800">
                          {riskScores.flood.historicalFlood?.available
                            ? riskScores.flood.historicalFlood.inundationCount
                            : 'N/A'}
                        </strong>
                      </div>
                      {riskScores.flood.historicalFlood?.available ? (
                        <>
                          <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden border border-teal-200 bg-teal-200 text-center text-[10px]">
                            <div className="bg-white p-2"><span className="block text-slate-500">TC-induced</span><b>{riskScores.flood.historicalFlood.typhoonCount}</b></div>
                            <div className="bg-white p-2"><span className="block text-slate-500">Rain-induced</span><b>{riskScores.flood.historicalFlood.rainfallCount}</b></div>
                            <div className="bg-white p-2"><span className="block text-slate-500">Catalog queried</span><b>{riskScores.flood.historicalFlood.queriedEvents}/{riskScores.flood.historicalFlood.totalEvents}</b></div>
                          </div>
                          {riskScores.flood.historicalFlood.events.length > 0 && (
                            <details className="mt-2 border border-teal-200 bg-white">
                              <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-semibold text-teal-800">View inundating events and depths</summary>
                              <div className="max-h-44 overflow-y-auto border-t border-teal-100">
                                {riskScores.flood.historicalFlood.events.map((event: any) => (
                                  <div key={event.layer} className="grid grid-cols-[1fr_55px] gap-2 border-t border-slate-100 px-2 py-1 text-[10px] first:border-t-0">
                                    <span>{event.display}</span>
                                    <b className="text-right">{event.depth?.toFixed(2)} m</b>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          <p className="mt-2 text-[9px] leading-relaxed text-slate-500">Counted from historical-event simulation rasters in the Data Hub; this is not a count of independently verified observed loss records.</p>
                        </>
                      ) : (
                        <p className="mt-2 text-[10px] text-slate-600">{riskScores.flood.historicalFlood?.reason || 'Historical flood layers are unavailable for this location.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-800">How to read this result / 结果解读</p>
                    {riskScores.flood.assessmentMode === 'selected-scenario' ? (
                      <div className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-600">
                        <p>• 当前为单情景查询：结果只表示所选设计情景在该坐标的模拟水深。</p>
                        <p>• 建筑位置被栅格掩膜时，系统读取周围{riskScores.flood.samplingRadiusMeters}米圆形邻域，并取有效街道像元最大水深。</p>
                        <p>• 水深超过 {riskScores.flood.thresholdMeters}m 即标记为受淹；这不是该地点的年发生概率或完整风险评分。</p>
                        <p>• 当前T图层仅作为台风复合洪水的临时代理，不是万年联合事件集统计出的最终复合重现期图。</p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-600">
                        <p>• 每个情景读取建筑坐标周围{riskScores.flood.samplingRadiusMeters}米圆形邻域，以有效栅格像元的最大街道水深作为建筑外部积水代理值。</p>
                        <p>• 受淹频率敏感性由首次超过 {riskScores.flood.thresholdMeters}m 的重现期表示。越早在R2、R5等高频情景受淹，说明地点越容易频繁受淹，但不表示R2情景比R1000情景更严重。</p>
                        <p>• 情景严重度由该重现期对应的水深表示。R1000是0.1% AEP的罕见极端情景，通常比R50的2% AEP情景水深更大、范围更广。</p>
                        <p>• 水深严重度分级：低于0.15m为未达阈值，0.15–0.5m为浅水，0.5–1m为中等水深，1–2m为深水，2–3m为很深，超过3m为极深。</p>
                        <p>• 目前不计算两类事件的总体洪水分数。总体重现期曲线应通过合并两个万年事件集的年度最大值或超越率获得，不能直接把两个分数相加、平均或取最大值。</p>
                        <p>• 台风复合洪水：目前用11张独立T图层临时代替，仅用于设计平台界面；最终结果应由万年联合事件集统计出的11张复合重现期图替换。</p>
                        <p>• 本结果是危险度筛查，不含建筑脆弱性、保险条件及损失计算，不能直接解释为保费或预期损失。</p>
                      </div>
                    )}
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
                      <CardTitle className="text-sm text-gray-800">Area Flood Hazard Assessment</CardTitle>
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
                  <AreaFloodHazardResults result={areaRiskData} />
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Legend (conditional) */}
          {(Object.values(visibleLayers).some(v => v) ||
            urbanElements.moInPipeLink || urbanElements.moInPipeManhole || urbanElements.moInPipeOutlet ||
            urbanElements.hkDrainageConduits || urbanElements.hkDrainageJunctions ||
            urbanElements.hkDrainageOutfalls || urbanElements.hkStorageTanks) && (
            <MapLegend visibleLayers={visibleLayers} urbanElements={urbanElements} currentRegion={currentRegion} />
          )}
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
