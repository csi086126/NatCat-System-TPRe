"use client"

// 1. Import necessary React Hooks and components
import { useState, useRef, useEffect } from 'react';
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
  Target, Search, FileText, Download, Upload, ChevronDown, ChevronUp, Layers, Settings, Globe, Shield, Eye, EyeOff
} from 'lucide-react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegion } from '@/contexts/RegionContext';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

// 2. Dynamically import Leaflet map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });

// 3. WMS Layer Configuration (Composite + Detailed layers)
const wmsLayersConfig = {
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
};

// 4. Historical Events Mock Data
const mockHistoricalEvents = [
  {
    id: 'T-2023-1',
    name: 'Typhoon Mangkhut',
    type: 'Typhoon',
    date: '2023-09-16',
    year: 2023,
    maxWindSpeed: '285 km/h',
    totalRainfall: '350 mm',
    estimatedLoss: '$6.27 Billion',
    affectedPopulation: '3.6 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.1694, 22.3193]
    }
  },
  {
    id: 'R-2024-2',
    name: 'HK Black Rainstorm',
    type: 'Rainstorm',
    date: '2024-06-08',
    year: 2024,
    maxWindSpeed: 'N/A',
    totalRainfall: '600 mm in 24h',
    estimatedLoss: '$150 Million',
    affectedPopulation: '7.4 Million',
    geometry: {
      type: 'Point',
      coordinates: [114.1095, 22.3964]
    }
  },
  {
    id: 'F-2022-3',
    name: 'Macau Coastal Flood',
    type: 'Flood',
    date: '2022-08-23',
    year: 2022,
    maxWindSpeed: 'N/A',
    totalRainfall: '280 mm',
    estimatedLoss: '$85 Million',
    affectedPopulation: '320,000',
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  },
];

