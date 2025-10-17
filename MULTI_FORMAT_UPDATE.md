# Event Upload 多格式支持 - 更新说明

## 🎉 重大更新

Event Upload功能已从单一JSON格式扩展为支持多种地理和灾害数据格式！

---

## ✨ 新增功能

### 1. 多格式自动识别
系统现在根据文件扩展名自动识别并处理不同格式：

```javascript
文件选择器支持的格式：
.accept = '.json,.tif,.tiff,.bin,.dat,.geojson,.shp,.kml'

自动路由到对应的处理函数：
- .json / .geojson  → handleJSONUpload()
- .tif / .tiff      → handleTIFFUpload()
- .bin / .dat       → handleBinaryUpload()
- .shp              → handleShapefileUpload()
- .kml              → handleKMLUpload()
```

### 2. TIFF栅格数据支持 ✅
```javascript
特点：
- 读取为ArrayBuffer
- 支持GeoTIFF格式
- 可集成geotiff.js库进行解析
- 适用于洪水深度图、DEM、卫星影像

数据存储：
{
  id: "TIFF-{timestamp}",
  type: "Raster Data",
  dataFormat: "TIFF",
  rasterData: {
    buffer: ArrayBuffer,
    fileName: "flood_depth.tif"
  }
}
```

### 3. 二进制数据支持 ✅
```javascript
特点：
- 读取为ArrayBuffer
- 支持自定义二进制格式
- 提供DataView解析
- 适用于模型输出、传感器数据

示例结构（每条20字节）：
- Longitude (float32, 4B)
- Latitude (float32, 4B)
- Flood Depth (float32, 4B)
- Water Velocity (float32, 4B)
- Timestamp (uint32, 4B)
```

### 4. Shapefile/KML提示 🔄
```javascript
当前状态：
- 显示友好的转换指引
- 建议使用QGIS或在线工具转换为GeoJSON
- 未来版本将完全支持

转换工具推荐：
- QGIS（桌面软件）
- mapshaper.org（在线）
- ogr2ogr（命令行）
```

---

## 📁 代码结构

### 主处理函数
```javascript
handleUploadEventMetadata()
├── 创建文件选择器（多格式accept）
├── 文件扩展名识别
└── switch分发到对应处理器
    ├── handleJSONUpload()       // JSON/GeoJSON
    ├── handleTIFFUpload()       // TIFF栅格
    ├── handleBinaryUpload()     // 二进制
    ├── handleShapefileUpload()  // Shapefile
    └── handleKMLUpload()        // KML
```

### 各格式处理器特点

#### handleJSONUpload()
- 使用FileReader.readAsText()
- JSON.parse()解析
- 字段验证（id, name, type）
- 重复检测和覆盖确认
- 自动分类（historical/stochastic）

#### handleTIFFUpload()
- 使用FileReader.readAsArrayBuffer()
- 存储ArrayBuffer引用
- 创建"Raster Data"类型事件
- 记录文件大小和元数据
- 可集成geotiff.js深度解析

#### handleBinaryUpload()
- 使用FileReader.readAsArrayBuffer()
- 创建DataView用于字节操作
- 记录首16字节用于调试
- 创建"Binary Data"类型事件
- 支持自定义解析逻辑

---

## 🎯 使用场景

### 场景1: 洪水深度图上传
```
数据：GeoTIFF格式的洪水深度栅格
文件：flood_depth_typhoon_2023.tif
大小：2.5 MB

步骤：
1. Event Upload → 选择.tif文件
2. 系统自动识别为TIFF
3. 读取为ArrayBuffer
4. 创建事件：TIFF-{timestamp}
5. 可后续使用geotiff.js解析并在地图渲染
```

### 场景2: 模型输出上传
```
数据：洪水模拟二进制结果
文件：simulation_results.bin
格式：每条20字节（lon, lat, depth, velocity, time）

步骤：
1. Event Upload → 选择.bin文件
2. 系统识别为Binary
3. 读取为ArrayBuffer
4. 创建事件：BIN-{timestamp}
5. 自定义解析函数提取数据点
6. 在地图上可视化
```

### 场景3: GIS数据导入
```
数据：Shapefile（建筑物轮廓）
文件：buildings.shp + .shx + .dbf

当前方案：
1. 使用QGIS转换为GeoJSON
2. Export → Save Features As → GeoJSON
3. 上传转换后的.geojson文件

未来版本：
1. 打包为buildings.zip
2. 直接上传ZIP
3. 系统自动解压并解析
```

---

## 📊 性能考虑

### 内存管理
```
当前实现：
- 文件直接读入浏览器内存（ArrayBuffer）
- 适合 < 100MB 的文件
- 刷新页面后数据丢失

建议优化（生产环境）：
- 上传到后端服务器
- 使用IndexedDB缓存大文件
- 实现分块上传（Chunked Upload）
- Web Workers处理大文件
```

