# Geospatial & Disaster Data Hub 数据重构完成

## 📋 重构概述

成功将数据组织结构重构为更加清晰的层级分类，将 IBTrACS 全球台风数据和澳门台风洪涝模拟数据整合到统一的 Historical Events 结构中。

---

## 🎯 重构目标

### 重构前的问题
1. ❌ IBTrACS 数据作为独立的 "Global Typhoon Datasets" 面板存在
2. ❌ 台风洪涝 TIFF 图层分散在历史事件的详情中
3. ❌ 数据组织不够清晰，用户需要在多个面板间切换
4. ❌ Typhoon 和 Flood 概念混淆

### 重构后的改进
1. ✅ 所有数据统一在 "Geospatial & Disaster Data Hub" 下
2. ✅ Historical Events 按灾害类型分为 Typhoon 和 Flood 两个子类别
3. ✅ IBTrACS 全球数据集成到 Typhoon 类别中
4. ✅ 澳门台风洪涝 TIFF 图层集成到 Flood 类别中
5. ✅ 数据层次更加清晰，易于导航和使用

---

## 🏗️ 新的数据结构

```
Geospatial & Disaster Data Hub
├── Geospatial Reference Layers (地理参考图层)
│   ├── Base Maps (底图)
│   ├── Topography (地形)
│   ├── Land Cover (土地覆盖)
│   └── ... (其他地理要素)
│
└── Disaster Events (灾害事件)
    ├── 📅 Historical Events (历史事件)
    │   ├── 🌀 Typhoon (台风类别)
    │   │   ├── 🌏 IBTrACS Global Typhoon Database
    │   │   │   ├── Global Typhoon Tracks (路径线)
    │   │   │   └── Global Typhoon Analysis Points (分析节点)
    │   │   │       └── 点击节点查看: 风速、气压、风圈半径
    │   │   │
    │   │   └── 📍 Macau Historical Typhoon Events
    │   │       ├── Typhoon Hato (2017)
    │   │       ├── Typhoon Mangkhut (2018)
    │   │       └── Typhoon Ragasa (2023)
    │   │
    │   └── 🌊 Flood (洪涝类别)
    │       └── Macau Typhoon-Induced Flood Events
    │           ├── Hato Flood Simulation Layers
    │           │   ├── Macau Peninsula Flood Depth
    │           │   └── Taipa Flood Depth
    │           ├── Mangkhut Flood Simulation Layers
    │           │   ├── Macau Peninsula Flood Depth
    │           │   └── Taipa Flood Depth
    │           └── Ragasa Flood Simulation Layers
    │               ├── Macau Peninsula Flood Depth
    │               └── Taipa Flood Depth
    │
    └── 🔮 Stochastic Events (随机事件)
        └── (保持原有结构)
```

---

## 🔄 主要变更

### 1. 移除独立的 Global Typhoon Datasets 面板

**变更前**:
```tsx
{/* ========== Global Typhoon Datasets (IBTrACS) ========== */}
<div className="mb-6">
  <button onClick={() => setGlobalDatasetsOpen(!globalDatasetsOpen)}>
    <Globe /> Global Typhoon Datasets (IBTrACS)
  </button>
  {globalDatasetsOpen && (
    <div>
      {/* IBTrACS layers */}
    </div>
  )}
</div>
```

**变更后**:
- ✅ 删除独立面板
- ✅ 删除 `globalDatasetsOpen` 状态变量
- ✅ 内容整合到 Historical Events - Typhoon 中

---

### 2. Historical Events 添加子分类

**新增功能**:
```tsx
{/* Event Type Selection - Typhoon vs Flood */}
<div className="grid grid-cols-2 gap-2">
  <button
    onClick={() => setEventTypeFilter('Typhoon')}
    className={/* 样式 */}
  >
    🌀 Typhoon
  </button>
  <button
    onClick={() => setEventTypeFilter('Flood')}
    className={/* 样式 */}
  >
    🌊 Flood
  </button>
</div>
```

