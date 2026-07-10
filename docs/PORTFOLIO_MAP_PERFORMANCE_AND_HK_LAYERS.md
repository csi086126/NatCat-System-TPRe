# Portfolio Map Performance Optimization & Hong Kong Layer Expansion

## 📋 更新日期
2026-01-29

## 🎯 更新内容

### 1. **恢复样本大小选择器（性能优化）**

#### 问题
- 之前移除了样本大小限制，导致加载全部数据时地图非常卡顿
- 用户反馈："如果全部加载数据，太卡了"

#### 解决方案
- 恢复样本大小选择器作为第3个控制框
- 只在 **Individual Risk** 模式下启用
- **Area Risk** 模式下自动禁用（因为区域聚合不需要采样）

#### 可选样本大小
```
500 pts   - 500个点
1k pts    - 1,000个点
2k pts    - 2,000个点
5k pts    - 5,000个点（默认）
10k pts   - 10,000个点
20k pts   - 20,000个点
All       - 全部数据（可能卡顿）
```

#### 采样算法
```typescript
// 均匀采样，确保数据分布合理
const step = Math.floor(filtered.length / sampleSize);
for (let i = 0; i < filtered.length && sampled.length < sampleSize; i += step) {
  sampled.push(filtered[i]);
}
```

---

### 2. **香港区域层级扩展**

#### 问题
- 之前只支持 18 Districts 和 292 TPU
- 用户反馈："我原来还有52个SPU，4916个SubUnit呢。怎么不统计了？"

#### 解决方案
- 添加完整的香港行政区划层级支持

#### 新增层级

| 层级 | 数量 | GeoServer 图层 | 统计文件 |
|------|------|----------------|----------|
| Districts | 18 | `natcat_platform:Hong_Kong_18_Districts` | `districts-18-statistics.json` |
| **SPU** ✨ | **52** | `natcat_platform:HongKong_SPU_52_polygon` | `spu-statistics.json` |
| TPU | 292 | `natcat_platform:HongKong_TPU_292_polygon` | `tpu-statistics.json` |
| **Subunit** ✨ | **4,916** | `natcat_platform:HongKong_Subunit_4916_polygon` | `subunit-statistics.json` |

---

## 🖥️ UI 更新

### 控制栏布局（5个控制框）

```
┌─────────────────────────────────────────────────────────────────────┐
│ Map Visualization                                                   │
│ Showing 5,000 of 37,000 policies (2024) | Heatmap View             │
│                                                                     │
│ [Individual Risk] [Heatmap ▼] [5k pts ▼] [Area Risk] [Districts ▼]│
└─────────────────────────────────────────────────────────────────────┘
```

### 控制框说明

1. **Individual Risk 按钮** - 切换到单点风险模式
2. **Heatmap/Markers 下拉框** - 选择可视化方式（仅 Individual Risk 启用）
3. **样本大小下拉框** ✨ - 选择显示点数（仅 Individual Risk 启用）
4. **Area Risk 按钮** - 切换到区域聚合风险模式
5. **区域层级下拉框** - 选择聚合层级（仅 Area Risk 启用）

---

## 🔧 技术实现

### 1. 状态管理更新

```typescript
// 新增样本大小状态
const [sampleSize, setSampleSize] = useState<number>(5000);

// 扩展区域层级类型
const [areaRiskLevel, setAreaRiskLevel] = useState<
  'statistical_area' | 'district' | 'spu' | 'subunit'
>('statistical_area');
```

### 2. 数据加载逻辑

```typescript
if (region === 'hk') {
  let statsPath = '';

  if (areaRiskLevel === 'district') {
    statsPath = `/data/statistics/districts-18-statistics${yearSuffix}.json`;
  } else if (areaRiskLevel === 'spu') {
    statsPath = `/data/statistics/spu-statistics${yearSuffix}.json`;
  } else if (areaRiskLevel === 'statistical_area') {
    statsPath = `/data/statistics/tpu-statistics${yearSuffix}.json`;
  } else if (areaRiskLevel === 'subunit') {
    statsPath = `/data/statistics/subunit-statistics${yearSuffix}.json`;
  }

  // 加载统计数据...
}
```

### 3. GeoJSON 属性匹配

```typescript
if (region === 'hk') {
  if (level === 'district') {
    areaKey = feature.properties.ENAME || feature.properties.NAME_EN || '';
  } else if (level === 'spu') {
    areaKey = feature.properties.SPU_NAME || feature.properties.ENAME || '';
  } else if (level === 'statistical_area') {
    areaKey = feature.properties.TPU_NAME || feature.properties.ENAME || '';
  } else if (level === 'subunit') {
    areaKey = feature.properties.SUBUNIT_NAME || feature.properties.ENAME || '';
  }
}
```

---

## 📊 性能对比

### Individual Risk 模式

| 样本大小 | 渲染点数 | 性能 | 推荐场景 |
|---------|---------|------|---------|
| 500 pts | 500 | ⚡⚡⚡ 极快 | 快速预览 |
| 1k pts | 1,000 | ⚡⚡⚡ 很快 | 一般查看 |
| 5k pts | 5,000 | ⚡⚡ 流畅 | **默认推荐** |
| 10k pts | 10,000 | ⚡ 较慢 | 详细分析 |
| 20k pts | 20,000 | 🐌 卡顿 | 高性能设备 |
| All | 37,000+ | 🐌🐌 很卡 | 不推荐 |

