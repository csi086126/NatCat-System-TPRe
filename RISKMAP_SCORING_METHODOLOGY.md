# Risk Map Scoring Methodology
## 基于慕尼黑再保险 NATHAN 模型的评分方案

**更新时间**: 2025-10-17  
**参考标准**: Munich Re NATHAN Hazards, JBA Flood Defense Standards

---

## 1. 总体架构

### 1.1 评分体系层级
```
Overall Risk Score (0-10)
├── Typhoon Risk Score (0-10)
├── Rainstorm Risk Score (0-10)
├── Flood Risk Score (0-10)
├── Storm Surge Risk Score (0-10)
└── Landslide Risk Score (0-10)
```

### 1.2 评分等级定义
| Risk Index | Level | Color | 描述 |
|-----------|-------|-------|------|
| 0 | No Hazard | Gray | 无风险 |
| 1-2 | Very Low | Light Green | 极低风险 |
| 3-4 | Low | Green | 低风险 |
| 5-6 | Medium | Yellow | 中等风险 |
| 7-8 | High | Orange | 高风险 |
| 9-10 | Extreme | Red | 极高风险 |

---

## 2. 各灾种评分方法

### 2.1 Flood (洪水) - 基于重现期 + 淹没深度

#### 评分标准
| Zone | Return Period | Depth Range | Risk Index | 说明 |
|------|--------------|-------------|-----------|------|
| Zone 0 | - | No flood risk | 0 | 无洪水风险 |
| Zone 1 | 500yr | 0-1m | 3 | 500年一遇，浅水 |
| Zone 2 | 200yr | 0-1m | 4 | 200年一遇，浅水 |
| Zone 3 | 100yr | 0-1m | 5 | 100年一遇，浅水 |
| Zone 4 | 50yr | 0-2m | 6 | 50年一遇，中等深度 |
| Zone 5 | 20yr | 0-2m | 7 | 20年一遇，中等深度 |
| Zone 6 | 100yr | 2-4m | 8 | 100年一遇，深水 |
| Zone 7 | 50yr | 2-4m | 9 | 50年一遇，深水 |
| Zone 8 | 20yr | >4m | 10 | 20年一遇，极深水 |

#### WMS 图层映射
```javascript
flood20yr  → 查询淹没深度 → 计算得分 (7-10)
flood50yr  → 查询淹没深度 → 计算得分 (6-9)
flood100yr → 查询淹没深度 → 计算得分 (5-8)
flood200yr → 查询淹没深度 → 计算得分 (4-7)
flood500yr → 查询淹没深度 → 计算得分 (3-6)
```

#### 计算逻辑
```javascript
function calculateFloodScore(lat, lon) {
  // 1. 查询所有重现期图层，获取该点的淹没深度
  const depths = {
    '20yr': queryWMS('flood20yr', lat, lon),
    '50yr': queryWMS('flood50yr', lat, lon),
    '100yr': queryWMS('flood100yr', lat, lon),
    '200yr': queryWMS('flood200yr', lat, lon),
    '500yr': queryWMS('flood500yr', lat, lon),
  };
  
  // 2. 找到最严重的情况（最短重现期 + 最大深度）
  let maxScore = 0;
  let criticalScenario = null;
  
  if (depths['20yr'] > 4) { maxScore = 10; criticalScenario = '20yr, >4m depth'; }
  else if (depths['20yr'] > 0) { maxScore = 7; criticalScenario = '20yr flood zone'; }
  else if (depths['50yr'] > 2) { maxScore = 9; criticalScenario = '50yr, 2-4m depth'; }
  else if (depths['50yr'] > 0) { maxScore = 6; criticalScenario = '50yr flood zone'; }
  else if (depths['100yr'] > 2) { maxScore = 8; criticalScenario = '100yr, 2-4m depth'; }
  else if (depths['100yr'] > 0) { maxScore = 5; criticalScenario = '100yr flood zone'; }
  else if (depths['200yr'] > 0) { maxScore = 4; criticalScenario = '200yr flood zone'; }
  else if (depths['500yr'] > 0) { maxScore = 3; criticalScenario = '500yr flood zone'; }
  
  return {
    score: maxScore,
    level: getRiskLevel(maxScore),
    scenario: criticalScenario,
    details: depths
  };
}
```

