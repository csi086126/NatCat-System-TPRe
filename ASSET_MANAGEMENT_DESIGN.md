# Asset Management 模块功能设计

## 🏢 模块概述

Asset Management（资产管理）模块是洪水灾害保险系统的核心模块之一，用于管理、分析和评估承保资产的信息和风险。

## 🎯 核心功能

### 1. 资产数据管理

#### 1.1 资产导入/导出
**功能描述**：
- 批量导入资产数据（Excel, CSV, GeoJSON, Shapefile）
- 导出资产清单和报告
- 支持模板下载

**数据字段**：
```javascript
{
  // 基本信息
  id: "ASSET-HK-00123",
  name: "Taiping Financial Centre",
  type: "Commercial Building", // 建筑物、基础设施、存货等
  address: "1 Connaught Road Central, Hong Kong",
  
  // 地理信息
  coordinates: [114.1694, 22.3193],
  district: "Central and Western",
  region: "Hong Kong Island",
  
  // 财务信息
  totalInsuredValue: 5200000000, // $5.2B
  replacementCost: 6000000000,
  marketValue: 5500000000,
  
  // 保险信息
  policyId: "TP-PROP-2024-888",
  coverageType: "Property All Risks",
  premium: 1200000, // 年保费
  deductible: 500000,
  policyStartDate: "2024-01-01",
  policyEndDate: "2024-12-31",
  
  // 物理特征
  construction: "Reinforced Concrete",
  yearBuilt: 2015,
  floors: 50,
  buildingArea: 120000, // 平方米
  occupancy: ["Office", "Retail"],
  
  // 风险评估
  floodRiskScore: 8.5,
  floodZone: "High Risk Zone",
  elevationAboveSeaLevel: 5.2, // 米
  distanceToCoast: 0.5, // 公里
  distanceToRiver: 1.2,
  
  // 灾害历史
  historicalDamages: [
    {
      eventId: "Typhoon-2017-001",
      date: "2017-08-23",
      damageAmount: 2500000,
      description: "Typhoon Hato - Roof damage and flooding"
    }
  ],
  
  // 防护措施
  floodDefenses: ["Flood Barriers", "Waterproofing", "Emergency Pumps"],
  
  // 元数据
  lastUpdated: "2024-10-16",
  assessedBy: "John Doe",
  status: "Active" // Active, Expired, Cancelled
}
```

#### 1.2 资产详情查看
**功能**：
- 单个资产的详细信息展示
- 资产照片和文档附件
- 历史变更记录
- 理赔历史

#### 1.3 资产编辑和更新
**功能**：
- 在线编辑资产信息
- 批量更新资产属性
- 资产状态管理（激活/停用）

### 2. 资产筛选和搜索

#### 2.1 多维度筛选
**筛选条件**：
- **资产类型**：建筑物、基础设施、存货等
- **保险价值范围**：< $1M, $1M-$10M, $10M-$100M, > $100M
- **保险类型**：财产险、营业中断险、综合险等
- **地理位置**：地区、区域、街道
- **风险等级**：低、中、高、极高
- **建造年份**：年份范围
- **建筑类型**：钢结构、混凝土、木结构等
- **保单状态**：有效、即将到期、已过期

#### 2.2 高级搜索
**功能**：
- 关键词搜索（资产名称、地址、保单号）
- 组合条件搜索
- 保存搜索条件
- 快速筛选预设

### 3. 资产地图可视化

#### 3.1 资产分布地图
**功能**：
- 在地图上显示所有资产位置（标记点）
- 按颜色区分资产类型或风险等级
- 聚类显示（大量资产时）
- 热力图展示资产密度

**标记样式**：
```javascript
// 按风险等级着色
- 低风险：绿色
- 中风险：黄色
- 高风险：橙色
- 极高风险：红色

// 按资产价值大小
- 小圆圈：< $10M
- 中圆圈：$10M - $100M
- 大圆圈：> $100M
```

#### 3.2 资产与风险图层叠加
**功能**：
- 叠加洪水风险图层（50年、100年、500年重现期）
- 识别高风险区域内的资产
- 计算资产暴露度（Exposure）

#### 3.3 地图交互
**功能**：
- 点击资产标记查看详情
- 框选多个资产进行批量操作
- 测量工具（距离、面积）
- 导出地图为PDF/图片

### 4. 资产分组和批量操作

#### 4.1 资产分组
**功能**：
- 创建资产组合（Portfolio）
- 按客户、行业、地区分组
- 分层分组（父组/子组）

**示例分组**：
```
Hong Kong Portfolio
├── Commercial Properties
│   ├── Office Buildings (15 assets)
│   └── Shopping Malls (8 assets)
├── Residential Properties (120 units)
└── Industrial Properties (5 facilities)
```

#### 4.2 批量操作
**功能**：
- 批量导出选中资产
- 批量更新保费
- 批量生成报告
- 批量重新评估风险

### 5. 风险分析

#### 5.1 资产风险评分
**评分维度**：
1. **地理位置风险** (0-10分)
   - 洪水区划等级
   - 历史灾害频率
   - 距离水体距离

