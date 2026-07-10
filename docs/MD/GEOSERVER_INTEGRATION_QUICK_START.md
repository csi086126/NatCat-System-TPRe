# GeoServer Integration - Quick Start Guide

## 快速开始指南

### 🎯 功能概述

现在你可以在 Risk Map 的 Historical Events 中直接显示和切换你在 GeoServer 上发布的 TIFF 和 Shapefile 数据层。

### 📋 已完成的功能

1. ✅ 数据结构创建 - 支持每个历史事件关联多个 GeoServer 图层
2. ✅ 状态管理 - 图层可见性动态控制
3. ✅ UI 更新 - 在事件详情中显示可用图层并支持切换
4. ✅ 地图渲染 - WMS 图层自动加载和显示
5. ✅ 文档完善 - 详细的集成指南

### 🚀 如何使用

#### 在 GeoServer 上发布数据

1. **创建工作空间** (如果还没有)
   - 名称: `historical_events`
   - URI: `http://your-domain.com/historical_events`

2. **发布 TIFF 栅格数据**
   - 数据存储 → 添加新的数据存储 → GeoTIFF
   - 选择你的 TIFF 文件
   - 发布为图层

3. **发布 Shapefile 矢量数据**
   - 数据存储 → 添加新的数据存储 → Shapefile
   - 选择你的 .shp 文件
   - 发布为图层

#### 添加事件到系统

编辑 `public/data/historical-events-with-layers.json`:

```json
{
  "id": "EVENT_001",
  "name": "台风事件名称",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "region": "Hong Kong",
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "geoserverLayers": [
    {
      "id": "flood_depth_layer",
      "name": "洪水深度图层",
      "workspace": "historical_events",
      "layerName": "your_layer_name_in_geoserver",
      "type": "raster",
      "format": "image/png",
      "description": "这个图层显示模拟的洪水深度分布"
    }
  ]
}
```

### 🎨 界面使用

1. **打开 Risk Map** → **Geospatial & Disaster Data Hub**
2. **点击 Disaster Events** → **Historical Events**
3. **选择一个事件** - 地图会自动飞到事件位置
4. **在事件详情中查看 "Available Data Layers"**
5. **勾选/取消勾选** 复选框来显示/隐藏图层

### 🔧 修改的文件

1. **public/data/historical-events-with-layers.json**
   - 新的数据文件，包含 GeoServer 图层信息

2. **src/app/riskmap/page.tsx**
   - 第 25 行: 导入新数据文件
   - 第 673-678 行: 添加状态管理
   - 第 716-745 行: 添加图层切换函数
   - 第 2410-2469 行: 更新 UI 显示图层列表
   - 第 2948-2969 行: 在地图上渲染 WMS 图层

3. **MD/GEOSERVER_HISTORICAL_EVENTS_INTEGRATION_GUIDE.md**
   - 完整的集成指南和文档

### 📊 数据层类型支持

#### 栅格数据 (TIFF)
- ✅ 洪水深度网格
- ✅ 降雨分布
- ✅ 风场数据
- ✅ 温度分布
- ✅ 任何地理参考的栅格数据

#### 矢量数据 (Shapefile)
- ✅ 受影响区域多边形
- ✅ 疏散路线 (线)
- ✅ 避难所位置 (点)
- ✅ 行政边界
- ✅ 基础设施损坏点

### 🌐 GeoServer 配置

**当前 GeoServer URL:** `http://143.89.22.7:8090/geoserver/wms`

如果你的 GeoServer 在不同的地址，在 `src/app/riskmap/page.tsx` 中搜索并替换这个 URL。

### 💡 关键特性

1. **无需代码修改** - 只需编辑 JSON 文件即可添加新事件
2. **多图层支持** - 每个事件可以有多个数据层
3. **自动图层激活** - 选择事件时自动启用第一个图层
4. **动态切换** - 实时显示/隐藏图层
5. **透明度支持** - 图层以 70% 不透明度渲染，便于叠加查看
6. **栅格和矢量** - 同时支持 TIFF 和 Shapefile 数据

### 🔍 示例配置

系统预配置了 3 个示例事件:

1. **Typhoon Mangkhut (2023)**
   - 洪水深度栅格层
   - 风场栅格层
   - 受影响区域矢量层

2. **June 2022 Rainstorm**
   - 降雨分布栅格层
   - 洪水范围矢量层

3. **July 2021 Flash Flood**
   - 洪水深度栅格层
   - 排水系统状态矢量层

### ⚠️ 注意事项

1. **确保 CORS 配置正确** - GeoServer 需要允许来自你域名的请求
2. **图层名称大小写敏感** - 必须与 GeoServer 中的完全一致
3. **使用正确的坐标系** - 建议使用 EPSG:4326 或 EPSG:3857
4. **优化大文件** - 对于大型 TIFF 文件，建议创建图像金字塔

### 📖 详细文档

完整的技术文档和故障排除指南请查看:
**[MD/GEOSERVER_HISTORICAL_EVENTS_INTEGRATION_GUIDE.md](./GEOSERVER_HISTORICAL_EVENTS_INTEGRATION_GUIDE.md)**

### 🎉 完成！

你的平台现在已经准备好接入 GeoServer 数据了！

访问 http://localhost:3003/riskmap 开始使用。
