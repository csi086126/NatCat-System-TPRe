"use client"

// 1. Import necessary React Hooks and components
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut,
  Target, Search, FileText, Download, ChevronDown, ChevronUp, Layers, Settings, Globe
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
  flood500yr: { name: 'Flood depth (500-year return)', layer: 'COP:Flood_Depth _Return_Period_500yr' },
  flood200yr: { name: 'Flood depth (200-year return)', layer: 'COP:Flood_Depth _Return_Period_200yr' },
  flood100yr: { name: 'Flood depth (100-year return)', layer: 'COP:Flood_Depth _Return_Period_100yr' },
  flood50yr: { name: 'Flood depth (50-year return)', layer: 'COP:Flood_Depth _Return_Period_50yr' },
  flood20yr: { name: 'Flood depth (20-year return)', layer: 'COP:Flood_Depth _Return_Period_20yr' },
  
  // Flood layers without drainage (for comparison)
  floodNoDrainage500yr: { name: 'Flood depth without drainage (500-year return)', layer: 'COP:Flood_No_Drainage_500yr' },
  floodNoDrainage200yr: { name: 'Flood depth without drainage (200-year return)', layer: 'COP:Flood_No_Drainage_200yr' },
  floodNoDrainage100yr: { name: 'Flood depth without drainage (100-year return)', layer: 'COP:Flood_No_Drainage_100yr' },
  floodNoDrainage50yr: { name: 'Flood depth without drainage (50-year return)', layer: 'COP:Flood_No_Drainage_50yr' },
  floodNoDrainage20yr: { name: 'Flood depth without drainage (20-year return)', layer: 'COP:Flood_No_Drainage_20yr' },
  rainstorm500yr: { name: 'Rainstorm intensity (500-year return)', layer: 'COP:Rainstorm_Intensity_500yr' },
  rainstorm200yr: { name: 'Rainstorm intensity (200-year return)', layer: 'COP:Rainstorm_Intensity_200yr' },
  rainstorm100yr: { name: 'Rainstorm intensity (100-year return)', layer: 'COP:Rainstorm_Intensity_100yr' },
  rainstorm50yr: { name: 'Rainstorm intensity (50-year return)', layer: 'COP:Rainstorm_Intensity_50yr' },
  rainstorm20yr: { name: 'Rainstorm intensity (20-year return)', layer: 'COP:Rainstorm_Intensity_20yr' },
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

// 4. Legend Data
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

