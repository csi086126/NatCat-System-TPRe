# 灾害数据多格式上传指南

## 🎯 支持的文件格式

系统现在支持多种常见的灾害和地理数据格式：

| 格式 | 扩展名 | 数据类型 | 状态 | 用途 |
|------|--------|----------|------|------|
| **JSON** | .json | 元数据 | ✅ 完全支持 | 事件属性和元数据 |
| **GeoJSON** | .geojson | 地理数据 | ✅ 完全支持 | 矢量地理数据 |
| **TIFF** | .tif, .tiff | 栅格数据 | ✅ 基础支持 | 卫星影像、DEM、洪水深度图 |
| **Binary** | .bin, .dat | 二进制数据 | ✅ 基础支持 | 模型输出、原始数据 |
| **Shapefile** | .shp | 矢量数据 | 🔄 计划中 | GIS矢量数据 |
| **KML** | .kml | 地理标记 | 🔄 计划中 | Google Earth数据 |

---

## 📤 格式详解

### 1. JSON / GeoJSON 格式

#### 特点
- ✅ **纯文本**: 易读易编辑
- ✅ **标准化**: 广泛支持
- ✅ **完整性**: 包含所有元数据
- ✅ **轻量级**: 文件小，传输快

#### 适用场景
```
✓ 事件元数据存储
✓ 灾害事件属性数据
✓ 影响范围和损失统计
✓ 系统间数据交换
✓ API数据传输
```

#### 示例文件
```json
{
  "id": "T-2023-1",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "properties": {
    "maxWindSpeed": "285 km/h",
    "totalRainfall": "350 mm",
    "estimatedLoss": "$6.27 Billion"
  }
}
```

---

### 2. TIFF / GeoTIFF 格式

#### 特点
- ✅ **栅格数据**: 网格化的地理数据
- ✅ **高精度**: 支持多种数据类型
- ✅ **地理参考**: 包含坐标系统信息
- ✅ **多波段**: 支持多层数据

#### 适用场景
```
✓ 洪水深度图（Flood Depth Map）
✓ 数字高程模型（DEM）
✓ 卫星遥感影像
✓ 风险热力图
✓ 降雨量分布图
✓ 灾害影响范围图
```

#### 数据类型
```
- 洪水淹没深度（米）
- 地表高程（米）
- 风速分布（km/h）
- 降雨强度（mm/h）
- 建筑物损失比例（0-1）
```

#### 使用示例
```javascript
// TIFF文件上传后的数据结构
{
  id: "TIFF-1729065432123",
  name: "Flood_Depth_HK_2023",
  type: "Raster Data",
  dataFormat: "TIFF",
  fileSize: "2.5 MB",
  rasterData: {
    buffer: ArrayBuffer,
    fileName: "flood_depth.tif",
    // 可以包含波段信息、投影信息等
    bands: 1,
    width: 1024,
    height: 768,
    projection: "EPSG:4326"
  }
}
```

#### 推荐库
```bash
# 解析GeoTIFF文件
npm install geotiff

# 使用示例
import GeoTIFF from 'geotiff';

const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
const image = await tiff.getImage();
const width = image.getWidth();
const height = image.getHeight();
const data = await image.readRasters();
```

---

### 3. Binary 格式 (.bin, .dat)

#### 特点
- ✅ **紧凑**: 文件体积小
- ✅ **高效**: 读写速度快
- ✅ **原始**: 保持数据精度
- ✅ **灵活**: 自定义结构

#### 适用场景
```
✓ 数值模型输出
✓ 时间序列数据
✓ 大规模网格数据
✓ 传感器原始数据
✓ 模拟计算结果
```

#### 常见格式
```
1. 固定长度记录
   - 每条记录N字节
   - 字段位置固定

2. 变长记录
   - 长度前缀
   - 分隔符分隔

3. 结构化二进制
   - HDF5
   - NetCDF
   - GRIB
```

#### 数据解析示例
```javascript
// 读取二进制文件
const arrayBuffer = /* 从文件读取 */;
const dataView = new DataView(arrayBuffer);

// 解析定长记录（每条20字节：经度、纬度、深度、时间戳）
const recordSize = 20; // 4*4 + 4 = 20 bytes
const numRecords = arrayBuffer.byteLength / recordSize;

for (let i = 0; i < numRecords; i++) {
  const offset = i * recordSize;
  const longitude = dataView.getFloat32(offset, true);      // 4 bytes
  const latitude = dataView.getFloat32(offset + 4, true);   // 4 bytes
  const depth = dataView.getFloat32(offset + 8, true);      // 4 bytes
  const timestamp = dataView.getUint32(offset + 12, true);  // 4 bytes
  
  console.log({ longitude, latitude, depth, timestamp });
}
```

---

### 4. Shapefile 格式 (.shp)