**默认选项**:
```tsx
const [eventTypeFilter, setEventTypeFilter] = useState('Typhoon');
```

---

### 3. Typhoon 类别内容

#### A. IBTrACS 全球台风数据库

```tsx
{/* IBTrACS Global Typhoon Tracks */}
<div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
  <p className="text-xs font-bold text-indigo-900 mb-2">
    🌏 IBTrACS Global Typhoon Database
  </p>
  <p className="text-[11px] text-indigo-700 mb-3">
    点击地图上的台风路径或节点可查看详细信息，包括最大风速、最低气压、风圈半径等。
  </p>

  <div className="space-y-2">
    {/* Global Typhoon Tracks */}
    <Checkbox id="globalTyphoonTracks" />
    <Label>Global Typhoon Tracks (IBTrACS Lines)</Label>

    {/* Global Typhoon Points */}
    <Checkbox id="globalTyphoonPoints" />
    <Label>Global Typhoon Analysis Points (IBTrACS)</Label>
  </div>
</div>
```

**功能特性**:
- ✅ 显示全球台风路径线
- ✅ 显示台风分析节点
- ✅ 点击节点查看详细信息:
  - 最大风速 (kt 和 km/h)
  - 最低气压 (hPa)
  - 最大风速半径 (nm 和 km)
  - 34/50/64 kt 风圈半径（四象限）

#### B. Macau Historical Typhoon Events

```tsx
{/* Macau Typhoon Events List */}
<div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
  <p className="text-xs font-bold text-orange-900 mb-2">
    📍 Macau Historical Typhoon Events
  </p>

  {/* Year Range Filter */}
  <div className="mb-3">
    <Input type="number" placeholder="From" value={eventYearFrom} />
    <Input type="number" placeholder="To" value={eventYearTo} />
  </div>

  {/* Show/Hide Events Toggle */}
  <Checkbox checked={showHistoricalEvents} />
  <Label>Display Markers on Map</Label>

  {/* Event List */}
  {filteredHistoricalEvents.filter(e => e.type === 'Typhoon').map(event => (
    <div key={event.id} onClick={() => setSelectedEvent(event)}>
      <p>{event.name}</p>
      <p>{event.type} • {event.date}</p>
      {/* Event details */}
    </div>
  ))}
</div>
```

**功能特性**:
- ✅ 显示澳门历史台风事件列表
- ✅ 年份范围筛选
- ✅ 地图标记开关
- ✅ 点击事件可飞到事件位置
- ✅ 显示事件详细信息

---

### 4. Flood 类别内容

```tsx
{/* Flood Content (Macau Typhoon-induced Floods) */}
{eventTypeFilter === 'Flood' && (
  <div className="space-y-3">
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-xs font-bold text-blue-900 mb-2">
        🌊 Macau Typhoon-Induced Flood Events
      </p>
      <p className="text-[11px] text-blue-700 mb-3">
        Historical flood simulation layers from major typhoon events
      </p>

      {/* Year Range Filter */}
      <div className="mb-3">
        <Input type="number" placeholder="From" value={eventYearFrom} />
        <Input type="number" placeholder="To" value={eventYearTo} />
      </div>

      {/* Event List with Flood Layers */}
      {filteredHistoricalEvents.filter(e => e.type === 'Typhoon').map(event => (
        <div key={event.id}>
          <p>{event.name}</p>
          <span className="bg-blue-200 text-blue-800">Flood</span>

          {/* GeoServer Flood Layers */}
          {event.geoserverLayers && event.geoserverLayers.map((layer, idx) => (
            <div key={idx}>
              <Checkbox
                id={`flood-layer-${event.id}-${idx}`}
                checked={visibleLayers[layerKey]}
                onCheckedChange={(checked) => {
                  setVisibleLayers(prev => ({ ...prev, [layerKey]: !!checked }));
                }}
              />
              <Label>{layer.name}</Label>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)}
```

**功能特性**:
- ✅ 显示台风引发的洪涝事件
- ✅ 每个事件显示可用的洪涝模拟图层
- ✅ 可切换显示不同区域的洪涝深度
- ✅ 年份范围筛选

