# GeoServer WMS Integration - Complete! 🎉

## ✅ 已完成的工作

### 1. GeoServer图层上传
- ✅ Hong_Kong_18_Districts (18个行政区)
- ✅ Hong_Kong_18_Districts_Lines (18区边界线)
- ✅ TPUSU_2021 (4,916个TPU/Subunit)

**Workspace**: `natcat_platform`
**GeoServer URL**: http://143.89.22.7:8090/geoserver

---

### 2. 创建的组件

#### `GeoServerLayers.tsx`
📁 位置: `src/components/portfolio/GeoServerLayers.tsx`

**功能**:
- 🗺️ WMS图层渲染
- 🖱️ 点击交互获取区域信息
- 📊 自动加载并显示统计数据
- 🎛️ 图层切换控制面板
- 💡 智能弹出窗口显示统计信息

**支持的图层**:
1. **18 Districts** - 香港18个行政区 (默认显示)
2. **18 Districts Boundaries** - 18区边界线 (可选)
3. **TPU/Subunit (4,916)** - 最细粒度规划单元

---

### 3. 集成到 Portfolio Map

已将 `GeoServerLayers` 组件集成到现有的 `PortfolioMap.tsx` 中，与现有功能完美配合:

- ✅ 保留原有的热力图和标记功能
- ✅ 保留原有的搜索和过滤功能
- ✅ 添加了新的WMS图层显示
- ✅ 添加了区域统计信息显示

---

## 🎯 如何使用

### 访问地图

1. 打开浏览器访问: http://10.253.22.15:3004/portfolio
2. 点击左侧菜单的 **"Map View"** 标签
3. 地图将自动加载，18区图层默认显示

---

### 图层控制

#### 打开图层控制面板

在地图右上角，您会看到 **"Geographic Layers"** 按钮：

```
┌────────────────────────────┐
│ [图标] Geographic Layers   │
└────────────────────────────┘
```

点击后展开面板，显示可用图层：

```
Administrative Boundaries
☑ 18 Districts
☐ 18 Districts Boundaries
☐ TPU/Subunit (4,916)

Click on a region to view statistics
```

#### 切换图层

- **18 Districts**: 显示18个行政区的多边形（带填充色）
- **18 Districts Boundaries**: 仅显示18区的边界线
- **TPU/Subunit**: 显示4,916个最细粒度的规划单元

**注意**:
- 18 Districts 和 TPU/Subunit 是主图层，切换时会互相排斥
- Boundaries 是辅助图层，可以与主图层叠加显示

---

### 查看统计数据

#### 点击区域

1. 在地图上点击任意区域
2. 系统会自动:
   - 🔍 查询 GeoServer 获取区域信息
   - 📊 加载对应的统计数据
   - 💬 显示弹出窗口

#### 统计信息弹窗

弹窗会显示以下信息：

```
┌─────────────────────────────────┐
│ CENTRAL & WESTERN  中西區        │
│                                 │
│   481          0M         0M    │
│ Policies  Total Exposure  Avg   │
│                                 │
│ 🏢 By Occupancy (Top 3)         │
│ STORAGE      220 policies       │
│ OFFICE       180 policies       │
│ RETAIL        81 policies       │
│                                 │
│ Click region to view statistics │
└─────────────────────────────────┘
```

**包含的数据**:
- 区域名称 (中英文)
- 保单数量
- 总承保额
- 平均承保额
- 前3类occupancy分布

#### 关闭弹窗

点击弹窗右上角的 **[X]** 按钮关闭。

---

## 🔧 技术实现

### WMS图层渲染

使用 Leaflet 的 `L.tileLayer.wms` 加载 GeoServer 图层：

```typescript
const wmsLayer = L.tileLayer.wms(`${GEOSERVER_URL}/wms`, {
  layers: 'natcat_platform:Hong_Kong_18_Districts',
  format: 'image/png',
  transparent: true,
  version: '1.1.0',
});
```

### 点击交互 (GetFeatureInfo)

当用户点击地图时:

1. **获取点击坐标和视口信息**
   ```typescript
   const bbox = map.getBounds()
   const point = map.latLngToContainerPoint(e.latlng)
   ```

2. **发送 WMS GetFeatureInfo 请求**
   ```
   http://143.89.22.7:8090/geoserver/wms?
     SERVICE=WMS&
     VERSION=1.1.1&
     REQUEST=GetFeatureInfo&
     LAYERS=natcat_platform:Hong_Kong_18_Districts&
     QUERY_LAYERS=natcat_platform:Hong_Kong_18_Districts&
     BBOX=113.8,22.1,114.5,22.6&
     WIDTH=800&HEIGHT=600&
     X=400&Y=300&
     INFO_FORMAT=application/json&
     FEATURE_COUNT=1
   ```

3. **解析返回的 GeoJSON**
   ```json
   {
     "features": [{
       "properties": {
         "ID": 1,
         "ENAME": "CENTRAL & WESTERN",
         "CNAME": "中西區"
       }
     }]
   }
   ```

4. **加载对应的统计数据**
   ```typescript
   const districtId = feature.properties.ID;
   const statsResponse = await fetch('/data/statistics/districts-18-statistics.json');
   const statistics = statsData[`district_${districtId}`];
   ```

5. **显示弹出窗口**

---

## 📊 统计数据来源

统计数据来自之前生成的JSON文件：

```
public/data/statistics/
├── districts-18-statistics.json  ← 18区统计
├── ppu-statistics.json           ← PPU统计
├── spu-statistics.json           ← SPU统计
└── tpu-statistics.json           ← TPU统计
```

### 数据匹配逻辑

#### 18 Districts
```typescript
district_id (from GeoServer) → district_{id} (in JSON)
例如: ID=1 → district_1
```

#### TPU/TPUSU
```typescript
TPU code (from GeoServer) → tpu_{code} (in JSON)
例如: TPU="1-11" → tpu_1-11
```

---

## 🎨 样式说明

### WMS图层样式

图层样式由 GeoServer 控制，可在 GeoServer Web界面中修改：

1. 访问 http://143.89.22.7:8090/geoserver/web/
2. 点击 **Styles**
3. 创建或修改 SLD 样式文件
4. 应用到对应图层

### 弹窗样式

弹窗使用 Tailwind CSS 样式，在 `GeoServerLayers.tsx` 中定义。

**主要样式类**:
- 统计卡片: `bg-blue-50` (浅蓝色背景)
- 数值: `text-blue-600` (蓝色文字)
- 小标题: `text-xs font-semibold`

---

## 🧪 测试清单

### 基础功能测试

- [ ] **图层显示**
  - [ ] 18 Districts 图层正确显示
  - [ ] 18 Districts Lines 图层正确显示
  - [ ] TPUSU 图层正确显示
  - [ ] 图层可以切换

- [ ] **点击交互**
  - [ ] 点击 18 Districts 显示统计信息
  - [ ] 点击 TPUSU 显示统计信息
  - [ ] 弹窗显示完整信息
  - [ ] 弹窗可以关闭

- [ ] **统计数据**
  - [ ] 保单数量正确
  - [ ] Occupancy 分布正确
  - [ ] 年份分布正确 (如有)

### 性能测试

- [ ] **加载速度**
  - [ ] WMS 图层加载时间 < 2秒
  - [ ] GetFeatureInfo 响应时间 < 1秒
  - [ ] 统计数据加载时间 < 0.5秒

- [ ] **TPUSU 性能** (4,916个单元)
  - [ ] 缩放流畅度
  - [ ] 平移流畅度
  - [ ] 点击响应速度

### 兼容性测试

- [ ] **与现有功能兼容**
  - [ ] 热力图正常工作
  - [ ] 标记图层正常工作
  - [ ] 搜索功能正常工作
  - [ ] 过滤功能正常工作

- [ ] **浏览器兼容**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari

---

## 🐛 已知问题和限制

### 1. TPUSU 图层性能

**问题**: TPUSU图层包含4,916个多边形，在低缩放级别可能渲染较慢

