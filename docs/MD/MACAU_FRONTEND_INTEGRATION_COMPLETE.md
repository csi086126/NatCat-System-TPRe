# Macau台风洪涝可视化 - 前端集成完成

## ✅ 已完成的工作

### 1. 数据文件
- ✅ `public/data/macau-typhoon-events.json` - 包含3个台风事件元数据

### 2. 前端代码更新 (`src/app/riskmap/page.tsx`)

#### 2.1 导入Macau事件数据
```typescript
import macauTyphoonEventsData from '@/../public/data/macau-typhoon-events.json';
```

#### 2.2 添加WMS图层配置
添加了6个Macau TIF图层：
- `macauHatoPeninsula`: Hato - Macau Peninsula
- `macauHatoTaipa`: Hato - Taipa
- `macauMangkhutPeninsula`: Mangkhut - Macau Peninsula
- `macauMangkhutTaipa`: Mangkhut - Taipa
- `macauRagasaPeninsula`: Ragasa - Macau Peninsula
- `macauRagasaTaipa`: Ragasa - Taipa

#### 2.3 合并事件数据
```typescript
const [historicalEvents, setHistoricalEvents] = useState([
  ...mockHistoricalEvents,
  ...macauTyphoonEventsData
]);
```

#### 2.4 添加图层切换UI
在事件详情卡片中，Macau台风事件会显示TIF图层切换选项。

---

## 🎯 测试步骤

### 前提条件
确保GeoServer已发布6个TIF文件为WMS图层（参考`MACAU_TYPHOON_QUICK_START.md`步骤3）

### 测试流程

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **打开Risk Map**
   访问: http://localhost:3003/riskmap

3. **导航到澳门**
   - 使用RegionSelector选择"Macau"
   - 或手动缩放到坐标 (22.1987, 113.5439)

4. **打开Historical Events**
   - 展开左侧边栏的"Geospatial & Disaster Data Hub"
   - 点击"Historical Events"
   - 应该看到3个新的Macau台风事件：
     * TY2017-HATO: Typhoon Hato (天鸽) - 2017-08-23
     * TY2018-MANGKHUT: Typhoon Mangkhut (山竹) - 2018-09-16
     * TY2023-RAGASA: Typhoon Ragasa (桦加沙) - 2023-09-02

5. **查看事件详情**
   - 点击任一Macau事件
   - 地图自动飞到澳门位置
   - 事件卡片展开显示详情：
     * Max Wind (最大风速)
     * Rainfall (降雨量)
     * Storm Surge (风暴潮)
     * Estimated Loss (估计损失)
     * Affected Population (受影响人口)

6. **切换TIF图层**
   - 在展开的事件详情中，会看到"🗺️ Flood Simulation Layers"部分
   - 勾选复选框：
     * ☑️ Macau Peninsula Flood Extent
     * ☑️ Taipa Flood Extent
   - 地图上应显示蓝色渐变的洪涝深度图

---

## 🗺️ 预期效果

### 事件列表视图
```
╔════════════════════════════════════════════╗
║ 📋 Historical Events                       ║
╠════════════════════════════════════════════╣
║                                            ║
║ [已有的事件...]                              ║
║                                            ║
║ ┌────────────────────────────────────┐   ║
║ │ Typhoon Hato (天鸽)          [🌀] │   ║
║ │ Typhoon • 2017-08-23              │   ║
║ └────────────────────────────────────┘   ║
║                                            ║
║ ┌────────────────────────────────────┐   ║
║ │ Typhoon Mangkhut (山竹)      [🌀] │   ║
║ │ Typhoon • 2018-09-16              │   ║
║ └────────────────────────────────────┘   ║
║                                            ║
║ ┌────────────────────────────────────┐   ║
║ │ Typhoon Ragasa (桦加沙)      [🌀] │   ║
║ │ Typhoon • 2023-09-02              │   ║
║ └────────────────────────────────────┘   ║
╚════════════════════════════════════════════╝
```

### 展开的事件详情（点击后）
```
╔════════════════════════════════════════════╗
║ Typhoon Hato (天鸽)                [🌀]   ║
║ Typhoon • 2017-08-23                       ║
║ ──────────────────────────────────────     ║
║ Max Wind: 185 km/h                         ║
║ Rainfall: 320 mm                           ║
║ Loss: $1.65 Billion USD                    ║
║ Population: 680,000                        ║
║ ──────────────────────────────────────     ║
║ 🗺️ Flood Simulation Layers:               ║
║ ☑️ Macau Peninsula Flood Extent           ║
║ ☐ Taipa Flood Extent                      ║
║ 💡 Toggle layers to view flood depth      ║
╚════════════════════════════════════════════╝
```