---

### 2.2 Typhoon (台风) - 基于强度等级

#### 评分标准（参考 JBA Storm/Wind 模型）
| Zone | Wind Speed (m/s) | Saffir-Simpson | Risk Index | 说明 |
|------|-----------------|----------------|-----------|------|
| Zone 0 | <17.2 | Below TD | 0 | 无台风影响 |
| Zone 1 | 17.2-24.4 | TD | 2 | 热带低压 |
| Zone 2 | 24.5-32.6 | TS | 4 | 热带风暴 |
| Zone 3 | 32.7-41.4 | STS | 6 | 强热带风暴 |
| Zone 4 | 41.5-50.9 | TY | 7 | 台风 |
| Zone 5 | 51.0-56.0 | STY | 9 | 强台风 |
| Zone 6 | >56.1 | Super TY | 10 | 超强台风 |

#### 计算逻辑
```javascript
function calculateTyphoonScore(lat, lon) {
  // 1. 查询台风强度图层
  const intensity = queryWMS('typhoon_intensity', lat, lon);
  
  // 2. 查询历史台风路径密度
  const trackDensity = queryWMS('typhoon_tracks', lat, lon);
  // trackDensity: 0-5+ (过去50年经过该区域的台风数量/10km²)
  
  // 3. 综合评分
  let baseScore = 0;
  if (intensity === 'SuperTY') baseScore = 10;
  else if (intensity === 'STY') baseScore = 9;
  else if (intensity === 'TY') baseScore = 7;
  else if (intensity === 'STS') baseScore = 6;
  else if (intensity === 'TS') baseScore = 4;
  else if (intensity === 'TD') baseScore = 2;
  
  // 4. 历史路径密度调整（频率因子）
  const frequencyFactor = Math.min(trackDensity / 5, 1); // 归一化到0-1
  const finalScore = Math.round(baseScore * (0.7 + 0.3 * frequencyFactor));
  
  return {
    score: finalScore,
    level: getRiskLevel(finalScore),
    intensity: intensity,
    frequency: trackDensity
  };
}
```

---

### 2.3 Rainstorm (暴雨) - 基于降雨强度 + 重现期

#### 评分标准
| Zone | Return Period | Rainfall (mm/day) | Risk Index | 说明 |
|------|--------------|-------------------|-----------|------|
| Zone 0 | - | <50 | 0 | 无暴雨风险 |
| Zone 1 | 500yr | 50-100 | 3 | 500年一遇 |
| Zone 2 | 200yr | 100-150 | 4 | 200年一遇 |
| Zone 3 | 100yr | 150-200 | 5 | 100年一遇 |
| Zone 4 | 50yr | 200-250 | 6 | 50年一遇 |
| Zone 5 | 20yr | 250-300 | 7 | 20年一遇 |
| Zone 6 | 100yr | >300 | 8 | 极端降雨 |
| Zone 7 | 50yr | >350 | 9 | 极端暴雨 |
| Zone 8 | 20yr | >400 | 10 | 灾难性暴雨 |

#### 计算逻辑（类似 Flood）
```javascript
function calculateRainstormScore(lat, lon) {
  const rainfall = {
    '20yr': queryWMS('rainstorm20yr', lat, lon),
    '50yr': queryWMS('rainstorm50yr', lat, lon),
    '100yr': queryWMS('rainstorm100yr', lat, lon),
    '200yr': queryWMS('rainstorm200yr', lat, lon),
    '500yr': queryWMS('rainstorm500yr', lat, lon),
  };
  
  let maxScore = 0;
  let criticalScenario = null;
  
  if (rainfall['20yr'] > 400) { maxScore = 10; criticalScenario = '20yr, >400mm/day'; }
  else if (rainfall['20yr'] > 250) { maxScore = 7; criticalScenario = '20yr, 250-300mm/day'; }
  // ... 类似逻辑
  
  return { score: maxScore, level: getRiskLevel(maxScore), scenario: criticalScenario };
}
```

