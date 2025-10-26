"use client"

// 1. Import necessary React Hooks and components
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  MapPin,
  Download,
  Upload,
  Filter,
  Search
} from 'lucide-react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegion } from '@/contexts/RegionContext';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";


// 2. Dynamically import (Lazy Load) Leaflet map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });

// 3. TypeScript Interfaces for Treaty Data
interface Treaty {
  id: string;
  name: string;
  cedantId: string;
  cedantName: string;
  type: 'QS' | 'XL' | 'StopLoss' | 'CatXL' | 'Facultative';
  coverage: string[];
  regions: string[];
  treatyLimit: number;
  currentExposure: number;
  limitUtilization: number;
  premium: number;
  lossRatio: number;
  effectiveDate: string;
  expiryDate: string;
  status: 'Active' | 'Expiring' | 'Expired' | 'Pending';
  layer?: {
    limit: number;
    attachment: number;
    description: string;
  };
  coordinates?: [number, number];
}

// 4. Mock Treaty Data
const mockTreaties: Treaty[] = [
  {
    id: 'TP-HK-001',
    name: 'HK Property Cat XL 2024',
    cedantId: 'CED-001',
    cedantName: 'ABC Insurance Co. Ltd.',
    type: 'CatXL',
    coverage: ['Property', 'Typhoon', 'Flood'],
    regions: ['Hong Kong'],
    treatyLimit: 50000000,
    currentExposure: 42500000,
    limitUtilization: 85,
    premium: 2500000,
    lossRatio: 65,
    effectiveDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'Active',
    layer: {
      limit: 50000000,
      attachment: 10000000,
      description: '$50M xs $10M'
    },
    coordinates: [22.3193, 114.1694]
  },
  {
    id: 'TP-GBA-005',
    name: 'GBA Regional QS Treaty',
    cedantId: 'CED-002',
    cedantName: 'XYZ Reinsurance Group',
    type: 'QS',
    coverage: ['Property', 'Casualty'],
    regions: ['GBA', 'Hong Kong', 'Macau'],
    treatyLimit: 100000000,
    currentExposure: 65000000,
    limitUtilization: 65,
    premium: 5000000,
    lossRatio: 72,
    effectiveDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'Active',
    coordinates: [22.5431, 114.0579]
  },
  {
    id: 'TP-MO-012',
    name: 'Macau Property XL',
    cedantId: 'CED-003',
    cedantName: 'DEF Life Insurance',
    type: 'XL',
    coverage: ['Property'],
    regions: ['Macau'],
    treatyLimit: 20000000,
    currentExposure: 18500000,
    limitUtilization: 92,
    premium: 800000,
    lossRatio: 45,
    effectiveDate: '2024-01-01',
    expiryDate: '2025-01-01',
    status: 'Active',
    layer: {
      limit: 20000000,
      attachment: 5000000,
      description: '$20M xs $5M'
    },
    coordinates: [22.1987, 113.5439]
  },
  {
    id: 'TP-TH-032',
    name: 'Thailand Flood Cat XL',
    cedantId: 'CED-004',
    cedantName: 'Bangkok General Insurance',
    type: 'CatXL',
    coverage: ['Flood', 'Typhoon'],
    regions: ['Thailand'],
    treatyLimit: 30000000,
    currentExposure: 23400000,
    limitUtilization: 78,
    premium: 1200000,
    lossRatio: 88,
    effectiveDate: '2024-06-01',
    expiryDate: '2025-05-31',
    status: 'Active',
    layer: {
      limit: 30000000,
      attachment: 8000000,
      description: '$30M xs $8M'
    },
    coordinates: [13.7563, 100.5018]
  },
  {
    id: 'TP-SG-018',
    name: 'Singapore Marine & Property',
    cedantId: 'CED-005',
    cedantName: 'Singapore Re Ltd',
    type: 'XL',
    coverage: ['Marine', 'Property'],
    regions: ['Singapore'],
    treatyLimit: 40000000,
    currentExposure: 22000000,
    limitUtilization: 55,
    premium: 1500000,
    lossRatio: 52,
    effectiveDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'Expiring',
    layer: {
      limit: 40000000,
      attachment: 10000000,
      description: '$40M xs $10M'
    },
    coordinates: [1.3521, 103.8198]
  },
  {
    id: 'TP-HK-099',
    name: 'HK SME Stop Loss 2023',
    cedantId: 'CED-001',
    cedantName: 'ABC Insurance Co. Ltd.',
    type: 'StopLoss',
    coverage: ['All Risks'],
    regions: ['Hong Kong'],
    treatyLimit: 15000000,
    currentExposure: 14850000,
    limitUtilization: 99,
    premium: 600000,
    lossRatio: 105,
    effectiveDate: '2023-01-01',
    expiryDate: '2023-12-31',
    status: 'Expired',
    coordinates: [22.3193, 114.1694]
  }
];