### 文件大小指导
```
✅ 理想: < 10 MB
   → 快速加载，流畅体验

⚠️ 可接受: 10-50 MB
   → 可能有短暂加载时间
   → 考虑显示进度条

❌ 慢: 50-100 MB
   → 明显延迟
   → 强烈建议服务器处理

🚫 不推荐: > 100 MB
   → 浏览器可能崩溃
   → 必须使用服务器处理
```

---

## 🔧 扩展建议

### 1. 集成GeoTIFF解析
```bash
npm install geotiff

# 使用示例
import GeoTIFF from 'geotiff';

async function parseTIFF(arrayBuffer) {
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox();
  const data = await image.readRasters();
  
  return { width, height, bbox, data };
}
```

### 2. 在地图上渲染TIFF
```javascript
// 使用Leaflet渲染栅格数据
import L from 'leaflet';

function renderTIFFOnMap(tiffData, bbox) {
  const bounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
  
  // 创建canvas渲染
  const canvas = createCanvasFromTIFF(tiffData);
  
  // 叠加到地图
  L.imageOverlay(canvas.toDataURL(), bounds, {
    opacity: 0.7
  }).addTo(map);
}
```

### 3. 二进制数据可视化
```javascript
function visualizeBinaryData(arrayBuffer) {
  const data = parseBinaryData(arrayBuffer);
  
  // 创建热力图
  const heatmapData = data.map(point => [
    point.latitude,
    point.longitude,
    point.floodDepth
  ]);
  
  L.heatLayer(heatmapData, {
    radius: 25,
    blur: 15,
    maxZoom: 13
  }).addTo(map);
}
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [MULTI_FORMAT_UPLOAD_GUIDE.md](./MULTI_FORMAT_UPLOAD_GUIDE.md) | 完整的多格式上传指南 |
| [EVENT_UPLOAD_GUIDE.md](./EVENT_UPLOAD_GUIDE.md) | 基础上传功能说明 |
| [UPLOAD_QUICK_REFERENCE.md](./UPLOAD_QUICK_REFERENCE.md) | 快速参考卡 |
| [BINARY_TEST_DATA.md](./public/data/BINARY_TEST_DATA.md) | 测试数据生成脚本 |
| [DATA_EXCHANGE_GUIDE.md](./DATA_EXCHANGE_GUIDE.md) | 数据交换完整指南 |

---

## 🧪 测试文件

| 文件 | 格式 | 用途 |
|------|------|------|
| test-event-upload.json | JSON | 测试标准事件上传 |
| test-flood-event.json | JSON | 测试洪水事件（含TIFF引用） |
| BINARY_TEST_DATA.md | 文档 | 生成测试.bin文件的脚本 |

---

## 🚀 未来功能

### 短期（1-3个月）
- [ ] 完整的GeoTIFF解析和地图渲染
- [ ] Shapefile ZIP包支持
- [ ] KML完整解析
- [ ] 上传进度显示
- [ ] 文件拖拽上传

### 中期（3-6个月）
- [ ] HDF5/NetCDF支持
- [ ] 批量文件上传
- [ ] 服务器端存储集成
- [ ] 大文件分块上传
- [ ] Web Workers异步处理

### 长期（6-12个月）
- [ ] 3D点云数据（LAS/LAZ）
- [ ] 视频数据支持
- [ ] 实时数据流
- [ ] 分布式处理
- [ ] AI自动数据提取

---

## 💡 开发者备注

### 关键修改位置
```
文件: src/app/disasterinfo/page.tsx

主要修改:
1. handleUploadEventMetadata() 
   - 扩展文件选择器accept
   - 添加格式识别switch

2. 新增5个处理函数:
   - handleJSONUpload()
   - handleTIFFUpload()
   - handleBinaryUpload()
   - handleShapefileUpload()
   - handleKMLUpload()

行数: ~350 lines (新增约200行)
```

### 向后兼容性
```
✅ 完全兼容
- 原有JSON上传功能不受影响
- 新格式作为扩展功能
- 不影响现有事件数据结构
```

### 已知限制
```
1. 数据仅存储在内存
   → 刷新页面后丢失
   → 需要重新上传

2. 大文件性能问题
   → >100MB可能卡顿
   → 建议服务器处理

3. Shapefile/KML部分支持
   → 需要手动转换
   → 未来版本完全支持
```

---

## ✅ 测试清单

- [ ] JSON上传（现有功能）
- [ ] GeoJSON上传
- [ ] TIFF文件上传（小文件<10MB）
- [ ] TIFF文件上传（大文件50-100MB）
- [ ] Binary文件上传
- [ ] 不支持格式的错误提示
- [ ] 文件取消操作
- [ ] 多次上传同一文件
- [ ] 上传后的事件显示
- [ ] 上传后的地图定位

---

**版本**: 2.0  
**更新日期**: 2025-10-16  
**更新内容**: 支持TIFF、Binary等多种数据格式  
**向后兼容**: ✅ 是  
**生产就绪**: 🔄 部分（建议添加服务器上传）