---

### 2.4 Storm Surge (风暴潮) - 基于潮位高度

#### 评分标准
| Zone | Return Period | Surge Height (m) | Risk Index | 说明 |
|------|--------------|-----------------|-----------|------|
| Zone 0 | - | No risk | 0 | 无风暴潮风险（内陆） |
| Zone 1 | 500yr | 0.5-1.0 | 3 | 500年一遇 |
| Zone 2 | 200yr | 1.0-1.5 | 4 | 200年一遇 |
| Zone 3 | 100yr | 1.5-2.0 | 5 | 100年一遇 |
| Zone 4 | 50yr | 2.0-2.5 | 6 | 50年一遇 |
| Zone 5 | 20yr | 2.5-3.0 | 7 | 20年一遇 |
| Zone 6 | 100yr | >3.0 | 8 | 极端风暴潮 |
| Zone 7 | 50yr | >3.5 | 9 | 灾难性风暴潮 |
| Zone 8 | 20yr | >4.0 | 10 | 毁灭性风暴潮 |

#### 计算逻辑
```javascript
function calculateStormSurgeScore(lat, lon) {
  // 1. 检查距离海岸线距离
  const distanceToCoast = queryWMS('distance_to_coast', lat, lon);
  if (distanceToCoast > 50000) return { score: 0, level: 'No Hazard' }; // >50km 无风险
  
  // 2. 查询风暴潮高度
  const surgeHeight = {
    '20yr': queryWMS('stormsurge20yr', lat, lon),
    '50yr': queryWMS('stormsurge50yr', lat, lon),
    '100yr': queryWMS('stormsurge100yr', lat, lon),
  };
  
  // 3. 综合评分（类似洪水）
  // ...
}
```

---

### 2.5 Landslide (滑坡) - 基于地质条件 + 降雨触发

#### 评分标准（参考慕再 Solid-mass Hazards）
| Zone | Slope | Soil Type | Rainfall Trigger | Risk Index | 说明 |
|------|-------|-----------|-----------------|-----------|------|
| Zone 0 | <5° | Stable | - | 0 | 无滑坡风险 |
| Zone 1 | 5-15° | Stable | >300mm/day | 2 | 极低风险 |
| Zone 2 | 15-25° | Medium | >200mm/day | 4 | 低风险 |
| Zone 3 | 25-35° | Medium | >150mm/day | 6 | 中等风险 |
| Zone 4 | 35-45° | Unstable | >100mm/day | 8 | 高风险 |
| Zone 5 | >45° | Very Unstable | >50mm/day | 10 | 极高风险 |

#### 计算逻辑
```javascript
function calculateLandslideScore(lat, lon) {
  // 1. 查询地质风险图层
  const geoRisk = queryWMS('geo_landslide', lat, lon);
  // 返回: low / medium / high
  
  // 2. 查询当前或预测降雨
  const rainfall = queryWMS('rainstorm100yr', lat, lon);
  
  // 3. 综合评分
  let baseScore = 0;
  if (geoRisk === 'high') baseScore = 8;
  else if (geoRisk === 'medium') baseScore = 5;
  else if (geoRisk === 'low') baseScore = 2;
  
  // 4. 降雨触发系数（暴雨会增加滑坡风险）
  if (rainfall > 300) baseScore = Math.min(baseScore + 2, 10);
  else if (rainfall > 200) baseScore = Math.min(baseScore + 1, 10);
  
  return { score: baseScore, level: getRiskLevel(baseScore), geoRisk, rainfall };
}
```

---

## 3. Overall Risk Score 计算

