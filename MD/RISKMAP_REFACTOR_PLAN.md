# Risk Map UI 重构计划

## 目标
按照慕尼黑再保险（Munich Re）的标准重构 Risk Map 模块，简化用户界面，优化风险评估流程。

## 当前问题
1. ❌ UI 过于复杂：4个独立模块（Hazard/Exposure/Risk/Query）
2. ❌ 用户需要手动选择 Exposure 类型（不符合行业标准）
3. ❌ 专业模式隐藏了过多内容
4. ❌ 风险计算逻辑不透明
5. ❌ 与慕再等行业工具差距大

## 重构方案

### 阶段 1：UI 结构重构（本次实施）

#### 新的 UI 结构
```
┌─────────────────────────────────────────────────────────────┐
│  Header (保持不变)                                            │
└─────────────────────────────────────────────────────────────┘
┌────────────────┬────────────────────────────────────────────┐
│  Left Sidebar  │  Map Area                                   │
│  (384px)       │                                             │
│                │  ┌──────────────────────────────────────┐  │
│  ┌──────────┐  │  │                                      │  │
│  │ Location │  │  │      Interactive Map                 │  │
│  │ Risk     │  │  │      (Leaflet + WMS)                 │  │
│  │ Query    │  │  │                                      │  │
│  │          │  │  │                                      │  │
│  │ [Input]  │  │  │                                      │  │
│  │ [Search] │  │  │                                      │  │
│  │          │  │  │                                      │  │
│  │ [Results]│  │  │                                      │  │
│  └──────────┘  │  │                                      │  │
│                │  └──────────────────────────────────────┘  │
│  ┌──────────┐  │                                             │
│  │Advanced  │  │  Bottom: Legend (条件显示)                 │
│  │Options   │  │                                             │
│  │(折叠)    │  │                                             │
│  └──────────┘  │                                             │
└────────────────┴────────────────────────────────────────────┘
```

#### 左侧边栏模块（从上到下）

**1. Location Risk Query（主要功能，始终可见）**
- 地址/经纬度输入框
- "Search & Calculate Risk" 按钮
- 查询结果展示区域：
  - 位置信息（地址、经纬度）
  - Asset Info（自动查询的暴露度信息）
  - Risk Scores（各灾种分数 + 综合评分）
  - 计算详情（透明化）
  - 承保建议（基于风险等级）
  - Download Report / Export Data 按钮

**2. Advanced Options（可折叠，默认收起）**
- 查看详细 Hazard 图层
  - 洪水（5个重现期）
  - 暴雨（5个重现期）
  - 台风（6个强度级别 + 历史路径）
  - 风暴潮（3个重现期）
  - 滑坡（3个风险等级）
- 调整 Vulnerability 参数
- 查看计算方法说明
- 导出详细数据

### 主要改动

#### 移除的内容
- ❌ 独立的 "Hazard Map" 模块（整合到 Advanced Options）
- ❌ 独立的 "Exposure Map" 模块（改为自动查询）
- ❌ 独立的 "Risk Calculation" 模块（整合到 Query 结果）
- ❌ "Professional Mode" 切换开关（改为 "Advanced Options" 折叠面板）

#### 新增的内容
- ✅ Asset Info 展示区域（类似慕再）
- ✅ 更详细的 Risk Scores 展示
- ✅ 自动查询 Exposure 数据的逻辑
- ✅ 折叠式 Advanced Options（取代 Professional Mode）

### 阶段 2：数据查询逻辑重构（后续实施）

#### Exposure 自动查询
```typescript
async function queryAssetInfo(lat: number, lon: number) {
  return {
    elevation: await queryDEM(lat, lon),
    populationDensity: await queryPopulation(lat, lon),
    buildingDensity: await queryBuildings(lat, lon),
    distanceToCoast: calculateDistanceToCoast(lat, lon),
    landUse: await queryLandUse(lat, lon),
  };
}
```

#### Hazard 自动查询
```typescript
async function queryHazards(lat: number, lon: number) {
  return {
    flood: await queryWMS('flood_composite', lat, lon),
    typhoon: await queryWMS('typhoon_composite', lat, lon),
    rainstorm: await queryWMS('rainstorm_composite', lat, lon),
    stormSurge: await queryWMS('stormsurge_composite', lat, lon),
    landslide: await queryWMS('landslide_composite', lat, lon),
  };
}
```