2. **建筑脆弱性** (0-10分)
   - 建筑年代
   - 建筑结构类型
   - 防护措施

3. **价值暴露度** (0-10分)
   - 保险金额
   - 财产集中度
   - 替代成本

**综合风险分数**：
```javascript
riskScore = (地理位置风险 * 0.4) + 
            (建筑脆弱性 * 0.3) + 
            (价值暴露度 * 0.3)
```

#### 5.2 资产与风险区域交叉分析
**功能**：
- 识别位于高风险区域的资产
- 计算不同重现期下的资产暴露
- 生成风险矩阵

**风险矩阵示例**：
```
               低价值    中价值    高价值
低风险区      50 assets  30 assets  5 assets
中风险区      20 assets  15 assets  8 assets
高风险区      5 assets   10 assets  12 assets
```

#### 5.3 损失预测
**功能**：
- 基于历史数据预测潜在损失
- 不同灾害情景下的损失估算
- PML (Probable Maximum Loss) 计算

### 6. 报告和分析

#### 6.1 资产统计报告
**内容**：
- 资产总数和总价值
- 按类型、地区分布统计
- 风险等级分布
- 保费收入统计

#### 6.2 风险暴露报告
**内容**：
- 高风险区域资产清单
- 风险集中度分析
- 建议的风险缓解措施

#### 6.3 理赔历史报告
**内容**：
- 历史理赔记录
- 理赔率分析
- 高频理赔资产识别

### 7. 数据集成

#### 7.1 与灾害数据集成
**功能**：
- 关联历史灾害事件
- 自动匹配受灾资产
- 损失记录追踪

#### 7.2 与风险地图集成
**功能**：
- 自动获取资产位置的风险等级
- 实时更新风险评分
- 风险变化预警

## 📊 数据模型