### 3.1 方法一：加权平均（当前使用）
```javascript
function calculateOverallScore(scores) {
  const weights = {
    flood: 0.30,        // 洪水权重最高（再保险核心风险）
    typhoon: 0.25,      // 台风（级联效应大）
    rainstorm: 0.20,    // 暴雨（触发洪水和滑坡）
    stormSurge: 0.15,   // 风暴潮（沿海地区重要）
    landslide: 0.10,    // 滑坡（局部风险）
  };
  
  const overall = 
    scores.flood * weights.flood +
    scores.typhoon * weights.typhoon +
    scores.rainstorm * weights.rainstorm +
    scores.stormSurge * weights.stormSurge +
    scores.landslide * weights.landslide;
  
  return Math.round(overall * 10) / 10; // 保留1位小数
}
```

### 3.2 方法二：情景分析（推荐用于专业模式）
```javascript
function calculateOverallScoreScenario(scores, correlations) {
  // 定义4个主要灾害情景
  const scenarios = [
    {
      name: 'Typhoon Event',
      primary: scores.typhoon,
      cascading: [
        { hazard: 'rainstorm', score: scores.rainstorm, correlation: 0.8 },
        { hazard: 'stormSurge', score: scores.stormSurge, correlation: 0.7 },
        { hazard: 'flood', score: scores.flood, correlation: 0.6 },
        { hazard: 'landslide', score: scores.landslide, correlation: 0.5 },
      ]
    },
    {
      name: 'Extreme Rainfall Event',
      primary: scores.rainstorm,
      cascading: [
        { hazard: 'flood', score: scores.flood, correlation: 0.9 },
        { hazard: 'landslide', score: scores.landslide, correlation: 0.7 },
      ]
    },
    {
      name: 'Coastal Flood Event',
      primary: Math.max(scores.flood, scores.stormSurge),
      cascading: []
    },
    {
      name: 'Geological Event',
      primary: scores.landslide,
      cascading: [
        { hazard: 'rainstorm', score: scores.rainstorm, correlation: 0.6 },
      ]
    }
  ];
  
  // 计算每个情景的综合得分
  const scenarioScores = scenarios.map(scenario => {
    let totalScore = scenario.primary;
    scenario.cascading.forEach(item => {
      totalScore += item.score * item.correlation * 0.3; // 级联效应权重30%
    });
    return {
      name: scenario.name,
      score: Math.min(totalScore, 10) // 最高不超过10
    };
  });
  
  // 返回最严重的情景得分
  const criticalScenario = scenarioScores.reduce((max, s) => 
    s.score > max.score ? s : max
  );
  
  return {
    overallScore: criticalScenario.score,
    criticalScenario: criticalScenario.name,
    allScenarios: scenarioScores
  };
}
```

---

## 4. 报告生成规范

### 4.1 报告结构（参考慕再模板）
```
Page 1: 封面
- Asset Risk Report
- 经纬度坐标
- 生成日期
- 地图预览

Page 2: 目录
- Asset Info
- Risk Scores
- Natural Hazards
- Natural Hazards (Legends)

Page 3: Asset Info
- 卫星图/街景图
- 基本信息（海拔、地表覆盖、人口密度、建筑物密度）
- 距离海岸线距离
- JBA Flood Defense Zone（如适用）

Page 4: Risk Scores
- Overall (Defended) Score - 大卡片显示
- 各灾种单独得分 - 进度条形式
  - Typhoon: 7 (High) [=========>---]
  - Rainstorm: 5 (Medium) [======>-----]
  - Flood: 4 (Low) [====>-------]
  - Storm Surge: 2 (Very Low) [=>---------]
  - Landslide: 1 (Very Low) [>----------]

Page 5-6: Natural Hazards 详细说明
- 每个灾种的 Zone 分级
- 重现期说明
- 评分依据

Page 7-8: Natural Hazards (Legends)
- 详细图例说明
- 数据来源
- 评分方法论

Page 9: 法律声明
- 数据使用条款
- 责任限制
```

### 4.2 关键指标计算