---

### 5. 数据文件更新

#### macau-typhoon-events.json

为每个事件添加了 `geoserverLayers` 字段：

```json
{
  "id": "TY2017-HATO",
  "name": "Typhoon Hato (天鸽)",
  "geoserverLayers": [
    {
      "name": "Macau Peninsula Flood Depth",
      "layerName": "Hato_MacauPeninsula",
      "workspace": "Macau",
      "area": "Macau Peninsula"
    },
    {
      "name": "Taipa Flood Depth",
      "layerName": "Hato_Taipa",
      "workspace": "Macau",
      "area": "Taipa"
    }
  ]
}
```

**图层映射逻辑**:
```tsx
// Convert layer layerName to config key
// e.g., "Hato_MacauPeninsula" -> "macauHatoPeninsula"
const parts = layer.layerName.split('_');
const typhoonName = parts[0]; // "Hato"
let area = parts.slice(1).join(''); // "MacauPeninsula"
area = area.replace('Macau', ''); // "Peninsula"
const layerKey = `macau${typhoonName}${area}`; // "macauHatoPeninsula"
```

---

## 📊 用户界面流程

### Typhoon 类别使用流程

```
1. 打开 Geospatial & Disaster Data Hub
   ↓
2. 点击 "Historical Events"
   ↓
3. 选择 "Typhoon" 类别 (默认选中)
   ↓
4. 查看两个数据源:
   ├── IBTrACS Global Database
   │   ├── 勾选 "Global Typhoon Tracks"
   │   └── 勾选 "Global Typhoon Points"
   │       └── 点击地图上的节点查看详情
   │
   └── Macau Historical Events
       ├── 设置年份范围筛选
       ├── 开启地图标记显示
       └── 点击事件查看详情和飞到位置
```

### Flood 类别使用流程

```
1. 打开 Geospatial & Disaster Data Hub
   ↓
2. 点击 "Historical Events"
   ↓
3. 选择 "Flood" 类别
   ↓
4. 查看台风引发的洪涝事件:
   ├── 设置年份范围筛选
   ├── 选择感兴趣的事件
   │   ├── Hato (2017)
   │   ├── Mangkhut (2018)
   │   └── Ragasa (2023)
   │
   └── 勾选对应的洪涝模拟图层
       ├── Macau Peninsula Flood Depth
       └── Taipa Flood Depth
```

---

## 🎨 UI/UX 改进

### 1. 颜色编码

**Typhoon 类别**:
- 主色调：紫色/靛蓝色 (`purple-100 to indigo-100`)
- IBTrACS 面板：靛蓝色 (`indigo-50`, `indigo-200`)
- Macau Events 面板：橙色 (`orange-50`, `orange-200`)

**Flood 类别**:
- 主色调：蓝色/青色 (`blue-100 to cyan-100`)
- Flood Events 面板：蓝色 (`blue-50`, `blue-200`)

### 2. 图标系统

| 类别 | 图标 | 说明 |
|------|------|------|
| Typhoon | 🌀 | 台风/飓风符号 |
| Flood | 🌊 | 洪水/水波符号 |
| IBTrACS | 🌏 | 全球数据库 |
| Macau Events | 📍 | 地理位置标记 |
| Historical | 📅 | 历史事件 |
| Stochastic | 🔮 | 随机/概率事件 |

### 3. 交互优化

**按钮状态**:
```tsx
// 选中状态 - 渐变背景 + 加粗边框
className="bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-400"

// 未选中状态 - 灰色背景 + 细边框
className="bg-gray-50 border border-gray-300"
```

**面板布局**:
- ✅ 使用卡片式设计
- ✅ 不同数据源用不同背景色区分
- ✅ 清晰的标题和说明文字
- ✅ 合理的间距和分隔线

---

## 🔧 技术实现细节

### 状态管理

**删除的状态**:
```tsx
// ❌ 删除
const [globalDatasetsOpen, setGlobalDatasetsOpen] = useState(false);
```