### 资产表 (Assets)
```sql
CREATE TABLE assets (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  address TEXT,
  coordinates GEOGRAPHY(POINT),
  district VARCHAR(100),
  region VARCHAR(100),
  
  total_insured_value DECIMAL(15,2),
  replacement_cost DECIMAL(15,2),
  market_value DECIMAL(15,2),
  
  policy_id VARCHAR(50),
  coverage_type VARCHAR(100),
  premium DECIMAL(15,2),
  deductible DECIMAL(15,2),
  policy_start_date DATE,
  policy_end_date DATE,
  
  construction VARCHAR(100),
  year_built INTEGER,
  floors INTEGER,
  building_area DECIMAL(10,2),
  occupancy JSONB,
  
  flood_risk_score DECIMAL(3,1),
  flood_zone VARCHAR(50),
  elevation DECIMAL(6,2),
  distance_to_coast DECIMAL(8,2),
  distance_to_river DECIMAL(8,2),
  
  flood_defenses JSONB,
  
  status VARCHAR(20),
  last_updated TIMESTAMP,
  assessed_by VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 资产分组表 (Asset Groups)
```sql
CREATE TABLE asset_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  parent_group_id INTEGER REFERENCES asset_groups(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_group_members (
  group_id INTEGER REFERENCES asset_groups(id),
  asset_id VARCHAR(50) REFERENCES assets(id),
  PRIMARY KEY (group_id, asset_id)
);
```

### 理赔历史表 (Claims History)
```sql
CREATE TABLE claims_history (
  id SERIAL PRIMARY KEY,
  asset_id VARCHAR(50) REFERENCES assets(id),
  event_id VARCHAR(50),
  claim_date DATE,
  damage_amount DECIMAL(15,2),
  claim_status VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 UI/UX 设计

### 左侧边栏（操作面板）
```
┌─────────────────────────┐
│ [Asset Import/Export]   │
│ [Asset Distribution Map]│
├─────────────────────────┤
│ Asset Filtering         │
│ - Type: [Dropdown]      │
│ - Value: [Input]        │
│ - Insurance: [Dropdown] │
│ - Risk Level: [Slider]  │
│ - District: [Select]    │
│ [Apply Filters]         │
├─────────────────────────┤
│ [Asset Grouping]        │
│ [Batch Operations]      │
│ [Asset List View]       │
├─────────────────────────┤
│ Analysis                │
│ [Asset Risk Analysis]   │
│ [Exposure Report]       │
└─────────────────────────┘
```

### 中央地图区域
- 显示所有资产位置
- 风险图层叠加
- 资产聚类显示
- 交互式标记

### 右侧边栏（详情面板）
```
┌────────────────────────────┐
│ Asset Details              │
│ ────────────────────────   │
│ [Asset Name]               │
│ [Asset ID]                 │
│ [Address]                  │
│ [View on Map Button]       │
├────────────────────────────┤
│ Financial & Insurance      │
│ - Total Value: $5.2B       │
│ - Premium: $1.2M/yr        │
│ - Policy: Active           │
├────────────────────────────┤
│ Physical Characteristics   │
│ - Type: Commercial         │
│ - Built: 2015             │
│ - Construction: Concrete   │
├────────────────────────────┤
│ Risk Assessment            │
│ - Score: 8.5/10 (High)     │
│ - Flood Zone: High Risk    │
│ - Last Assessment: 2024-10 │
├────────────────────────────┤
│ [Edit Asset]               │
│ [View Claims History]      │
│ [Generate Report]          │
└────────────────────────────┘
```

## 🔧 技术实现

### 前端组件
```typescript
// 资产列表组件
<AssetList assets={filteredAssets} onSelect={setSelectedAsset} />

// 资产地图组件
<AssetMap assets={assets} selectedAsset={selectedAsset} />

// 资产详情组件
<AssetDetails asset={selectedAsset} />

// 资产筛选器组件
<AssetFilter filters={filters} onFilterChange={handleFilterChange} />

// 批量操作组件
<BatchOperations selectedAssets={selectedAssets} />
```

### 后端API端点
```
GET    /api/assets              - 获取资产列表
POST   /api/assets              - 创建新资产
GET    /api/assets/:id          - 获取资产详情
PUT    /api/assets/:id          - 更新资产
DELETE /api/assets/:id          - 删除资产

POST   /api/assets/import       - 批量导入资产
GET    /api/assets/export       - 导出资产数据

GET    /api/assets/filter       - 筛选资产
GET    /api/assets/search       - 搜索资产

POST   /api/assets/groups       - 创建资产分组
GET    /api/assets/groups/:id   - 获取分组详情

GET    /api/assets/:id/risk     - 获取资产风险评估
GET    /api/assets/:id/claims   - 获取理赔历史

POST   /api/assets/batch/update - 批量更新
POST   /api/assets/batch/export - 批量导出

GET    /api/assets/stats        - 资产统计
GET    /api/assets/reports      - 生成报告
```

## 📈 核心算法

### 风险评分算法
```javascript
function calculateAssetRisk(asset) {
  // 1. 地理位置风险 (0-10)
  const locationRisk = calculateLocationRisk(
    asset.floodZone,
    asset.distanceToCoast,
    asset.distanceToRiver,
    asset.elevation
  );
  
  // 2. 建筑脆弱性 (0-10)
  const vulnerabilityRisk = calculateVulnerability(
    asset.construction,
    asset.yearBuilt,
    asset.floodDefenses
  );
  
  // 3. 价值暴露度 (0-10)
  const exposureRisk = calculateExposure(
    asset.totalInsuredValue,
    asset.buildingArea
  );
  
  // 加权计算综合风险
  return (locationRisk * 0.4) + 
         (vulnerabilityRisk * 0.3) + 
         (exposureRisk * 0.3);
}
```

### 资产-风险区域交叉分析
```javascript
function analyzeAssetRiskExposure(assets, floodZones) {
  return assets.map(asset => {
    // 空间查询：资产是否在风险区域内
    const zone = findContainingZone(asset.coordinates, floodZones);
    
    return {
      assetId: asset.id,
      assetName: asset.name,
      value: asset.totalInsuredValue,
      riskZone: zone?.level || 'Unknown',
      returnPeriod: zone?.returnPeriod,
      estimatedLoss: calculatePotentialLoss(asset, zone)
    };
  });
}
```

## 🎯 优先级实现顺序

### Phase 1: 基础功能 (2周)
1. ✅ 资产数据模型定义
2. ✅ 资产CRUD API
3. ✅ 资产列表展示
4. ✅ 资产详情查看
5. ✅ 基本筛选功能

### Phase 2: 地图功能 (2周)
1. ✅ 资产在地图上标记
2. ✅ 资产与风险图层叠加
3. ✅ 地图交互（点击查看详情）
4. ✅ 资产聚类显示

### Phase 3: 高级功能 (2周)
1. ✅ 资产导入/导出
2. ✅ 资产分组管理
3. ✅ 批量操作
4. ✅ 风险评分计算

### Phase 4: 分析报告 (1周)
1. ✅ 统计报告
2. ✅ 风险分析报告
3. ✅ 报告导出

## 📝 测试数据准备

创建测试资产数据：
```json
[
  {
    "id": "ASSET-HK-001",
    "name": "International Finance Centre",
    "type": "Commercial Building",
    "coordinates": [114.1589, 22.2853],
    "totalInsuredValue": 8500000000,
    "floodRiskScore": 6.5
  },
  {
    "id": "ASSET-HK-002",
    "name": "Ocean Terminal",
    "type": "Retail Complex",
    "coordinates": [114.1677, 22.2947],
    "totalInsuredValue": 3200000000,
    "floodRiskScore": 8.8
  },
  // ... 更多测试数据
]
```

## 🚀 开始实现

现在你想要从哪个功能开始实现？

1. **资产数据导入/导出** - 批量管理资产数据
2. **资产地图可视化** - 在地图上展示资产分布
3. **资产筛选和搜索** - 快速找到特定资产
4. **风险评分系统** - 自动计算资产风险
5. **报告生成** - 生成资产分析报告

选择一个优先级最高的功能，我来帮你实现！