#### 特点
- 🔄 **标准格式**: GIS行业标准
- 🔄 **矢量数据**: 点、线、面
- 🔄 **属性表**: 丰富的属性信息
- ⚠️ **多文件**: 需要配套文件

#### 必需文件
```
filename.shp    - 几何数据
filename.shx    - 索引文件
filename.dbf    - 属性表
filename.prj    - 投影信息（可选）
```

#### 适用场景
```
✓ 行政区划边界
✓ 建筑物轮廓
✓ 河流水系
✓ 道路网络
✓ 灾害影响范围
```

#### 当前解决方案
```
由于Shapefile需要多个配套文件，建议：

1. 使用QGIS转换为GeoJSON
   - 打开Shapefile
   - Export → Save Features As
   - 选择GeoJSON格式

2. 使用在线工具
   - mapshaper.org
   - mygeodata.cloud

3. 未来版本将支持ZIP压缩包上传
   - 将所有.shp相关文件打包为.zip
   - 系统自动解压并解析
```

---

### 5. KML 格式 (.kml)

#### 特点
- 🔄 **XML格式**: 易读
- 🔄 **Google Earth**: 原生支持
- 🔄 **可视化**: 包含样式信息
- 🔄 **多媒体**: 支持图片、链接

#### 适用场景
```
✓ Google Earth数据导入
✓ 轨迹和路线
✓ 地标标注
✓ 可视化项目
```

#### 当前解决方案
```
暂时不支持直接导入，建议：

1. 转换为GeoJSON
   - 使用在线工具（geojson.io）
   - 使用GDAL: ogr2ogr -f GeoJSON output.geojson input.kml

2. 使用库解析
   - togeojson.js
   - 将KML转为GeoJSON后导入
```

---

## 🚀 使用指南

### 上传流程

#### 1. 准备数据文件
```
确保文件符合以下要求：
✓ 格式正确（.json, .tif, .bin等）
✓ 文件完整（不损坏）
✓ 大小合理（建议<100MB）
✓ 编码正确（文本文件使用UTF-8）
```

#### 2. 点击Event Upload
```
在Disaster Repository页面：
1. 找到左侧Actions卡片
2. 点击"Event Upload"按钮
3. 文件选择器自动打开
```

#### 3. 选择文件
```
文件选择器支持的格式：
- .json, .geojson
- .tif, .tiff
- .bin, .dat
- .shp (未来)
- .kml (未来)
```

#### 4. 自动处理
```
系统根据文件扩展名自动识别格式：
- JSON → 解析元数据 → 添加到事件列表
- TIFF → 读取栅格数据 → 存储ArrayBuffer
- Binary → 读取二进制 → 存储ArrayBuffer
```

#### 5. 查看结果
```
上传成功后：
✓ 显示确认消息
✓ 事件自动添加到列表
✓ 自动选中并显示
✓ 地图定位到事件位置
```

---

## 💡 实际应用案例

### 案例1: 上传洪水深度TIFF图

#### 场景
有一个2023年台风山竹的洪水深度GeoTIFF文件（flood_depth_mangkhut_2023.tif）

#### 步骤
```
1. 点击 Event Upload
2. 选择 flood_depth_mangkhut_2023.tif
3. 系统自动：
   - 读取TIFF文件（ArrayBuffer）
   - 创建事件: TIFF-1729065432123
   - 类型: Raster Data
   - 存储: 栅格数据保存在内存中
4. 后续可以：
   - 在地图上叠加显示
   - 提取特定位置的深度值
   - 导出为其他格式
```

#### 数据使用
```javascript
// 访问上传的TIFF数据
const tiffEvent = selectedEvent;
if (tiffEvent.dataFormat === 'TIFF') {
  const arrayBuffer = tiffEvent.rasterData.buffer;
  
  // 使用geotiff.js解析
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const data = await image.readRasters();
  
  // 在地图上渲染
  renderTIFFOnMap(data, image.getBoundingBox());
}
```

---

### 案例2: 上传模型输出二进制文件

#### 场景
洪水模型输出的二进制结果文件（simulation_results.bin）

#### 二进制文件结构
```
每条记录32字节：
- Longitude (float32, 4 bytes)
- Latitude (float32, 4 bytes)
- Flood_Depth (float32, 4 bytes)
- Water_Velocity (float32, 4 bytes)
- Timestamp (uint32, 4 bytes)
- Building_Damage (float32, 4 bytes)
- 保留字段 (8 bytes)
```

#### 处理步骤
```
1. 上传 simulation_results.bin
2. 系统读取为ArrayBuffer
3. 自定义解析函数：

function parseSimulationData(arrayBuffer) {
  const dataView = new DataView(arrayBuffer);
  const recordSize = 32;
  const numRecords = arrayBuffer.byteLength / recordSize;
  const results = [];
  
  for (let i = 0; i < numRecords; i++) {
    const offset = i * recordSize;
    results.push({
      lon: dataView.getFloat32(offset, true),
      lat: dataView.getFloat32(offset + 4, true),
      depth: dataView.getFloat32(offset + 8, true),
      velocity: dataView.getFloat32(offset + 12, true),
      timestamp: dataView.getUint32(offset + 16, true),
      damage: dataView.getFloat32(offset + 20, true)
    });
  }
  
  return results;
}

4. 在地图上可视化
5. 导出为GeoJSON或CSV
```