**更新的状态**:
```tsx
// ✅ 更新默认值为 'Typhoon'
const [eventTypeFilter, setEventTypeFilter] = useState('Typhoon');
```

**保留的状态**:
```tsx
const [activeEventDataset, setActiveEventDataset] = useState<'historical' | 'stochastic' | null>(null);
const [eventYearFrom, setEventYearFrom] = useState('');
const [eventYearTo, setEventYearTo] = useState('');
const [showHistoricalEvents, setShowHistoricalEvents] = useState(false);
const [selectedEvent, setSelectedEvent] = useState<any>(null);
```

### 图层可见性控制

**Typhoon 图层**:
```tsx
visibleLayers.globalTyphoonTracks
visibleLayers.globalTyphoonPoints
```

**Flood 图层** (动态生成):
```tsx
visibleLayers.macauHatoPeninsula
visibleLayers.macauHatoTaipa
visibleLayers.macauMangkhutPeninsula
visibleLayers.macauMangkhutTaipa
visibleLayers.macauRagasaPeninsula
visibleLayers.macauRagasaTaipa
```

### 数据过滤逻辑

**Typhoon 事件过滤**:
```tsx
filteredHistoricalEvents.filter(e => e.type === 'Typhoon')
```

**Flood 事件过滤** (实际上也是 Typhoon 类型，但展示为 Flood):
```tsx
filteredHistoricalEvents.filter(e => e.type === 'Typhoon')
// 因为台风引发了洪涝，所以事件本身还是 Typhoon 类型
// 但在 Flood 类别中，我们展示其洪涝模拟图层
```

---

## 📝 代码文件修改清单

### 修改的文件

1. **src/app/riskmap/page.tsx**
   - ✅ 删除独立的 Global Typhoon Datasets 面板（约 50 行）
   - ✅ 删除 `globalDatasetsOpen` 状态变量
   - ✅ 更新 `eventTypeFilter` 默认值为 `'Typhoon'`
   - ✅ 重构 Historical Events 结构（约 300 行）
   - ✅ 添加 Typhoon 子类别（IBTrACS + Macau Events）
   - ✅ 添加 Flood 子类别（洪涝模拟图层）

2. **public/data/macau-typhoon-events.json**
   - ✅ 为每个事件添加 `geoserverLayers` 字段
   - ✅ Hato: 2 个洪涝图层
   - ✅ Mangkhut: 2 个洪涝图层
   - ✅ Ragasa: 2 个洪涝图层

### 新增的文档

3. **MD/GEOSPATIAL_DATA_HUB_RESTRUCTURE.md** (本文件)
   - ✅ 完整的重构文档
   - ✅ 数据结构说明
   - ✅ 用户使用流程
   - ✅ 技术实现细节

---

## ✅ 验证检查清单

### 功能验证

- [x] IBTrACS 台风路径线可以正常显示
- [x] IBTrACS 台风节点可以正常显示
- [x] 点击台风节点可以查看详细信息
- [x] Typhoon 类别显示澳门历史台风事件
- [x] Flood 类别显示洪涝模拟图层
- [x] 洪涝图层可以正常切换显示/隐藏
- [x] 年份范围筛选功能正常
- [x] 事件选择和地图飞行功能正常
- [x] 没有 TypeScript 编译错误

### UI 验证

- [x] Typhoon 和 Flood 按钮样式正确
- [x] 颜色编码清晰明确
- [x] 面板布局合理美观
- [x] 图标使用恰当
- [x] 文字说明清晰易懂
- [x] 响应式设计正常

### 代码质量

- [x] 删除了不必要的代码
- [x] 没有留下未使用的状态变量
- [x] 代码格式规范
- [x] 注释清晰完整
- [x] 逻辑结构清晰

---

## 🎯 使用示例

### 示例 1: 查看全球台风路径

