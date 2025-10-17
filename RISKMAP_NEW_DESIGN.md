# Risk Map 界面重新设计方案

## 🎯 新的设计理念

### 核心思路：
> **左侧模块化选择，右侧动态显示详情**
> - 左侧4个独立模块，用户点击哪个，右侧就显示对应的详细控制面板
> - 避免信息过载，保持界面清爽
> - 符合专业GIS系统的交互逻辑

---

## 📐 新的界面布局

```
┌────────────────────────────────────────────────────────────────┐
│                         Header                                  │
├────────────────┬───────────────────────┬────────────────────────┤
│                │                       │                        │
│  Left Panel    │    Map Area           │   Right Panel          │
│  (384px)       │    (Flexible)         │   (384px)              │
│                │                       │                        │
│  [模块1]       │                       │  ← 动态显示选中模块     │
│  Hazard Map    │   🗺️ Leaflet Map     │    的详细控制面板       │
│                │                       │                        │
│  [模块2]       │   + WMS Layers        │  例如：                │
│  Exposure Map  │                       │  - Hazard详情          │
│                │   + Legend            │  - Exposure详情        │
│  [模块3]       │                       │  - Risk详情            │
│  Risk Map      │   + Markers           │  - 查询结果            │
│                │                       │                        │
│  [模块4]       │                       │                        │
│  Query &       │                       │                        │
│  Download      │                       │                        │
│                │                       │                        │
└────────────────┴───────────────────────┴────────────────────────┘
```

---

## 📋 四个模块的详细设计

### 模块1️⃣ : Hazard Map（灾害地图）

**定义**：显示自然灾害的危险性分布
- 只显示**灾害本身**的强度/范围
- 不考虑暴露度（人口、资产）

**左侧卡片内容**：
```tsx
<Card className={activeModule === 'hazard' ? 'border-blue-500 border-2' : ''}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertTriangle size={20} className="text-orange-500" />
      Hazard Map
    </CardTitle>
    <CardDescription>
      Natural hazard intensity distribution
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-3">
      Click to view and control hazard layers
    </p>
    <Button 
      variant={activeModule === 'hazard' ? 'default' : 'outline'}
      className="w-full"
      onClick={() => setActiveModule('hazard')}
    >
      {activeModule === 'hazard' ? 'Active' : 'Select'}
    </Button>
  </CardContent>
</Card>
```

**右侧详情面板**（当选中时显示）：
```tsx
{activeModule === 'hazard' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Hazard Layer Controls</h2>
    
    {/* 洪水灾害 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Checkbox 
            checked={hazardLayers.flood.enabled}
            onCheckedChange={() => toggleHazardCategory('flood')}
          />
          <span className="ml-2">Flood Hazard</span>
        </CardTitle>
      </CardHeader>
      {hazardLayers.flood.enabled && (
        <CardContent className="space-y-2">
          <Label className="text-sm font-medium">Return Period:</Label>
          {['20yr', '50yr', '100yr', '200yr', '500yr'].map(period => (
            <div key={period} className="flex items-center space-x-2">
              <Checkbox 
                id={`flood-${period}`}
                checked={hazardLayers.flood[period]}
                onCheckedChange={() => toggleFloodLayer(period)}
              />
              <Label htmlFor={`flood-${period}`} className="text-sm cursor-pointer">
                {period.replace('yr', '-year')} return period
              </Label>
            </div>
          ))}
          
          <div className="mt-3">
            <Label>Layer Opacity: {opacity}%</Label>
            <Input 
              type="range" 
              min="0" 
              max="100" 
              value={opacity}
              onChange={(e) => setOpacity(e.target.value)}
            />
          </div>
        </CardContent>
      )}
    </Card>
    
    {/* 台风灾害 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Checkbox 
            checked={hazardLayers.typhoon.enabled}
            onCheckedChange={() => toggleHazardCategory('typhoon')}
          />
          <span className="ml-2">Typhoon Hazard</span>
        </CardTitle>
      </CardHeader>
      {hazardLayers.typhoon.enabled && (
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="typhoon-track" />
            <Label htmlFor="typhoon-track">Historical Tracks</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="typhoon-windcircle" />
            <Label htmlFor="typhoon-windcircle">Wind Circle</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="typhoon-rainfall" />
            <Label htmlFor="typhoon-rainfall">Cumulative Rainfall</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="typhoon-surge" />
            <Label htmlFor="typhoon-surge">Storm Surge</Label>
          </div>
        </CardContent>
      )}
    </Card>
    
    {/* 暴雨灾害 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Checkbox 
            checked={hazardLayers.rainstorm.enabled}
            onCheckedChange={() => toggleHazardCategory('rainstorm')}
          />
          <span className="ml-2">Rainstorm Hazard</span>
        </CardTitle>
      </CardHeader>
      {hazardLayers.rainstorm.enabled && (
        <CardContent className="space-y-2">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hr">1-hour rainfall</SelectItem>
              <SelectItem value="3hr">3-hour rainfall</SelectItem>
              <SelectItem value="24hr">24-hour rainfall</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select intensity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="heavy">Heavy</SelectItem>
              <SelectItem value="black">Black Rainstorm</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      )}
    </Card>
    
    {/* 地质灾害 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Checkbox 
            checked={hazardLayers.geological.enabled}
            onCheckedChange={() => toggleHazardCategory('geological')}
          />
          <span className="ml-2">Geological Hazard</span>
        </CardTitle>
      </CardHeader>
      {hazardLayers.geological.enabled && (
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="geo-landslide" />
            <Label htmlFor="geo-landslide">Landslide Susceptibility</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="geo-debris" />
            <Label htmlFor="geo-debris">Debris Flow Zones</Label>
          </div>
        </CardContent>
      )}
    </Card>
  </div>
)}
```

