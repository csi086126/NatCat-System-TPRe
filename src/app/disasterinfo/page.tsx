"use client"

// 1. Import necessary React Hooks and components
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut, Globe } from 'lucide-react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegion } from '@/contexts/RegionContext';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getEvents, createEvent, type DisasterEvent } from '@/lib/api/events';

// 2. Dynamically import (Lazy Load) Leaflet map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });

// 3. WMS Layer Configuration
const wmsLayersConfig = {
  flood500yr: { name: 'Flood depth (500-year return)', layer: 'COP:Flood_Depth _Return_Period_500yr' },
  flood200yr: { name: 'Flood depth (200-year return)', layer: 'COP:Flood_Depth _Return_Period_200yr' },
  flood100yr: { name: 'Flood depth (100-year return)', layer: 'COP:Flood_Depth _Return_Period_100yr' },
  flood50yr: { name: 'Flood depth (50-year return)', layer: 'COP:Flood_Depth _Return_Period_50yr' },
  flood20yr: { name: 'Flood depth (20-year return)', layer: 'COP:Flood_Depth _Return_Period_20yr' },
  buildingRisk: { name: 'Building', layer: 'COP:Building' },
  boundary : { name: 'Administrative boundary', layer: ' COP:taiping_boundary' },
  annualrainfall : { name: 'Annual rainfall', layer: ' COP:taiping_Annual_rainfall' },
};

