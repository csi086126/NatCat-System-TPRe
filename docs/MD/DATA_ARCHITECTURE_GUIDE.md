# 数据架构说明

## 📊 数据分类策略

### 三层数据架构

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: 具体事件数据 (Event-Specific Data)                  │
│ - 特定台风的洪涝模拟TIF                                       │
│ - 事件关联的保险理赔数据                                      │
│ - 存储位置: events-index.json + 详细JSON                      │
│ - GeoServer: 按地区组织 (Macau, HongKong, etc.)              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: 全球数据集 (Global Datasets)                        │
│ - IBTracks全球台风路径 (1842-2024)                           │
│ - 背景参考数据，不属于特定事件                                │
│ - 存储位置: global-datasets.json                             │
│ - GeoServer: Global工作空间                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: 模型数据 (Model/Scenario Data)                      │
│ - 随机降雨事件集 (Python二进制数组)                          │
│ - 情景数据，用于风险评估                                      │
│ - 存储位置: Python API + 缓存                                 │
│ - 访问方式: FastAPI按需转换                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ 文件组织

### 配置文件

```
public/data/
  ├── events-index.json          # 所有具体事件的索引
  ├── regions-config.json        # 地区配置（边界、人口等）
  └── global-datasets.json       # 全球数据集配置（IBTracks等）
```

### GeoServer工作空间

```
GeoServer Workspaces:
  ├── Global/                    # 全球数据
  │   ├── IBTrACS_WP_Lines       # 台风路径（线）
  │   └── IBTrACS_WP_Points      # 台风路径点（6小时）
  ├── Macau/                     # 澳门数据
  │   ├── Hato_MacauPeninsula    # 天鸽-澳门半岛洪涝
  │   ├── Hato_Taipa             # 天鸽-氹仔洪涝
  │   ├── Mangkhut_MacauPeninsula
  │   ├── Mangkhut_Taipa
  │   ├── Ragasa_MacauPeninsula
  │   └── Ragasa_Taipa
  ├── HongKong/                  # 香港数据（未来）
  └── GBA/                       # 大湾区数据（未来）
```

### 数据文件目录

```
D:/web-flood-insurance-model/Data/
  ├── IBTracks/                           # 全球台风路径
  │   ├── IBTrACS.WP.list.v04r01.lines/   # Shapefile目录
  │   │   ├── IBTrACS.WP.list.v04r01.lines.shp
  │   │   ├── IBTrACS.WP.list.v04r01.lines.shx
  │   │   ├── IBTrACS.WP.list.v04r01.lines.dbf
  │   │   └── IBTrACS.WP.list.v04r01.lines.prj
  │   └── IBTrACS.WP.list.v04r01.points/  # Shapefile目录
  ├── Typhoon_FloodResult_Macau/          # 澳门台风洪涝
  │   ├── Hato_MacauPeninsula.tif
  │   ├── Hato_Taipa.tif
  │   ├── Mangkhut_MacauPeninsula.tif
  │   ├── Mangkhut_Taipa.tif
  │   ├── Ragasa_MacauPeninsula.tif
  │   └── Ragasa_Taipa.tif
  ├── Insurance_data/                     # 保险数据
  └── RainfallScenarios/                  # 降雨事件集（未来）
      ├── scenario_0001.npy
      ├── scenario_0002.npy
      └── ...
```

---

## 🎯 使用场景

### 场景1: 查看历史台风事件

**用户操作**: 在事件列表中选择"Typhoon Hato 2017"

**系统响应**:
1. 从 `events-index.json` 加载事件基本信息
2. 从 `macau-typhoon-events.json` 加载详细信息
3. 在地图上显示事件中心点（标记）
4. 用户展开事件 → 显示可用图层列表
5. 用户勾选"Macau Peninsula Flood" → 加载 `Macau:Hato_MacauPeninsula` WMS图层
6. 可选：显示该台风在IBTracks中的路径（查询 `Global:IBTrACS_WP_Lines` WHERE `NAME='HATO' AND SEASON=2017`）

### 场景2: 浏览区域内所有历史台风

**用户操作**: 勾选"Show Historical Typhoon Tracks"

**系统响应**:
1. 从 `global-datasets.json` 读取IBTracks配置
2. 添加 `Global:IBTrACS_WP_Lines` 作为背景图层
3. 使用WFS CQL过滤器：`BBOX(geometry, 113, 21, 115, 23)` （当前地图范围）
4. 按强度（Saffir-Simpson等级）着色路径
5. 点击某条路径 → 弹窗显示台风名称、年份、强度
6. 如果该台风有对应的模拟数据 → 显示"View Simulation"按钮