// 5. Header Component
const Header = ({ onLogout, activePage }: { onLogout: () => void; activePage?: string }) => {
  return (
    <header className="bg-white shadow-md z-[9000] relative">
      <div className="mx-auto px-4 py-2 flex justify-between items-center ml-2">
        <div className="flex items-center gap-4">
          <Image
            src="/taipinglogo.png"
            alt="China Taiping Logo"
            width={280}
            height={31}
          />
          {/* 地区选择器 - 最左侧 */}
          <div className="border-l border-gray-300 pl-4">
            <RegionSelector />
          </div>
        </div>
        <nav className="flex-grow flex justify-end items-center">
          <ul className="flex space-x-4">
            <li><Link href="/"><Button variant="ghost" className={`gap-2 ${activePage === 'home' ? 'text-blue-900 font-bold text-lg' : ''}`}><Home size={18} />Home</Button></Link></li>
            <li><Link href="/cityinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'cityinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><Globe size={18} />Geospatial Data Hub</Button></Link></li>
            <li className="ml-auto"><Link href="/disasterinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'disasterinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li className="ml-auto"><Link href="/asset"><Button variant="ghost" className={`gap-2 ${activePage === 'asset' ? 'text-blue-900 font-bold text-lg' : ''}`}><Building2 size={18} />Asset management</Button></Link></li>
            <li className="ml-auto"><Link href="/riskmap"><Button variant="ghost" className={`gap-2 ${activePage === 'riskmap' ? 'text-blue-900 font-bold text-lg' : ''}`}><Map size={18} />Risk map</Button></Link></li>
            <li className="ml-auto"><Link href="/model"><Button variant="ghost" className={`gap-2 ${activePage === 'model' ? 'text-blue-900 font-bold text-lg' : ''}`}><Activity size={18} />Catastrophe model</Button></Link></li>
            <li className="ml-auto"><Link href="/fuzhu"><Button variant="ghost" className={`gap-2 ${activePage === 'fuzhu' ? 'text-blue-900 font-bold text-lg' : ''}`}><Puzzle size={18} />Accessibility</Button></Link></li>
            <li><Link href="/usercenter"><Button variant="ghost" className={`gap-2 ${activePage === 'usercenter' ? 'text-blue-900 font-bold text-lg' : ''}`}><User size={18} />User</Button></Link></li>
          </ul>
          <Button variant="outline" onClick={onLogout} className="ml-4 gap-2">
            <LogOut size={18} />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}

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

// 8. Main Component
export default function RiskMapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const { regionConfig, currentRegion } = useRegion();
  
  // 地图中心和缩放状态
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]);
  const [mapZoom, setMapZoom] = useState(11);
  
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
  
  // Advanced Options toggle
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  
  // Vulnerability override (optional, for advanced users)
  const [vulnerabilityOverride, setVulnerabilityOverride] = useState('auto');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Map marker position (for location query result)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  
  // Query results visibility (collapsible details)
  const [resultsExpanded, setResultsExpanded] = useState(true);
  
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
      
      if (isChinese) {
        // Chinese address: Try Amap first, then Baidu, finally Nominatim
        console.log('🇨🇳 Detected Chinese address, using China-optimized geocoding...');
        
        // Try Amap (高德) first
        try {
          console.log('Trying Amap (高德地图)...');
          const result = await geocodeWithAmap(query);
          console.log('✅ Success with Amap:', result);
          return result;
        } catch (error) {
          console.log('❌ Amap failed, trying Baidu...');
        }
        
        // Try Baidu second
        try {
          console.log('Trying Baidu Maps (百度地图)...');
          const result = await geocodeWithBaidu(query);
          console.log('✅ Success with Baidu:', result);
          return result;
        } catch (error) {
          console.log('❌ Baidu failed, trying Nominatim...');
        }
        
        // Try Nominatim last (often less accurate for Chinese addresses)
        try {
          console.log('Trying Nominatim (OpenStreetMap)...');
          const result = await geocodeWithNominatim(query);
          console.log('⚠️ Using Nominatim (may be less accurate for Chinese addresses):', result);
          return result;
        } catch (error) {
          throw new Error('❌ All geocoding services failed. Please try:\n1. Using English address\n2. Adding more specific details (city, district)\n3. Using coordinates (format: lat,lon)');
        }
      } else {
        // International address: Try Nominatim first (best for non-Chinese)
        console.log('🌍 Detected international address, using Nominatim...');
        
        try {
          const result = await geocodeWithNominatim(query);
          console.log('✅ Success with Nominatim:', result);
          return result;
        } catch (error) {
          throw new Error('Location not found. Please try:\n1. More specific address\n2. Different language\n3. Coordinates (format: lat,lon)');
        }
      }
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
      const scores = calculateRiskScores(hazards, asset, vulnerabilityOverride);
      setRiskScores(scores);
      
      console.log('Query complete:', { asset, hazards, scores });
    } catch (error: any) {
      console.error('Query failed:', error);
      alert(error.message || 'Failed to query location. Please check your input and try again.');
      
      // Clear previous results on error
      setAssetInfo(null);
      setRiskScores(null);
      setMarkerPosition(null);
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
  
  // ========== Render ==========
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header onLogout={handleLogout} activePage="riskmap" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-white shadow-lg overflow-y-auto p-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Location Risk Intelligence</h2>
          
          {/* ========== Main Query Module ========== */}
          <Card className="mb-4 border-2 border-purple-300 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Location Risk Query
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Enter an address or coordinates to assess multi-peril risk
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Input */}
              <div className="mb-3">
                <Label htmlFor="search-address" className="text-sm font-semibold">Address or Coordinates</Label>
                <Input
                  id="search-address"
                  type="text"
                  placeholder="e.g. 上海法国学校 / China Taiping Tower / 22.28868, 114.19135"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchAndCalculate()}
                  disabled={isLoading}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  🇨🇳 Supports Chinese addresses (高德/百度地图) | 🌍 International addresses (OSM) | 📍 Coordinates (lat,lon)
                </p>
              </div>
              
              {/* Search Button */}
              <Button 
                onClick={handleSearchAndCalculate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search & Calculate Risk'}
              </Button>
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Querying location data...</span>
                  </div>
                </div>
              )}
              
              {/* Query Results */}
              {assetInfo && riskScores && (
                <div className="mt-4">
                  <Separator className="my-3" />
                  
                  {/* Results Header with Collapse Button */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{assetInfo.address}</p>
                      <p className="text-xs text-gray-600">
                        Lat: {assetInfo.latitude.toFixed(5)}, Lon: {assetInfo.longitude.toFixed(5)}
                      </p>
                      {(assetInfo as any).geocodingSource && (
                        <p className="text-xs text-blue-600 mt-1">
                          📍 Located via {(assetInfo as any).geocodingSource}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResultsExpanded(!resultsExpanded)}
                      className="ml-2 h-8 px-2"
                    >
                      {resultsExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          <span className="text-xs">Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          <span className="text-xs">Expand</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Collapsible Details */}
                  {resultsExpanded && (
                    <>
                      <Separator className="my-3" />
                      
                      {/* Asset Info */}
                      <div className="mb-3">
                        <p className="text-sm font-bold text-gray-800 mb-2">📍 Asset Info</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Elevation:</span>
                        <span className="ml-1 font-semibold">{assetInfo.elevation}m</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Distance to Coast:</span>
                        <span className="ml-1 font-semibold">{assetInfo.distanceToCoast}km</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Population Density:</span>
                        <span className="ml-1 font-semibold">{assetInfo.populationDensity}/km²</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Building Density:</span>
                        <span className="ml-1 font-semibold">{assetInfo.buildingDensity}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Land Use:</span>
                        <span className="ml-1 font-semibold">{assetInfo.landUse}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  {/* Risk Scores */}
                  <div className="mb-3">
                    <p className="text-sm font-bold text-gray-800 mb-2">📊 Risk Scores</p>
                    
                    {/* Overall Score */}
                    <div className={`mb-3 p-3 rounded-lg border-2 ${getRiskColor(riskScores.overall.level)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold">Overall (Defended)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getRiskColor(riskScores.overall.level)}`}>
                          {riskScores.overall.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{riskScores.overall.score}</span>
                        <span className="text-xs text-gray-600">Risk Index: {riskScores.overall.riskIndex}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                    
                    {/* Individual Hazard Scores */}
                    <div className="space-y-2">
                      {/* Flood */}
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
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
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
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
                      <div className="flex items-center justify-between p-2 bg-indigo-50 rounded border border-indigo-200">
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
                      <div className="flex items-center justify-between p-2 bg-cyan-50 rounded border border-cyan-200">
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
                      <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
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
                  </div>
                  
                  <Separator className="my-3" />
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleDownloadReport} variant="default" className="flex-1" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download Report
                    </Button>
                    <Button onClick={handleExportData} variant="outline" className="flex-1" size="sm">
                      <FileText className="w-4 h-4 mr-1" />
                      Export Data
                    </Button>
                  </div>
                  </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Separator className="my-4" />
          
          {/* ========== Advanced Options ========== */}
          <div className="mb-4">
            <button
              onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 rounded-lg border-2 border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-bold text-gray-800">Advanced Options</span>
              </div>
              {advancedOptionsOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            {advancedOptionsOpen && (
              <div className="mt-3 p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">
                {/* Vulnerability Override */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Vulnerability Override</Label>
                  <Select value={vulnerabilityOverride} onValueChange={setVulnerabilityOverride}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vulnerability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (based on land use)</SelectItem>
                      <SelectItem value="low">Low (reinforced concrete)</SelectItem>
                      <SelectItem value="medium">Medium (standard construction)</SelectItem>
                      <SelectItem value="high">High (wood frame/old buildings)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600 mt-1">
                    Override automatic vulnerability determination. Use with caution.
                  </p>
                </div>
                
                <Separator />
                
                {/* Detailed Hazard Layers */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Detailed Hazard Layers
                  </Label>
                  <p className="text-xs text-gray-600 mb-3">
                    View individual return period maps. Risk calculation uses composite layers by default.
                  </p>
                  
                  {/* Flood Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">🌊 Flood (River/Coastal) - With Drainage System</p>
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
                  <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 mb-1">
                      🚫 Flood Without Drainage (Comparison Baseline)
                    </p>
                    <p className="text-xs text-amber-600 mb-2 italic">
                      Shows flood depth without underground drainage infrastructure. 
                      Compare with "With Drainage" layers above to see the effectiveness of HK/Macau drainage systems.
                    </p>
                    <div className="space-y-1 pl-2">
                      {['floodNoDrainage500yr', 'floodNoDrainage200yr', 'floodNoDrainage100yr', 'floodNoDrainage50yr', 'floodNoDrainage20yr'].map(layer => (
                        <div key={layer} className="flex items-center">
                          <Checkbox
                            id={layer}
                            checked={visibleLayers[layer]}
                            onCheckedChange={(checked) => setVisibleLayers(prev => ({ ...prev, [layer]: !!checked }))}
                          />
                          <Label htmlFor={layer} className="ml-2 text-xs cursor-pointer text-amber-800">
                            {wmsLayersConfig[layer].name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Rainstorm Layers */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Rainstorm / Flash Flood</p>
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
                
                <Separator />
                
                {/* Methodology Info */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-900 mb-2">ℹ️ Calculation Methodology</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><span className="font-semibold">Hazard Source:</span> WMS composite layers (max risk across return periods)</p>
                    <p><span className="font-semibold">Exposure:</span> Auto-queried from elevation, population, building density</p>
                    <p><span className="font-semibold">Vulnerability:</span> Auto-determined from land use, or user-overridden</p>
                    <p><span className="font-semibold">Risk Formula:</span> Risk = Hazard × Exposure × Vulnerability</p>
                  </div>
                </div>
              </div>
            )}
          </div>
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

            {/* Coordinate Display */}
            <MapCoordinateDisplay />

          </MapContainer>
          
          {/* Legend (conditional) */}
          {Object.values(visibleLayers).some(v => v) && <Legend />}
        </div>
      </div>
    </div>
  );
}
