# TPUSU 层级结构详解

## 快速回答

**TPUSU 有 4 个层级：**

```
层级 1: PPU (Primary)      → 9 个主要规划区
层级 2: SPU (Secondary)    → 52 个次级规划区
层级 3: TPU (Tertiary) ⭐  → 292 个小规划统计区 (推荐使用)
层级 4: Subunit            → 4,916 个单元区 (最细粒度)
```

---

## 详细层级说明

### 层级 1: PPU (Primary Planning Unit - 主要规划区)
**数量**: 9 个

| PPU | SPU数量 | TPU数量 | Subunit数量 | 说明 |
|-----|---------|---------|-------------|------|
| PPU 1 | 9 | 59 | 1,160 | 最大的区域 |
| PPU 2 | 9 | 66 | 1,392 | 最大的区域 |
| PPU 3 | 5 | 20 | 281 | |
| PPU 4 | 4 | 20 | 249 | |
| PPU 5 | 4 | 31 | 464 | |
| PPU 6 | 5 | 20 | 348 | |
| PPU 7 | 6 | 29 | 534 | |
| PPU 8 | 3 | 24 | 268 | 最少SPU |
| PPU 9 | 7 | 23 | 220 | 最少Subunit |

**特点**:
- 最粗的层级
- 可能对应香港的大区域（港岛、九龙、新界东、新界西等）
- ⚠️ 注意：9个PPU ≠ 18个行政区！

### 层级 2: SPU (Secondary Planning Unit - 次级规划区)
**数量**: 52 个

**命名格式**: `PPU-SPU` (例如: `1-11`, `2-21`)

**样本**:
- SPU 1-11: 6个TPU, 166个Subunit
- SPU 1-12: 4个TPU, 78个Subunit
- SPU 1-13: 5个TPU, 125个Subunit

**特点**:
- 中等粒度
- 每个SPU包含4-10个TPU
- 每个SPU包含32-228个Subunit

### 层级 3: TPU (Tertiary Planning Unit - 小规划统计区) ⭐ 推荐
**数量**: 292 个

**命名格式**: `PPU-SPU-TPU` (例如: `1-11-111`, `7-72-726`)

**样本**:
- TPU 1-11-111: 47个Subunit
- TPU 1-11-112: 50个Subunit
- TPU 7-72-726: 1个policy (从测试结果)

**特点**:
- ✅ **官方人口普查使用的标准层级**
- ✅ **数据权威且实用**
- ✅ **最佳的性能与细节平衡**
- 每个TPU平均包含 ~17个Subunit (4916÷292)
- 比18区细 **16倍** (292 vs 18)

### 层级 4: Subunit (单元区 - 最细粒度)
**数量**: 4,916 个

**命名格式**: `PPU-SPU-TPU-Subunit` (例如: `3-35-351-30`)

**特点**:
- 最细的地理单元
- 每个Subunit是一个独立的小区域
- ⚠️ 数量很大，Web端匹配可能较慢

---

## 层级对比表

### 完整对比

| 层级 | 英文全称 | 中文名称 | 数量 | 每个包含 | 用途 | 性能 |
|------|---------|---------|------|---------|------|------|
| **18区** | 18 Districts | 香港行政区 | 18 | ~10,800保单 | 行政、概览 | ⚡ 极快 |
| **PPU** | Primary Planning Unit | 主要规划区 | 9 | ~21,700保单 | 大区分组 | ⚡ 极快 |
| **SPU** | Secondary Planning Unit | 次级规划区 | 52 | ~3,740保单 | 中等粒度 | ⚡ 快 |
| **TPU** ⭐ | Tertiary Planning Unit | 小规划统计区 | 292 | ~665保单 | **详细分析** | ✅ 中等 |
| **Subunit** | Subunit | 单元区 | 4,916 | ~40保单 | 超详细 | ⚠️ 慢 |

### Web应用推荐

```
┌─────────────────────────────────────────┐
│ 场景          │ 推荐层级     │ 原因    │
├─────────────────────────────────────────┤
│ 首页概览      │ 18 区        │ 快速    │
│ 风险热力图    │ TPU (292)    │ 细节好  │
│ 详细统计      │ TPU (292)    │ 平衡    │
│ 对比分析      │ 18 区 或 TPU │ 灵活    │
│ 科研分析      │ Subunit      │ 最细    │
└─────────────────────────────────────────┘
```

---

## 层级关系图

```
香港特区
├── 18 行政区 (行政划分)
│   ├── 中西區
│   ├── 灣仔區
│   └── ...
│
└── TPUSU (规划划分) - 独立体系
    ├── PPU 1 (9个大区)
    │   ├── SPU 1-11
    │   │   ├── TPU 1-11-111
    │   │   │   ├── Subunit 1
    │   │   │   ├── Subunit 2
    │   │   │   └── ...
    │   │   ├── TPU 1-11-112
    │   │   └── ...
    │   ├── SPU 1-12
    │   └── ...
    ├── PPU 2
    └── ...
```

---

## 实际应用建议

### 方案 1: 双层级系统（推荐）

```
概览层: 18 行政区
详细层: TPU (292个)
```

**优点**:
- 用户熟悉18区
- TPU提供足够细节
- 性能可接受