---

### 模块2️⃣ : Exposure Map（暴露度地图）

**定义**：显示可能受灾害影响的人口、资产、基础设施分布
- 与灾害无关，只显示**承灾体**的分布
- 人在哪里？资产在哪里？

**左侧卡片**：
```tsx
<Card className={activeModule === 'exposure' ? 'border-blue-500 border-2' : ''}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Building2 size={20} className="text-blue-500" />
      Exposure Map
    </CardTitle>
    <CardDescription>
      Population, assets, and infrastructure distribution
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-3">
      Display exposure elements on map
    </p>
    <Button 
      variant={activeModule === 'exposure' ? 'default' : 'outline'}
      className="w-full"
      onClick={() => setActiveModule('exposure')}
    >
      {activeModule === 'exposure' ? 'Active' : 'Select'}
    </Button>
  </CardContent>
</Card>
```

**右侧详情面板**：
```tsx
{activeModule === 'exposure' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Exposure Layer Controls</h2>
    
    {/* 人口暴露度 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Population Exposure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="pop-density" defaultChecked />
          <Label htmlFor="pop-density">Population Density Heatmap</Label>
        </div>
        
        <div>
          <Label>Display Style:</Label>
          <Select defaultValue="heatmap">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heatmap">Heatmap</SelectItem>
              <SelectItem value="choropleth">Choropleth (by district)</SelectItem>
              <SelectItem value="points">Point Density</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Opacity: 70%</Label>
          <Input type="range" min="0" max="100" defaultValue="70" />
        </div>
        
        <div className="p-3 bg-blue-50 rounded text-sm">
          <p className="font-semibold">Total Population in View:</p>
          <p className="text-2xl font-bold text-blue-600">2,847,392</p>
        </div>
      </CardContent>
    </Card>
    
    {/* 建筑资产暴露度 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Building Asset Exposure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="building-cost" />
          <Label htmlFor="building-cost">Replacement Cost Heatmap</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox id="building-footprint" />
          <Label htmlFor="building-footprint">Building Footprints</Label>
        </div>
        
        <div>
          <Label>Filter by Property Type:</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="type-residential" defaultChecked />
              <Label htmlFor="type-residential">Residential</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="type-commercial" defaultChecked />
              <Label htmlFor="type-commercial">Commercial</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="type-industrial" />
              <Label htmlFor="type-industrial">Industrial</Label>
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded text-sm">
          <p className="font-semibold">Total Asset Value in View:</p>
          <p className="text-2xl font-bold text-green-600">$128.5B</p>
        </div>
      </CardContent>
    </Card>
    
    {/* 关键基础设施 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Critical Infrastructure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="infra-hospital" defaultChecked />
          <Label htmlFor="infra-hospital">🏥 Hospitals (25)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="infra-school" defaultChecked />
          <Label htmlFor="infra-school">🏫 Schools (182)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="infra-power" />
          <Label htmlFor="infra-power">⚡ Power Stations (8)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="infra-water" />
          <Label htmlFor="infra-water">💧 Water Treatment (12)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="infra-transport" />
          <Label htmlFor="infra-transport">🚇 Transport Hubs (15)</Label>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

---

### 模块3️⃣ : Risk Map（风险地图）

**定义**：Hazard × Exposure = Risk
- 综合考虑灾害危险性和暴露度
- 显示**实际风险**的空间分布

**左侧卡片**：
```tsx
<Card className={activeModule === 'risk' ? 'border-blue-500 border-2' : ''}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Target size={20} className="text-red-500" />
      Risk Map
    </CardTitle>
    <CardDescription>
      Integrated risk analysis (Hazard × Exposure)
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-3">
      Calculate and visualize risk levels
    </p>
    <Button 
      variant={activeModule === 'risk' ? 'default' : 'outline'}
      className="w-full"
      onClick={() => setActiveModule('risk')}
    >
      {activeModule === 'risk' ? 'Active' : 'Select'}
    </Button>
  </CardContent>