### 地图视图（图层激活后）
```
┌───────────────────────────────────────────┐
│  🗺️ Macau Map (Zoom: 12)                 │
│                                           │
│     ╔══════════════╗                      │
│     ║              ║   Macau Peninsula    │
│     ║  🟦 深蓝区域  ║ ← 洪涝深度2-3米      │
│     ║  🟨 浅蓝区域  ║ ← 洪涝深度0.5-1米    │
│     ╚══════════════╝                      │
│                                           │
│        ╔═════╗                            │
│        ║ 🟦  ║  Taipa                     │
│        ╚═════╝                            │
│                                           │
└───────────────────────────────────────────┘

图例: 🟦 深蓝 = 深水区 | 🟨 浅蓝 = 浅水区
```

---

## ⚠️ 注意事项

### 1. GeoServer必须先配置
在前端能看到TIF图层之前，必须完成：
- 在GeoServer中创建`Macau`工作空间
- 发布6个TIF文件为WMS图层
- 测试WMS GetMap请求能正常返回图像

### 2. WMS URL配置
当前代码使用的WMS服务器URL是：
```
http://localhost:8080/geoserver/Macau/wms
```

如果你的GeoServer在不同端口或地址，需要修改。

### 3. 图层命名必须匹配
GeoServer中的图层名必须严格匹配：
```
Macau:Hato_MacauPeninsula
Macau:Hato_Taipa
Macau:Mangkhut_MacauPeninsula
Macau:Mangkhut_Taipa
Macau:Ragasa_MacauPeninsula
Macau:Ragasa_Taipa
```

### 4. TypeScript类型警告
部分TypeScript类型错误是已存在的历史问题，不影响功能运行：
- `mapRef.current.flyTo` - Leaflet类型定义问题
- `asset.address` - 类型推断问题

新增的Macau事件使用`(event as any)`类型断言来访问`floodSimulation`属性。

---

## 🐛 常见问题排查

### 问题1: 看不到Macau事件
**症状:** Historical Events列表中没有Macau台风

**排查:**
1. 检查浏览器控制台是否有JSON导入错误
2. 确认文件路径: `public/data/macau-typhoon-events.json`
3. 检查文件内容是否为有效JSON

### 问题2: 点击事件后地图不跳转
**症状:** 点击Macau事件，地图没有飞到澳门

**原因:** `geometry.coordinates`必须存在且格式正确 `[lng, lat]`

**解决:** 检查JSON中的coordinates字段:
```json
"geometry": {
  "type": "Point",
  "coordinates": [113.5439, 22.1987]  // [经度, 纬度]
}
```

### 问题3: 复选框显示但图层不出现
**症状:** 勾选TIF图层，地图上没有显示

**可能原因:**
1. GeoServer未发布该图层
2. WMS URL不正确
3. 图层命名不匹配
4. TIF文件CRS与地图不兼容

**排查步骤:**
1. 打开浏览器开发者工具 → Network标签
2. 勾选图层
3. 查看是否有WMS GetMap请求
4. 如果有请求但返回错误，检查GeoServer配置
5. 手动访问WMS GetMap URL测试

### 问题4: TIF图层显示为灰色
**症状:** 图层加载但显示为灰色/单色

**原因:** 未配置SLD样式或样式不正确

**解决:** 
1. 在GeoServer中为图层配置颜色渐变样式
2. 参考`MACAU_TYPHOON_INTEGRATION_GUIDE.md`中的SLD XML
3. 设置ColorMap的quantity范围与实际数据匹配

---

## 📚 相关文档

- 📖 **完整集成指南**: `MD/MACAU_TYPHOON_INTEGRATION_GUIDE.md`
- 🚀 **快速开始**: `MD/MACAU_TYPHOON_QUICK_START.md`
- 📊 **数据文件**: `public/data/macau-typhoon-events.json`

---

## 🎉 下一步

前端集成已完成！现在你可以：

1. **立即测试**（如果GeoServer已配置）
   ```bash
   npm run dev
   # 访问 http://localhost:3003/riskmap
   ```

2. **配置GeoServer**（如果还没配置）
   - 按照`MACAU_TYPHOON_QUICK_START.md`步骤3操作
   - 发布6个TIF文件为WMS图层

3. **后续增强**（可选）
   - 添加保险数据图层（等Excel列名确认后）
   - 优化TIF性能（转换为COG格式）
   - 添加图例组件显示洪涝深度色标

---

**更新时间:** 2025-11-18  
**状态:** ✅ 前端集成完成，等待GeoServer配置