**UI流程**:
```
1. 首页显示18区热力图
2. 点击某区 → 显示该区的TPU细分
3. 点击TPU → 显示该TPU的保单列表
```

### 方案 2: 三层级系统（完整）

```
概览层: 18 行政区
中层:   SPU (52个)
详细层: TPU (292个)
```

**优点**:
- 层级更清晰
- 适合大型项目

**缺点**:
- UI复杂度增加
- 可能混淆用户

### 方案 3: 自定义切换

```
允许用户选择:
○ 18 Districts (18)
○ PPU (9)
○ SPU (52)
● TPU (292) ⭐ 默认
○ Subunit (4,916)
```

---

## 性能考量

### 地理匹配时间估算

基于194,506条保单数据：

| 层级 | 多边形数 | 预估时间 | 推荐方式 |
|------|---------|---------|---------|
| 18区 | 18 | ~2-3秒 | ✅ 实时匹配 |
| PPU | 9 | ~1-2秒 | ✅ 实时匹配 |
| SPU | 52 | ~10-15秒 | ✅ 实时匹配 |
| **TPU** | **292** | **~30-45秒** | ⚠️ **预计算+缓存** |
| Subunit | 4,916 | ~8-10分钟 | ❌ 必须预计算 |

### 优化策略

#### 1. 预计算（推荐）
```javascript
// 一次性处理所有保单
// 生成 portfolio-tpu-mapping.json
{
  "districts": {...},  // 18区统计
  "tpu": {...},        // TPU统计
  "timestamp": "..."
}
```

#### 2. 增量更新
```javascript
// 只处理新增保单
// 合并到已有统计中
```

#### 3. Web Worker
```javascript
// 后台线程处理
// 不阻塞UI
```

---

## 数据文件

### 输入文件

| 文件 | 大小 | 要素数 | 用途 |
|------|------|--------|------|
| `TPUSU_2021_converted.geojson` | 67.2 MB | 4,916 | 完整TPUSU数据 |
| `Hong_Kong_18_Districts.geojson` | 3.9 MB | 18 | 行政区边界 |
| `tphk_portfolio_subset_5000.json` | 3.1 MB | 5,000 | 承保数据样本 |

### 需要生成的文件

| 文件 | 预估大小 | 内容 |
|------|---------|------|
| `portfolio-district-stats.json` | ~500 KB | 18区统计 |
| `portfolio-tpu-stats.json` | ~5-10 MB | TPU统计 |
| `policy-tpu-mapping.json` | ~20-30 MB | 保单→TPU映射 |

---

## 示例代码

### 提取TPU层级数据

```javascript
// 从完整TPUSU中提取TPU层级
const tpuLayer = {};

data.features.forEach(f => {
  const key = `${f.properties.PPU}-${f.properties.SPU}-${f.properties.TPU}`;

  if (!tpuLayer[key]) {
    tpuLayer[key] = {
      ppu: f.properties.PPU,
      spu: f.properties.SPU,
      tpu: f.properties.TPU,
      geometry: null, // 需要合并所有subunit的geometry
      subunits: []
    };
  }

  tpuLayer[key].subunits.push(f.properties.Subunit);
});

// 292个TPU
console.log(Object.keys(tpuLayer).length);
```

### 匹配保单到TPU

```javascript
import * as turf from '@turf/turf';

function matchPolicyToTPU(policy, tpuData) {
  const point = turf.point([
    policy.location.lng,
    policy.location.lat
  ]);

  for (const tpu of tpuData.features) {
    const tpuKey = `${tpu.properties.PPU}-${tpu.properties.SPU}-${tpu.properties.TPU}`;

    if (turf.booleanPointInPolygon(point, tpu)) {
      return {
        tpuKey,
        ppu: tpu.properties.PPU,
        spu: tpu.properties.SPU,
        tpu: tpu.properties.TPU
      };
    }
  }

  return null;
}
```

---

## 关键要点总结

### ✅ 可以做的

1. **18区 + TPU 双层级系统** - 最推荐
   - 18区用于概览
   - TPU用于详细分析

2. **预计算所有统计数据**
   - 避免实时计算
   - 存储为JSON文件
   - Web端直接加载

3. **按需加载**
   - 首页只加载18区
   - 点击后加载该区的TPU数据

### ⚠️ 注意事项

1. **PPU ≠ 18区**
   - 两个独立的分类体系
   - 不要混淆

2. **性能考虑**
   - TPU (292) 需要预计算
   - Subunit (4,916) 太慢，不推荐实时

3. **数据大小**
   - 完整TPU数据 67MB
   - 需要压缩或分块加载

---

## 下一步建议

### 立即行动：

1. ✅ 使用 **18区 + TPU** 双层级
2. ⏳ 生成预计算统计数据
3. ⏳ 实现Web UI组件
4. ⏳ 添加图层切换功能

### 未来扩展：

1. 添加SPU中间层（可选）
2. 支持Subunit超细粒度（科研用）
3. 时间序列分析（按年份对比）

---

**创建日期**: 2024-12-17
**数据来源**: 2021年香港人口普查
**状态**: ✅ 分析完成
**推荐层级**: TPU (292个) ⭐