```
用户操作流程:
1. 打开 Risk Map 页面
2. 点击 "Geospatial & Disaster Data Hub" 展开
3. 点击 "Historical Events" 按钮
4. 选择 "Typhoon" 类别 (默认已选中)
5. 在 "IBTrACS Global Typhoon Database" 面板:
   - 勾选 "Global Typhoon Tracks"
   - 勾选 "Global Typhoon Points"
6. 地图显示全球台风路径和节点
7. 点击任意台风节点查看:
   - 台风名称和时间
   - 最大风速 (155 kt ≈ 287 km/h)
   - 最低气压 (895 hPa)
   - 最大风速半径 (25 nm ≈ 46 km)
   - 34/50/64 kt 风圈半径（四象限）
```

### 示例 2: 查看澳门台风洪涝模拟

```
用户操作流程:
1. 打开 Risk Map 页面
2. 点击 "Geospatial & Disaster Data Hub" 展开
3. 点击 "Historical Events" 按钮
4. 选择 "Flood" 类别
5. 在事件列表中找到 "Typhoon Hato (天鸽)" 2017
6. 勾选洪涝模拟图层:
   - Macau Peninsula Flood Depth
   - Taipa Flood Depth
7. 地图显示 Hato 台风导致的洪涝深度分布
8. 可以同时查看多个台风的洪涝图层进行对比
```

### 示例 3: 对比不同台风的影响

```
用户操作流程:
1. 选择 "Typhoon" 类别
2. 在 "Macau Historical Events" 中:
   - 点击 "Typhoon Hato" 查看详情
   - 记录: 最大风速 185 km/h, 损失 $1.65B
3. 点击 "Typhoon Mangkhut" 查看详情
   - 记录: 最大风速 215 km/h, 损失 $2.83B
4. 切换到 "Flood" 类别
5. 对比两个台风的洪涝范围:
   - 同时勾选 Hato 和 Mangkhut 的洪涝图层
   - 观察哪个台风造成的洪涝范围更广
```

---

## 🚀 未来优化建议

### 短期优化

1. **添加图层预览缩略图**
   - 在图层列表中显示小缩略图
   - 用户可以直观了解图层内容

2. **添加图层透明度控制**
   - 滑块控制图层透明度
   - 便于叠加多个图层查看

3. **添加图层顺序调整**
   - 拖拽调整图层显示顺序
   - 控制哪个图层显示在上层

### 中期优化

4. **添加洪涝深度统计**
   - 显示洪涝面积统计
   - 显示不同深度区间的分布

5. **添加事件对比功能**
   - 选择多个事件进行并排对比
   - 显示关键指标的对比图表

6. **添加导出功能**
   - 导出事件列表为 CSV/Excel
   - 导出地图截图

### 长期优化

7. **集成更多台风数据源**
   - JMA (Japan Meteorological Agency)
   - CMA (China Meteorological Administration)
   - 提供多源数据对比

8. **添加台风路径预测**
   - 集成实时台风路径预报
   - 显示预测路径的不确定性

9. **添加影响区域评估**
   - 根据台风路径和强度自动评估影响区域
   - 提供人口和资产暴露度分析

---

## 📚 相关文档

- [IBTrACS Integration Guide](./IBTRACS_TYPHOON_INTEGRATION_GUIDE.md)
- [IBTrACS Quick Start](./IBTRACS_QUICK_START.md)
- [Macau Typhoon Integration Guide](./MACAU_TYPHOON_INTEGRATION_GUIDE.md)
- [GeoServer Integration Guide](./GEOSERVER_INTEGRATION_QUICK_START.md)

---

## 🎉 总结

本次重构成功实现了以下目标：

1. ✅ **统一数据入口**: 所有灾害数据都在 Geospatial & Disaster Data Hub 中
2. ✅ **清晰的分类**: Typhoon 和 Flood 分类明确，易于理解
3. ✅ **完整的功能**: 既保留了所有原有功能，又增强了易用性
4. ✅ **更好的用户体验**: 颜色编码、图标、布局都经过优化
5. ✅ **可扩展性强**: 未来可以轻松添加更多灾害类型和数据源

这个新结构为后续的功能扩展奠定了良好的基础！

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-26
**作者**: Claude Code Assistant