</Card>
```

**右侧详情面板**：
```tsx
{activeModule === 'risk' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Risk Analysis Configuration</h2>
    
    {/* 风险计算设置 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Calculation Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Select Hazard Scenario:</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose hazard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flood-100yr">Flood (100-year)</SelectItem>
              <SelectItem value="flood-200yr">Flood (200-year)</SelectItem>
              <SelectItem value="flood-500yr">Flood (500-year)</SelectItem>
              <SelectItem value="typhoon-mangkhut">Typhoon Mangkhut Scenario</SelectItem>
              <SelectItem value="typhoon-hato">Typhoon Hato Scenario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Select Exposure Type:</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="risk-population" defaultChecked />
              <Label htmlFor="risk-population">Population at Risk</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="risk-buildings" defaultChecked />
              <Label htmlFor="risk-buildings">Building Assets</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="risk-infrastructure" />
              <Label htmlFor="risk-infrastructure">Critical Infrastructure</Label>
            </div>
          </div>
        </div>
        
        <Button className="w-full" variant="default">
          <Calculator size={16} className="mr-2" />
          Calculate Risk
        </Button>
      </CardContent>
    </Card>
    
    {/* 风险分析结果 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Analysis Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 rounded">
            <p className="text-xs text-gray-600">High Risk Area</p>
            <p className="text-xl font-bold text-red-600">18.5 km²</p>
          </div>
          <div className="p-3 bg-orange-50 rounded">
            <p className="text-xs text-gray-600">Medium Risk</p>
            <p className="text-xl font-bold text-orange-600">42.3 km²</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded">
            <p className="text-xs text-gray-600">Low Risk</p>
            <p className="text-xl font-bold text-yellow-600">89.7 km²</p>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <p className="text-xs text-gray-600">No Risk</p>
            <p className="text-xl font-bold text-green-600">245.1 km²</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-semibold mb-2">Estimated Impact:</h4>
          <div className="space-y-1 text-sm">
            <p>👥 Population Affected: <span className="font-bold">385,000</span></p>
            <p>🏢 Buildings at Risk: <span className="font-bold">12,450</span></p>
            <p>💰 Potential Loss: <span className="font-bold text-red-600">$2.8B</span></p>
            <p>🏥 Critical Facilities: <span className="font-bold">8 hospitals, 23 schools</span></p>
          </div>
        </div>
        
        <Button variant="outline" className="w-full">
          <Download size={16} className="mr-2" />
          Export Risk Analysis Report
        </Button>
      </CardContent>
    </Card>
    
    {/* 风险分级显示 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Level Display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-sm">Very High Risk</span>
          </div>
          <Checkbox defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm">High Risk</span>
          </div>
          <Checkbox defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Medium Risk</span>
          </div>
          <Checkbox defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Low Risk</span>
          </div>
          <Checkbox />
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

---

### 模块4️⃣ : Query & Download（查询与下载）

**定义**：快速查询特定位置的风险，导出报告和数据

**左侧卡片**：
```tsx
<Card className={activeModule === 'query' ? 'border-blue-500 border-2' : ''}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Search size={20} className="text-purple-500" />
      Query & Download
    </CardTitle>
    <CardDescription>
      Location risk query and report generation
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-3">
      Search locations and export results
    </p>
    <Button 
      variant={activeModule === 'query' ? 'default' : 'outline'}
      className="w-full"
      onClick={() => setActiveModule('query')}
    >
      {activeModule === 'query' ? 'Active' : 'Select'}
    </Button>
  </CardContent>
</Card>
```

**右侧详情面板**：
```tsx
{activeModule === 'query' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Location Risk Query</h2>
    
    {/* 单点查询 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Single Location Query</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Address or Coordinates:</Label>
          <Input 
            placeholder="e.g., Central Plaza, Hong Kong or 22.28,114.15"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSearch}>
            <Search size={16} className="mr-2" />
            Search
          </Button>
          <Button variant="outline" onClick={locateOnMap}>
            <MapPin size={16} className="mr-2" />
            Locate on Map
          </Button>
        </div>
        
        {queryResult && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-2">📍 {queryResult.address}</h4>
            <div className="space-y-1 text-sm">
              <p>Coordinates: {queryResult.lat}, {queryResult.lon}</p>
              <p>District: {queryResult.district}</p>
              <Separator className="my-2" />
              <p>Flood Risk (100-yr): 
                <span className={`ml-2 font-bold ${
                  queryResult.floodRisk === 'High' ? 'text-red-600' : 
                  queryResult.floodRisk === 'Medium' ? 'text-orange-600' : 
                  'text-green-600'
                }`}>{queryResult.floodRisk}</span>
              </p>
              <p>Inundation Depth: <span className="font-bold">{queryResult.depth}m</span></p>
              <p>Typhoon Risk: <span className="font-bold">{queryResult.typhoonRisk}</span></p>
              <p>Overall Risk: 
                <span className="ml-2 px-2 py-1 rounded text-white bg-red-600 text-xs font-bold">
                  {queryResult.overallRisk}
                </span>
              </p>
            </div>
            
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <FileText size={14} className="mr-1" />
                PDF Report
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download size={14} className="mr-1" />
                Excel Data
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* 批量查询 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Batch Location Query</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Upload Address List:</Label>
          <Input type="file" accept=".xlsx,.csv" />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: Excel (.xlsx) or CSV (.csv)
          </p>
        </div>
        
        <Button className="w-full">
          <Upload size={16} className="mr-2" />
          Upload & Analyze
        </Button>
        
        <div className="p-3 bg-blue-50 rounded text-sm">
          <p className="text-gray-600">Template:</p>
          <Button variant="link" className="p-0 h-auto text-blue-600">
            Download Sample Template
          </Button>
        </div>
      </CardContent>
    </Card>
    
    {/* 区域查询 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Area Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Analysis Method:</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draw">Draw on Map</SelectItem>
              <SelectItem value="district">By District</SelectItem>
              <SelectItem value="radius">Radius from Point</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" className="w-full">
          <Pencil size={16} className="mr-2" />
          Enable Drawing Tool
        </Button>
        
        <p className="text-xs text-gray-500">
          Draw a polygon on the map to analyze risk within that area
        </p>
      </CardContent>
    </Card>
    
    {/* 数据下载 */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="outline" className="w-full justify-start">
          <FileDown size={16} className="mr-2" />
          Export Current View as Image
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <FileSpreadsheet size={16} className="mr-2" />
          Export Risk Data (Excel)
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <FileJson size={16} className="mr-2" />
          Export GeoJSON
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <FileText size={16} className="mr-2" />
          Generate Full Report (PDF)
        </Button>
      </CardContent>
    </Card>
  </div>
)}
```

---

## 🎨 左侧面板的完整代码结构

```tsx
// 左侧面板
<aside className="w-96 flex-shrink-0 border-r bg-white p-6 overflow-y-auto space-y-6">
  <div>
    <h2 className="text-2xl font-bold mb-2">Risk Map Analysis</h2>
    <p className="text-sm text-gray-600">
      Select a module to view detailed controls
    </p>
  </div>
  
  <Separator />
  
  {/* 模块1: Hazard Map */}
  <Card className={activeModule === 'hazard' ? 'border-blue-500 border-2 shadow-lg' : 'hover:shadow-md transition-shadow'}>
    {/* ... 如上 ... */}
  </Card>
  
  {/* 模块2: Exposure Map */}
  <Card className={activeModule === 'exposure' ? 'border-blue-500 border-2 shadow-lg' : 'hover:shadow-md transition-shadow'}>
    {/* ... 如上 ... */}
  </Card>
  
  {/* 模块3: Risk Map */}
  <Card className={activeModule === 'risk' ? 'border-blue-500 border-2 shadow-lg' : 'hover:shadow-md transition-shadow'}>
    {/* ... 如上 ... */}
  </Card>
  
  {/* 模块4: Query & Download */}
  <Card className={activeModule === 'query' ? 'border-blue-500 border-2 shadow-lg' : 'hover:shadow-md transition-shadow'}>
    {/* ... 如上 ... */}
  </Card>
