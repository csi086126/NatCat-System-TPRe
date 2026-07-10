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
  Search,
  Trash2,
  X
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
  
  // View mode: individual treaties, regional aggregation, or direct insurance
  const [viewMode, setViewMode] = useState<'treaties' | 'regions' | 'direct'>('direct');
  
  // TPHK Direct Insurance Data
  const [tphkData, setTphkData] = useState<any[]>([]);
  const [isLoadingTphk, setIsLoadingTphk] = useState(false);

  // Load TPHK data when view mode changes to direct
  useEffect(() => {
    if (viewMode === 'direct' && tphkData.length === 0) {
      setIsLoadingTphk(true);
      fetch('/data/tphk_portfolio_subset_5000.json')
        .then(res => res.json())
        .then(data => {
          setTphkData(data);
          setIsLoadingTphk(false);
          // Zoom to HK
          setMapCenter([22.3193, 114.1694]);
          setMapZoom(11);
        })
        .catch(err => {
          console.error('Failed to load TPHK data', err);
          setIsLoadingTphk(false);
        });
    }
  }, [viewMode]);
  
  // Regional aggregation data
  const [regionAggregations, setRegionAggregations] = useState<RegionAggregation[]>([]);
  
  // Portfolio CSV data mapped to Cresta Zones
  const [portfolioData, setPortfolioData] = useState<{[zoneCode: string]: {
    zoneCode: string;
    zoneName?: string;
    tsi: number;
    eventLimit?: number;
    policyCount: number;
    customData?: {[key: string]: number}; // 存储所有数值列
    exposures: any[];
  }}>({}); 
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  
  // Field mapping configuration
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // CSV 所有列名
  const [shapefileFields, setShapefileFields] = useState<string[]>([]); // Shapefile 所有字段
  const [matchFieldShapefile, setMatchFieldShapefile] = useState<string>(''); // Shapefile 匹配字段
  const [matchFieldCSV, setMatchFieldCSV] = useState<string>(''); // CSV 匹配字段
  const [displayField, setDisplayField] = useState<string>(''); // 要显示的数值列
  const [csvData, setCsvData] = useState<any[]>([]); // 临时存储 CSV 数据
  
  // Cresta Zone shapefile data - support multiple files
  const [uploadedShapefiles, setUploadedShapefiles] = useState<{id: string, name: string, data: any}[]>([]);
  const [selectedShapefileId, setSelectedShapefileId] = useState<string>('none');
  const [isLoadingShapefile, setIsLoadingShapefile] = useState(false);
  
  // Get currently active shapefile
  const activeShapefile = uploadedShapefiles.find(sf => sf.id === selectedShapefileId)?.data || null;
  
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
      
      // Extract available fields from the first feature
      if (geojson.features && geojson.features.length > 0) {
        const fields = Object.keys(geojson.features[0].properties || {});
        setShapefileFields(fields);
        console.log('📋 Shapefile fields detected:', fields);
        
        // Auto-select common matching fields
        const commonFields = ['ADM1_PCODE', 'ZONE_CODE', 'CRESTA', 'CODE', 'ID', 'ADM1_EN', 'NAME'];
        const foundField = commonFields.find(f => fields.includes(f));
        if (foundField && !matchFieldShapefile) {
          setMatchFieldShapefile(foundField);
          console.log('🎯 Auto-selected shapefile field:', foundField);
        }
      }
      
      // Create unique ID and add to uploaded files
      const fileId = `sf-${Date.now()}`;
      const newShapefile = {
        id: fileId,
        name: file.name,
        data: geojson
      };
      
      setUploadedShapefiles(prev => [...prev, newShapefile]);
      // Don't auto-select, let user choose manually
      // setSelectedShapefileId(fileId);
      
      console.log('✅ Shapefile loaded:', file.name, geojson);
    } catch (error) {
      console.error('❌ Failed to load shapefile:', error);
      alert('Failed to load shapefile. Please check the file format.');
    } finally {
      setIsLoadingShapefile(false);
    }
  };
  
  // Clear shapefile
  const handleClearShapefile = () => {
    setSelectedShapefileId('none');
    console.log('🗑️ Shapefile display cleared');
  };
  
  // Delete a specific shapefile from the list
  const handleDeleteShapefile = (fileId: string) => {
    setUploadedShapefiles(prev => prev.filter(sf => sf.id !== fileId));
    if (selectedShapefileId === fileId) {
      setSelectedShapefileId('none');
    }
    console.log('🗑️ Shapefile deleted:', fileId);
  };
  
  // Handle Portfolio CSV upload
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoadingPortfolio(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      console.log('📋 CSV Headers:', headers);
      
      // Store headers for field selection
      setCsvHeaders(headers);
      
      // Auto-detect common matching fields
      const commonMatchFields = ['ADM1_PCODE', 'zone_code', 'cresta', 'province', 'ADM1_EN', 'region'];
      const foundMatchField = headers.find(h => 
        commonMatchFields.some(f => h.toLowerCase().includes(f.toLowerCase()))
      );
      
      if (foundMatchField && !matchFieldCSV) {
        setMatchFieldCSV(foundMatchField);
        console.log('🎯 Auto-selected CSV match field:', foundMatchField);
      }
      
      // Auto-detect numeric fields for display
      const numericFields = headers.filter(h => {
        // Check if the field contains numeric data
        const sampleValue = lines[1]?.split(',')[headers.indexOf(h)];
        return sampleValue && !isNaN(parseFloat(sampleValue));
      });
      
      console.log('🔢 Numeric fields detected:', numericFields);
      
      // Parse all data
      const parsedData: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });
        parsedData.push(row);
      }
      
      setCsvData(parsedData);
      
      // If we have both match fields selected, trigger matching
      if (matchFieldShapefile && foundMatchField) {
        performDataMatching(parsedData, headers, foundMatchField);
      } else {
        alert(`CSV 文件已加载！\n共 ${parsedData.length} 行数据\n请在下方选择匹配字段和显示列`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load CSV:', error);
      alert('CSV 文件加载失败，请检查文件格式');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };
  
  // Perform data matching between CSV and Shapefile
  const performDataMatching = (data: any[], headers: string[], csvMatchField: string) => {
    if (!matchFieldShapefile) {
      alert('请先选择 Shapefile 的匹配字段');
      return;
    }
    
    if (!displayField) {
      alert('请选择要显示的数值列');
      return;
    }
    
    console.log(`🔗 开始匹配: Shapefile[${matchFieldShapefile}] ↔ CSV[${csvMatchField}]`);
    console.log(`📊 显示字段: ${displayField}`);
    
    const zoneData: {[key: string]: any} = {};
    let matchedCount = 0;
    
    data.forEach(row => {
      const matchValue = row[csvMatchField];
      if (!matchValue) return;
      
      // Normalize match value (case-insensitive)
      const normalizedMatch = matchValue.toString().trim().toUpperCase();
      
      // Get all numeric fields from this row
      const customData: {[key: string]: number} = {};
      headers.forEach(header => {
        const value = parseFloat(row[header]);
        if (!isNaN(value)) {
          customData[header] = value;
        }
      });
      
      // Use display field value as TSI
      const displayValue = parseFloat(row[displayField]) || 0;
      
      // Debug: Log first zone data
      if (matchedCount === 0) {
        console.log('📝 第一条数据示例:', {
          matchValue,
          normalizedMatch,
          displayField,
          displayValue,
          customDataKeys: Object.keys(customData),
          customData
        });
      }
      
      zoneData[normalizedMatch] = {
        zoneCode: matchValue, // Keep original case for display
        zoneName: matchValue,
        tsi: displayValue, // Use selected display field as TSI
        eventLimit: 0,
        policyCount: 1,
        customData, // Store all numeric fields
        exposures: [row]
      };
      
      matchedCount++;
    });
    
    setPortfolioData(zoneData);
    console.log(`✅ 匹配完成: ${matchedCount} 条记录`);
    console.log('📊 Portfolio 数据示例:', Object.keys(zoneData).slice(0, 3));
    alert(`数据匹配成功！\n匹配字段: ${matchFieldShapefile} ↔ ${csvMatchField}\n显示列: ${displayField}\n共 ${matchedCount} 条记录`);
  };
  
  // Manual trigger matching when fields are changed
  const handleApplyMatching = () => {
    if (csvData.length === 0) {
      alert('请先上传 CSV 文件');
      return;
    }
    if (!matchFieldShapefile || !matchFieldCSV) {
      alert('请选择匹配字段');
      return;
    }
    if (!displayField) {
      alert('请选择要显示的数值列');
      return;
    }
    performDataMatching(csvData, csvHeaders, matchFieldCSV);
  };
  
  // Clear portfolio data
  const handleClearPortfolio = () => {
    setPortfolioData({});
    setCsvData([]);
    setCsvHeaders([]);
    setMatchFieldCSV('');
    setDisplayField('');
    const fileInput = document.querySelector('input[type="file"][accept=".csv"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    console.log('🗑️ Portfolio data cleared');
  };
  
  // Get style for each GeoJSON zone based on portfolio data
  const getZoneStyle = (feature: any) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.2,
        color: '#9CA3AF',
        weight: 1
      };
    }
    
    // Try to match using configured match field
    let portfolioZone = null;
    
    if (matchFieldShapefile && feature.properties[matchFieldShapefile]) {
      const shapefileValue = feature.properties[matchFieldShapefile].toString().trim().toUpperCase();
      
      // Find matching portfolio data (case-insensitive)
      for (const key in portfolioData) {
        if (key.toUpperCase() === shapefileValue) {
          portfolioZone = portfolioData[key];
          break;
        }
      }
    } else {
      // Fallback: try common field names
      const zoneCode = feature.properties.ZONE_CODE || 
                       feature.properties.CRESTA || 
                       feature.properties.CODE ||
                       feature.properties.ID ||
                       feature.properties.ADM1_PCODE ||
                       feature.properties.ADM1_EN || '';
      
      if (zoneCode) {
        const normalizedCode = zoneCode.toString().trim().toUpperCase();
        for (const key in portfolioData) {
          if (key.toUpperCase() === normalizedCode) {
            portfolioZone = portfolioData[key];
            break;
          }
        }
      }
    }
    
    if (!portfolioZone || portfolioZone.tsi === 0) {
      // No portfolio data for this zone - show as gray
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.3,
        color: '#9CA3AF',
        weight: 1.5,
        opacity: 0.8
      };
    }
    
    // Calculate color intensity based on selected display field value (TSI)
    const maxTSI = Math.max(...Object.values(portfolioData).map(z => z.tsi));
    const minTSI = Math.min(...Object.values(portfolioData).filter(z => z.tsi > 0).map(z => z.tsi));
    const intensity = (portfolioZone.tsi - minTSI) / (maxTSI - minTSI) || 0;
    
    // Color gradient: Yellow (low) -> Orange -> Red (high) for better visibility
    const getColor = (intensity: number) => {
      if (intensity > 0.8) return '#DC2626'; // Very High - Dark Red
      if (intensity > 0.6) return '#EA580C'; // High - Orange-Red
      if (intensity > 0.4) return '#F97316'; // Medium - Orange
      if (intensity > 0.2) return '#FBBF24'; // Low - Yellow-Orange
      return '#FDE047'; // Very Low - Yellow
    };
    
    return {
      fillColor: getColor(intensity),
      fillOpacity: 0.5 + intensity * 0.4, // Range from 0.5 to 0.9 (more opaque = higher value)
      color: '#78350F', // Dark brown border
      weight: 2,
      opacity: 1
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
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* ===== LEFT SIDEBAR: Filters (保留显示) ===== */}
        <aside className="w-96 flex-shrink-0 border-r bg-white px-3 py-4 overflow-y-auto">
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setViewMode('treaties')}
                  className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'treaties'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📄 Treaties
                </button>
                <button
                  onClick={() => setViewMode('regions')}
                  className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'regions'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌍 Regional
                </button>
                <button
                  onClick={() => setViewMode('direct')}
                  className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'direct'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🏢 Direct
                </button>
              </div>
            </div>
            
            {/* Cresta Zone Shapefile Upload */}
            {viewMode === 'regions' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    Cresta Zone Shapefile
                  </label>
                </div>
                
                {/* File Upload Input */}
                <input
                  type="file"
                  accept=".zip,.shp,.geojson"
                  onChange={handleShapefileUpload}
                  className="text-xs w-full"
                  disabled={isLoadingShapefile}
                />
                
                {isLoadingShapefile && (
                  <p className="text-xs text-blue-600 animate-pulse">⏳ 加载中...</p>
                )}
                
                {/* Shapefile Selection Dropdown */}
                {uploadedShapefiles.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      选择显示的文件：
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedShapefileId}
                        onChange={(e) => setSelectedShapefileId(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 border border-blue-300 rounded bg-white"
                      >
                        <option value="none">❌ None (不显示)</option>
                        {uploadedShapefiles.map(sf => (
                          <option key={sf.id} value={sf.id}>
                            📁 {sf.name} ({sf.data.features?.length || 0} 区域)
                          </option>
                        ))}
                      </select>
                      {selectedShapefileId !== 'none' && (
                        <button
                          onClick={() => handleDeleteShapefile(selectedShapefileId)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded border border-red-300 transition-colors flex items-center gap-1"
                          title="删除此文件"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Status Display */}
                {activeShapefile && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                    <span className="text-xs text-green-700">
                      ✓ 当前显示: {uploadedShapefiles.find(sf => sf.id === selectedShapefileId)?.name}
                      ({activeShapefile.features?.length || 0} 个区域)
                    </span>
                  </div>
                )}
                
                {uploadedShapefiles.length === 0 && (
                  <p className="text-xs text-gray-600">
                    💡 上传 .zip、.shp 或 .geojson 文件来显示真实地理边界
                  </p>
                )}
                
                {/* GADM Global Boundaries */}
                <div className="pt-2 border-t border-blue-300">
                  <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                    🌍 GADM 全球行政边界数据
                  </p>
                  <button
                    onClick={() => alert('GADM 数据文件位置：D:\\web-flood-insurance-model\\Data\\Shapefile\\gadm_410.gpkg\n\n文件信息：\n- 格式：GeoPackage (SQLite)\n- 大小：2.57 GB\n- 内容：全球行政边界（国家、省、市、县等多级）\n\n由于文件较大，建议：\n1. 使用 QGIS 打开查看\n2. 提取特定国家/地区后使用\n3. 或开发 API 按需加载')}
                    className="w-full text-xs px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    查看 GADM 数据信息
                  </button>
                </div>
              </div>
            )}
            
            {/* Portfolio CSV Upload */}
            {viewMode === 'regions' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-green-900 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Portfolio CSV 数据
                  </label>
                  {Object.keys(portfolioData).length > 0 && (
                    <button
                      onClick={handleClearPortfolio}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                      title="清除 Portfolio 数据"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      清除
                    </button>
                  )}
                </div>
                
                {/* File Upload Input */}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handlePortfolioUpload}
                  className="text-xs w-full"
                  disabled={isLoadingPortfolio}
                />
                
                {isLoadingPortfolio && (
                  <p className="text-xs text-green-600 animate-pulse">⏳ 加载中...</p>
                )}
                
                {/* Field Mapping Configuration */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs font-semibold text-yellow-900">🔧 字段匹配配置</p>
                    
                    {/* Shapefile Match Field */}
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">Shapefile 匹配字段:</label>
                      <select
                        value={matchFieldShapefile}
                        onChange={(e) => setMatchFieldShapefile(e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-yellow-300 rounded bg-white"
                      >
                        <option value="">-- 选择字段 --</option>
                        {shapefileFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* CSV Match Field */}
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">CSV 匹配字段:</label>
                      <select
                        value={matchFieldCSV}
                        onChange={(e) => setMatchFieldCSV(e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-yellow-300 rounded bg-white"
                      >
                        <option value="">-- 选择字段 --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Display Field */}
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">显示数值列:</label>
                      <select
                        value={displayField}
                        onChange={(e) => setDisplayField(e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-yellow-300 rounded bg-white"
                      >
                        <option value="">-- 选择数值列 --</option>
                        {csvHeaders.filter(h => {
                          const sampleValue = csvData[0]?.[h];
                          return sampleValue && !isNaN(parseFloat(sampleValue));
                        }).map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Apply Button */}
                    <button
                      onClick={handleApplyMatching}
                      disabled={!matchFieldShapefile || !matchFieldCSV || !displayField}
                      className="w-full text-xs px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✓ 应用匹配
                    </button>
                  </div>
                )}
                
                {/* Status Display */}
                {Object.keys(portfolioData).length > 0 && (
                  <div className="p-2 bg-green-100 border border-green-300 rounded space-y-1">
                    <div className="text-xs text-green-800 font-semibold">
                      ✓ Portfolio 已加载
                    </div>
                    <div className="text-xs text-green-700">
                      • {Object.keys(portfolioData).length} 个区域
                    </div>
                    {displayField && (
                      <div className="text-xs text-green-700">
                        • 显示列: {displayField}
                      </div>
                    )}
                    <div className="text-xs text-green-700">
                      • 匹配: {matchFieldShapefile} ↔ {matchFieldCSV}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📋 使用说明：</p>
                  <ul className="list-disc list-inside text-[10px] ml-2 space-y-0.5">
                    <li>上传 CSV 文件后选择匹配字段</li>
                    <li>Shapefile 字段需要先上传 Shapefile</li>
                    <li>选择要在地图上显示的数值列</li>
                    <li>点击"应用匹配"开始数据匹配</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Treaty Type Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap min-w-[100px]">📋 Treaty Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
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
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap min-w-[100px]">📊 Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Expiring">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            
            {/* Region Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap min-w-[100px]">🌏 Region</label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
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
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap min-w-[100px]">🏢 Cedant</label>
              <select
                value={filterCedant}
                onChange={(e) => setFilterCedant(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
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
                className="w-full px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Reset Filters
              </button>
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Treaties
              </button>
            </div>
            
            {/* Statistics Summary */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold">📈 Portfolio Summary</h3>
              {viewMode === 'direct' ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Policies:</span>
                    <span className="font-semibold">{tphkData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Geocoded:</span>
                    <span className="font-semibold text-green-600">
                      {tphkData.filter(i => i.location).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sum Insured:</span>
                    <span className="font-semibold">
                      {formatCurrency(tphkData.reduce((acc, item) => acc + (Number(item.sum_insured) || 0), 0))}
                    </span>
                  </div>
                </div>
              ) : (
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
              )}
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
            
            {/* Conditional Rendering: Treaty Markers OR Direct Insurance OR Regional Circles */}
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
                        className="w-full mt-3 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : viewMode === 'direct' ? (
              // Direct Insurance Markers
              tphkData.map((item, idx) => item.location && (
                <Circle
                  key={idx}
                  center={[item.location.lat, item.location.lng]}
                  radius={30}
                  pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.6, weight: 1 }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-sm mb-1">{item.id}</h3>
                      <p className="text-xs text-gray-600 mb-2">{item.address}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-semibold">Sum Insured:</span>
                          <br />
                          HKD {Number(item.sum_insured).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-semibold">Occupancy:</span>
                          <br />
                          {item.occupancy || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold">Construction:</span>
                          <br />
                          {item.construction || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold">Year Built:</span>
                          <br />
                          {item.year_built || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))
            ) : (
              // Regional Aggregation - Circles OR Shapefile
              <>
                {activeShapefile ? (
                  // Cresta Zone Shapefile Display (Choropleth Map)
                  <GeoJSON
                    key={JSON.stringify(portfolioData) + selectedShapefileId} // Force re-render when data changes
                    data={activeShapefile}
                    style={getZoneStyle}
                    onEachFeature={(feature: any, layer: any) => {
                      const zoneName = feature.properties.ZONE_NAME || 
                                     feature.properties.NAME ||
                                     feature.properties.ADM1_EN ||
                                     feature.properties.COUNTRY || 
                                     feature.properties.REGION || 
                                     'Unknown Zone';
                      
                      // Get match value from shapefile
                      let matchValue = '';
                      if (matchFieldShapefile && feature.properties[matchFieldShapefile]) {
                        matchValue = feature.properties[matchFieldShapefile];
                      } else {
                        matchValue = feature.properties.ZONE_CODE || 
                                    feature.properties.CRESTA || 
                                    feature.properties.CODE ||
                                    feature.properties.ADM1_PCODE ||
                                    feature.properties.ID || '';
                      }
                      
                      // Find matching portfolio data (case-insensitive)
                      let portfolioZone = null;
                      if (matchValue) {
                        const normalizedMatch = matchValue.toString().trim().toUpperCase();
                        for (const key in portfolioData) {
                          if (key.toUpperCase() === normalizedMatch) {
                            portfolioZone = portfolioData[key];
                            break;
                          }
                        }
                      }
                      
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
                      
                      // Popup with portfolio data
                      if (portfolioZone && portfolioZone.tsi > 0) {
                        const maxTSI = Math.max(...Object.values(portfolioData).map(z => z.tsi));
                        const riskLevel = portfolioZone.tsi / maxTSI;
                        const getRiskLabel = (level: number) => {
                          if (level > 0.8) return { text: 'Very High', color: '#DC2626' };
                          if (level > 0.6) return { text: 'High', color: '#EA580C' };
                          if (level > 0.4) return { text: 'Medium', color: '#F59E0B' };
                          if (level > 0.2) return { text: 'Low', color: '#10B981' };
                          return { text: 'Very Low', color: '#6EE7B7' };
                        };
                        const risk = getRiskLabel(riskLevel);
                        
                        // Debug: Log portfolio zone data
                        console.log('🔍 弹窗数据:', {
                          zoneName,
                          matchValue,
                          tsi: portfolioZone.tsi,
                          displayField,
                          hasCustomData: !!portfolioZone.customData,
                          customDataKeys: portfolioZone.customData ? Object.keys(portfolioZone.customData) : []
                        });
                        
                        // Build custom data rows
                        let customDataRows = '';
                        if (portfolioZone.customData) {
                          for (const [key, value] of Object.entries(portfolioZone.customData)) {
                            const isDisplayField = key === displayField;
                            customDataRows += `
                              <div class="flex justify-between ${isDisplayField ? 'bg-yellow-50 px-1 rounded' : ''}">
                                <span class="text-gray-600">${key}:</span>
                                <span class="${isDisplayField ? 'font-bold text-blue-700' : 'font-semibold'}">${typeof value === 'number' ? value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value}</span>
                              </div>
                            `;
                          }
                        }
                        
                        layer.bindPopup(`
                          <div class="min-w-[280px]">
                            <h3 class="font-bold text-base mb-2">🌍 ${zoneName}</h3>
                            <div class="text-xs text-gray-500 mb-3">
                              ${matchFieldShapefile ? `${matchFieldShapefile}: ${matchValue}` : `Zone: ${matchValue}`}
                            </div>
                            <div class="text-sm space-y-1.5">
                              ${displayField ? `
                                <div class="flex justify-between pb-2 border-b bg-blue-50 px-2 py-1 rounded">
                                  <span class="text-gray-700 font-semibold">📊 ${displayField}:</span>
                                  <span class="font-bold text-lg text-blue-600">${portfolioZone.tsi.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                              ` : ''}
                              ${customDataRows ? `
                                <div class="mt-2 space-y-1 text-xs border-t pt-2">
                                  <div class="font-semibold text-gray-700 mb-1">📋 所有数据列:</div>
                                  ${customDataRows}
                                </div>
                              ` : ''}
                              <div class="flex justify-between items-center pt-2 border-t mt-2">
                                <span class="text-gray-600">风险等级:</span>
                                <span class="font-bold text-sm px-2 py-1 rounded" style="background-color: ${risk.color}20; color: ${risk.color}">
                                  ${risk.text}
                                </span>
                              </div>
                              ${riskLevel > 0.6 ? `
                                <div class="mt-2 pt-2 border-t">
                                  <div class="bg-red-50 p-2 rounded text-xs text-red-800 flex items-start gap-1">
                                    <span>⚠️</span>
                                    <span>高风险累积区域 - 关注该区域的暴露累积</span>
                                  </div>
                                </div>
                              ` : ''}
                            </div>
                          </div>
                        `);
                      } else {
                        layer.bindPopup(`
                          <div class="p-2">
                            <h3 class="font-bold text-sm mb-1">${zoneName}</h3>
                            <div class="text-xs text-gray-500 mb-1">${matchFieldShapefile}: ${matchValue}</div>
                            <p class="text-xs text-gray-600">此区域无 Portfolio 数据</p>
                          </div>
                        `);
                      }
                    }}
                  />
                ) : null}
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
              {viewMode === 'treaties' ? 'Treaty Markers' : Object.keys(portfolioData).length > 0 ? 'Portfolio Risk Heatmap' : 'Regional Risk Heatmap'}
            </h4>
            <div className="space-y-2">
              {viewMode === 'regions' && Object.keys(portfolioData).length > 0 && displayField ? (
                // Portfolio Data Heatmap Legend
                <div>
                  <p className="text-xs text-gray-600 mb-1.5 font-medium">
                    📊 {displayField}
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-red-600 border border-gray-300"></div>
                      <span>Very High (80-100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-orange-600 border border-gray-300"></div>
                      <span>High (60-80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-orange-400 border border-gray-300"></div>
                      <span>Medium (40-60%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-yellow-400 border border-gray-300"></div>
                      <span>Low (20-40%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-yellow-200 border border-gray-300"></div>
                      <span>Very Low (0-20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded bg-gray-300 border border-gray-400"></div>
                      <span>No Data</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    颜色深浅表示 {displayField} 值的相对大小
                  </p>
                </div>
              ) : (
                // Original Treaty/Regional Legend
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
              )}
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
                  {activeShapefile ? (
                    <>
                      <p className="text-xs text-gray-600 mb-1.5 font-medium">Opacity = Utilization</p>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <div className="w-4 h-4 bg-blue-400 opacity-30 border border-gray-300"></div>
                        <span>→</span>
                        <div className="w-4 h-4 bg-blue-400 opacity-80 border border-gray-300"></div>
                        <span className="text-gray-500">Darker = Higher Risk</span>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">
                        📊 {uploadedShapefiles.find(sf => sf.id === selectedShapefileId)?.name || 'Shapefile'}
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
                <button className="w-full px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors">
                  <MapPin className="h-4 w-4" />
                  View on Map
                </button>
                <button className="w-full px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors">
                  <TrendingUp className="h-4 w-4" />
                  Exposure Analysis
                </button>
                <button className="w-full px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors">
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