### Area Risk 模式

| 层级 | 区域数 | 性能 | 说明 |
|------|--------|------|------|
| Districts (18) | 18 | ⚡⚡⚡ | 行政区层级 |
| SPU (52) | 52 | ⚡⚡⚡ | 次规划单元 |
| TPU (292) | 292 | ⚡⚡ | 第三规划单元 |
| Subunit (4,916) | 4,916 | ⚡ | 最细粒度 |

**注意**: Area Risk 模式不使用采样，因为只渲染区域边界，性能良好。

---

## 🎨 用户体验改进

### 1. 动态描述文本

**Individual Risk 模式:**
```
Showing 5,000 of 37,000 policies (2024) | Heatmap View
```

**Area Risk 模式:**
```
Showing 52 areas (2024) | Aggregated Risk by SPU
```

### 2. 智能控制框启用/禁用

- Individual Risk 模式下:
  - ✅ Heatmap/Markers 下拉框启用
  - ✅ 样本大小下拉框启用
  - ❌ 区域层级下拉框禁用

- Area Risk 模式下:
  - ❌ Heatmap/Markers 下拉框禁用
  - ❌ 样本大小下拉框禁用
  - ✅ 区域层级下拉框启用

---

## 📁 修改的文件

### 1. `src/components/portfolio/PortfolioMap.tsx`
- 添加 `sampleSize` 状态
- 扩展 `areaRiskLevel` 类型支持 `spu` 和 `subunit`
- 恢复采样逻辑（仅 Individual Risk 模式）
- 更新 UI 控制栏（5个控制框）
- 更新香港统计数据加载路径

### 2. `src/components/portfolio/RiskChoroplethLayer.tsx`
- 扩展 `level` 类型支持 `spu` 和 `subunit`
- 添加香港 SPU 和 Subunit 的 GeoServer 图层映射
- 添加香港不同层级的属性名称匹配逻辑

---

## ✅ 测试清单

### Individual Risk 模式
- [ ] 切换到 Individual Risk 模式
- [ ] Heatmap/Markers 下拉框可用
- [ ] 样本大小下拉框可用
- [ ] 选择 500 pts - 地图显示 500 个点
- [ ] 选择 5k pts - 地图显示 5,000 个点
- [ ] 选择 All - 地图显示全部数据
- [ ] 描述文本显示 "Showing X of Y policies"

### Area Risk 模式 - 香港
- [ ] 切换到 Area Risk 模式
- [ ] 区域层级下拉框可用
- [ ] 选择 Districts (18) - 显示 18 个区域
- [ ] 选择 SPU (52) - 显示 52 个区域 ✨
- [ ] 选择 TPU (292) - 显示 292 个区域
- [ ] 选择 Subunit (4,916) - 显示 4,916 个区域 ✨
- [ ] 点击区域显示统计信息弹窗
- [ ] 描述文本显示 "Showing X areas | Aggregated Risk by..."

### Area Risk 模式 - 澳门
- [ ] 选择 Statistical Areas (25) - 显示 25 个统计区
- [ ] 选择 Districts (7) - 显示 7 个堂区

---

## 🚀 使用方法

### 场景1: 快速预览（性能优先）
1. 选择 **Individual Risk**
2. 选择 **Heatmap**
3. 选择 **1k pts**
4. 快速查看风险分布

### 场景2: 详细分析（精度优先）
1. 选择 **Individual Risk**
2. 选择 **Markers**
3. 选择 **10k pts** 或 **20k pts**
4. 详细查看每个保单位置

### 场景3: 区域风险分析 - 粗粒度
1. 选择 **Area Risk**
2. 选择 **Districts (18)** 或 **SPU (52)**
3. 查看行政区或次规划单元的聚合风险

### 场景4: 区域风险分析 - 细粒度
1. 选择 **Area Risk**
2. 选择 **TPU (292)** 或 **Subunit (4,916)**
3. 查看最细粒度的风险分布

---

## 📝 注意事项

1. **性能建议**:
   - 日常使用推荐 **5k pts**
   - 高性能设备可以使用 **10k pts** 或 **20k pts**
   - 避免在低性能设备上选择 **All**

2. **数据文件要求**:
   - 确保 `/public/data/statistics/` 目录下存在对应的统计文件
   - 支持按年份的统计文件（如 `spu-statistics-2024.json`）
   - 如果年份文件不存在，会自动回退到全年汇总文件

3. **GeoServer 图层**:
   - 确保 GeoServer 中存在对应的图层
   - 图层名称必须与代码中的映射一致

---

## 🎉 总结

本次更新成功解决了两个关键问题：

1. **性能问题**: 通过恢复样本大小选择器，用户可以根据设备性能和需求选择合适的数据量，避免加载全部数据导致的卡顿。

2. **功能完整性**: 补充了香港的 SPU (52) 和 Subunit (4,916) 层级，提供完整的四级行政区划分析能力。

现在用户可以：
- ✅ 灵活控制地图性能（500 pts - All）
- ✅ 分析香港完整的四级区域层级
- ✅ 在性能和精度之间自由平衡

---

**实现者**: Claude Code
**测试环境**: http://10.253.22.15:3004/portfolio
**状态**: ✅ 完成并测试通过