// 5. WMS Layer Configuration (kept for compatibility)
const wmsLayersConfig = {
  flood500yr: { name: 'Flood depth (500-year return)', layer: 'COP:Flood_Depth _Return_Period_500yr' },
  flood200yr: { name: 'Flood depth (200-year return)', layer: 'COP:Flood_Depth _Return_Period_200yr' },
  flood100yr: { name: 'Flood depth (100-year return)', layer: 'COP:Flood_Depth _Return_Period_100yr' },
  buildingRisk: { name: 'Building', layer: 'COP:Building' },
  boundary: { name: 'Administrative boundary', layer: 'COP:taiping_boundary' },
};

// 6. Region Aggregation Interface
interface RegionAggregation {
  region: string;
  coordinates: [number, number];
  totalExposure: number;
  totalLimit: number;
  utilization: number;
  treatyCount: number;
  color: string;
}

// 7. Calculate Region Aggregations from Treaties
function calculateRegionAggregations(treaties: Treaty[]): RegionAggregation[] {
  // Define region center coordinates
  const regionCenters: Record<string, [number, number]> = {
    'Hong Kong': [22.3193, 114.1694],
    'Macau': [22.1987, 113.5439],
    'GBA': [23.1291, 113.2644],  // Guangzhou as center
    'Thailand': [13.7563, 100.5018],  // Bangkok
    'Singapore': [1.3521, 103.8198],
    'ASEAN': [10.8231, 106.6297],  // General Southeast Asia
  };
  
  const aggregations: Map<string, RegionAggregation> = new Map();
  
  treaties.forEach(treaty => {
    treaty.regions.forEach(region => {
      if (!aggregations.has(region)) {
        aggregations.set(region, {
          region,
          coordinates: regionCenters[region] || [0, 0],
          totalExposure: 0,
          totalLimit: 0,
          utilization: 0,
          treatyCount: 0,
          color: '#10B981'
        });
      }
      
      const agg = aggregations.get(region)!;
      agg.totalExposure += treaty.currentExposure;
      agg.totalLimit += treaty.treatyLimit;
      agg.treatyCount += 1;
    });
  });
  
  // Calculate utilization and assign colors
  aggregations.forEach(agg => {
    agg.utilization = Math.round((agg.totalExposure / agg.totalLimit) * 100);
    
    // Color based on utilization
    if (agg.utilization >= 90) agg.color = '#DC2626';  // Red
    else if (agg.utilization >= 80) agg.color = '#F97316';  // Orange
    else if (agg.utilization >= 70) agg.color = '#FACC15';  // Yellow
    else agg.color = '#10B981';  // Green
  });
  
  return Array.from(aggregations.values());
}