</aside>
```

---

## 📊 状态管理

```typescript
// 主状态
const [activeModule, setActiveModule] = useState<'hazard' | 'exposure' | 'risk' | 'query' | null>(null);

// Hazard Map 状态
const [hazardLayers, setHazardLayers] = useState({
  flood: {
    enabled: false,
    '20yr': false,
    '50yr': false,
    '100yr': true,
    '200yr': false,
    '500yr': false,
  },
  typhoon: {
    enabled: false,
    tracks: false,
    windcircle: false,
    rainfall: false,
    surge: false,
  },
  rainstorm: {
    enabled: false,
    duration: '24hr',
    intensity: 'heavy',
  },
  geological: {
    enabled: false,
    landslide: false,
    debris: false,
  },
});

// Exposure Map 状态
const [exposureLayers, setExposureLayers] = useState({
  population: {
    enabled: false,
    style: 'heatmap',
    opacity: 70,
  },
  buildings: {
    enabled: false,
    footprints: false,
    costHeatmap: false,
    types: {
      residential: true,
      commercial: true,
      industrial: false,
    },
  },
  infrastructure: {
    hospitals: true,
    schools: true,
    power: false,
    water: false,
    transport: false,
  },
});

// Risk Map 状态
const [riskConfig, setRiskConfig] = useState({
  hazardScenario: null,
  exposureTypes: {
    population: true,
    buildings: true,
    infrastructure: false,
  },
  results: null,
});

// Query 状态
const [searchQuery, setSearchQuery] = useState('');
const [queryResult, setQueryResult] = useState(null);
```

---

## ✅ 这个设计的优点

1. **逻辑清晰**
   - Hazard（危险性）→ Exposure（暴露度）→ Risk（风险）是标准的风险评估流程
   - 符合专业GIS和灾害管理系统的逻辑

2. **界面简洁**
   - 左侧4个模块，一目了然
   - 右侧动态显示，不会信息过载

3. **灵活性强**
   - 用户可以分别查看 Hazard、Exposure、Risk
   - 也可以组合使用

4. **易于扩展**
   - 未来可以添加更多模块（如 Vulnerability、Loss Estimation）
   - 每个模块独立，互不影响

5. **符合专业标准**
   - 与 UNDRO、UNISDR 等国际组织的风险评估框架一致
   - Risk = Hazard × Vulnerability × Exposure

---

## ❓ 你觉得这个设计怎么样？

需要我：
1. ✅ 立即实现这个新的布局结构？
2. 📝 先调整某个模块的详细设计？
3. 🤔 还有其他想法或需求？

告诉我，我们开始重构！🚀
