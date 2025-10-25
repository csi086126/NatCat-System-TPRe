"use client"

// 1. 导入必要的 React Hooks 和组件
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut, Globe } from 'lucide-react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegion } from '@/contexts/RegionContext';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

// 2. 动态导入 (Lazy Load) Leaflet 地图组件
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });

// 4. 主组件
export default function Component() {
  const router = useRouter();
  const mapRef = useRef(null);
  const { regionConfig, currentRegion } = useRegion();
  
  // 地图中心和缩放状态 - 默认使用 worldwide 视图
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]); // worldwide center
  const [mapZoom, setMapZoom] = useState(3); // worldwide zoom level
  
  // 退出登录处理
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
  
  // 城市空间元素的状态管理 (已整合新的图层)
  const [urbanElements, setUrbanElements] = useState({
    topography: false,
    geomorphology: false,
    riverNetwork: false, 
    boundary: false,
    landCover: false, // 新增: 土地覆盖
    buildingRisk: false,
    roadsAndStreets: false, 
    landUse: false,
    drainageConduits: false, 
    drainageJunctions: false,
    drainageOutfalls: false,
    reservoirRegulation: false,
    defensiveEmbankments: false,
    serviceReservoirs: false, // 新增: 服务型水库
    populationDensity: false,
    economicData: false,
    industrialCommercial: false,
    nighttimeLightIndex: false,
    poi: false,
    annualRainfall: false,
    annualTemperature: false,
    earthMapIntegration: false,
  });

  // 处理左侧复选框的点击事件
  const handleElementToggle = (elementKey: keyof typeof urbanElements) => {
    setUrbanElements(prev => ({
      ...prev,
      [elementKey]: !prev[elementKey]
    }));
  };

  // Header Component
  const Header = () => (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="rounded" />
        </div>
        
        {/* Quick Navigation */}
        <nav className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <Home size={16} />
              Home
            </Button>
          </Link>
          <Link href="/riskmap">
            <Button variant="ghost" size="sm" className="gap-2">
              <MapPin size={16} />
              Risk Map
            </Button>
          </Link>
          <Link href="/model">
            <Button variant="ghost" size="sm" className="gap-2">
              <AlertTriangle size={16} />
              Catastrophe Model
            </Button>
          </Link>
          <Link href="/asset">
            <Button variant="ghost" size="sm" className="gap-2">
              <Building2 size={16} />
              Portfolio Management
            </Button>
          </Link>
          <Link href="/fuzhu">
            <Button variant="ghost" size="sm" className="gap-2">
              <Puzzle size={16} />
              Extensions
            </Button>
          </Link>
          <RegionSelector />
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut size={16} />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
      {/* 左侧边栏 */}
      <aside className="w-80 flex-shrink-0 border-r bg-white pl-8 pr-8 py-4 overflow-y-auto space-y-1">
          
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Geospatial Data Hub</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Geography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="topography" checked={urbanElements.topography} onCheckedChange={() => handleElementToggle('topography')} />
                <Label htmlFor="topography" className="font-normal">Topography</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="geomorphology" checked={urbanElements.geomorphology} onCheckedChange={() => handleElementToggle('geomorphology')} />
                <Label htmlFor="geomorphology" className="font-normal">Geomorphology</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="riverNetwork" checked={urbanElements.riverNetwork} onCheckedChange={() => handleElementToggle('riverNetwork')} />
                <Label htmlFor="riverNetwork" className="font-normal">River Network</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="boundary" checked={urbanElements.boundary} onCheckedChange={() => handleElementToggle('boundary')} />
                <Label htmlFor="boundary" className="font-normal">Administrative boundary</Label>
              </div>
              {/* --- 新增的复选框 --- */}
              <div className="flex items-center space-x-2">
                <Checkbox id="landCover" checked={urbanElements.landCover} onCheckedChange={() => handleElementToggle('landCover')} />
                <Label htmlFor="landCover" className="font-normal">Land Cover (2019)</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weather and Climate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="annualRainfall" checked={urbanElements.annualRainfall} onCheckedChange={() => handleElementToggle('annualRainfall')} />
                <Label htmlFor="annualRainfall" className="font-normal">Annual Rainfall</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="annualTemperature" checked={urbanElements.annualTemperature} onCheckedChange={() => handleElementToggle('annualTemperature')} />
                <Label htmlFor="annualTemperature" className="font-normal">Annual Temperature</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="earthMapIntegration" checked={urbanElements.earthMapIntegration} onCheckedChange={() => handleElementToggle('earthMapIntegration')} />
                <Label htmlFor="earthMapIntegration" className="font-normal">Earth-map Integration</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="buildingRisk" checked={urbanElements.buildingRisk} onCheckedChange={() => handleElementToggle('buildingRisk')} />
                <Label htmlFor="buildingRisk" className="font-normal">Building</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="roadsAndStreets" checked={urbanElements.roadsAndStreets} onCheckedChange={() => handleElementToggle('roadsAndStreets')} />
                <Label htmlFor="roadsAndStreets" className="font-normal">Roads & Streets</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="landUse" checked={urbanElements.landUse} onCheckedChange={() => handleElementToggle('landUse')} />
                <Label htmlFor="landUse" className="font-normal">Land Use</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="drainageConduits" checked={urbanElements.drainageConduits} onCheckedChange={() => handleElementToggle('drainageConduits')} />
                <Label htmlFor="drainageConduits" className="font-normal">Drainage Conduits</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="drainageJunctions" checked={urbanElements.drainageJunctions} onCheckedChange={() => handleElementToggle('drainageJunctions')} />
                <Label htmlFor="drainageJunctions" className="font-normal">Drainage Junctions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="drainageOutfalls" checked={urbanElements.drainageOutfalls} onCheckedChange={() => handleElementToggle('drainageOutfalls')} />
                <Label htmlFor="drainageOutfalls" className="font-normal">Drainage Outfalls</Label>
              </div>
              {/* <div className="flex items-center space-x-2">
                <Checkbox id="reservoirRegulation" checked={urbanElements.reservoirRegulation} onCheckedChange={() => handleElementToggle('reservoirRegulation')} />
                <Label htmlFor="reservoirRegulation" className="font-normal">Reservoir Regulation</Label>
              </div> */}
              <div className="flex items-center space-x-2">
                <Checkbox id="defensiveEmbankments" checked={urbanElements.defensiveEmbankments} onCheckedChange={() => handleElementToggle('defensiveEmbankments')} />
                <Label htmlFor="defensiveEmbankments" className="font-normal">Defensive Embankments</Label>
              </div>
              {/* --- 新增的复选框 --- */}
              <div className="flex items-center space-x-2">
                <Checkbox id="serviceReservoirs" checked={urbanElements.serviceReservoirs} onCheckedChange={() => handleElementToggle('serviceReservoirs')} />
                <Label htmlFor="serviceReservoirs" className="font-normal">Service Reservoirs</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Socioeconomic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="populationDensity" checked={urbanElements.populationDensity} onCheckedChange={() => handleElementToggle('populationDensity')} />
                <Label htmlFor="populationDensity" className="font-normal">Population Density</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="economicData" checked={urbanElements.economicData} onCheckedChange={() => handleElementToggle('economicData')} />
                <Label htmlFor="economicData" className="font-normal">Economic Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="industrialCommercial" checked={urbanElements.industrialCommercial} onCheckedChange={() => handleElementToggle('industrialCommercial')} />
                <Label htmlFor="industrialCommercial" className="font-normal">Industrial & Commercial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="nighttimeLightIndex" checked={urbanElements.nighttimeLightIndex} onCheckedChange={() => handleElementToggle('nighttimeLightIndex')} />
                <Label htmlFor="nighttimeLightIndex" className="font-normal">Nighttime Light Index</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="poi" checked={urbanElements.poi} onCheckedChange={() => handleElementToggle('poi')} />
                <Label htmlFor="poi" className="font-normal">POI</Label>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* 中间地图区域 */}
        <main className="flex-1 relative">
          {urbanElements.earthMapIntegration && (
            <div className="absolute inset-0 z-50 bg-white">
              <div className="absolute top-4 right-4 z-50">
                <Button 
                  onClick={() => handleElementToggle('earthMapIntegration')}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  ← Return to Map
                </Button>
              </div>
              <iframe
                src="https://earth.nullschool.net/#current/wind/isobaric/850hPa/orthographic"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Earth Wind Map"
              />
            </div>
          )}
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            className="z-10"
          >
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            
            {urbanElements.buildingRisk && (
              <WMSTileLayer
                key="buildingRisk"
                url="http://143.89.22.7:8090/geoserver/wms"
                params={{ layers: 'COP:Building', format: 'image/png', transparent: true, version: '1.1.0' }}
                attribution="GeoServer Data"
              />
            )}
            {urbanElements.boundary && (
              <WMSTileLayer
                key="boundary"
                url="http://143.89.22.7:8090/geoserver/wms"
                params={{ layers: 'COP:taiping_boundary', format: 'image/png', transparent: true, version: '1.1.0' }}
                attribution="GeoServer Data"
              />
            )}
            {urbanElements.annualRainfall && (
              <WMSTileLayer
                key="annualRainfall"
                url="http://143.89.22.7:8090/geoserver/wms"
                params={{ layers: 'COP:taiping_Annual_rainfall', format: 'image/png', transparent: true, version: '1.1.0' }}
                attribution="GeoServer Data"
              />
            )}

            {urbanElements.drainageConduits && (
              <WMSTileLayer
                key="conduits"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:Conduits',
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}
            
            {urbanElements.drainageJunctions && (
              <WMSTileLayer
                key="junctions"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:Junctions', 
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}
            
            {urbanElements.drainageOutfalls && (
              <WMSTileLayer
                key="outfalls"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:Outfalls', 
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}
            
            {urbanElements.populationDensity && (
              <WMSTileLayer
                key="populationDensity"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:PopulationDensity_per_30_arcseconds',
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}

            {/* --- 新增的 WMS 图层 --- */}
            {urbanElements.landCover && (
              <WMSTileLayer
                key="landCover"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:LandCover_ProbaV_2019',
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}

            {urbanElements.serviceReservoirs && (
              <WMSTileLayer
                key="serviceReservoirs"
                url="http://143.89.23.123:8080/geoserver/wms"
                params={{
                  layers: 'ITF:Service_Reservoirs',
                  format: 'image/png',
                  transparent: true,
                  version: '1.1.0'
                }}
                attribution="GeoServer Data"
              />
            )}

            {/* Coordinate Display */}
            <MapCoordinateDisplay />

          </MapContainer>
        </main>
      </div>
    </div>
  );
}