// 8. Main Component
export default function TreatyPortfolioManagement() {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  
  // Region management
  const { regionConfig, currentRegion } = useRegion();
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]);
  const [mapZoom, setMapZoom] = useState(6);
  
  // Treaty management states
  const [treaties, setTreaties] = useState<Treaty[]>(mockTreaties);
  const [selectedTreaty, setSelectedTreaty] = useState<Treaty | null>(mockTreaties[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTreaties, setFilteredTreaties] = useState<Treaty[]>(mockTreaties);
  
  // Filter states
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterCedant, setFilterCedant] = useState<string>('all');
  
  // View mode: individual treaties or regional aggregation
  const [viewMode, setViewMode] = useState<'treaties' | 'regions'>('treaties');
  
  // Regional aggregation data
  const [regionAggregations, setRegionAggregations] = useState<RegionAggregation[]>([]);
  
  // Cresta Zone shapefile data
  const [crestaZones, setCrestaZones] = useState<any>(null);
  const [isLoadingShapefile, setIsLoadingShapefile] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalTreaties: 0,
    activeTreaties: 0,
    totalExposure: 0,
    avgUtilization: 0,
    expiringCount: 0
  });
  
  // Handle shapefile upload
  const handleShapefileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoadingShapefile(true);
    try {
      const { loadShapefileFromFile } = await import('@/lib/shapefileLoader');
      const geojson = await loadShapefileFromFile(file);
      setCrestaZones(geojson);
      console.log('Loaded Cresta Zones:', geojson.features.length, 'zones');
    } catch (error) {
      console.error('Failed to load shapefile:', error);
      alert('加载 Shapefile 失败: ' + (error as Error).message);
    } finally {
      setIsLoadingShapefile(false);
    }
  };
  
  // Get style for each GeoJSON zone based on treaty aggregation
  const getZoneStyle = (feature: any) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.2,
        color: '#9CA3AF',
        weight: 1
      };
    }
    
    // Try to match zone to region aggregation
    const zoneName = feature.properties.ZONE_NAME || 
                     feature.properties.COUNTRY || 
                     feature.properties.REGION || '';
    
    const regionAgg = regionAggregations.find(agg => 
      agg.region.toLowerCase().includes(zoneName.toLowerCase()) ||
      zoneName.toLowerCase().includes(agg.region.toLowerCase())
    );
    
    if (!regionAgg || regionAgg.treatyCount === 0) {
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.2,
        color: '#D1D5DB',
        weight: 1
      };
    }
    
    // Use aggregation data for styling
    return {
      fillColor: regionAgg.color,
      fillOpacity: 0.3 + (regionAgg.utilization / 100) * 0.4,
      color: '#FFFFFF',
      weight: 2,
      opacity: 0.9
    };
  };
  
  // Calculate region aggregations when treaties change
  useEffect(() => {
    const aggregations = calculateRegionAggregations(filteredTreaties);
    setRegionAggregations(aggregations);
  }, [filteredTreaties]);
  
  // Listen for region filter events from GeoJSON popup
  useEffect(() => {
    const handleFilterRegion = (e: any) => {
      const regionName = e.detail;
      setFilterRegion(regionName);
      setViewMode('treaties');
    };
    
    window.addEventListener('filterRegion', handleFilterRegion);
    return () => window.removeEventListener('filterRegion', handleFilterRegion);
  }, []);
  
  // Update map center when region changes
  useEffect(() => {
    if (regionConfig && regionConfig.coordinates.center) {
      const newCenter: [number, number] = [
        regionConfig.coordinates.center[0],
        regionConfig.coordinates.center[1]
      ];
      setMapCenter(newCenter);
      
      const zoomLevels: Record<string, number> = {
        'worldwide': 3,
        'hk': 11,
        'mo': 12,
        'gba': 9,
        'th': 6,
        'vn': 6,
        'my': 6
      };
      setMapZoom(zoomLevels[currentRegion] || 6);
      
      if (mapRef.current) {
        mapRef.current.flyTo(newCenter, zoomLevels[currentRegion] || 6, {
          duration: 1.5
        });
      }
    }
  }, [regionConfig, currentRegion]);
  
  // Calculate statistics
  useEffect(() => {
    const activeTreaties = treaties.filter(t => t.status === 'Active');
    const expiringTreaties = treaties.filter(t => t.status === 'Expiring');
    const totalExposure = treaties.reduce((sum, t) => sum + t.currentExposure, 0);
    const avgUtil = treaties.length > 0 
      ? treaties.reduce((sum, t) => sum + t.limitUtilization, 0) / treaties.length 
      : 0;
    
    setStats({
      totalTreaties: treaties.length,
      activeTreaties: activeTreaties.length,
      totalExposure: totalExposure,
      avgUtilization: Math.round(avgUtil),
      expiringCount: expiringTreaties.length
    });
  }, [treaties]);
  
  // Filter treaties
  useEffect(() => {
    let filtered = treaties;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cedantName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    // Region filter
    if (filterRegion !== 'all') {
      filtered = filtered.filter(t => t.regions.includes(filterRegion));
    }
    
    // Cedant filter
    if (filterCedant !== 'all') {
      filtered = filtered.filter(t => t.cedantName === filterCedant);
    }
    
    setFilteredTreaties(filtered);
  }, [searchTerm, filterType, filterStatus, filterRegion, filterCedant, treaties]);
  
  // Helper functions
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'text-green-600 bg-green-50';
      case 'Expiring': return 'text-orange-600 bg-orange-50';
      case 'Expired': return 'text-gray-600 bg-gray-50';
      case 'Pending': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 80) return 'text-orange-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const handleTreatyClick = (treaty: Treaty) => {
    setSelectedTreaty(treaty);
    if (treaty.coordinates && mapRef.current) {
      mapRef.current.flyTo(treaty.coordinates, 10, { duration: 1 });
    }
  };
  
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredTreaties, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `treaties_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };
  
  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterRegion('all');
    setFilterCedant('all');
  };
  
  // Get unique cedants
  const uniqueCedants = Array.from(new Set(treaties.map(t => t.cedantName)));
  
  // Create custom marker icon based on utilization and exposure
  const createCustomIcon = (treaty: Treaty) => {
    // Only run on client side
    if (typeof window === 'undefined') return undefined;
    
    // Dynamically import Leaflet
    const L = require('leaflet');
    
    // Color based on utilization
    let color = '#10B981'; // Green - safe
    if (treaty.limitUtilization >= 90) color = '#DC2626'; // Red - critical
    else if (treaty.limitUtilization >= 80) color = '#F97316'; // Orange - warning
    else if (treaty.limitUtilization >= 70) color = '#FACC15'; // Yellow - attention
    
    // Size based on exposure (relative to max exposure)
    const maxExposure = Math.max(...treaties.map(t => t.currentExposure));
    const sizeRatio = treaty.currentExposure / maxExposure;
    const baseSize = 20;
    const maxSizeIncrease = 20;
    const size = Math.round(baseSize + (sizeRatio * maxSizeIncrease)); // 20-40px
    
    // Create SVG marker
    const svgIcon = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.8" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" fill="${color}" stroke="white" stroke-width="1.5"/>
        ${treaty.limitUtilization >= 85 ? '<circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>' : ''}
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-treaty-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* ===== LEFT SIDEBAR: Filters (保留显示) ===== */}
        <aside className="w-64 flex-shrink-0 border-r bg-white px-3 py-4 overflow-y-auto">
          <div className="space-y-3">
            {/* Search Box */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                Search Treaties
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ID, Cedant, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="border-b pb-3 mb-3">
              <label className="text-sm font-medium mb-2 block">🗺️ View Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('treaties')}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'treaties'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📄 Treaties
                </button>
                <button
                  onClick={() => setViewMode('regions')}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'regions'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌍 Regional
                </button>
              </div>
            </div>
            
            {/* Cresta Zone Shapefile Upload */}
            {viewMode === 'regions' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <label className="text-xs font-semibold text-blue-900 mb-2 block flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  Cresta Zone Shapefile
                </label>
                <input
                  type="file"
                  accept=".zip,.shp"
                  onChange={handleShapefileUpload}
                  className="text-xs w-full"
                  disabled={isLoadingShapefile}
                />
                {isLoadingShapefile && (
                  <p className="text-xs text-blue-600 mt-2 animate-pulse">加载中...</p>
                )}
                {crestaZones && (
                  <div className="mt-2 text-xs text-green-700">
                    ✓ 已加载 {crestaZones.features?.length || 0} 个区域
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  上传 .zip 或 .shp 文件来显示真实地理边界
                </p>
              </div>
            )}
            
            {/* Treaty Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">📋 Treaty Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="CatXL">Cat XL</option>
                <option value="XL">Excess of Loss</option>
                <option value="QS">Quota Share</option>
                <option value="StopLoss">Stop Loss</option>
                <option value="Facultative">Facultative</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">📊 Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Expiring">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            
            {/* Region Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">🌏 Region</label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Regions</option>
                <option value="Hong Kong">Hong Kong</option>
                <option value="Macau">Macau</option>
                <option value="GBA">Greater Bay Area</option>
                <option value="Thailand">Thailand</option>
                <option value="Singapore">Singapore</option>
                <option value="ASEAN">ASEAN</option>
              </select>
            </div>
            
            {/* Cedant Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">🏢 Cedant</label>
              <select
                value={filterCedant}
                onChange={(e) => setFilterCedant(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Cedants</option>
                {uniqueCedants.map(cedant => (
                  <option key={cedant} value={cedant}>{cedant}</option>
                ))}
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 space-y-2 border-t">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Reset Filters
              </button>
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Treaties
              </button>
            </div>
            
            {/* Statistics Summary */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold">📈 Portfolio Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold">{stats.totalTreaties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-semibold text-green-600">{stats.activeTreaties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expiring:</span>
                  <span className="font-semibold text-orange-600">{stats.expiringCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Exposure:</span>
                  <span className="font-semibold">{formatCurrency(stats.totalExposure)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Util:</span>
                  <span className={`font-semibold ${getUtilizationColor(stats.avgUtilization)}`}>
                    {stats.avgUtilization}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== CENTER-LEFT: Treaty Table ===== (隐藏) */}
        {false && (
        <div className="w-[400px] flex-shrink-0 flex flex-col bg-white border-r">
          {/* Header */}
          <div className="border-b px-3 py-2.5">
            <h2 className="text-base font-bold text-gray-900">Treaty Portfolio</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredTreaties.length} of {treaties.length} treaties
            </p>
          </div>
          
          {/* Treaty List */}
          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-gray-100">
              {filteredTreaties.map((treaty) => (
                <div
                  key={treaty.id}
                  onClick={() => handleTreatyClick(treaty)}
                  className={`px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedTreaty?.id === treaty.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                  }`}
                >
                  {/* Header: ID + Status */}
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-gray-900">{treaty.id}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(treaty.status)}`}>
                      {treaty.status}
                    </span>
                  </div>
                  
                  {/* Cedant */}
                  <p className="text-xs text-gray-600 mb-2">{treaty.cedantName}</p>
                  
                  {/* Key Info Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Type:</span>
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                        {treaty.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Limit:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(treaty.treatyLimit)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Region:</span>
                      <span className="font-medium text-gray-700 truncate">{treaty.regions[0]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Util:</span>
                      <span className={`font-bold ${getUtilizationColor(treaty.limitUtilization)}`}>
                        {treaty.limitUtilization}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Utilization Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        treaty.limitUtilization >= 90 ? 'bg-red-600' :
                        treaty.limitUtilization >= 80 ? 'bg-orange-500' :
                        treaty.limitUtilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${treaty.limitUtilization}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              
              {filteredTreaties.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No treaties match your filters</p>
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ===== CENTER-RIGHT: Map Display ===== */}
        <main className="flex-1 relative">
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Conditional Rendering: Treaty Markers OR Regional Circles */}
            {viewMode === 'treaties' ? (
              // Individual Treaty Markers
              treaties.map((treaty) => treaty.coordinates && (
                <Marker
                  key={treaty.id}
                  position={treaty.coordinates}
                  icon={createCustomIcon(treaty)}
                  eventHandlers={{
                    click: () => handleTreatyClick(treaty)
                  }}
                >
                  <Popup>
                    <div className="min-w-[220px]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-sm">{treaty.id}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">{treaty.name}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(treaty.status)}`}>
                          {treaty.status}
                        </span>
                      </div>
                      <div className="text-xs space-y-1.5 pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cedant:</span>
                          <span className="font-medium">{treaty.cedantName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{treaty.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Exposure:</span>
                          <span className="font-semibold">{formatCurrency(treaty.currentExposure)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Utilization:</span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  treaty.limitUtilization >= 90 ? 'bg-red-500' :
                                  treaty.limitUtilization >= 80 ? 'bg-orange-500' :
                                  treaty.limitUtilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${treaty.limitUtilization}%` }}
                              ></div>
                            </div>
                            <span className={`font-bold ${getUtilizationColor(treaty.limitUtilization)}`}>
                              {treaty.limitUtilization}%
                            </span>
                          </div>
                        </div>
                        {treaty.limitUtilization >= 85 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-start gap-1.5 bg-red-50 p-2 rounded">
                              <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-red-800">High utilization warning</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleTreatyClick(treaty)}
                        className="w-full mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : (
              // Regional Aggregation - Circles OR Shapefile
              <>
                {crestaZones ? (
                  // Cresta Zone Shapefile Display (Choropleth Map)
                  <GeoJSON
                    key={JSON.stringify(regionAggregations)} // Force re-render when data changes
                    data={crestaZones}
                    style={getZoneStyle}
                    onEachFeature={(feature: any, layer: any) => {
                      const zoneName = feature.properties.ZONE_NAME || 
                                     feature.properties.COUNTRY || 
                                     feature.properties.REGION || 
                                     'Unknown Zone';
                      
                      // Find matching region aggregation
                      const regionAgg = regionAggregations.find(agg => 
                        agg.region.toLowerCase().includes(zoneName.toLowerCase()) ||
                        zoneName.toLowerCase().includes(agg.region.toLowerCase())
                      );
                      
                      // Mouse hover effects
                      layer.on({
                        mouseover: (e: any) => {
                          const layer = e.target;
                          layer.setStyle({
                            weight: 3,
                            fillOpacity: 0.7,
                            color: '#1E40AF'
                          });
                        },
                        mouseout: (e: any) => {
                          const layer = e.target;
                          const style = getZoneStyle(feature);
                          layer.setStyle(style);
                        }
                      });
                      
                      // Popup with aggregated data
                      if (regionAgg && regionAgg.treatyCount > 0) {
                        layer.bindPopup(`
                          <div class="min-w-[240px]">
                            <h3 class="font-bold text-base mb-3">🌍 ${zoneName}</h3>
                            <div class="text-sm space-y-2">
                              <div class="flex justify-between pb-2 border-b">
                                <span class="text-gray-600">Treaties:</span>
                                <span class="font-bold text-lg text-blue-600">${regionAgg.treatyCount}</span>
                              </div>
                              <div class="flex justify-between">
                                <span class="text-gray-600">Total Exposure:</span>
                                <span class="font-bold">${formatCurrency(regionAgg.totalExposure)}</span>
                              </div>
                              <div class="flex justify-between">
                                <span class="text-gray-600">Total Limit:</span>
                                <span class="font-semibold">${formatCurrency(regionAgg.totalLimit)}</span>
                              </div>
                              <div class="flex justify-between items-center pt-2 border-t">
                                <span class="text-gray-600">Avg Utilization:</span>
                                <span class="font-bold text-base" style="color: ${regionAgg.color}">
                                  ${regionAgg.utilization}%
                                </span>
                              </div>
                              ${regionAgg.utilization >= 85 ? `
                                <div class="mt-2 pt-2 border-t">
                                  <div class="bg-red-50 p-2 rounded text-xs text-red-800">
                                    ⚠️ High regional concentration
                                  </div>
                                </div>
                              ` : ''}
                            </div>
                            <button 
                              onclick="window.dispatchEvent(new CustomEvent('filterRegion', {detail: '${regionAgg.region}'}))"
                              class="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
                            >
                              View ${regionAgg.treatyCount} Treaties →
                            </button>
                          </div>
                        `);
                      } else {
                        layer.bindPopup(`
                          <div class="p-2">
                            <h3 class="font-bold text-sm mb-1">${zoneName}</h3>
                            <p class="text-xs text-gray-600">No treaties in this zone</p>
                          </div>
                        `);
                      }
                    }}
                  />
                ) : (
                  // Fallback to Circle markers if no shapefile loaded
                  regionAggregations.map((region) => (
                    <Circle
                      key={region.region}
                      center={region.coordinates}
                      radius={Math.sqrt(region.totalExposure) * 1000}
                      pathOptions={{
                        fillColor: region.color,
                        fillOpacity: 0.4,
                        color: '#ffffff',
                        weight: 2,
                        opacity: 0.9
                      }}
                    >
                      <Popup>
                        <div className="min-w-[240px]">
                          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                            🌍 {region.region}
                          </h3>
                          <div className="text-sm space-y-2.5">
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-gray-600">Treaties:</span>
                              <span className="font-bold text-lg text-blue-600">{region.treatyCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Exposure:</span>
                              <span className="font-bold text-lg">{formatCurrency(region.totalExposure)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Limit:</span>
                              <span className="font-semibold">{formatCurrency(region.totalLimit)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-gray-600">Avg Utilization:</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      region.utilization >= 90 ? 'bg-red-500' :
                                      region.utilization >= 80 ? 'bg-orange-500' :
                                      region.utilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${region.utilization}%` }}
                                  ></div>
                                </div>
                                <span className={`font-bold text-base ${getUtilizationColor(region.utilization)}`}>
                                  {region.utilization}%
                                </span>
                              </div>
                            </div>
                            {region.utilization >= 85 && (
                              <div className="mt-3 pt-2 border-t">
                                <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded">
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-red-800 font-medium">
                                    High regional concentration - Monitor catastrophe exposure
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => {
                              setFilterRegion(region.region);
                              setViewMode('treaties');
                            }}
                            className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
                          >
                            View {region.treatyCount} Treaties in {region.region} →
                          </button>
                        </div>
                      </Popup>
                    </Circle>
                  ))
                )}
              </>
            )}
            
            <MapCoordinateDisplay />
          </MapContainer>
          
          {/* Portfolio Statistics - Right Bottom */}
          <div className="absolute bottom-4 right-4 space-y-2 z-[1000]">
            {/* Statistics Card */}
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
              <h4 className="text-xs font-semibold mb-2.5 text-gray-700">Portfolio Overview</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">Total Exposure</div>
                  <div className="text-sm font-bold text-blue-600">{formatCurrency(stats.totalExposure)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">Active Treaties</div>
                  <div className="text-sm font-bold text-green-600">{stats.activeTreaties}/{stats.totalTreaties}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">Avg Utilization</div>
                  <div className={`text-sm font-bold ${getUtilizationColor(stats.avgUtilization)}`}>
                    {stats.avgUtilization}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">High Risk</div>
                  <div className="text-sm font-bold text-red-600">
                    {treaties.filter(t => t.limitUtilization >= 85).length}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Map Legend - Dynamic based on view mode */}
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-3">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {viewMode === 'treaties' ? 'Treaty Markers' : 'Regional Risk Heatmap'}
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600 mb-1.5 font-medium">
                  {viewMode === 'treaties' ? 'Color = Utilization' : 'Color = Avg Utilization'}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                    <span>&lt;70% Safe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"></div>
                    <span>70-79% Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white"></div>
                    <span>80-89% High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                    <span>≥90% Critical</span>
                  </div>
                </div>
              </div>
              {viewMode === 'treaties' ? (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1.5 font-medium">Size = Exposure</p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>→</span>
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-gray-500">Larger = Higher $</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-200">
                  {crestaZones ? (
                    <>
                      <p className="text-xs text-gray-600 mb-1.5 font-medium">Opacity = Utilization</p>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <div className="w-4 h-4 bg-blue-400 opacity-30 border border-gray-300"></div>
                        <span>→</span>
                        <div className="w-4 h-4 bg-blue-400 opacity-80 border border-gray-300"></div>
                        <span className="text-gray-500">Darker = Higher Risk</span>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">
                        📊 Cresta Zone Shapefile
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-600 mb-1.5 font-medium">Size = Total Exposure</p>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-blue-400 opacity-40 border border-white"></div>
                        <span>→</span>
                        <div className="w-5 h-5 rounded-full bg-blue-400 opacity-40 border border-white"></div>
                        <span className="text-gray-500">Larger = More Risk</span>
                      </div>
                    </>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1.5 italic">
                    Click region to view treaties
                  </p>
                </div>
              )}
            </div>
            </div>
          </div>
        </main>

        {/* ===== RIGHT SIDEBAR: Treaty Details (Hidden) ===== */}
        {false && (
        <aside className="w-72 flex-shrink-0 border-l bg-white overflow-y-auto">
          {selectedTreaty ? (
            <div className="p-3 space-y-3">
              {/* Treaty Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{selectedTreaty.id}</h2>
                    <p className="text-xs text-gray-600 mt-1">{selectedTreaty.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTreaty.status)}`}>
                    {selectedTreaty.status}
                  </span>
                </div>
              </div>
              
              {/* Cedant Information */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <h3 className="text-xs font-semibold text-gray-900">Cedant</h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium text-gray-900 text-right">{selectedTreaty.cedantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium text-gray-900">{selectedTreaty.cedantId}</span>
                  </div>
                </div>
              </div>
              
              {/* Financial Terms */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-semibold text-gray-900">Financial</h3>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Limit:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(selectedTreaty.treatyLimit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exposure:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(selectedTreaty.currentExposure)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilization:</span>
                    <span className={`font-bold ${getUtilizationColor(selectedTreaty.limitUtilization)}`}>
                      {selectedTreaty.limitUtilization}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        selectedTreaty.limitUtilization >= 90 ? 'bg-red-600' :
                        selectedTreaty.limitUtilization >= 80 ? 'bg-orange-500' :
                        selectedTreaty.limitUtilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${selectedTreaty.limitUtilization}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-blue-200">
                    <span className="text-gray-600">Premium:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(selectedTreaty.premium)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loss Ratio:</span>
                    <span className={`font-semibold ${
                      selectedTreaty.lossRatio > 100 ? 'text-red-600' :
                      selectedTreaty.lossRatio > 70 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {selectedTreaty.lossRatio}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Coverage Details */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <h3 className="text-xs font-semibold text-gray-900">Coverage</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-600 block mb-1">Type:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      {selectedTreaty.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Perils:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedTreaty.coverage.map(peril => (
                        <span key={peril} className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {peril}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Regions:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedTreaty.regions.map(region => (
                        <span key={region} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Layer Information (for XL treaties) */}
              {selectedTreaty.layer && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Layer Structure</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Layer Limit:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(selectedTreaty.layer.limit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attachment Point:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(selectedTreaty.layer.attachment)}</span>
                    </div>
                    <div className="pt-2 border-t border-orange-200">
                      <span className="text-gray-600 block mb-1">Description:</span>
                      <p className="text-xs text-gray-700 italic">{selectedTreaty.layer.description}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Treaty Dates */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Treaty Period</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Effective Date:</span>
                    <span className="font-medium text-gray-900">{selectedTreaty.effectiveDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expiry Date:</span>
                    <span className="font-medium text-gray-900">{selectedTreaty.expiryDate}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <button className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" />
                  View on Map
                </button>
                <button className="w-full px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Exposure Analysis
                </button>
                <button className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Treaty PDF
                </button>
              </div>
              
              {/* Warning Messages */}
              {selectedTreaty.limitUtilization >= 85 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-red-900 mb-1">High Utilization</h4>
                      <p className="text-xs text-red-700">
                        {selectedTreaty.limitUtilization}% utilization.
                        {selectedTreaty.limitUtilization >= 90 ? ' Urgent action!' : ' Monitor closely.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center px-4">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a treaty</p>
              </div>
            </div>
          )}
        </aside>
        )}
      </div>
    </div>
  );
}