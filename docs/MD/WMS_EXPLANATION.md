# WMS (Web Map Service) 详解

## 🗺️ WMS 是什么？

**WMS = Web Map Service（网络地图服务）**

简单来说：
> WMS 是一个**标准化的网络服务**，用于在互联网上**发布和访问地图图片**。

---

## 📖 通俗理解

### 类比1：餐厅点菜
```
你（网页）     →  "我要一份地图"
餐厅（WMS服务器） →  🗺️ 返回地图图片

你可以指定：
- 要哪个区域（香港还是澳门）
- 要哪个图层（洪水深度还是人口密度）
- 要多大尺寸（256x256 还是 512x512）
- 要什么格式（PNG还是JPEG）
```

### 类比2：Google Maps API
```
WMS 就像 Google Maps，但是：
- Google Maps：显示街道、建筑物
- 你的 WMS：显示洪水深度、风险区域
```

---

## 🔧 你的系统中的 WMS

### 在你的代码中：

```typescript
// 你的 WMS 服务器地址
const WMS_SERVER = "http://143.89.22.7:8090/geoserver/wms";

// 你有的图层（洪水深度数据）
const layers = {
  flood500yr: 'COP:Flood_Depth _Return_Period_500yr',
  flood200yr: 'COP:Flood_Depth _Return_Period_200yr',
  flood100yr: 'COP:Flood_Depth _Return_Period_100yr',
  // ... 等等
};

// 在地图上显示
<WMSTileLayer 
  url="http://143.89.22.7:8090/geoserver/wms"
  params={{
    layers: 'COP:Flood_Depth_Return_Period_100yr',
    format: 'image/png',
    transparent: true
  }}
/>
```

### 实际效果：
```
你的网页请求：
"给我看香港的100年一遇洪水深度地图"
         ↓
WMS服务器（GeoServer）处理
         ↓
返回一张彩色地图图片（蓝色=深水区，绿色=浅水区）
         ↓
显示在你的 Leaflet 地图上
```

---

## 📊 WMS 的工作原理

### 1. GetCapabilities（获取能力）
**问**：这个WMS服务器有什么图层？

```http
GET http://143.89.22.7:8090/geoserver/wms?
    SERVICE=WMS&
    REQUEST=GetCapabilities
```

**答**：服务器返回一个XML文档，列出所有可用的图层：
```xml
<Layer>
  <Name>COP:Flood_Depth_Return_Period_100yr</Name>
  <Title>100年一遇洪水深度</Title>
  <BoundingBox>22.0, 113.0, 23.0, 115.0</BoundingBox>
</Layer>
```

---

### 2. GetMap（获取地图）
**问**：给我一张具体的地图图片

```http
GET http://143.89.22.7:8090/geoserver/wms?
    SERVICE=WMS&
    VERSION=1.1.0&
    REQUEST=GetMap&
    LAYERS=COP:Flood_Depth_Return_Period_100yr&
    BBOX=114.0,22.0,115.0,23.0&  ← 范围（经纬度）
    WIDTH=512&                    ← 宽度（像素）
    HEIGHT=512&                   ← 高度（像素）
    FORMAT=image/png&             ← 格式
    TRANSPARENT=true              ← 透明背景
```

**答**：服务器返回一张 PNG 图片：

```
🗺️ 返回的图片：
┌─────────────────┐
│  🔵🔵🔵          │  ← 蓝色=深水区（3-5米）
│  🔵🔵            │
│      🟢🟢🟢      │  ← 绿色=浅水区（0.5-1米）
│        🟡🟡      │  ← 黄色=中等（1-2米）
│                 │  ← 白色=无风险
└─────────────────┘
```

---

### 3. GetFeatureInfo（获取要素信息）⭐ 重要！
**问**：鼠标点击的这个位置，具体的数值是多少？

```http
GET http://143.89.22.7:8090/geoserver/wms?
    SERVICE=WMS&
    REQUEST=GetFeatureInfo&
    LAYERS=COP:Flood_Depth_Return_Period_100yr&
    QUERY_LAYERS=COP:Flood_Depth_Return_Period_100yr&
    BBOX=114.0,22.0,115.0,23.0&
    WIDTH=512&
    HEIGHT=512&
    X=256&                        ← 点击的X坐标
    Y=256&                        ← 点击的Y坐标
    INFO_FORMAT=application/json  ← 返回JSON格式
```

**答**：服务器返回该点的详细数据：

```json
{
  "features": [
    {
      "properties": {
        "GRAY_INDEX": 1.5,           ← 洪水深度 1.5米
        "flood_depth": 1.5,
        "risk_level": "Medium"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [114.5, 22.5]
      }
    }
  ]
}
```

**这就是模块4查询功能的核心！** 🎯

---

## 🖼️ WMS vs 普通图片

### 普通图片（静态）：
```
<img src="hongkong-map.png" />

问题：
❌ 不能放大缩小（会模糊）
❌ 不能选择显示哪些内容
❌ 不能查询数据
```

### WMS（动态）：
```
<WMSTileLayer 
  url="http://server.com/wms"
  params={{ layers: 'flood' }}
/>

优点：
✅ 放大缩小自动请求更清晰的图
✅ 可以开关不同图层
✅ 可以查询具体数值
✅ 数据更新后自动显示新内容
```

---

## 🏗️ 你的系统架构

