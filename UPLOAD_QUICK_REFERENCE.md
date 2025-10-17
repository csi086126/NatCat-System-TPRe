# 灾害数据上传快速参考

## 🎯 支持的格式一览

```
┌──────────────────────────────────────────────────────────────┐
│  格式类型  │  扩展名        │  用途                          │
├──────────────────────────────────────────────────────────────┤
│  ✅ JSON    │  .json         │  事件元数据、属性信息          │
│  ✅ GeoJSON │  .geojson      │  地理矢量数据                  │
│  ✅ TIFF    │  .tif, .tiff   │  洪水深度图、DEM、卫星影像     │
│  ✅ Binary  │  .bin, .dat    │  模型输出、传感器数据          │
│  🔄 SHP     │  .shp          │  GIS矢量数据（建议转GeoJSON）  │
│  🔄 KML     │  .kml          │  Google Earth（建议转GeoJSON） │
└──────────────────────────────────────────────────────────────┘
```

---

## 📤 一分钟上传指南

### 1️⃣ JSON/GeoJSON
```
用途: 事件元数据
示例: typhoon_event.json

{
  "id": "T-2023-1",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "geometry": {
    "type": "Point",
    "coordinates": [114.17, 22.32]
  }
}

操作:
1. 点击 Event Upload
2. 选择 .json 文件
3. 自动解析并添加
```

### 2️⃣ TIFF
```
用途: 洪水深度图、高程数据
示例: flood_depth.tif

特点:
- 栅格数据（网格）
- 包含地理坐标
- 多波段支持

操作:
1. 点击 Event Upload
2. 选择 .tif 文件
3. 系统读取为ArrayBuffer
4. 可用geotiff.js解析
```

### 3️⃣ Binary
```
用途: 模型输出、原始数据
示例: simulation.bin

结构示例（每条20字节）:
- 经度 (4 bytes, float32)
- 纬度 (4 bytes, float32)
- 深度 (4 bytes, float32)
- 速度 (4 bytes, float32)
- 时间 (4 bytes, uint32)

操作:
1. 点击 Event Upload
2. 选择 .bin 文件
3. 系统读取ArrayBuffer
4. 自定义解析逻辑
```

---

## 🔧 常见格式转换

### Shapefile → GeoJSON
```bash
# QGIS
1. 打开 .shp 文件
2. 右键 → Export → Save Features As
3. 选择 GeoJSON 格式
4. 保存并上传

# GDAL命令行
ogr2ogr -f GeoJSON output.geojson input.shp

# 在线工具
mapshaper.org
mygeodata.cloud
```

### KML → GeoJSON
```bash
# GDAL
ogr2ogr -f GeoJSON output.geojson input.kml

# 在线工具
geojson.io
mygeodata.cloud
```

### TIFF → 其他格式
```bash
# GDAL
gdal_translate input.tif output.png  # 转PNG
gdal_translate input.tif output.asc  # 转ASCII Grid
```

---

## ⚡ 快速示例

### 示例1: 上传台风事件
```json
{
  "id": "T-2024-3",
  "name": "Super Typhoon Saola",
  "type": "Typhoon",
  "date": "2024-09-01",
  "maxWindSpeed": "210 km/h",
  "geometry": {
    "type": "Point",
    "coordinates": [114.05, 22.18]
  },
  "category": "historical"
}
```

### 示例2: 上传洪水区域
```json
{
  "id": "F-2024-1",
  "name": "Urban Flooding Kowloon",
  "type": "Flood",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [114.16, 22.31],
      [114.18, 22.31],
      [114.18, 22.33],
      [114.16, 22.33],
      [114.16, 22.31]
    ]]
  }
}
```

---

## 🎓 数据结构速查

### 必需字段
```javascript
{
  id: "string",      // 唯一标识符
  name: "string",    // 事件名称
  type: "string"     // 事件类型
}
```

### 推荐字段
```javascript
{
  date: "YYYY-MM-DD",
  year: number,
  category: "historical" | "stochastic",
  geometry: {
    type: "Point" | "Polygon",
    coordinates: [lon, lat]
  }
}
```

### 扩展字段
```javascript
{
  maxWindSpeed: "string",
  totalRainfall: "string",
  estimatedLoss: "string",
  affectedPopulation: "string",
  affectedAreas: ["area1", "area2"],
  impactArea: {
    level1: "Hong Kong",
    level2: "Kowloon",
    level3: "Yau Tsim Mong"
  }
}
```

---

## 🚨 错误排查

### JSON解析失败
```
❌ Failed to parse JSON file

解决:
1. 检查JSON格式（使用jsonlint.com验证）
2. 确保UTF-8编码
3. 检查是否有多余逗号
4. 确认括号匹配
```

### 缺少必需字段
```
❌ Missing required fields (id, name, type)

解决:
1. 确保包含 id, name, type 字段
2. 字段名称区分大小写
3. 字段值不能为空或null
```

### 文件读取失败
```
❌ Failed to read file

解决:
1. 检查文件是否损坏
2. 确认文件扩展名正确
3. 尝试重新下载/生成文件
4. 检查文件权限
```

---

## 📊 性能指南

### 文件大小建议
```
✅ 优秀:  < 1 MB    → 瞬间加载
⚠️ 可接受: 1-10 MB  → 几秒加载
❌ 慢:    10-100 MB → 可能卡顿
🚫 不推荐: > 100 MB → 应使用服务器处理
```

### 优化建议
```
1. TIFF文件使用压缩（LZW, DEFLATE）
2. 大型数据集使用WMS/WFS服务
3. 二进制文件考虑分块上传
4. 使用Web Workers处理大文件
```

---

## 🔗 快速链接

- [完整上传指南](./EVENT_UPLOAD_GUIDE.md)
- [多格式详细说明](./MULTI_FORMAT_UPLOAD_GUIDE.md)
- [二进制测试数据生成](./public/data/BINARY_TEST_DATA.md)
- [数据交换完整指南](./DATA_EXCHANGE_GUIDE.md)

---

## 💡 提示

```
💡 第一次使用？
   → 从简单的JSON文件开始
   → 使用 public/data/test-event-upload.json

💡 需要转换格式？
   → 使用QGIS（免费、强大）
   → 或在线工具 mapshaper.org

💡 数据太大？
   → 考虑使用GeoServer
   → 设置WMS/WFS服务
   → 按需加载数据

💡 遇到问题？
   → 查看浏览器控制台（F12）
   → 检查文件格式和大小
   → 参考详细文档
```

---

**快速测试**: 
```
cd public/data
使用 test-event-upload.json 或 test-flood-event.json
```

**联系支持**: 查看详细错误日志，提供文件示例