// 随机事件 WMS 图层配置（几万个事件通过 WMS 展示）
const stochasticWMSLayers = {
  typhoon: { name: 'Stochastic Typhoon (10,000-yr)', layer: 'COP:stochastic_typhoon_10000yr' },
  rainstorm: { name: 'Stochastic Rainstorm (10,000-yr)', layer: 'COP:stochastic_rainstorm_10000yr' },
  flood: { name: 'Stochastic Flood (10,000-yr)', layer: 'COP:stochastic_flood_10000yr' },
  stormSurge: { name: 'Stochastic Storm Surge (10,000-yr)', layer: 'COP:stochastic_stormsurge_10000yr' },
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

// --- MOCK DATA FOR EVENTS ---
const mockHistoricalEvents = [
  {
    id: 'T-2023-1',
    name: 'Typhoon Mangkhut',
    type: 'Typhoon',
    date: '2023-09-16',
    year: 2023,
    impactArea: {
      level1: 'Hong Kong',
      level2: 'New Territories',
      level3: 'Tai Po'
    },
    maxWindSpeed: '285 km/h',
    totalRainfall: '350 mm',
    estimatedLoss: '$6.27 Billion',
    affectedPopulation: '3.6 Million',
    affectedAreas: ['Hong Kong', 'Guangdong', 'Macau'],
    geometry: {
      type: 'Point',
      coordinates: [114.1694, 22.3193] // [经度, 纬度]
    }
  },
  {
    id: 'R-2024-2',
    name: 'HK Black Rainstorm',
    type: 'Rainstorm',
    date: '2024-06-08',
    year: 2024,
    impactArea: {
      level1: 'Hong Kong',
      level2: 'Kowloon',
      level3: 'Mong Kok'
    },
    maxWindSpeed: 'N/A',
    totalRainfall: '600 mm in 24h',
    estimatedLoss: '$150 Million',
    affectedPopulation: '7.4 Million',
    affectedAreas: ['Hong Kong Island', 'Kowloon', 'New Territories'],
    geometry: {
      type: 'Point',
      coordinates: [114.1095, 22.3964] // 新界区域
    }
  },
];

// Mock Stochastic Events Data
const mockStochasticEvents = [
  {
    id: 'T-00156-1',
    name: 'Stochastic Typhoon Event 156',
    type: 'Typhoon',
    date: 'Year 156',
    year: 156,
    impactArea: {
      level1: 'Hong Kong',
      level2: 'Hong Kong Island',
      level3: 'Central and Western'
    },
    maxWindSpeed: '265 km/h',
    totalRainfall: '320 mm',
    estimatedLoss: '$5.2 Billion',
    affectedPopulation: '2.8 Million',
    affectedAreas: ['Central', 'Admiralty', 'Sheung Wan'],
    geometry: {
      type: 'Point',
      coordinates: [114.1577, 22.2855]
    }
  },
  {
    id: 'R-01234-2',
    name: 'Stochastic Rainstorm Event 1234',
    type: 'Rainstorm',
    date: 'Year 1234',
    year: 1234,
    impactArea: {
      level1: 'Hong Kong',
      level2: 'Kowloon',
      level3: 'Yau Tsim Mong'
    },
    maxWindSpeed: 'N/A',
    totalRainfall: '550 mm in 24h',
    estimatedLoss: '$280 Million',
    affectedPopulation: '5.1 Million',
    affectedAreas: ['Tsim Sha Tsui', 'Mong Kok', 'Yau Ma Tei'],
    geometry: {
      type: 'Point',
      coordinates: [114.1722, 22.3193]
    }
  },
  {
    id: 'F-05678-3',
    name: 'Stochastic Flood Event 5678',
    type: 'Flood',
    date: 'Year 5678',
    year: 5678,
    impactArea: {
      level1: 'Macau',
      level2: 'Macau Peninsula',
      level3: 'Sé'
    },
    maxWindSpeed: 'N/A',
    totalRainfall: '450 mm',
    estimatedLoss: '$180 Million',
    affectedPopulation: '450,000',
    affectedAreas: ['Senado Square', 'Ruins of St. Paul', 'A-Ma Temple'],
    geometry: {
      type: 'Point',
      coordinates: [113.5439, 22.1987]
    }
  },
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
            width={360}
            height={40}
          />
          {/* 地区选择器 - 最左侧 */}
          <div className="border-l border-gray-300 pl-4">
            <RegionSelector />
          </div>
        </div>
        <nav className="flex-grow flex justify-end items-center">
          <ul className="flex space-x-4">
          
            <li><Link href="/cityinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'cityinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><Globe size={18} />Geospatial Data Hub</Button></Link></li>
            <li className="ml-auto"><Link href="/disasterinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'disasterinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li className="ml-auto"><Link href="/asset"><Button variant="ghost" className={`gap-2 ${activePage === 'asset' ? 'text-blue-900 font-bold text-lg' : ''}`}><Building2 size={18} />Asset management</Button></Link></li>
            <li className="ml-auto"><Link href="/riskmap"><Button variant="ghost" className={`gap-2 ${activePage === 'riskmap' ? 'text-blue-900 font-bold text-lg' : ''}`}><Map size={18} />Risk map</Button></Link></li>
            <li className="ml-auto"><Link href="/model"><Button variant="ghost" className={`gap-2 ${activePage === 'model' ? 'text-blue-900 font-bold text-lg' : ''}`}><Activity size={18} />Catastrophe model</Button></Link></li>
            <li className="ml-auto"><Link href="/fuzhu"><Button variant="ghost" className={`gap-2 ${activePage === 'fuzhu' ? 'text-blue-900 font-bold text-lg' : ''}`}><Puzzle size={18} />Accessibility</Button></Link></li>
            <li><Link href="/usercenter"><Button variant="ghost" className={`gap-2 ${activePage === 'usercenter' ? 'text-blue-900 font-bold text-lg' : ''}`}><User size={18} />User centre</Button></Link></li>
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
    <div className="absolute bottom-4 left-4 z-[1000] bg-white p-4 rounded-lg shadow-lg border">
      <h3 className="text-lg font-semibold mb-2">Legend (m)</h3>
      <div className="flex flex-col space-y-1">
        {legendData.map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-3">
            <div 
              className="w-5 h-5 border border-gray-400" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


// 7. Main Component
export default function Component() {
  const router = useRouter();
  const mapRef = useRef(null);
  
  // Region management
  const { regionConfig, currentRegion } = useRegion();
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]);
  const [mapZoom, setMapZoom] = useState(11);
  
  // Update map center when region changes
  useEffect(() => {
    if (regionConfig && regionConfig.coordinates.center) {
      const newCenter: [number, number] = [
        regionConfig.coordinates.center[0],
        regionConfig.coordinates.center[1]
      ];
      setMapCenter(newCenter);
      
      const zoomLevels = {
        'worldwide': 3,
        'hk': 11,
        'mo': 12,
        'gba': 9,
        'th': 6,
        'vn': 6,
        'my': 6
      };
      setMapZoom(zoomLevels[currentRegion] || 10);
      
      if (mapRef.current) {
        mapRef.current.flyTo(newCenter, zoomLevels[currentRegion] || 10, {
          duration: 1.5
        });
      }
      
      console.log(`✈️ [Disaster Repository] Map center updated to ${regionConfig.nameEn}:`, newCenter);
    }
  }, [regionConfig, currentRegion]);
  
  // 退出登录处理
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
  // 历史事件数据（从 JSON 加载或直接使用 mock）
  const [historicalEvents, setHistoricalEvents] = useState(mockHistoricalEvents);
  const [filteredHistoricalEvents, setFilteredHistoricalEvents] = useState(mockHistoricalEvents);
  
  // 随机事件数据
  const [stochasticEvents, setStochasticEvents] = useState(mockStochasticEvents);
  const [filteredStochasticEvents, setFilteredStochasticEvents] = useState(mockStochasticEvents);
  
  // API 加载状态
  const [isLoadingFromBackend, setIsLoadingFromBackend] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  
  // 当前激活的事件类型：'historical' 或 'stochastic'
  const [activeEventCategory, setActiveEventCategory] = useState<'historical' | 'stochastic'>('historical');
  
  // 历史事件筛选条件
  const [historicalFilter, setHistoricalFilter] = useState({
    eventType: 'all',
    yearFrom: '',
    yearTo: '',
    impactAreaLevel1: 'all',
    impactAreaLevel2: 'all',
    impactAreaLevel3: 'all',
  });
  
  // 随机事件筛选条件
  const [stochasticFilter, setStochasticFilter] = useState({
    eventType: 'all',
    yearFrom: '',
    yearTo: '',
    impactAreaLevel1: 'all',
    impactAreaLevel2: 'all',
    impactAreaLevel3: 'all',
  });
  
  // 随机事件 WMS 图层显示状态
  const [stochasticLayersVisible, setStochasticLayersVisible] = useState({
    typhoon: false,
    rainstorm: false,
    flood: false,
    stormSurge: false,
    landslide: false,
  });
  
  const [visibleLayers, setVisibleLayers] = useState({
    flood500yr: false,
    flood200yr: false,
    flood100yr: false,
    flood50yr: false,
    flood20yr: false,
    buildingRisk: false,
    boundary: false,
    annualrainfall: false,
  });

  // 当前选中的事件
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  // 从后端 API 加载事件数据
  useEffect(() => {
    const loadEventsFromBackend = async () => {
      try {
        setIsLoadingFromBackend(true);
        setBackendError(null);
        
        console.log('Loading events from backend API...');
        const result = await getEvents();
        
        if (result.success && result.data) {
          console.log('Backend API response:', result.data);
          
          // 更新历史事件
          if (result.data.historical && result.data.historical.length > 0) {
            console.log(`Loaded ${result.data.historical.length} historical events from backend`);
            setHistoricalEvents(result.data.historical);
            setFilteredHistoricalEvents(result.data.historical);
          }
          
          // 更新随机事件
          if (result.data.stochastic && result.data.stochastic.length > 0) {
            console.log(`Loaded ${result.data.stochastic.length} stochastic events from backend`);
            setStochasticEvents(result.data.stochastic);
            setFilteredStochasticEvents(result.data.stochastic);
          }
          
          console.log('✓ Events loaded successfully from backend');
        } else {
          console.warn('Backend API returned no data or failed, using mock data');
          setBackendError('Using local mock data');
        }
      } catch (error) {
        console.error('Error loading events from backend:', error);
        setBackendError('Failed to load from backend, using mock data');
      } finally {
        setIsLoadingFromBackend(false);
      }
    };

    loadEventsFromBackend();
  }, []); // 只在组件挂载时执行一次

  // 历史事件筛选逻辑
  useEffect(() => {
    let filtered = historicalEvents;
    
    // 按事件类型筛选
    if (historicalFilter.eventType !== 'all') {
      filtered = filtered.filter(event => 
        event.type.toLowerCase() === historicalFilter.eventType.toLowerCase()
      );
    }
    
    // 按年份范围筛选
    if (historicalFilter.yearFrom) {
      filtered = filtered.filter(event => 
        event.year >= parseInt(historicalFilter.yearFrom)
      );
    }
    if (historicalFilter.yearTo) {
      filtered = filtered.filter(event => 
        event.year <= parseInt(historicalFilter.yearTo)
      );
    }
    
    // 按影响区域筛选（一级）
    if (historicalFilter.impactAreaLevel1 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level1 === historicalFilter.impactAreaLevel1
      );
    }
    
    // 按影响区域筛选（二级）
    if (historicalFilter.impactAreaLevel2 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level2 === historicalFilter.impactAreaLevel2
      );
    }
    
    // 按影响区域筛选（三级）
    if (historicalFilter.impactAreaLevel3 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level3 === historicalFilter.impactAreaLevel3
      );
    }
    
    setFilteredHistoricalEvents(filtered);
  }, [historicalFilter, historicalEvents]);

  // 随机事件筛选逻辑
  useEffect(() => {
    let filtered = stochasticEvents;
    
    // 按事件类型筛选
    if (stochasticFilter.eventType !== 'all') {
      filtered = filtered.filter(event => 
        event.type.toLowerCase() === stochasticFilter.eventType.toLowerCase()
      );
    }
    
    // 按年份范围筛选
    if (stochasticFilter.yearFrom) {
      filtered = filtered.filter(event => 
        event.year >= parseInt(stochasticFilter.yearFrom)
      );
    }
    if (stochasticFilter.yearTo) {
      filtered = filtered.filter(event => 
        event.year <= parseInt(stochasticFilter.yearTo)
      );
    }
    
    // 按影响区域筛选（一级）
    if (stochasticFilter.impactAreaLevel1 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level1 === stochasticFilter.impactAreaLevel1
      );
    }
    
    // 按影响区域筛选（二级）
    if (stochasticFilter.impactAreaLevel2 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level2 === stochasticFilter.impactAreaLevel2
      );
    }
    
    // 按影响区域筛选（三级）
    if (stochasticFilter.impactAreaLevel3 !== 'all') {
      filtered = filtered.filter(event => 
        event.impactArea?.level3 === stochasticFilter.impactAreaLevel3
      );
    }
    
    setFilteredStochasticEvents(filtered);
  }, [stochasticFilter, stochasticEvents]);

  const handleLayerToggle = (layerKey: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    
    // 如果事件有坐标，将地图移动到该位置
    if (event && event.geometry && event.geometry.coordinates && mapRef.current) {
      const [lng, lat] = event.geometry.coordinates;
      const map = mapRef.current;
      if (map) {
        // 移动地图到事件位置并放大
        map.setView([lat, lng], 13, { animate: true });
      }
    }
  };

  // 更新历史事件筛选条件
  const handleHistoricalFilterChange = (field: string, value: string) => {
    setHistoricalFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 更新随机事件筛选条件
  const handleStochasticFilterChange = (field: string, value: string) => {
    setStochasticFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 清除筛选条件
  const clearHistoricalFilter = () => {
    setHistoricalFilter({
      eventType: 'all',
      yearFrom: '',
      yearTo: '',
      impactAreaLevel1: 'all',
      impactAreaLevel2: 'all',
      impactAreaLevel3: 'all',
    });
  };
  
  const clearStochasticFilter = () => {
    setStochasticFilter({
      eventType: 'all',
      yearFrom: '',
      yearTo: '',
      impactAreaLevel1: 'all',
      impactAreaLevel2: 'all',
      impactAreaLevel3: 'all',
    });
  };

  // 导出事件详情为PDF
  const handleExportEventDetails = async () => {
    if (!selectedEvent) return;

    try {
      // 创建PDF文档 (A4尺寸)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // 添加标题
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Event Details Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // 添加事件基本信息
      pdf.setFontSize(16);
      pdf.text(selectedEvent.name, 20, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${selectedEvent.type} • ${selectedEvent.date}`, 20, yPosition);
      yPosition += 10;

      // 添加分隔线
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // 添加影响概况
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Impact Summary', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Max Wind Speed: ${selectedEvent.maxWindSpeed}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Total Rainfall: ${selectedEvent.totalRainfall}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Estimated Loss: ${selectedEvent.estimatedLoss}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Affected Population: ${selectedEvent.affectedPopulation}`, 20, yPosition);
      yPosition += 10;

      // 添加受影响地区
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Affected Areas', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      selectedEvent.affectedAreas.forEach((area) => {
        pdf.text(`• ${area}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 5;

      // 截取地图
      const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
      if (mapElement) {
        try {
          // 等待地图图块加载完成
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 使用html2canvas截图地图
          const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: 2 // 提高截图质量
          });

          const imgData = canvas.toDataURL('image/png');
          
          // 计算图片尺寸 (保持宽高比)
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // 如果当前页面空间不够，添加新页面
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          // 添加地图标题
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Event Location Map', 20, yPosition);
          yPosition += 8;

          // 添加地图图片
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        } catch (error) {
          console.error('Failed to capture map:', error);
          pdf.setFontSize(10);
          pdf.setTextColor(255, 0, 0);
          pdf.text('(Map capture failed)', 20, yPosition);
        }
      }

      // 添加页脚
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // 下载PDF
      const fileName = `Event_${selectedEvent.id}_${selectedEvent.date}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to export event details. Please try again.');
    }
  };

  // 下载事件元数据为JSON
  const handleDownloadEventMetadata = () => {
    if (!selectedEvent) {
      alert('Please select an event first.');
      return;
    }

    try {
      // 创建事件元数据对象
      const metadata = {
        id: selectedEvent.id,
        name: selectedEvent.name,
        type: selectedEvent.type,
        date: selectedEvent.date,
        year: selectedEvent.year,
        impactArea: selectedEvent.impactArea,
        maxWindSpeed: selectedEvent.maxWindSpeed,
        totalRainfall: selectedEvent.totalRainfall,
        estimatedLoss: selectedEvent.estimatedLoss,
        affectedPopulation: selectedEvent.affectedPopulation,
        affectedAreas: selectedEvent.affectedAreas,
        geometry: selectedEvent.geometry,
        category: activeEventCategory, // 标记是Historical还是Stochastic
        exportDate: new Date().toISOString(),
      };

      // 转换为JSON字符串（格式化，便于阅读）
      const jsonString = JSON.stringify(metadata, null, 2);

      // 创建Blob对象
      const blob = new Blob([jsonString], { type: 'application/json' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Event_Metadata_${selectedEvent.id}_${selectedEvent.date}.json`;

      // 触发下载
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading metadata:', error);
      alert('Failed to download event metadata. Please try again.');
    }
  };

  // Event Upload - 支持多种格式（JSON, TIFF, 二进制等）
  const handleUploadEventMetadata = () => {
    try {
      // 创建文件选择器 - 支持多种格式
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.tif,.tiff,.bin,.dat,.geojson,.shp,.shx,.dbf,.prj,.kml'; // 支持多种地理数据格式
      input.multiple = true; // 允许多文件选择
      input.style.display = 'none';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        
        if (!files || files.length === 0) return;

        // 检查是否是 shapefile 组合
        const fileArray = Array.from(files);
        const fileNames = fileArray.map(f => f.name.toLowerCase());
        const hasShp = fileNames.some(name => name.endsWith('.shp'));
        const hasShx = fileNames.some(name => name.endsWith('.shx'));
        const hasDbf = fileNames.some(name => name.endsWith('.dbf'));

        // 如果检测到 shapefile 组件，处理为 shapefile
        if (hasShp && hasShx && hasDbf) {
          handleShapefileUpload(fileArray);
          return;
        }

        // 如果选择了多个文件但不是 shapefile 组合
        if (files.length > 1) {
          alert(
            'Multiple files selected, but not a valid shapefile set.\n\n' +
            'For shapefile upload, please select:\n' +
            '- .shp (required)\n' +
            '- .shx (required)\n' +
            '- .dbf (required)\n' +
            '- .prj (optional)\n\n' +
            'For other formats, please upload one file at a time.'
          );
          return;
        }

        // 单文件上传的原有逻辑
        const file = files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        console.log(`Uploading file: ${file.name}, type: ${file.type}, extension: ${fileExtension}`);

        // 根据文件类型选择处理方式
        switch (fileExtension) {
          case 'json':
          case 'geojson':
            handleJSONUpload(file);
            break;
          
          case 'tif':
          case 'tiff':
            handleTIFFUpload(file);
            break;
          
          case 'bin':
          case 'dat':
            handleBinaryUpload(file);
            break;
          
          case 'shp':
          case 'shx':
          case 'dbf':
            alert(
              'Shapefile upload requires multiple files.\n\n' +
              'Please select all required files together:\n' +
              '- .shp (geometry)\n' +
              '- .shx (index)\n' +
              '- .dbf (attributes)\n' +
              '- .prj (projection, optional)'
            );
            break;
          
          case 'kml':
            handleKMLUpload(file);
            break;
          
          default:
            alert(
              `Unsupported file format: .${fileExtension}\n\n` +
              `Supported formats:\n` +
              `- JSON/GeoJSON (metadata)\n` +
              `- TIFF (raster data)\n` +
              `- BIN/DAT (binary data)\n` +
              `- SHP (shapefile - select .shp, .shx, .dbf together)\n` +
              `- KML (Google Earth)`
            );
        }
      };

      // 触发文件选择
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);

    } catch (error) {
      console.error('Error uploading metadata:', error);
      alert('Failed to upload event metadata. Please try again.');
    }
  };

  // 处理JSON格式文件
  const handleJSONUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const jsonText = event.target?.result as string;
        const uploadedEvent = JSON.parse(jsonText);

        // 验证必需字段
        if (!uploadedEvent.id || !uploadedEvent.name || !uploadedEvent.type) {
          alert('Invalid event file: Missing required fields (id, name, type).');
          return;
        }

        // 确定事件类别
        const category = uploadedEvent.category || 'historical';

        // ========== 保存到后端 API ==========
        console.log('Saving event to backend...', uploadedEvent);
        const saveResult = await createEvent(uploadedEvent, category);
        
        if (!saveResult.success) {
          alert(`Failed to save event to backend: ${saveResult.error}\n\nThe event will only be available in this session.`);
        } else {
          console.log('✓ Event saved to backend successfully');
        }
        // ====================================

        // 更新前端状态
        if (category === 'historical') {
          const existing = historicalEvents.find(e => e.id === uploadedEvent.id);
          if (existing) {
            setHistoricalEvents(prev => 
              prev.map(e => e.id === uploadedEvent.id ? uploadedEvent : e)
            );
          } else {
            setHistoricalEvents(prev => [...prev, uploadedEvent]);
          }
        } else {
          const existing = stochasticEvents.find(e => e.id === uploadedEvent.id);
          if (existing) {
            setStochasticEvents(prev => 
              prev.map(e => e.id === uploadedEvent.id ? uploadedEvent : e)
            );
          } else {
            setStochasticEvents(prev => [...prev, uploadedEvent]);
          }
        }

        // 自动选中上传的事件
        setActiveEventCategory(category);
        setSelectedEvent(uploadedEvent);

        alert(
          `Event "${uploadedEvent.name}" uploaded successfully!\n\n` +
          `Format: JSON\n` +
          `Category: ${category}\n` +
          `Event ID: ${uploadedEvent.id}\n` +
          `Backend Status: ${saveResult.success ? 'Saved ✓' : 'Not saved ✗'}`
        );

      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Failed to parse JSON file. Please ensure it is a valid event metadata file.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };

    reader.readAsText(file);
  };

  // 处理TIFF格式文件（栅格数据）
  const handleTIFFUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // 这里可以使用 geotiff.js 库来解析TIFF文件
        // import GeoTIFF from 'geotiff';
        // const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        
        console.log('TIFF file loaded:', {
          name: file.name,
          size: file.size,
          type: file.type,
          bufferSize: arrayBuffer.byteLength
        });

        // 临时处理：创建一个事件对象来存储TIFF引用
        const eventId = `TIFF-${Date.now()}`;
        const tiffEvent = {
          id: eventId,
          name: file.name.replace(/\.(tif|tiff)$/i, ''),
          type: 'Raster Data',
          date: new Date().toISOString().split('T')[0],
          year: new Date().getFullYear(),
          dataFormat: 'TIFF',
          fileSize: `${(file.size / 1024).toFixed(2)} KB`,
          geometry: {
            type: 'Point',
            coordinates: [114.1694, 22.3193] // 默认坐标，实际应从TIFF元数据提取
          },
          category: 'historical',
          // 存储二进制数据的引用（实际应用中应该上传到服务器）
          rasterData: {
            buffer: arrayBuffer,
            fileName: file.name,
            mimeType: file.type
          }
        };

        // 添加事件
        setHistoricalEvents(prev => [...prev, tiffEvent]);
        setActiveEventCategory('historical');
        setSelectedEvent(tiffEvent);

        alert(
          `TIFF file uploaded successfully!\n\n` +
          `File: ${file.name}\n` +
          `Size: ${(file.size / 1024).toFixed(2)} KB\n` +
          `Event ID: ${eventId}\n\n` +
          `Note: TIFF data is loaded in memory. In production, this should be uploaded to a server.`
        );

      } catch (error) {
        console.error('Error processing TIFF:', error);
        alert('Failed to process TIFF file. Please ensure it is a valid GeoTIFF file.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read TIFF file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  // 处理二进制数据文件
  const handleBinaryUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const dataView = new DataView(arrayBuffer);
        
        console.log('Binary file loaded:', {
          name: file.name,
          size: file.size,
          bufferSize: arrayBuffer.byteLength,
          firstBytes: Array.from(new Uint8Array(arrayBuffer.slice(0, 16)))
        });

        // 创建事件对象
        const eventId = `BIN-${Date.now()}`;
        const binaryEvent = {
          id: eventId,
          name: file.name.replace(/\.(bin|dat)$/i, ''),
          type: 'Binary Data',
          date: new Date().toISOString().split('T')[0],
          year: new Date().getFullYear(),
          dataFormat: file.name.endsWith('.bin') ? 'BIN' : 'DAT',
          fileSize: `${(file.size / 1024).toFixed(2)} KB`,
          geometry: {
            type: 'Point',
            coordinates: [114.1694, 22.3193]
          },
          category: 'historical',
          binaryData: {
            buffer: arrayBuffer,
            fileName: file.name,
            byteLength: arrayBuffer.byteLength
          }
        };

        setHistoricalEvents(prev => [...prev, binaryEvent]);
        setActiveEventCategory('historical');
        setSelectedEvent(binaryEvent);

        alert(
          `Binary file uploaded successfully!\n\n` +
          `File: ${file.name}\n` +
          `Size: ${(file.size / 1024).toFixed(2)} KB\n` +
          `Event ID: ${eventId}\n\n` +
          `Note: Binary data is loaded in memory.`
        );

      } catch (error) {
        console.error('Error processing binary file:', error);
        alert('Failed to process binary file.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read binary file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  // 处理Shapefile（需要配套的.shp, .shx, .dbf文件）
  const handleShapefileUpload = (files: File[]) => {
    // 查找必需的文件
    const shpFile = files.find(f => f.name.toLowerCase().endsWith('.shp'));
    const shxFile = files.find(f => f.name.toLowerCase().endsWith('.shx'));
    const dbfFile = files.find(f => f.name.toLowerCase().endsWith('.dbf'));
    const prjFile = files.find(f => f.name.toLowerCase().endsWith('.prj'));

    if (!shpFile || !shxFile || !dbfFile) {
      alert(
        'Incomplete shapefile set.\n\n' +
        'Required files:\n' +
        `- .shp: ${shpFile ? '✓' : '✗'}\n` +
        `- .shx: ${shxFile ? '✓' : '✗'}\n` +
        `- .dbf: ${dbfFile ? '✓' : '✗'}\n` +
        `- .prj: ${prjFile ? '✓' : '(optional)'}\n\n` +
        'Please select all required files together.'
      );
      return;
    }

    // 读取文件内容
    const readers = {
      shp: new FileReader(),
      shx: new FileReader(),
      dbf: new FileReader(),
      prj: prjFile ? new FileReader() : null
    };

    const fileContents: {
      shp?: ArrayBuffer;
      shx?: ArrayBuffer;
      dbf?: ArrayBuffer;
      prj?: string;
    } = {};

    let loadedCount = 0;
    const totalFiles = prjFile ? 4 : 3;

    const processShapefile = () => {
      try {
        console.log('Shapefile components loaded:', {
          shp: fileContents.shp?.byteLength,
          shx: fileContents.shx?.byteLength,
          dbf: fileContents.dbf?.byteLength,
          prj: fileContents.prj?.length
        });

        alert(
          'Shapefile uploaded successfully!\n\n' +
          `Files:\n` +
          `- ${shpFile.name} (${(shpFile.size / 1024).toFixed(2)} KB)\n` +
          `- ${shxFile.name} (${(shxFile.size / 1024).toFixed(2)} KB)\n` +
          `- ${dbfFile.name} (${(dbfFile.size / 1024).toFixed(2)} KB)\n` +
          (prjFile ? `- ${prjFile.name} (${(prjFile.size / 1024).toFixed(2)} KB)\n` : '') +
          '\n' +
          'Note: Full shapefile parsing requires a specialized library.\n' +
          'For now, please convert to GeoJSON for complete feature support.\n\n' +
          'Recommended tools:\n' +
          '- QGIS (desktop)\n' +
          '- mapshaper.org (online)\n' +
          '- ogr2ogr (command line)'
        );

        // TODO: 使用 shpjs 或类似库解析 shapefile
        // import('shpjs').then(shp => {
        //   shp(fileContents.shp).then(geojson => {
        //     // 处理 GeoJSON 数据
        //   });
        // });

      } catch (error) {
        console.error('Error processing shapefile:', error);
        alert('Failed to process shapefile. Please try converting to GeoJSON format.');
      }
    };

    // 读取 .shp
    readers.shp.onload = (e) => {
      fileContents.shp = e.target?.result as ArrayBuffer;
      loadedCount++;
      if (loadedCount === totalFiles) processShapefile();
    };
    readers.shp.readAsArrayBuffer(shpFile);

    // 读取 .shx
    readers.shx.onload = (e) => {
      fileContents.shx = e.target?.result as ArrayBuffer;
      loadedCount++;
      if (loadedCount === totalFiles) processShapefile();
    };
    readers.shx.readAsArrayBuffer(shxFile);

    // 读取 .dbf
    readers.dbf.onload = (e) => {
      fileContents.dbf = e.target?.result as ArrayBuffer;
      loadedCount++;
      if (loadedCount === totalFiles) processShapefile();
    };
    readers.dbf.readAsArrayBuffer(dbfFile);

    // 读取 .prj (如果存在)
    if (readers.prj && prjFile) {
      readers.prj.onload = (e) => {
        fileContents.prj = e.target?.result as string;
        loadedCount++;
        if (loadedCount === totalFiles) processShapefile();
      };
      readers.prj.readAsText(prjFile);
    }
  };

  // 处理KML文件（Google Earth格式）
  const handleKMLUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const kmlText = event.target?.result as string;
        
        // 简单的KML解析（实际应使用专门的库如 togeojson）
        console.log('KML content loaded:', kmlText.substring(0, 500));

        alert(
          'KML file format detected.\n\n' +
          'For now, please:\n' +
          '1. Convert KML to GeoJSON using online tools\n' +
          '2. Upload the GeoJSON file instead\n\n' +
          'Full KML parsing will be added in a future version.'
        );

      } catch (error) {
        console.error('Error processing KML:', error);
        alert('Failed to process KML file.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header onLogout={handleLogout} activePage="disasterinfo" />

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- Left Sidebar --- */}
        <aside className="w-80 flex-shrink-0 border-r bg-white pl-8 pr-8 py-4 overflow-y-auto space-y-1">

          {/* 切换事件类别 */}
          <div className="flex gap-2 mb-4">
            <Button 
              variant={activeEventCategory === 'historical' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setActiveEventCategory('historical')}
            >
              Historical Events
            </Button>
            <Button 
              variant={activeEventCategory === 'stochastic' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setActiveEventCategory('stochastic')}
            >
              Stochastic Events
            </Button>
          </div>

          {/* 历史事件筛选 */}
          {activeEventCategory === 'historical' && (
            <>
              <h2 className="text-xl font-bold mb-2 pl-2 mt-36">Historical Events Filtering</h2>
              <Card>
                <CardContent className="space-y-3">
                  {/* 1. Event Type */}
                  <div className="space-y-1">
                    <Label htmlFor="hist-event-type" className="text-sm font-semibold">1. Event Type</Label>
                    <Select 
                      value={historicalFilter.eventType}
                      onValueChange={(value) => handleHistoricalFilterChange('eventType', value)}
                    >
                      <SelectTrigger id="hist-event-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="typhoon">Typhoon</SelectItem>
                        <SelectItem value="rainstorm">Rainstorm</SelectItem>
                        <SelectItem value="flood">Flood</SelectItem>
                        <SelectItem value="stormsurge">Storm Surge</SelectItem>
                        <SelectItem value="landslide">Landslide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Time Range */}
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">2. Time (1850 - Present)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="From Year"
                        min="1850"
                        max={new Date().getFullYear()}
                        value={historicalFilter.yearFrom}
                        onChange={(e) => handleHistoricalFilterChange('yearFrom', e.target.value)}
                      />
                      <Input 
                        type="number" 
                        placeholder="To Year"
                        min="1850"
                        max={new Date().getFullYear()}
                        value={historicalFilter.yearTo}
                        onChange={(e) => handleHistoricalFilterChange('yearTo', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. Impact Area */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">3. Impact Area</Label>
                    
                    {/* Level 1 - Region */}
                    <Select 
                      value={historicalFilter.impactAreaLevel1}
                      onValueChange={(value) => handleHistoricalFilterChange('impactAreaLevel1', value)}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 1 - All Regions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 1 - All Regions</SelectItem>
                        <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                        <SelectItem value="Macau">Macau</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Level 2 - Area */}
                    <Select 
                      value={historicalFilter.impactAreaLevel2}
                      onValueChange={(value) => handleHistoricalFilterChange('impactAreaLevel2', value)}
                      disabled={historicalFilter.impactAreaLevel1 === 'all'}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 2 - All Areas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 2 - All Areas</SelectItem>
                        {historicalFilter.impactAreaLevel1 === 'Hong Kong' && (
                          <>
                            <SelectItem value="Hong Kong Island">Hong Kong Island</SelectItem>
                            <SelectItem value="Kowloon">Kowloon</SelectItem>
                            <SelectItem value="New Territories">New Territories</SelectItem>
                          </>
                        )}
                        {historicalFilter.impactAreaLevel1 === 'Macau' && (
                          <>
                            <SelectItem value="Macau Peninsula">Macau Peninsula</SelectItem>
                            <SelectItem value="Taipa">Taipa</SelectItem>
                            <SelectItem value="Coloane">Coloane</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Level 3 - District */}
                    <Select 
                      value={historicalFilter.impactAreaLevel3}
                      onValueChange={(value) => handleHistoricalFilterChange('impactAreaLevel3', value)}
                      disabled={historicalFilter.impactAreaLevel2 === 'all'}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 3 - All Districts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 3 - All Districts</SelectItem>
                        {/* Hong Kong 18 Districts */}
                        {historicalFilter.impactAreaLevel1 === 'Hong Kong' && historicalFilter.impactAreaLevel2 === 'Hong Kong Island' && (
                          <>
                            <SelectItem value="Central and Western">Central and Western</SelectItem>
                            <SelectItem value="Wan Chai">Wan Chai</SelectItem>
                            <SelectItem value="Eastern">Eastern</SelectItem>
                            <SelectItem value="Southern">Southern</SelectItem>
                          </>
                        )}
                        {historicalFilter.impactAreaLevel1 === 'Hong Kong' && historicalFilter.impactAreaLevel2 === 'Kowloon' && (
                          <>
                            <SelectItem value="Yau Tsim Mong">Yau Tsim Mong</SelectItem>
                            <SelectItem value="Sham Shui Po">Sham Shui Po</SelectItem>
                            <SelectItem value="Kowloon City">Kowloon City</SelectItem>
                            <SelectItem value="Wong Tai Sin">Wong Tai Sin</SelectItem>
                            <SelectItem value="Kwun Tong">Kwun Tong</SelectItem>
                          </>
                        )}
                        {historicalFilter.impactAreaLevel1 === 'Hong Kong' && historicalFilter.impactAreaLevel2 === 'New Territories' && (
                          <>
                            <SelectItem value="Kwai Tsing">Kwai Tsing</SelectItem>
                            <SelectItem value="Tsuen Wan">Tsuen Wan</SelectItem>
                            <SelectItem value="Tuen Mun">Tuen Mun</SelectItem>
                            <SelectItem value="Yuen Long">Yuen Long</SelectItem>
                            <SelectItem value="North">North</SelectItem>
                            <SelectItem value="Tai Po">Tai Po</SelectItem>
                            <SelectItem value="Sha Tin">Sha Tin</SelectItem>
                            <SelectItem value="Sai Kung">Sai Kung</SelectItem>
                            <SelectItem value="Islands">Islands</SelectItem>
                          </>
                        )}
                        {/* Macau Districts */}
                        {historicalFilter.impactAreaLevel1 === 'Macau' && historicalFilter.impactAreaLevel2 === 'Macau Peninsula' && (
                          <>
                            <SelectItem value="Nossa Senhora de Fátima">Nossa Senhora de Fátima</SelectItem>
                            <SelectItem value="Santo António">Santo António</SelectItem>
                            <SelectItem value="São Lázaro">São Lázaro</SelectItem>
                            <SelectItem value="Sé">Sé</SelectItem>
                            <SelectItem value="São Lourenço">São Lourenço</SelectItem>
                          </>
                        )}
                        {historicalFilter.impactAreaLevel1 === 'Macau' && historicalFilter.impactAreaLevel2 === 'Taipa' && (
                          <SelectItem value="Our Lady of Carmel">Our Lady of Carmel</SelectItem>
                        )}
                        {historicalFilter.impactAreaLevel1 === 'Macau' && historicalFilter.impactAreaLevel2 === 'Coloane' && (
                          <SelectItem value="St. Francis Xavier">St. Francis Xavier</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={clearHistoricalFilter}
                  >
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>

              {/* 后端加载状态提示 */}
              {isLoadingFromBackend && (
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">📡 Loading events from backend...</p>
                </div>
              )}

              {backendError && !isLoadingFromBackend && (
                <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ {backendError}
                  </p>
                </div>
              )}

              {/* Event List - Dropdown */}
              <div className="mt-12">
                <h2 className="text-xl font-bold mb-2 pl-2">
                  Event List <span className="text-sm font-normal text-gray-500">({filteredHistoricalEvents.length} events)</span>
                </h2>
                <Select 
                  value={selectedEvent?.id || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedEvent(null);
                    } else {
                      const event = filteredHistoricalEvents.find(e => e.id === value);
                      if (event) handleSelectEvent(event);
                    }
                  }}
                >
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Select an event to view details" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select an event --</SelectItem>
                    {filteredHistoricalEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({event.type} • {event.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 随机事件筛选 */}
          {activeEventCategory === 'stochastic' && (
            <>
              <h2 className="text-xl font-bold mb-2 pl-2 mt-36">Stochastic Events Filtering</h2>
              <Card>
                <CardContent className="space-y-3">
                  {/* 1. Event Type */}
                  <div className="space-y-1">
                    <Label htmlFor="stoch-event-type" className="text-sm font-semibold">1. Event Type</Label>
                    <Select 
                      value={stochasticFilter.eventType}
                      onValueChange={(value) => handleStochasticFilterChange('eventType', value)}
                    >
                      <SelectTrigger id="stoch-event-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="typhoon">Typhoon</SelectItem>
                        <SelectItem value="rainstorm">Rainstorm</SelectItem>
                        <SelectItem value="flood">Flood</SelectItem>
                        <SelectItem value="stormsurge">Storm Surge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Time Range (1-10000 years) */}
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">2. Time (Year 1 - 10000)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="From"
                        min="1"
                        max="10000"
                        value={stochasticFilter.yearFrom}
                        onChange={(e) => handleStochasticFilterChange('yearFrom', e.target.value)}
                      />
                      <Input 
                        type="number" 
                        placeholder="To"
                        min="1"
                        max="10000"
                        value={stochasticFilter.yearTo}
                        onChange={(e) => handleStochasticFilterChange('yearTo', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. Impact Area */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">3. Impact Area</Label>
                    
                    {/* Level 1 - Region */}
                    <Select 
                      value={stochasticFilter.impactAreaLevel1}
                      onValueChange={(value) => handleStochasticFilterChange('impactAreaLevel1', value)}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 1 - All Regions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 1 - All Regions</SelectItem>
                        <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                        <SelectItem value="Macau">Macau</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Level 2 - Area */}
                    <Select 
                      value={stochasticFilter.impactAreaLevel2}
                      onValueChange={(value) => handleStochasticFilterChange('impactAreaLevel2', value)}
                      disabled={stochasticFilter.impactAreaLevel1 === 'all'}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 2 - All Areas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 2 - All Areas</SelectItem>
                        {stochasticFilter.impactAreaLevel1 === 'Hong Kong' && (
                          <>
                            <SelectItem value="Hong Kong Island">Hong Kong Island</SelectItem>
                            <SelectItem value="Kowloon">Kowloon</SelectItem>
                            <SelectItem value="New Territories">New Territories</SelectItem>
                          </>
                        )}
                        {stochasticFilter.impactAreaLevel1 === 'Macau' && (
                          <>
                            <SelectItem value="Macau Peninsula">Macau Peninsula</SelectItem>
                            <SelectItem value="Taipa">Taipa</SelectItem>
                            <SelectItem value="Coloane">Coloane</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Level 3 - District */}
                    <Select 
                      value={stochasticFilter.impactAreaLevel3}
                      onValueChange={(value) => handleStochasticFilterChange('impactAreaLevel3', value)}
                      disabled={stochasticFilter.impactAreaLevel2 === 'all'}
                    >
                      <SelectTrigger><SelectValue placeholder="Level 3 - All Districts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Level 3 - All Districts</SelectItem>
                        {/* Hong Kong 18 Districts */}
                        {stochasticFilter.impactAreaLevel1 === 'Hong Kong' && stochasticFilter.impactAreaLevel2 === 'Hong Kong Island' && (
                          <>
                            <SelectItem value="Central and Western">Central and Western</SelectItem>
                            <SelectItem value="Wan Chai">Wan Chai</SelectItem>
                            <SelectItem value="Eastern">Eastern</SelectItem>
                            <SelectItem value="Southern">Southern</SelectItem>
                          </>
                        )}
                        {stochasticFilter.impactAreaLevel1 === 'Hong Kong' && stochasticFilter.impactAreaLevel2 === 'Kowloon' && (
                          <>
                            <SelectItem value="Yau Tsim Mong">Yau Tsim Mong</SelectItem>
                            <SelectItem value="Sham Shui Po">Sham Shui Po</SelectItem>
                            <SelectItem value="Kowloon City">Kowloon City</SelectItem>
                            <SelectItem value="Wong Tai Sin">Wong Tai Sin</SelectItem>
                            <SelectItem value="Kwun Tong">Kwun Tong</SelectItem>
                          </>
                        )}
                        {stochasticFilter.impactAreaLevel1 === 'Hong Kong' && stochasticFilter.impactAreaLevel2 === 'New Territories' && (
                          <>
                            <SelectItem value="Kwai Tsing">Kwai Tsing</SelectItem>
                            <SelectItem value="Tsuen Wan">Tsuen Wan</SelectItem>
                            <SelectItem value="Tuen Mun">Tuen Mun</SelectItem>
                            <SelectItem value="Yuen Long">Yuen Long</SelectItem>
                            <SelectItem value="North">North</SelectItem>
                            <SelectItem value="Tai Po">Tai Po</SelectItem>
                            <SelectItem value="Sha Tin">Sha Tin</SelectItem>
                            <SelectItem value="Sai Kung">Sai Kung</SelectItem>
                            <SelectItem value="Islands">Islands</SelectItem>
                          </>
                        )}
                        {/* Macau Districts */}
                        {stochasticFilter.impactAreaLevel1 === 'Macau' && stochasticFilter.impactAreaLevel2 === 'Macau Peninsula' && (
                          <>
                            <SelectItem value="Nossa Senhora de Fátima">Nossa Senhora de Fátima</SelectItem>
                            <SelectItem value="Santo António">Santo António</SelectItem>
                            <SelectItem value="São Lázaro">São Lázaro</SelectItem>
                            <SelectItem value="Sé">Sé</SelectItem>
                            <SelectItem value="São Lourenço">São Lourenço</SelectItem>
                          </>
                        )}
                        {stochasticFilter.impactAreaLevel1 === 'Macau' && stochasticFilter.impactAreaLevel2 === 'Taipa' && (
                          <SelectItem value="Our Lady of Carmel">Our Lady of Carmel</SelectItem>
                        )}
                        {stochasticFilter.impactAreaLevel1 === 'Macau' && stochasticFilter.impactAreaLevel2 === 'Coloane' && (
                          <SelectItem value="St. Francis Xavier">St. Francis Xavier</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={clearStochasticFilter}
                  >
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>

              {/* 后端加载状态提示 */}
              {isLoadingFromBackend && (
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">📡 Loading events from backend...</p>
                </div>
              )}

              {backendError && !isLoadingFromBackend && (
                <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ {backendError}
                  </p>
                </div>
              )}

              {/* Event List - Dropdown */}
              <div className="mt-12">
                <h2 className="text-xl font-bold mb-2 pl-2">
                  Event List <span className="text-sm font-normal text-gray-500">({filteredStochasticEvents.length} events)</span>
                </h2>
                <Select 
                  value={selectedEvent?.id || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedEvent(null);
                    } else {
                      const event = filteredStochasticEvents.find(e => e.id === value);
                      if (event) handleSelectEvent(event);
                    }
                  }}
                >
                  <SelectTrigger id="stoch-event-select">
                    <SelectValue placeholder="Select an event to view details" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select an event --</SelectItem>
                    {filteredStochasticEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({event.type} • Year {event.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Actions Card */}
          <div className="mt-6">
            <Card>
              <CardContent className="flex flex-col space-y-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={handleUploadEventMetadata}
                >
                  Event Upload
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleDownloadEventMetadata}
                  disabled={!selectedEvent}
                >
                  Event Download
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Central Map Area */}
        <main className="flex-1 relative">
          <MapContainer ref={mapRef} center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} className="z-10">
            <TileLayer 
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
            />
            
            {/* 基础 WMS 图层 */}
            {Object.entries(visibleLayers).map(([key, isVisible]) => 
              isVisible && wmsLayersConfig[key] && (
                <WMSTileLayer 
                  key={key} 
                  url="http://143.89.22.7:8090/geoserver/wms" 
                  params={{ 
                    layers: wmsLayersConfig[key].layer, 
                    format: 'image/png', 
                    transparent: true, 
                    version: '1.1.0' 
                  }} 
                  attribution="GeoServer Data" 
                />
              )
            )}
            
            {/* 事件标记点（只显示选中的事件 - Historical或Stochastic） */}
            {selectedEvent && selectedEvent.geometry && selectedEvent.geometry.coordinates && (
              <Marker 
                key={selectedEvent.id} 
                position={[selectedEvent.geometry.coordinates[1], selectedEvent.geometry.coordinates[0]]}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold">{selectedEvent.name}</h3>
                    <p className="text-xs text-gray-600">{selectedEvent.type} • {selectedEvent.date}</p>
                    <p className="mt-1 text-xs">Loss: {selectedEvent.estimatedLoss}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Coordinate Display */}
            <MapCoordinateDisplay />

          </MapContainer>
        </main>

        {/* --- Right Sidebar for Event Details (Only show when event is selected) --- */}
        {selectedEvent && (
          <aside className="w-80 flex-shrink-0 border-l bg-white p-4 overflow-y-auto space-y-1">
            <h2 className="text-xl font-bold mb-2 pl-2">Event Details</h2>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedEvent.name}</CardTitle>
                  <p className="text-sm text-gray-500">{selectedEvent.type} - {selectedEvent.date}</p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Max Wind Speed:</span> <span className="font-medium">{selectedEvent.maxWindSpeed}</span></div>
                  <div className="flex justify-between"><span>Total Rainfall:</span> <span className="font-medium">{selectedEvent.totalRainfall}</span></div>
                  <div className="flex justify-between"><span>Estimated Loss:</span> <span className="font-medium text-red-600">{selectedEvent.estimatedLoss}</span></div>
                  <div className="flex justify-between"><span>Affected Population:</span> <span className="font-medium">{selectedEvent.affectedPopulation}</span></div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Affected Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {selectedEvent.affectedAreas.map(area => <li key={area}>{area}</li>)}
                  </ul>
                </CardContent>
              </Card>

              {/* Event Export */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={handleExportEventDetails}
                  >
                    Export Event Details
                  </Button>
                </CardContent>
              </Card>

            </div>
          </aside>
        )}

      </div>
    </div>
  );
}