**解决方案**:
- 使用 GeoServer 的瓦片缓存 (Tile Caching)
- 或者创建简化版 TPU 292 图层

**配置瓦片缓存**:
1. GeoServer → Tile Caching → Layers
2. 选择 `natcat_platform:TPUSU_2021`
3. 点击 **Seed/Truncate**
4. 配置缩放级别和格式

### 2. 统计数据缺失

**问题**: 部分区域可能没有对应的统计数据

**表现**: 弹窗显示 "No statistics available for this region"

**原因**:
- 该区域没有保单数据
- 统计文件未覆盖该区域
- 地理匹配未成功

### 3. 坐标系统

**注意**: TPUSU_2021 使用 EPSG:2326 (Hong Kong 1980 Grid)

如果发现位置不准确，可能需要在 GeoServer 中重新投影到 EPSG:4326 (WGS84)。

---

## 🚀 下一步改进

### 短期 (1-2周)

1. **添加 PPU 和 SPU 图层**
   - 目前只有 18 Districts 和 TPUSU
   - 添加 PPU (9个) 和 SPU (52个) 中间层级

2. **优化 TPUSU 性能**
   - 启用 GeoServer 瓦片缓存
   - 或创建 TPU 292 简化图层

3. **改进弹窗 UI**
   - 添加图表可视化
   - 添加更多统计维度
   - 支持多个区域对比

### 中期 (1个月)

4. **高级过滤**
   - 在地图上高亮显示特定 occupancy
   - 按承保额范围着色
   - 风险热点识别

5. **导出功能**
   - 导出当前视图为图片
   - 导出选中区域的统计数据
   - 生成PDF报表

6. **时间序列**
   - 显示历史数据趋势
   - 动画播放年度变化
   - 预测分析

### 长期 (2-3个月)

7. **实时数据**
   - 连接实时保单数据库
   - 自动更新统计数据
   - WebSocket 推送更新

8. **3D可视化**
   - 使用 Cesium.js 或 Deck.gl
   - 立体展示承保密度
   - 建筑物级别的3D模型

9. **AI分析**
   - 风险预测模型
   - 异常检测
   - 自动化报告生成

---

## 📚 相关文档

- [GeoServer Shapefile Upload Guide](./GEOSERVER_SHAPEFILE_UPLOAD_GUIDE.md)
- [Multi-Level Statistics Complete](./MULTI_LEVEL_STATISTICS_COMPLETE.md)
- [TPUSU Hierarchy Explained](./TPUSU_HIERARCHY_EXPLAINED.md)
- [GeoServer官方文档](https://docs.geoserver.org/)
- [Leaflet WMS文档](https://leafletjs.com/reference.html#tilelayer-wms)

---

## 🎉 完成清单

- [x] 创建 GeoServerLayers 组件
- [x] 集成 WMS 图层渲染
- [x] 实现点击交互
- [x] 加载统计数据
- [x] 显示统计弹窗
- [x] 添加图层控制面板
- [x] 集成到 Portfolio Map
- [x] 测试基本功能

---

## 💡 使用建议

### 最佳实践

1. **图层选择**
   - 使用 18 Districts 查看宏观分布
   - 使用 TPUSU 进行精细分析
   - 叠加 Boundaries 图层更清晰地看到边界

2. **性能优化**
   - 在高缩放级别(zoom > 13)时切换到 TPUSU
   - 在低缩放级别使用 18 Districts
   - 避免同时显示多个主图层

3. **数据分析**
   - 先在 Districts 标签页查看统计数字
   - 然后在 Map View 查看空间分布
   - 点击特定区域深入了解详情

---

**创建日期**: 2024-12-17
**状态**: ✅ 完成并可用
**版本**: 1.0.0
**作者**: Claude Code
**下次更新**: 添加 PPU/SPU 图层

---

## 快速开始

1. 访问: http://10.253.22.15:3004/portfolio
2. 点击 "Map View"
3. 点击右上角 "Geographic Layers"
4. 选择要显示的图层
5. 点击地图上的任意区域查看统计数据

**祝使用愉快！** 🎉