```
┌─────────────────────────────────────────────────┐
│  你的网页（Next.js + Leaflet）                   │
│                                                  │
│  用户看到：彩色的洪水风险地图                     │
│                                                  │
│  ┌──────────────────────────────────┐           │
│  │  <WMSTileLayer>                  │           │
│  │    url="geoserver/wms"           │  ← 请求地图│
│  │    layers="Flood_100yr"          │           │
│  └──────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
                    ↓ HTTP 请求
┌─────────────────────────────────────────────────┐
│  GeoServer（WMS服务器）                          │
│  地址：http://143.89.22.7:8090/geoserver        │
│                                                  │
│  功能：                                          │
│  1. 存储地理数据（洪水深度、风险区域等）          │
│  2. 根据请求生成地图图片                         │
│  3. 提供数据查询服务                             │
│                                                  │
│  ┌──────────────────────────────────┐           │
│  │  数据文件：                       │           │
│  │  - Flood_100yr.tif（栅格）       │           │
│  │  - Flood_200yr.tif               │           │
│  │  - Buildings.shp（矢量）         │           │
│  └──────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

---

## 🎯 在你的 Risk Map 中如何使用

### 场景1：显示图层（已经在做了）✅
```tsx
// 用户勾选"100年洪水图层"
<WMSTileLayer 
  url="http://143.89.22.7:8090/geoserver/wms"
  params={{
    layers: 'COP:Flood_Depth_Return_Period_100yr',
    format: 'image/png',
    transparent: true
  }}
/>

结果：地图上显示蓝色的洪水区域
```

### 场景2：查询具体数值（模块4要做的）⭐
```typescript
// 用户输入地址："中环金融街8号"
const address = "中环金融街8号";

// 1. 地理编码：地址 → 坐标
const coords = await geocodeAddress(address);
// 结果：{ lat: 22.2847, lon: 114.1578 }

// 2. WMS查询：坐标 → 洪水深度
const floodDepth = await queryWMS({
  lat: 22.2847,
  lon: 114.1578,
  layer: 'COP:Flood_Depth_Return_Period_100yr'
});
// 结果：{ depth: 1.5, unit: 'meters' }

// 3. 生成报告
const report = {
  address: "中环金融街8号",
  coordinates: "22.2847, 114.1578",
  floodRisk100yr: "1.5米",
  riskLevel: "Medium"
};

// 4. 下载 PDF
downloadPDF(report);
```

---

## 🔍 如何测试你的 WMS

### 方法1：浏览器直接访问
```
在浏览器打开：
http://143.89.22.7:8090/geoserver/wms?
  SERVICE=WMS&
  REQUEST=GetCapabilities

看到XML = WMS服务正常 ✅
```

### 方法2：获取一张地图图片
```
http://143.89.22.7:8090/geoserver/wms?
  SERVICE=WMS&
  VERSION=1.1.0&
  REQUEST=GetMap&
  LAYERS=COP:Flood_Depth_Return_Period_100yr&
  BBOX=113.8,22.1,114.3,22.6&
  WIDTH=512&
  HEIGHT=512&
  FORMAT=image/png&
  SRS=EPSG:4326

看到地图图片 = 图层正常 ✅
```

### 方法3：查询某个点的数值
```
http://143.89.22.7:8090/geoserver/wms?
  SERVICE=WMS&
  REQUEST=GetFeatureInfo&
  LAYERS=COP:Flood_Depth_Return_Period_100yr&
  QUERY_LAYERS=COP:Flood_Depth_Return_Period_100yr&
  BBOX=113.8,22.1,114.3,22.6&
  WIDTH=512&
  HEIGHT=512&
  X=256&
  Y=256&
  INFO_FORMAT=application/json

返回JSON数据 = 查询功能可用 ✅
```

---

## 📦 WMS 的数据格式

### 栅格数据（Raster）
```
像照片一样的格式，每个像素有一个值

例如：洪水深度
┌─────────────┐
│ 0.5 0.8 1.2 │  ← 每个格子是一个像素
│ 0.3 1.5 2.0 │     数字代表洪水深度（米）
│ 0.0 0.2 0.9 │
└─────────────┘

文件格式：
- GeoTIFF (.tif)
- NetCDF (.nc)
- ASCII Grid (.asc)
```

### 矢量数据（Vector）
```
像 SVG 一样的格式，存储点、线、面

例如：建筑物轮廓
Building 1: POLYGON((114.15 22.28, 114.16 22.28, ...))
Building 2: POLYGON((114.17 22.29, 114.18 22.29, ...))

文件格式：
- Shapefile (.shp)
- GeoJSON (.geojson)
- KML (.kml)
```

---

## 🎓 总结

### WMS 简单说就是：

1. **服务器上有地图数据**（洪水深度、风险区域等）

2. **你的网页发请求**："给我看香港的洪水地图"

3. **服务器返回图片**：🗺️ 一张彩色的地图

4. **你还能查询**："这个坐标的洪水深度是多少？"

5. **服务器返回数据**：`{ depth: 1.5m }`

### 在你的项目中：

```
模块1-3：显示 WMS 图层（已经在做了）
       ↓
       用户可以看到彩色的风险地图
       
模块4：  查询 WMS 数据（GetFeatureInfo）
       ↓
       用户输入地址 → 获取风险数值 → 生成报告
```

---

## 🚀 下一步

现在理解 WMS 了吗？需要我：

1. ✅ **测试你的 WMS 服务**，看看能不能查询数值？
2. 🔧 **写一个查询示例**，演示如何从 WMS 获取洪水深度？
3. 📝 **继续重构页面**，实现4模块布局？

告诉我！😊