#### Defended vs Undefended Score
```javascript
// Defended Score: 考虑防洪设施的得分
function calculateDefendedScore(undefendedScore, defenseLevel) {
  const defenseFactor = {
    'none': 1.0,        // 无防护 - 原始分数
    'standard': 0.7,    // 标准防护 - 降低30%
    'high': 0.5,        // 高标准防护 - 降低50%
    'extreme': 0.3,     // 极高标准防护 - 降低70%
  };
  
  return Math.round(undefendedScore * defenseFactor[defenseLevel] * 10) / 10;
}

// 查询防洪设施等级
function getFloodDefenseLevel(lat, lon) {
  const defenseZone = queryWMS('flood_defense_zones', lat, lon);
  // 返回: none / standard / high / extreme
  return defenseZone || 'none';
}
```

---

## 5. 实施计划

### Phase 1: 基础评分系统（1-2周）
- [ ] 实现5个灾种的基础评分函数
- [ ] 实现 WMS GetFeatureInfo 查询
- [ ] 实现 Overall Score 计算（加权平均法）
- [ ] 更新查询结果显示界面

### Phase 2: 报告生成（1周）
- [ ] 设计PDF报告模板（参考慕再）
- [ ] 实现 jsPDF 报告生成
- [ ] 添加地图截图功能
- [ ] 添加图表可视化

### Phase 3: 高级功能（2周）
- [ ] 实现情景分析法（Scenario-based）
- [ ] 添加 Defended Score 计算
- [ ] 添加历史灾害事件叠加
- [ ] 添加时间序列分析

### Phase 4: 数据完善（持续）
- [ ] 完善 GeoServer 图层（需要28个图层）
- [ ] 集成地理编码API
- [ ] 添加实时/预测数据源
- [ ] 添加防洪设施数据库

---

## 6. 数据需求清单

### 必需的 WMS 图层
```
洪水 (5层):
- flood20yr, flood50yr, flood100yr, flood200yr, flood500yr

暴雨 (5层):
- rainstorm20yr, rainstorm50yr, rainstorm100yr, rainstorm200yr, rainstorm500yr

台风 (7层):
- typhoon_td, typhoon_ts, typhoon_sts, typhoon_ty, typhoon_sty, typhoon_superty
- typhoon_tracks (历史路径密度)

风暴潮 (5层):
- stormsurge20yr, stormsurge50yr, stormsurge100yr, stormsurge200yr, stormsurge500yr

滑坡 (3层):
- landslide_low, landslide_medium, landslide_high

辅助图层 (5层):
- distance_to_coast (距离海岸线)
- flood_defense_zones (防洪设施分区)
- elevation (高程)
- soil_type (土壤类型)
- slope (坡度)

总计: 30个图层
```

### 外部API需求
- 地理编码: Nominatim / Google Geocoding API
- 卫星影像: Google Maps Static API / Mapbox
- 实时天气: OpenWeatherMap / ECMWF

---

## 7. 与当前系统的对比

| 项目 | 当前系统 | 慕再标准 | 改进建议 |
|-----|---------|---------|---------|
| 评分范围 | 0-100 | 0-10 | ✅ 改为0-10（行业标准） |
| 权重设定 | 固定权重 | 情景分析 | 🔄 保留权重法，增加情景分析 |
| 灾种关联 | 独立计算 | 级联效应 | ✅ 必须考虑关联性 |
| 数据来源 | 模拟数据 | WMS查询 | ⚠️ 需要接入真实数据 |
| 报告格式 | 简单展示 | 专业PDF | ✅ 参考慕再模板 |
| 防御措施 | 未考虑 | Defended Score | 🔄 可选功能 |
| 重现期使用 | 默认100年 | 查询所有 | ✅ 必须查询所有重现期 |

---

## 总结

**核心改进点**：
1. ✅ **评分范围改为 0-10**（行业标准）
2. ✅ **每个灾种查询所有重现期**，取最严重情况
3. ✅ **考虑灾害级联效应**（台风→暴雨→洪水）
4. ✅ **生成专业PDF报告**（参考慕再模板）
5. ⚠️ **接入真实WMS数据**（GetFeatureInfo查询）

**推荐的实施顺序**：
1. 先改评分系统（0-10制）
2. 实现WMS查询逻辑
3. 完善报告生成
4. 最后添加情景分析
