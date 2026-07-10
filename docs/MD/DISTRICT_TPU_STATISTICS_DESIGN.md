# 承保和理赔数据按区域层级分析方案

## 概述
在Web端实现按照18区和TPU（小规划统计区）层级对承保和理赔数据进行显示、汇总和统计分析。

**日期**: 2024-12-17
**状态**: 设计中

---

## 1. 数据结构分析

### 现有数据

#### A. 承保数据（Portfolio）
**位置**: `public/data/tphk_portfolio_subset_5000.json`

**结构**:
```json
{
  "id": "060101012021002085",
  "address": "8/F., HOPEWELL LOGISTICS CENTRE...",
  "region": "葵青區",
  "sum_insured": 15000000,
  "occupancy": "STORAGE",
  "construction": "01E01-CLASS 1 CONSTRUCTION",
  "year_built": 2010,
  "location": {
    "lat": 22.3580189,
    "lng": 114.1188065,
    "formatted_address": "2-12 Wing Kei Rd, Kwai Chung",
    "provider": "google"
  }
}
```

**关键字段**:
- ✅ `location.lat`, `location.lng` - 用于地理匹配
- ✅ `sum_insured` - 承保金额
- ✅ `region` - 已有区域（可验证）
- ✅ `occupancy` - 用途分类
- ✅ `id` - 保单号

#### B. 18区边界数据
**位置**: `D:\Nat Cat Platform\Data\Shapefile\Hong_Kong_18_Districts.geojson`