---

### 案例3: 批量上传历史事件JSON

#### 场景
有50个历史灾害事件的JSON文件需要导入

#### 方法
```
当前版本：逐个上传
1. 准备所有JSON文件
2. 逐个点击Event Upload上传
3. 每个文件自动添加到系统

未来版本：批量上传
1. 选择多个文件（Ctrl+点击）
2. 系统批量处理
3. 显示进度条
4. 生成上传报告
```

---

## 🔧 技术实现

### 文件读取方式

#### 1. 文本文件（JSON, KML）
```javascript
const reader = new FileReader();
reader.readAsText(file);
reader.onload = (e) => {
  const text = e.target.result;
  // 解析文本
};
```

#### 2. 二进制文件（TIFF, Binary）
```javascript
const reader = new FileReader();
reader.readAsArrayBuffer(file);
reader.onload = (e) => {
  const arrayBuffer = e.target.result;
  // 处理二进制数据
};
```

#### 3. Base64编码
```javascript
const reader = new FileReader();
reader.readAsDataURL(file);
reader.onload = (e) => {
  const base64 = e.target.result;
  // 用于图片预览等
};
```

---

### 推荐的数据处理库

#### GeoTIFF处理
```bash
npm install geotiff

# 使用
import GeoTIFF from 'geotiff';
const tiff = await GeoTIFF.fromUrl(url);
const image = await tiff.getImage();
```

#### Shapefile处理
```bash
npm install shapefile

# 使用
import shapefile from 'shapefile';
const source = await shapefile.open('file.shp');
```

#### GeoJSON处理
```bash
npm install @turf/turf

# 使用
import * as turf from '@turf/turf';
const buffered = turf.buffer(point, 50, {units: 'kilometers'});
```

#### KML转换
```bash
npm install @tmcw/togeojson

# 使用
import toGeoJSON from '@tmcw/togeojson';
const geojson = toGeoJSON.kml(kmlDom);
```

---

## ⚠️ 注意事项

### 1. 文件大小限制
```
浏览器内存限制：
- 小文件 (<10MB): 直接在内存处理 ✅
- 中等文件 (10-100MB): 可能卡顿 ⚠️
- 大文件 (>100MB): 建议服务器处理 ❌

建议：
- TIFF文件使用瓦片化（Tiling）
- 大型数据集使用WMS/WFS服务
- 实时流数据使用WebSocket
```

### 2. 数据安全
```
当前实现：
- 数据仅存储在浏览器内存
- 刷新页面后数据丢失
- 不会自动上传到服务器

生产环境建议：
- 上传到后端服务器
- 存储在数据库
- 使用云存储（S3, OSS）
- 实现访问控制
```

### 3. 坐标系统
```
注意事项：
- 确认TIFF文件的投影信息（CRS）
- 统一转换为WGS84 (EPSG:4326)
- Leaflet默认使用WGS84

转换工具：
- GDAL/OGR
- QGIS重投影
- proj4.js（浏览器端）
```

### 4. 性能优化
```
大数据处理建议：
- 使用Web Workers处理大文件
- 分块读取文件
- 使用IndexedDB缓存
- 实现虚拟滚动
- 按需加载数据
```

---

## 🚀 未来功能规划

### 短期（1-3个月）
- [ ] 完整的GeoTIFF解析和渲染
- [ ] Shapefile ZIP包上传
- [ ] KML完整解析
- [ ] CSV格式支持
- [ ] Excel格式支持

### 中期（3-6个月）
- [ ] 批量文件上传
- [ ] 拖拽上传界面
- [ ] 上传进度显示
- [ ] 文件预览功能
- [ ] 数据格式转换
- [ ] 服务器端存储集成

### 长期（6-12个月）
- [ ] HDF5/NetCDF支持
- [ ] 3D数据支持（点云）
- [ ] 视频数据支持
- [ ] 实时数据流
- [ ] 大数据优化（TB级）
- [ ] 分布式处理

---

## 📚 相关文档

- [EVENT_UPLOAD_GUIDE.md](./EVENT_UPLOAD_GUIDE.md) - 基础上传指南
- [DATA_EXCHANGE_GUIDE.md](./DATA_EXCHANGE_GUIDE.md) - 数据交换完整指南
- [GeoTIFF处理文档](https://geotiffjs.github.io/)
- [Shapefile规范](https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf)

---

**版本**: 2.0  
**更新日期**: 2025-10-16  
**作者**: GitHub Copilot  
**系统**: Flood Catastrophe Insurance System