#### Risk 计算
```typescript
function calculateRiskScores(hazards, assetInfo) {
  const vulnerability = getDefaultVulnerability(assetInfo.landUse);
  
  return {
    flood: calculateFloodScore(hazards.flood, assetInfo, vulnerability),
    typhoon: calculateTyphoonScore(hazards.typhoon, assetInfo, vulnerability),
    rainstorm: calculateRainstormScore(hazards.rainstorm, assetInfo, vulnerability),
    stormSurge: calculateStormSurgeScore(hazards.stormSurge, assetInfo, vulnerability),
    landslide: calculateLandslideScore(hazards.landslide, assetInfo, vulnerability),
    overall: calculateOverallRisk(...),
  };
}
```

## 实施步骤

### Step 1: 重构状态管理 ✅
- 简化 `riskConfig` 状态
- 移除用户可配置的 `exposureTypes`
- 添加 `assetInfo` 状态（存储自动查询的结果）

### Step 2: 重构 UI 布局 ✅
- 移除独立模块
- 整合到单一 Query 模块
- 添加折叠式 Advanced Options

### Step 3: 更新查询逻辑 🔄
- 添加 `queryAssetInfo()` 函数（目前返回模拟数据）
- 添加 `queryHazards()` 函数（目前返回模拟数据）
- 更新 `calculateCompositeRisk()` 函数

### Step 4: 优化结果展示 🔄
- Asset Info 卡片
- Risk Scores 卡片（类似慕再）
- 详细计算说明
- 承保建议

### Step 5: 实现 Advanced Options 🔄
- 折叠面板组件
- Hazard 图层详细视图
- Vulnerability 调整器

## 技术细节

### 新的状态结构
```typescript
const [assetInfo, setAssetInfo] = useState({
  address: '',
  latitude: 0,
  longitude: 0,
  elevation: 0,
  populationDensity: 0,
  buildingDensity: '',
  distanceToCoast: 0,
  landUse: '',
  worldcover: '',
});

const [riskScores, setRiskScores] = useState({
  flood: { score: 0, zone: 0, returnPeriod: '' },
  typhoon: { score: 0, zone: 0, intensity: '' },
  rainstorm: { score: 0, zone: 0, intensity: '' },
  stormSurge: { score: 0, zone: 0, returnPeriod: '' },
  landslide: { score: 0, zone: 0, level: '' },
  overall: { score: 0, level: '', defended: true },
});

const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
```

### 查询流程
```
用户输入地址 → 
  Geocoding (地址转经纬度) → 
    并行查询：
      ├─ WMS GetFeatureInfo (Hazard)
      ├─ Population API (Exposure)
      ├─ Building API (Exposure)
      ├─ DEM API (Exposure)
      └─ Land Use API (Exposure)
    → 计算 Risk Scores →
      → 显示结果 + 承保建议
```

## 预期效果

### 用户体验
- ✅ 快速查询：输入地址 → 点击按钮 → 获得结果（3步完成）
- ✅ 专业性：类似慕再的报告格式
- ✅ 灵活性：高级用户可展开 Advanced Options
- ✅ 透明度：清楚显示计算方法和假设

### 与慕再的对比
| 功能 | 慕再 | 重构后 | 当前版本 |
|------|------|--------|----------|
| 输入步骤 | 1步 | 1步 | 4步 ❌ |
| Asset Info | ✅ | ✅ | ❌ |
| Risk Scores | ✅ | ✅ | ✅ |
| 自动查询 Exposure | ✅ | ✅ | ❌ |
| 详细图层视图 | ✅ | ✅（Advanced） | ✅（Professional） |
| PDF 报告 | ✅ | ✅ | ✅ |

## 时间估算
- Step 1-2 (UI重构): 2-3小时 ✅ 本次完成
- Step 3 (查询逻辑): 1-2天（需要准备数据源）
- Step 4 (结果展示优化): 2-3小时
- Step 5 (Advanced Options): 2-3小时

总计：约3-4天完成全部重构

## 下一步
1. ✅ 完成 UI 重构（本次）
2. 准备 Exposure 数据源（WorldPop, OSM, SRTM等）
3. 实现 WMS GetFeatureInfo 查询
4. 实现 Geocoding API 集成
5. 优化 PDF 报告生成（模仿慕再格式）

---

**创建时间**: 2025-10-17
**状态**: 进行中 - Step 1-2