**结构**:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "properties": {
      "OBJECTID": 1,
      "ID": 1,
      "CNAME": "中西區",
      "CNAME_S": "中西区",
      "ENAME": "CENTRAL & WESTERN"
    },
    "geometry": {
      "type": "Polygon",
      "coordinates": [...]
    }
  }]
}
```

**特点**:
- 18个区
- 有中文和英文名称
- Polygon几何类型

#### C. TPU数据（小规划统计区）
**位置**: `BoundariesofTertiaryPlanningUnitsSubunitsfor2021PopulationCensus_GEOJSON/TPUSU_2021_converted.geojson`

**结构**:
```json
{
  "properties": {
    "PPU": 3,    // Primary Planning Unit (主要规划区)
    "SPU": 35,   // Secondary Planning Unit (次级规划区)
    "TPU": 351,  // Tertiary Planning Unit (小规划统计区)
    "Subunit": 30 // 单元区
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

**层级**:
- PPU: 9个主要区域
- SPU: 52个次级区域
- TPU: 292个小规划统计区 ⭐
- Subunit: 4,916个单元区（最细）

---

## 2. 技术架构

### 地理匹配算法

#### 点在多边形内（Point in Polygon）
使用 **Turf.js** 库实现：

```javascript
import * as turf from '@turf/turf';

function matchPolicyToDistrict(policy, districts) {
  const point = turf.point([policy.location.lng, policy.location.lat]);

  for (const district of districts.features) {
    if (turf.booleanPointInPolygon(point, district)) {
      return {
        districtId: district.properties.ID,
        districtName: district.properties.ENAME,
        districtNameCN: district.properties.CNAME
      };
    }
  }
  return null;
}
```

#### 性能优化策略

1. **预处理和缓存**
```javascript
// 一次性处理所有保单，缓存结果
const matchedData = await matchAllPolicies(policies, districts);
localStorage.setItem('policyDistrictMapping', JSON.stringify(matchedData));
```

2. **使用空间索引**
```javascript
// 使用 R-tree 加速查询
import RBush from 'rbush';

const tree = new RBush();
tree.load(districts.map(d => ({
  minX: d.bounds[0],
  minY: d.bounds[1],
  maxX: d.bounds[2],
  maxY: d.bounds[3],
  district: d
})));
```

3. **Web Worker 后台处理**
```javascript
// 在后台线程处理大量数据
const worker = new Worker('geo-matching-worker.js');
worker.postMessage({ policies, districts });
```

---

## 3. 数据聚合设计

### 层级结构

```
18 Districts (18区)
├── Central & Western (中西區)
│   ├── TPU 101
│   │   ├── Policy 1: HKD 5M
│   │   ├── Policy 2: HKD 3M
│   │   └── Total: HKD 8M (2 policies)
│   ├── TPU 102
│   │   └── Total: HKD 12M (5 policies)
│   └── District Total: HKD 20M (7 policies)
├── Wan Chai (灣仔區)
│   ├── TPU 201
│   └── ...
└── ...
```

### 聚合数据模型

```typescript
interface DistrictStatistics {
  districtId: number;
  districtName: string;
  districtNameCN: string;

  // 基础统计
  policyCount: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;

  // 分类统计
  byOccupancy: Record<string, {
    count: number;
    totalExposure: number;
  }>;

  byYear: Record<string, {
    count: number;
    totalExposure: number;
  }>;

  // TPU 子级
  tpus: TPUStatistics[];

  // 原始数据引用
  policies: string[]; // Policy IDs
}

interface TPUStatistics {
  ppu: number;
  spu: number;
  tpu: number;
  tpuKey: string; // "PPU-SPU-TPU"

  policyCount: number;
  totalExposure: number;
  avgExposure: number;

  byOccupancy: Record<string, {
    count: number;
    totalExposure: number;
  }>;

  policies: string[];
}
```

---

## 4. Web UI 设计

### A. 地图视图

#### 图层切换器
```
┌─────────────────────────────────┐
│ Layer Selector:                 │
│ ○ 18 Districts (overview)       │
│ ● TPU (292 areas) ⭐ Active    │
│ ○ Subunits (4,916 areas)        │
└─────────────────────────────────┘
```

#### 热力图显示
```javascript
// 18区热力图
const districtHeatmap = districts.map(d => ({
  ...d,
  fillColor: getColorByExposure(d.statistics.totalExposure),
  fillOpacity: 0.6
}));

// TPU热力图（颜色更细腻）
const tpuHeatmap = tpus.map(t => ({
  ...t,
  fillColor: getColorByExposure(t.statistics.totalExposure),
  fillOpacity: 0.5
}));
```

### B. 统计面板

#### 区级统计卡片
```
┌──────────────────────────────────────┐
│ 📍 Central & Western (中西區)        │
├──────────────────────────────────────┤
│ Policies      │ Total Exposure       │
│ 1,247         │ HKD 5.2B             │
├───────────────┼──────────────────────┤
│ Average       │ Density              │
│ HKD 4.2M      │ 45.3 per km²         │
├──────────────────────────────────────┤
│ By Occupancy                         │
│ 🏢 Commercial    650 (HKD 3.1B)      │
│ 🏠 Residential   450 (HKD 1.8B)      │
│ 🏭 Industrial     147 (HKD 300M)     │
├──────────────────────────────────────┤
│ Top 3 TPUs by Exposure               │
│ 1. TPU 101 - HKD 850M (125 pol)     │
│ 2. TPU 105 - HKD 720M (98 pol)      │
│ 3. TPU 112 - HKD 650M (110 pol)     │
├──────────────────────────────────────┤
│ [View Details] [Export] [Drill Down] │
└──────────────────────────────────────┘
```

#### TPU详细视图
```
┌──────────────────────────────────────┐
│ 📍 TPU 101 (PPU-1, SPU-10, TPU-101)  │
│ 📍 In: Central & Western             │
├──────────────────────────────────────┤
│ Policies: 125                        │
│ Total Exposure: HKD 850M             │
│ Average: HKD 6.8M                    │
│ Area: 2.5 km²                        │
│ Density: 50 policies/km²             │
├──────────────────────────────────────┤
│ By Occupancy                         │
│ 🏢 Commercial    75 (HKD 600M)       │
│ 🏠 Residential   45 (HKD 220M)       │
│ 🏭 Industrial     5 (HKD 30M)        │
├──────────────────────────────────────┤
│ Policy List:                         │
│ ▼ POL-001  | HKD 25M | Commercial   │
│ ▼ POL-002  | HKD 18M | Residential  │
│ ▼ POL-003  | HKD 15M | Commercial   │
│ ... (show all 125)                   │
├──────────────────────────────────────┤
│ [Back to District] [Export CSV]      │
└──────────────────────────────────────┘
```

### C. 对比分析视图

#### 多区对比
```
┌──────────────────────────────────────────────────────────┐
│ District Comparison                                      │
├──────────────────────────────────────────────────────────┤
│ District        │ Policies │ Total Exp │ Avg Exp │ Rank │
│─────────────────┼──────────┼───────────┼─────────┼──────│
│ Central & West  │ 1,247    │ 5.2B      │ 4.2M    │ 1    │
│ Wan Chai        │ 980      │ 4.8B      │ 4.9M    │ 2    │
│ Eastern         │ 1,150    │ 3.5B      │ 3.0M    │ 3    │
│ ...             │          │           │         │      │
├──────────────────────────────────────────────────────────┤
│ 📊 Chart View: [Bar] [Pie] [Heat Map]                   │
└──────────────────────────────────────────────────────────┘
```

---

## 5. 实现步骤

### Phase 1: 数据准备（1-2天）

#### 任务:
1. ✅ 加载TPU GeoJSON数据
2. ⏳ 实现地理匹配算法
3. ⏳ 批量处理所有保单数据
4. ⏳ 生成预聚合统计数据
5. ⏳ 存储到缓存文件

#### 输出:
```json
// district-statistics.json
{
  "districts": [...],
  "tpus": [...],
  "summary": {...},
  "timestamp": "2024-12-17T..."
}
```

### Phase 2: 后端API（1天）

#### Endpoints:
```
GET /api/statistics/districts
  → 返回18区统计

GET /api/statistics/districts/:id
  → 返回单个区的详细统计

GET /api/statistics/tpus
  → 返回所有TPU统计

GET /api/statistics/tpus/:id
  → 返回单个TPU的详细统计

GET /api/statistics/compare?districts=1,2,3
  → 返回多区对比数据
```

### Phase 3: 前端组件（2-3天）

#### 组件结构:
```
src/components/statistics/
├── DistrictStatistics/
│   ├── DistrictMap.tsx          # 地图显示
│   ├── DistrictCard.tsx         # 区级卡片
│   ├── DistrictList.tsx         # 区列表
│   └── DistrictComparison.tsx   # 对比视图
├── TPUStatistics/
│   ├── TPUMap.tsx               # TPU地图
│   ├── TPUCard.tsx              # TPU卡片
│   ├── TPUList.tsx              # TPU列表
│   └── TPUDetail.tsx            # TPU详情
├── shared/
│   ├── LayerSwitcher.tsx        # 图层切换器
│   ├── StatisticsCard.tsx       # 统计卡片
│   ├── ChartView.tsx            # 图表视图
│   └── ExportButton.tsx         # 导出功能
└── index.tsx                     # 主入口
```

### Phase 4: 交互功能（1-2天）

#### 功能:
1. **图层切换**: 18区 ↔ TPU ↔ Subunit
2. **点击钻取**: 区 → TPU → 保单列表
3. **悬停提示**: 显示快速统计
4. **筛选器**: 按用途、年份、风险等级
5. **导出**: CSV、Excel、PDF

### Phase 5: 性能优化（1天）

#### 优化点:
1. 数据分块加载
2. 虚拟滚动（大列表）
3. 地图瓦片缓存
4. 预计算统计数据
5. Service Worker 缓存

---

## 6. 性能考量

### 数据量估算

| 层级 | 数量 | 平均保单数 | 计算复杂度 |
|------|------|------------|------------|
| 18区 | 18 | ~10,800/区 | O(n) - 低 |
| TPU | 292 | ~665/TPU | O(n) - 中 |
| Subunit | 4,916 | ~40/单元 | O(n) - 高 |

### 首次加载时间预估

```
18区匹配:    ~2-3秒   (194,506 policies × 18 polygons)
TPU匹配:     ~30-45秒 (194,506 policies × 292 polygons)
Subunit匹配: ~8-10分钟 (194,506 policies × 4,916 polygons)
```

### 优化后加载时间

```
使用预计算 + 缓存:
18区统计:    ~0.5秒  (直接加载JSON)
TPU统计:     ~1-2秒  (直接加载JSON)
按需加载:    ~0.1秒/区 (点击时加载)
```

---

## 7. 示例代码

### 地理匹配主函数

```javascript
async function matchAllPoliciesToDistricts() {
  console.log('Loading data...');
  const policies = await loadPolicies();
  const districts = await loadDistricts();

  console.log('Matching policies to districts...');
  const results = {
    districts: {},
    unmatched: []
  };

  for (const policy of policies) {
    const point = turf.point([
      policy.location.lng,
      policy.location.lat
    ]);

    let matched = false;
    for (const district of districts.features) {
      if (turf.booleanPointInPolygon(point, district)) {
        const districtId = district.properties.ID;

        if (!results.districts[districtId]) {
          results.districts[districtId] = {
            ...district.properties,
            policies: [],
            totalExposure: 0,
            byOccupancy: {}
          };
        }

        results.districts[districtId].policies.push(policy.id);
        results.districts[districtId].totalExposure += policy.sum_insured;

        const occ = policy.occupancy || 'Unknown';
        if (!results.districts[districtId].byOccupancy[occ]) {
          results.districts[districtId].byOccupancy[occ] = {
            count: 0,
            total: 0
          };
        }
        results.districts[districtId].byOccupancy[occ].count++;
        results.districts[districtId].byOccupancy[occ].total += policy.sum_insured;

        matched = true;
        break;
      }
    }

    if (!matched) {
      results.unmatched.push(policy.id);
    }
  }

  return results;
}
```

### React组件示例

```tsx
// DistrictStatisticsView.tsx
export function DistrictStatisticsView() {
  const [layer, setLayer] = useState<'districts' | 'tpu'>('districts');
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [statistics, setStatistics] = useState<DistrictStatistics[]>([]);

  useEffect(() => {
    loadStatistics(layer).then(setStatistics);
  }, [layer]);

  return (
    <div className="flex h-screen">
      {/* Left: Map */}
      <div className="flex-1">
        <LayerSwitcher value={layer} onChange={setLayer} />
        <StatisticsMap
          layer={layer}
          statistics={statistics}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>

      {/* Right: Statistics Panel */}
      <div className="w-96 overflow-y-auto">
        {selectedDistrict ? (
          <DistrictDetailPanel districtId={selectedDistrict} />
        ) : (
          <DistrictListPanel statistics={statistics} />
        )}
      </div>
    </div>
  );
}
```

---

## 8. 预期效果

### 用户体验

1. **快速概览**: 一眼看到全港18区的风险分布
2. **深入分析**: 钻取到TPU级别的详细统计
3. **对比分析**: 多区域横向对比
4. **导出报告**: 一键生成Excel/PDF报告

### 业务价值

1. **风险集中度分析**: 识别高风险区域
2. **承保策略优化**: 根据区域调整费率
3. **理赔趋势分析**: 按区域分析理赔模式
4. **再保安排**: 按地理区域分层

---

## 9. 下一步行动

### 立即开始:

1. ✅ 安装 Turf.js: `npm install @turf/turf`
2. ⏳ 运行测试脚本验证地理匹配
3. ⏳ 生成完整的预聚合数据
4. ⏳ 实现前端统计组件

### 需要确认:

- [ ] 是否需要理赔数据集成？
- [ ] 是否需要实时更新还是定期批量？
- [ ] 是否需要历史趋势对比？
- [ ] 导出格式偏好？

---

**创建日期**: 2024-12-17
**作者**: Claude Code
**状态**: 📋 方案设计完成，待实施