// Stochastic Events Mock Data (10,000-year synthetic catalog)
const mockStochasticEvents = [
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

// 6. Legend Component
const Legend = () => {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-white p-4 rounded-lg shadow-lg border border-gray-300">
      <h3 className="text-base font-semibold mb-3">Risk Level</h3>
      <div className="flex flex-col space-y-1.5">
        {legendData.map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-3">
            <div 
              className="w-6 h-5 border border-gray-300 rounded" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. Create custom marker icon
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
  const mapRef = useRef(null);
  const { regionConfig, currentRegion } = useRegion();
  
  // 地图中心和缩放状态 - 默认使用 worldwide 视图
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]); // worldwide center
  const [mapZoom, setMapZoom] = useState(3); // worldwide zoom level
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
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
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Asset Info (auto-queried from location)
  const [assetInfo, setAssetInfo] = useState<any>(null);
  
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
    setUrbanElements(prev => ({
      ...prev,
      [elementKey]: !prev[elementKey]
    }));
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
  const [historicalEvents, setHistoricalEvents] = useState(mockHistoricalEvents);
  const [filteredHistoricalEvents, setFilteredHistoricalEvents] = useState(mockHistoricalEvents);
  const [showHistoricalEvents, setShowHistoricalEvents] = useState(false);
  
  // Event filter states
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [eventYearFrom, setEventYearFrom] = useState('');
  const [eventYearTo, setEventYearTo] = useState('');
  
  // Selected event for details
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
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
  const [stochasticEvents] = useState(mockStochasticEvents);
  const [filteredStochasticEvents, setFilteredStochasticEvents] = useState(mockStochasticEvents);
  const [showStochasticEvents, setShowStochasticEvents] = useState(false);
  
  // Stochastic event filter states
  const [stochasticEventType, setStochasticEventType] = useState('all');
  const [stochasticYearFrom, setStochasticYearFrom] = useState('');
  const [stochasticYearTo, setStochasticYearTo] = useState('');
  
  // Selected stochastic event for details
  const [selectedStochasticEvent, setSelectedStochasticEvent] = useState<any>(null);
  
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
  
  // Query results visibility (collapsible details)
  const [resultsExpanded, setResultsExpanded] = useState(true);
  
  // ========== Batch Portfolio Query States ==========
  
  // Batch query mode toggle
  const [batchQueryMode, setBatchQueryMode] = useState(false);
  
  // Portfolio locations data
  const [portfolioLocations, setPortfolioLocations] = useState<any[]>([]);
  
  // Batch query progress
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // Selected portfolio item for details view
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any>(null);
  
  // Visible WMS layers
  const [visibleLayers, setVisibleLayers] = useState({
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
  });
  
  // ========== Helper Functions ==========
  
  // Detect if query contains Chinese characters
  const containsChinese = (text: string) => {
    return /[\u4e00-\u9fa5]/.test(text);
  };
  
  // Try Amap (高德地图) Geocoding - Best for Chinese addresses
  const geocodeWithAmap = async (query: string) => {
    try {
      // Amap Web Service API Key (you need to register at https://lbs.amap.com/)
      // For demo, using a test key - replace with your own key in production
      const AMAP_KEY = 'YOUR_AMAP_KEY_HERE'; // TODO: Replace with your Amap API key
      
      const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(query)}`;
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
      
      // 优先使用Nominatim（免费，无需API密钥，支持全球地址）
      console.log('� Trying Nominatim (OpenStreetMap) geocoding...');
      try {
        const result = await geocodeWithNominatim(query);
        console.log('✅ Geocoding success with Nominatim:', result);
        return result;
      } catch (nominatimError) {
        console.warn('Nominatim geocoding failed, trying alternatives...', nominatimError);
      }
      
      // 如果Nominatim失败，且是中文地址，尝试国内服务（需要API密钥）
      if (isChinese) {
        console.log('🇨🇳 Detected Chinese address, trying China-specific services...');
        
        // Try Amap (高德) - 需要API密钥
        try {
          const result = await geocodeWithAmap(query);
          return result;
        } catch (error) {
          console.warn('Amap geocoding failed');
        }
        
        // Try Baidu - 需要API密钥
        try {
          const result = await geocodeWithBaidu(query);
          return result;
        } catch (error) {
          console.warn('Baidu geocoding failed');
        }
      }
      
      // 所有服务都失败
      throw new Error('❌ All geocoding services failed. Please try:\n1. Using English address\n2. Adding more specific details (city, district)\n3. Using coordinates (format: lat,lon)');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };
  
  // Query Asset Info from location
  const queryAssetInfo = async (lat: number, lon: number) => {
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
  
  // Main query handler
  const handleSearchAndCalculate = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter an address or coordinates (format: lat,lon)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Step 1: Geocode address
      const location = await geocodeAddress(searchQuery);
      
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
  
  // Handle portfolio file upload
  const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setBatchProgress({ current: 0, total: 0 });
    
    try {
      const text = await file.text();
      let locations: any[] = [];
      
      // Parse CSV or JSON
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find relevant columns (address, lat, lon, name, id)
        const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location'));
        const latIdx = headers.findIndex(h => h.includes('lat') || h === 'latitude');
        const lonIdx = headers.findIndex(h => h.includes('lon') || h === 'longitude');
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('asset'));
        const idIdx = headers.findIndex(h => h.includes('id'));
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < headers.length) continue;
          
          locations.push({
            id: idIdx >= 0 ? cols[idIdx] : `LOC-${i}`,
            name: nameIdx >= 0 ? cols[nameIdx] : `Location ${i}`,
            address: addressIdx >= 0 ? cols[addressIdx] : '',
            latitude: latIdx >= 0 ? parseFloat(cols[latIdx]) : null,
            longitude: lonIdx >= 0 ? parseFloat(cols[lonIdx]) : null,
          });
        }
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        const data = JSON.parse(text);
        locations = Array.isArray(data) ? data : data.locations || [];
        
        // Normalize structure
        locations = locations.map((loc, idx) => ({
          id: loc.id || loc.ID || `LOC-${idx + 1}`,
          name: loc.name || loc.Name || loc.assetName || `Location ${idx + 1}`,
          address: loc.address || loc.Address || '',
          latitude: loc.latitude || loc.lat || loc.Latitude || null,
          longitude: loc.longitude || loc.lon || loc.lng || loc.Longitude || null,
        }));
      } else {
        throw new Error('Unsupported file format. Please upload CSV or JSON file.');
      }
      
      if (locations.length === 0) {
        throw new Error('No valid locations found in file.');
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
              {/* Input */}
              <div className="mb-3">
                <Label htmlFor="search-address" className="text-sm font-semibold">Address or Coordinates</Label>
                <Input
                  id="search-address"
                  type="text"
                  placeholder="e.g. 中国太平金融中心香港 / China Taiping Tower / 22.28868, 114.19135"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchAndCalculate()}
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
              
              {/* Search Button with Export */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleSearchAndCalculate}
                  disabled={isLoading || batchQueryMode}
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Search Location & Calculate Risk'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!assetInfo || !riskScores}
                  onClick={() => {
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
              
              {/* Batch Upload Section */}
              <div className="mt-3">
                <Separator className="my-3" />
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-700">Batch Portfolio Query</Label>
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
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handlePortfolioUpload}
                    disabled={isLoading}
                    className="hidden"
                    id="portfolio-upload"
                  />
                  <label htmlFor="portfolio-upload" className="flex-1">
                    <Button
                      disabled={isLoading}
                      className="w-full bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      asChild
                    >
                      <span className="flex items-center justify-center">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Portfolio & Calculate Risk
                      </span>
                    </Button>
                  </label>
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
                    <div className="space-y-1 pl-2">
                      {['flood500yr', 'flood200yr', 'flood100yr', 'flood50yr', 'flood20yr'].map(layer => (
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
                      <SelectContent>
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
                      {['typhoonTD', 'typhoonTS', 'typhoonSTS', 'typhoonTY', 'typhoonSTY', 'typhoonSuperTY', 'typhoonTracks'].map(layer => (
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
          
          {/* ========== Asset Vulnerability Curves ========== */}
          <div className="mb-6">
            <button
              onClick={() => setAssetAttributesOpen(!assetAttributesOpen)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg border-2 border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-700" />
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
          
          <Separator className="my-6" />
          
          {/* ========== Geospatial Data Hub ========== */}
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
                
                {/* Geospatial Layers Section */}
                <div>
                  <Label className="text-xs font-bold text-gray-700 mb-2 block">📍 Geospatial Layers</Label>
                  
                  {/* Layer Category Selection Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveLayerCategory(activeLayerCategory === 'geography' ? null : 'geography')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeLayerCategory === 'geography'
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 text-green-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🗺️ Geography
                    </button>
                    <button
                      onClick={() => setActiveLayerCategory(activeLayerCategory === 'infrastructure' ? null : 'infrastructure')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeLayerCategory === 'infrastructure'
                          ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-400 text-blue-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🏗️ Infrastructure
                    </button>
                    <button
                      onClick={() => setActiveLayerCategory(activeLayerCategory === 'socioeconomic' ? null : 'socioeconomic')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeLayerCategory === 'socioeconomic'
                          ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 text-amber-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      👥 Socioeconomic
                    </button>
                    <button
                      onClick={() => setActiveLayerCategory(activeLayerCategory === 'weather' ? null : 'weather')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeLayerCategory === 'weather'
                          ? 'bg-gradient-to-r from-sky-100 to-indigo-100 border-2 border-sky-400 text-sky-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🌤️ Weather
                    </button>
                  </div>
                  
                  {/* Layer Content - Only show when a category is selected */}
                  {activeLayerCategory && (
                    <div className="mt-3">
                      {/* Basic Geography */}
                      {activeLayerCategory === 'geography' && (
                        <div>
                          <div className="p-2 bg-green-50 rounded border border-green-200 mb-3">
                            <p className="text-xs text-green-700">
                              Fundamental geographic features and terrain information
                            </p>
                          </div>
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
                      
                      {/* Infrastructure */}
                      {activeLayerCategory === 'infrastructure' && (
                        <div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-300 mb-3">
                            <p className="text-xs text-gray-700">
                              Built environment including buildings, roads, and drainage systems
                            </p>
                          </div>
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
                      
                      {/* Socioeconomic */}
                      {activeLayerCategory === 'socioeconomic' && (
                        <div>
                          <div className="p-2 bg-amber-50 rounded border border-amber-200 mb-3">
                            <p className="text-xs text-amber-700">
                              Population, economic activity, and social indicators
                            </p>
                          </div>
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
                      
                      {/* Weather and Climate */}
                      {activeLayerCategory === 'weather' && (
                        <div>
                          <div className="p-2 bg-sky-50 rounded border border-sky-200 mb-3">
                            <p className="text-xs text-sky-700">
                              Climate patterns, rainfall, temperature, and atmospheric data
                            </p>
                          </div>
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
                  <Label className="text-xs font-bold text-gray-700 mb-2 block">⚡ Disaster Events</Label>
                  
                  {/* Dataset Selection Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveEventDataset(activeEventDataset === 'historical' ? null : 'historical')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeEventDataset === 'historical'
                          ? 'bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 text-orange-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📅 Historical Events
                    </button>
                    <button
                      onClick={() => setActiveEventDataset(activeEventDataset === 'stochastic' ? null : 'stochastic')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeEventDataset === 'stochastic'
                          ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-400 text-purple-900'
                          : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🔮 Stochastic Events
                    </button>
                  </div>
                  
                  {/* Event Content - Only show when a dataset is selected */}
                  {activeEventDataset && (
                    <div className="mt-3">
                      {/* Historical Events Content */}
                      {activeEventDataset === 'historical' && (
                        <div className="space-y-3">
                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <p className="text-xs text-orange-700">
                          Real historical disaster events with documented impacts
                        </p>
                      </div>
                      
                      {/* Event Type Filter */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">Event Type</Label>
                        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Typhoon">Typhoon</SelectItem>
                            <SelectItem value="Rainstorm">Rainstorm</SelectItem>
                            <SelectItem value="Flood">Flood</SelectItem>
                            <SelectItem value="Storm Surge">Storm Surge</SelectItem>
                            <SelectItem value="Landslide">Landslide</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Year Range Filter */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">Year Range</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            placeholder="From"
                            value={eventYearFrom}
                            onChange={(e) => setEventYearFrom(e.target.value)}
                            className="flex-1 text-xs"
                          />
                          <span className="text-xs text-gray-500">-</span>
                          <Input
                            type="number"
                            placeholder="To"
                            value={eventYearTo}
                            onChange={(e) => setEventYearTo(e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      
                      {/* Show/Hide Events Toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Display on Map</Label>
                        <Checkbox
                          checked={showHistoricalEvents}
                          onCheckedChange={(checked) => setShowHistoricalEvents(!!checked)}
                        />
                      </div>
                      
                      {/* Event List */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">
                          Events Found: {filteredHistoricalEvents.length}
                        </Label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {filteredHistoricalEvents.map(event => (
                            <div
                              key={event.id}
                              className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                                selectedEvent?.id === event.id
                                  ? 'bg-orange-100 border-orange-400'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                setSelectedEvent(event);
                                if (mapRef.current && event.geometry?.coordinates) {
                                  mapRef.current.flyTo(
                                    [event.geometry.coordinates[1], event.geometry.coordinates[0]],
                                    12,
                                    { duration: 1.5 }
                                  );
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-900">{event.name}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {event.type} • {event.date}
                                  </p>
                                </div>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-200 text-orange-800 font-semibold">
                                  {event.type}
                                </span>
                              </div>
                              
                              {selectedEvent?.id === event.id && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-300 space-y-0.5">
                                  <p className="text-xs"><span className="font-semibold">Max Wind:</span> {event.maxWindSpeed}</p>
                                  <p className="text-xs"><span className="font-semibold">Rainfall:</span> {event.totalRainfall}</p>
                                  <p className="text-xs"><span className="font-semibold">Loss:</span> {event.estimatedLoss}</p>
                                  <p className="text-xs"><span className="font-semibold">Population:</span> {event.affectedPopulation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {filteredHistoricalEvents.length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-xs text-gray-500">No events matching filters</p>
                          </div>
                        )}
                      </div>
                    </div>
                      )}
                  
                      {/* Stochastic Events Content */}
                      {activeEventDataset === 'stochastic' && (
                        <div className="space-y-3">
                      <div className="p-2 bg-purple-50 rounded border border-purple-200">
                        <p className="text-xs text-purple-700">
                          Synthetic disaster scenarios from 10,000-year probabilistic catalog
                        </p>
                      </div>
                      
                      {/* Event Type Filter */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">Event Type</Label>
                        <Select value={stochasticEventType} onValueChange={setStochasticEventType}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Typhoon">Typhoon</SelectItem>
                            <SelectItem value="Rainstorm">Rainstorm</SelectItem>
                            <SelectItem value="Flood">Flood</SelectItem>
                            <SelectItem value="Storm Surge">Storm Surge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Year Range Filter (Simulation Year) */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">Simulation Year Range</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            placeholder="From"
                            value={stochasticYearFrom}
                            onChange={(e) => setStochasticYearFrom(e.target.value)}
                            className="flex-1 text-xs"
                          />
                          <span className="text-xs text-gray-500">-</span>
                          <Input
                            type="number"
                            placeholder="To"
                            value={stochasticYearTo}
                            onChange={(e) => setStochasticYearTo(e.target.value)}
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      
                      {/* Show/Hide Events Toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Display on Map</Label>
                        <Checkbox
                          checked={showStochasticEvents}
                          onCheckedChange={(checked) => setShowStochasticEvents(!!checked)}
                        />
                      </div>
                      
                      {/* Event List */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block text-gray-700">
                          Events Found: {filteredStochasticEvents.length}
                        </Label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {filteredStochasticEvents.map(event => (
                            <div
                              key={event.id}
                              className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                                selectedStochasticEvent?.id === event.id
                                  ? 'bg-purple-100 border-purple-400'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                setSelectedStochasticEvent(event);
                                if (mapRef.current && event.geometry?.coordinates) {
                                  mapRef.current.flyTo(
                                    [event.geometry.coordinates[1], event.geometry.coordinates[0]],
                                    12,
                                    { duration: 1.5 }
                                  );
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-900">{event.name}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {event.type} • Year {event.year}
                                  </p>
                                </div>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-semibold">
                                  {event.type}
                                </span>
                              </div>
                              
                              {selectedStochasticEvent?.id === event.id && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-300 space-y-0.5">
                                  <p className="text-xs"><span className="font-semibold">Max Wind:</span> {event.maxWindSpeed}</p>
                                  <p className="text-xs"><span className="font-semibold">Rainfall:</span> {event.totalRainfall}</p>
                                  <p className="text-xs"><span className="font-semibold">Loss:</span> {event.estimatedLoss}</p>
                                  <p className="text-xs"><span className="font-semibold">Population:</span> {event.affectedPopulation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {filteredStochasticEvents.length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-xs text-gray-500">No events matching filters</p>
                          </div>
                        )}
                      </div>
                    </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* ========== Batch Portfolio Results List ========== */}
          {batchQueryMode && portfolioLocations.length > 0 && (
            <div className="mt-6">
              <Separator className="my-6" />
              <h3 className="text-lg font-bold text-gray-800 mb-3">Portfolio Locations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {portfolioLocations.map((location, idx) => (
                  <Card
                    key={location.id || idx}
                    className={`cursor-pointer transition-all ${
                      selectedPortfolioItem?.id === location.id
                        ? 'border-2 border-purple-500 bg-purple-50'
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
                          <p className="text-sm font-bold text-gray-900">{location.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{location.id}</p>
                          {location.address && (
                            <p className="text-xs text-gray-500 mt-1">{location.address}</p>
                          )}
                        </div>
                        {location.status === 'success' ? (
                          <div className={`text-xs px-2 py-1 rounded-full font-semibold ${getRiskColor(location.riskScores?.overall?.level || 'Low')}`}>
                            {location.riskScores?.overall?.level || 'N/A'}
                          </div>
                        ) : (
                          <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                            Error
                          </div>
                        )}
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
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right Map Area */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            ref={mapRef}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            
            {/* Composite WMS Layers (used for quick query) */}
            {Object.entries(visibleLayers).map(([key, visible]) => {
              if (visible && wmsLayersConfig[key]) {
                return (
                  <WMSTileLayer
                    key={key}
                    url="http://143.89.22.7:8090/geoserver/wms"
                    layers={wmsLayersConfig[key].layer}
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
                url="http://143.89.22.7:8090/geoserver/wms"
                layers="COP:Building"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.boundary && (
              <WMSTileLayer
                key="boundary"
                url="http://143.89.22.7:8090/geoserver/wms"
                layers="COP:taiping_boundary"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.annualRainfall && (
              <WMSTileLayer
                key="annualRainfall"
                url="http://143.89.22.7:8090/geoserver/wms"
                layers="COP:taiping_Annual_rainfall"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.drainageConduits && (
              <WMSTileLayer
                key="conduits"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:Conduits"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.drainageJunctions && (
              <WMSTileLayer
                key="junctions"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:Junctions"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.drainageOutfalls && (
              <WMSTileLayer
                key="outfalls"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:Outfalls"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.populationDensity && (
              <WMSTileLayer
                key="populationDensity"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:PopulationDensity_per_30_arcseconds"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.landCover && (
              <WMSTileLayer
                key="landCover"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:LandCover_ProbaV_2019"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
              />
            )}
            {urbanElements.serviceReservoirs && (
              <WMSTileLayer
                key="serviceReservoirs"
                url="http://143.89.23.123:8080/geoserver/wms"
                layers="ITF:Service_Reservoirs"
                format="image/png"
                transparent={true}
                version="1.1.0"
                opacity={0.7}
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
            {batchQueryMode && portfolioLocations.map((location, idx) => {
              if (!location.latitude || !location.longitude || location.status === 'error') return null;
              
              const position: [number, number] = [location.latitude, location.longitude];
              
              return (
                <Marker
                  key={location.id || idx}
                  position={position}
                  icon={createCustomIcon()}
                  eventHandlers={{
                    click: () => {
                      setSelectedPortfolioItem(location);
                    }
                  }}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="mb-2">
                        <p className="font-bold text-gray-900">{location.name}</p>
                        <p className="text-xs text-gray-600">{location.id}</p>
                        {location.address && (
                          <p className="text-xs text-gray-500 mt-1">{location.address}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Lat: {location.latitude.toFixed(5)}<br />
                        Lon: {location.longitude.toFixed(5)}
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

            {/* Coordinate Display */}
            <MapCoordinateDisplay />

          </MapContainer>
          
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
                      <p className="text-xs text-blue-600 mt-1">
                        Located via {(assetInfo as any).geocodingSource}
                      </p>
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
          
          {/* Legend (conditional) */}
          {Object.values(visibleLayers).some(v => v) && <Legend />}
        </div>
      </div>
    </div>
  );
}
