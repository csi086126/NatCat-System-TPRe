"use client"

// 1. 导入必要的 React Hooks 和组件
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, MapPin, AlertTriangle, Map, Building2, Activity, Puzzle, User, LogOut } from 'lucide-react';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

// 2. 动态导入 (Lazy Load) Leaflet 地图组件
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const WMSTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.WMSTileLayer), { ssr: false });

// 3. Header 组件
const Header = ({ onLogout, activePage }: { onLogout: () => void; activePage?: string }) => {
  return (
    <header className="bg-white shadow-md z-20">
      <div className="mx-auto px-4 py-2 flex justify-between items-center ml-2">
        <div className="flex items-center">
          <Image
            src="/taipinglogo.png"
            alt="China Taiping Logo"
            width={360}
            height={40}
          />
          <span className="ml-2 text-xl font-semibold"></span>
        </div>
        <nav className="flex-grow flex justify-end items-center">
          <ul className="flex space-x-4">
          
            <li><Link href="/cityinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'cityinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><MapPin size={18} />Urban Spatial Elements</Button></Link></li>
            <li className="ml-auto"><Link href="/disasterinfo"><Button variant="ghost" className={`gap-2 ${activePage === 'disasterinfo' ? 'text-blue-900 font-bold text-lg' : ''}`}><AlertTriangle size={18} />Disaster repository</Button></Link></li>
            <li className="ml-auto"><Link href="/asset"><Button variant="ghost" className={`gap-2 ${activePage === 'asset' ? 'text-blue-900 font-bold text-lg' : ''}`}><Building2 size={18} />Asset management</Button></Link></li>
            <li className="ml-auto"><Link href="/riskmap"><Button variant="ghost" className={`gap-2 ${activePage === 'riskmap' ? 'text-blue-900 font-bold text-lg' : ''}`}><Map size={18} />Risk map</Button></Link></li>
            <li className="ml-auto"><Link href="/model"><Button variant="ghost" className={`gap-2 ${activePage === 'model' ? 'text-blue-900 font-bold text-lg' : ''}`}><Activity size={18} />Catastrophe model</Button></Link></li>
            <li className="ml-auto"><Link href="/fuzhu"><Button variant="ghost" className={`gap-2 ${activePage === 'fuzhu' ? 'text-blue-900 font-bold text-lg' : ''}`}><Puzzle size={18} />Accessibility</Button></Link></li>
            <li><Link href="/usercenter"><Button variant="ghost" className={`gap-2 ${activePage === 'usercenter' ? 'text-blue-900 font-bold text-lg' : ''}`}><User size={18} />User centre</Button></Link></li>
          </ul>
          <Button variant="outline" onClick={onLogout} className="ml-4 gap-2">
            <LogOut size={18} />
            退出登录
          </Button>
        </nav>
      </div>
    </header>
  );
}

// 4. 主组件
export default function Component() {
  const router = useRouter();
  const mapRef = useRef(null);
  
  // 退出登录处理
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/');
  };
  
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
    // Weather and Climate 相关
    annualRainfall: false,
    annualTemperature: false,
    earthMapIntegration: false,
  });

  const [selectedCity, setSelectedCity] = useState('');

  // 处理左侧复选框的点击事件
  const handleElementToggle = (elementKey: keyof typeof urbanElements) => {
    setUrbanElements(prev => ({
      ...prev,
      [elementKey]: !prev[elementKey]
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header onLogout={handleLogout} activePage="cityinfo" />

      <div className="flex flex-1 overflow-hidden">
        
        {/* 左侧边栏 */}
        <aside className="w-80 flex-shrink-0 border-r bg-white pl-8 pr-8 py-4 overflow-y-auto space-y-1">

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Region Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <select 
                id="city-select" 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Please select a city</option>
                <option value="hongkong">Hong Kong</option>
                <option value="shenzhen">Shenzhen</option>
                <option value="guangzhou">Guangzhou</option>
                <option value="beijing">Beijing</option>
                <option value="shanghai">Shanghai</option>
              </select>
            </CardContent>
          </Card>

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
            center={[22.3193, 114.1694]}
            zoom={11}
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

          </MapContainer>
        </main>

      </div>
    </div>
  );
}