### 场景3: 降雨情景分析

**用户操作**: 选择"Rainfall Scenarios" → 选择"100-year Return Period"

**系统响应**:
1. 从 `global-datasets.json` 读取降雨数据集配置
2. 前端调用API: `GET /api/rainfall/scenarios?return_period=100&region=Macau`
3. Python后端:
   - 从 `.npy` 文件加载数据
   - 使用 `rasterio` 转换为GeoTIFF
   - 缓存转换结果
   - 返回临时TIF的URL
4. 前端加载TIF作为临时WMS图层

---

## 🚀 实施步骤

### 已完成 ✅

1. ✅ 创建 `events-index.json`（3个Macau台风事件）
2. ✅ 创建 `regions-config.json`（4个地区配置）
3. ✅ 创建 `global-datasets.json`（IBTracks + 降雨数据配置）
4. ✅ 创建 `publish-ibtracs.py`（IBTracks发布脚本）

### 下一步 🔄

1. **发布IBTracks到GeoServer** （5-10分钟）
   ```bash
   python scripts/publish-ibtracs.py
   ```

2. **测试IBTracks图层** （5分钟）
   - 浏览器访问: http://localhost:8080/geoserver/web
   - 检查 `Global` 工作空间
   - 预览 `IBTrACS_WP_Lines` 图层

3. **前端集成IBTracks** （30分钟）
   - 在 `riskmap/page.tsx` 添加IBTracks图层
   - 添加开关控制显示/隐藏
   - 实现点击查询台风信息

4. **发布Macau TIF文件** （已有脚本）
   ```bash
   python scripts/batch-publish-geoserver.py
   ```

5. **降雨数据API**（未来实现）
   - 创建FastAPI服务
   - 实现 `.npy` 到 GeoTIFF 转换
   - 添加缓存机制

---

## 🔍 数据查询示例

### IBTracks WFS查询

```javascript
// 1. 查询2017年所有台风
const cql = "SEASON=2017"

// 2. 查询Typhoon Hato
const cql = "NAME='HATO' AND SEASON=2017"

// 3. 查询5级台风
const cql = "USA_SSHS=5"

// 4. 查询Macau附近500km的台风
const cql = "DWITHIN(geometry, POINT(113.5 22.2), 500, kilometers)"

// WFS请求URL
const url = `http://localhost:8080/geoserver/Global/wfs?
  service=WFS&
  version=2.0.0&
  request=GetFeature&
  typeName=Global:IBTrACS_WP_Lines&
  outputFormat=application/json&
  cql_filter=${encodeURIComponent(cql)}`
```

### 事件数据查询

```typescript
// 从events-index.json筛选
const events = eventsIndex.events.filter(event => {
  return event.regions.includes('Macau') && 
         event.year >= 2017 &&
         event.hazardType === 'Typhoon'
})

// 加载事件详情
const eventDetail = await fetch(`/data/${event.detailFile}`)
  .then(res => res.json())
  .then(data => data.find(e => e.id === event.id))
```

---

## 💡 关键设计决策

### 为什么分三层？

1. **Layer 1 (事件数据)**
   - 用户主要关注点
   - 需要详细元数据
   - 按地区组织便于管理

2. **Layer 2 (全球数据集)**
   - 背景参考数据
   - 跨地区共享
   - 不关联特定事件

3. **Layer 3 (模型数据)**
   - 数据量巨大（GB级别）
   - 按需访问，避免全量加载
   - 需要计算转换

### 为什么IBTracks不放在events-index中？

1. **数量级差异**: IBTracks有成千上万条台风路径，events-index只有数百个精选事件
2. **数据性质**: IBTracks是背景数据库，events是具体分析对象
3. **查询方式**: IBTracks用WFS空间查询，events用JSON筛选
4. **维护方式**: IBTracks由全球机构维护，events由各地区团队添加

### 为什么降雨数据用API？

1. **文件大小**: 数千个情景，每个数百MB，无法全量发布
2. **访问频率**: 大部分情景很少访问，不值得预处理
3. **灵活性**: 可以按需裁剪范围、调整分辨率
4. **缓存策略**: 只缓存常用情景（如100年重现期）

---

## 📝 下一步建议

**立即执行**（今天完成）:
1. 运行 `python scripts/publish-ibtracs.py` 发布台风路径
2. 在GeoServer中预览IBTracks图层
3. 测试WFS查询功能

**本周完成**:
1. 前端集成IBTracks图层
2. 添加台风路径显示开关
3. 实现点击路径查看台风详情

**下周计划**:
1. 设计降雨数据API接口
2. 实现 `.npy` 到 GeoTIFF 转换
3. 添加降雨情景选择器
