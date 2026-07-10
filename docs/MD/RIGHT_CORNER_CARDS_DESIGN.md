# 右下角卡片动态显示方案

## 问题分析

原有的右下角两个卡片存在以下问题：

1. **Portfolio Overview 卡片**
   - 显示的是 Treaty 特有数据（Active Treaties, High Risk count）
   - 对 Direct Insurance 没有意义

2. **Map Legend 卡片**
   - 标题和内容都是针对 Treaty 设计的
   - 对 Direct Insurance 的提示信息不准确

## 解决方案

### 方案概览

```
场景1: Reinsurance模式
├─ Portfolio Overview: Treaty统计（Exposure/Active Treaties/Utilization/High Risk）
└─ Map Legend: Treaty图例（颜色=Utilization, 尺寸=Exposure）

场景2: Direct Insurance + 无统计面板
├─ Portfolio Overview: 保单汇总统计（Policies/Exposure/Avg/Districts）
└─ Map Legend: 保单图例（Policy Points）

场景3: Direct Insurance + 有统计面板
└─ 两个小卡片隐藏（因为Statistics Panel已包含所有信息）
```

### 实现逻辑

#### 1. 条件隐藏逻辑

```typescript
{/* 当统计面板显示时，隐藏两个小卡片 */}
{!(dataSource === 'direct' && viewMode === 'map' && statisticsDimension) && (
  <div className="absolute bottom-4 right-4 space-y-2 z-[1000]">
    {/* Portfolio Overview */}
    {/* Map Legend */}
  </div>
)}
```

**为什么要隐藏？**
- 统计面板已经显示了汇总数据（Total Policies, Total Exposure, Avg Exposure）
- 避免界面过于拥挤
- 统计面板提供了更详细的信息

#### 2. Portfolio Overview 动态内容

```typescript
<div className="grid grid-cols-2 gap-3">
  {dataSource === 'reinsurance' ? (
    // Reinsurance: Treaty Statistics
    <>
      <div>Total Exposure</div>
      <div>Active Treaties</div>
      <div>Avg Utilization</div>
      <div>High Risk</div>
    </>
  ) : (
    // Direct Insurance: Policy Statistics
    <>
      <div>Total Policies</div>
      <div>Total Exposure</div>
      <div>Avg Exposure</div>
      <div>Districts</div>
    </>
  )}
</div>
```

**Direct Insurance 显示的数据**：
- **Total Policies**: 保单总数（68,762）
- **Total Exposure**: 总保额（HKD 127.75B）
- **Avg Exposure**: 平均保额（HKD 1.86M）
- **Districts**: 覆盖地区数（18）

**数据来源**：
- 优先使用 `portfolioStats.summary`（来自 usePortfolioData hook）
- 降级到硬编码默认值（当数据未加载时）

#### 3. Map Legend 动态提示

```typescript
<p className="text-[10px] text-gray-500 mt-1.5 italic">
  {dataSource === 'direct'
    ? 'Click dimension button (left) for detailed statistics'
    : 'Click region to view treaties'}
</p>
```

**提示文字变化**：
- **Direct Insurance**: 提示用户点击左侧维度按钮查看详细统计
- **Reinsurance**: 提示用户点击地图区域查看 treaties

## 视觉效果对比

### Before（所有模式显示相同内容）

```
┌─ Map View ────────────────────────┐
│                                   │
│                                   │
│                ┌─ Portfolio ──────┤
│                │ Total Exposure   │
│                │ Active Treaties  │  ← 对Direct Insurance无意义
│                │ Avg Utilization  │
│                │ High Risk        │
│                ├──────────────────│
│                │ Treaty Markers   │  ← 提示不准确
│                │ Color=Utilization│
│                └──────────────────┘
└───────────────────────────────────┘
```

### After（根据数据源动态调整）

#### Reinsurance 模式

```
┌─ Map View ────────────────────────┐
│                                   │
│  [Treaty Markers]                 │
│                ┌─ Portfolio ──────┤
│                │ Total Exposure   │
│                │ Active Treaties  │
│                │ Avg Utilization  │
│                │ High Risk        │
│                ├──────────────────│
│                │ Treaty Markers   │
│                │ Click for details│
│                └──────────────────┘
└───────────────────────────────────┘
```

#### Direct Insurance（无统计面板）

```
┌─ Map View ────────────────────────┐
│                                   │
│  [Policy Points]                  │
│                ┌─ Portfolio ──────┤
│                │ Total Policies   │  ← 改为保单统计
│                │ Total Exposure   │
│                │ Avg Exposure     │
│                │ Districts        │
│                ├──────────────────│
│                │ Policy Points    │
│                │ Click left for   │  ← 改为统计提示
│                │ statistics       │
│                └──────────────────┘
└───────────────────────────────────┘
```

#### Direct Insurance（有统计面板）

```
┌─ Map View ────────────────────────┐
│                                   │
│  [Policy Points]                  │
│             ┌─ Statistics Panel ──┤
│             │ 📊 By District      │
│             ├─────────────────────│
│             │ 📊 Summary          │
│             │  • 68,762 policies  │  ← 统计面板包含
│             │  • HKD 127.75B      │     所有汇总信息
│             │  • HKD 1.86M avg    │
│             ├─────────────────────│
│             │ [Chart]             │
│             └─────────────────────┘
│  (小卡片隐藏，避免重复信息)        │
└───────────────────────────────────┘
```

## 数据字段映射

### Reinsurance 模式

| 字段 | 数据源 | 格式 | 示例 |
|------|--------|------|------|
| Total Exposure | `stats.totalExposure` | Currency | $186.3M |
| Active Treaties | `stats.activeTreaties/totalTreaties` | Ratio | 4/6 |
| Avg Utilization | `stats.avgUtilization` | Percentage | 79% |
| High Risk | `treaties.filter(t => t.limitUtilization >= 85).length` | Count | 3 |

### Direct Insurance 模式

| 字段 | 数据源 | 格式 | 示例 |
|------|--------|------|------|
| Total Policies | `portfolioStats.summary.totalPolicies` | Number | 68,762 |
| Total Exposure | `portfolioStats.summary.totalExposure` | Currency | HKD 127.75B |
| Avg Exposure | `portfolioStats.summary.avgExposure` | Currency | HKD 1.86M |
| Districts | Hard-coded | Number | 18 |

## 用户体验流程

### 流程 1: Direct Insurance 首次进入

```
用户操作：
1. 选择 "🏢 Direct Insurance"
2. 默认显示 Map 视图

界面显示：
├─ 地图: 显示保单点位
├─ 右下角卡片1: Portfolio Overview（保单汇总统计）
└─ 右下角卡片2: Map Legend（保单图例 + 统计提示）

用户看到：
• 保单总数、总保额、平均保额、覆盖地区
• 提示："Click dimension button (left) for detailed statistics"
```

### 流程 2: 用户点击统计维度

```
用户操作：
3. 点击左侧 "📍 District" 按钮

界面变化：
├─ 地图: 保持不变
├─ 右下角小卡片: 隐藏（避免重复）
└─ 右下角大面板: 显示统计面板
    ├─ 汇总卡片: Total Policies, Total Exposure, Avg Exposure
    ├─ 柱状图: 18个地区的保额分布
    └─ 控制按钮: 最小化、关闭

用户体验：
• 小卡片消失，避免视觉干扰
• 大面板显示更详细的统计信息
• 仍可看到地图
```

### 流程 3: 用户关闭统计面板

```
用户操作：
4. 点击统计面板的 ✕ 关闭按钮

界面恢复：
├─ 地图: 保持不变
├─ 右下角卡片1: 重新显示 Portfolio Overview
└─ 右下角卡片2: 重新显示 Map Legend

用户体验：
• 回到初始状态
• 可以快速查看汇总信息
• 需要时再次点击维度按钮
```

### 流程 4: 切换到 Reinsurance

```
用户操作：
5. 切换到 "🔄 Reinsurance"

界面变化：
├─ 地图: 显示 Treaty 标记
├─ 右下角卡片1: 切换到 Treaty 统计
│   ├─ Total Exposure
│   ├─ Active Treaties
│   ├─ Avg Utilization
│   └─ High Risk
└─ 右下角卡片2: 切换到 Treaty 图例
    └─ 提示: "Click region to view treaties"

用户体验：
• 卡片内容自动适配 Treaty 数据
• 提示文字改为 Treaty 相关
```

## 代码要点

### 1. 条件渲染包装

```typescript
{!(dataSource === 'direct' && viewMode === 'map' && statisticsDimension) && (
  // 两个小卡片
)}
```

**逻辑**：
- 当 Direct Insurance + Map + 有统计维度 → 隐藏
- 其他所有情况 → 显示

### 2. 数据源分支

```typescript
{dataSource === 'reinsurance' ? (
  // Reinsurance 内容
) : (
  // Direct Insurance 内容
)}
```

### 3. 默认值降级

```typescript
{portfolioStats?.summary?.totalPolicies?.toLocaleString() || '68,762'}
```

**原因**：
- `portfolioStats` 可能未加载
- 避免显示空白或错误
- 提供合理的默认值

## 优势总结

### 1. 信息准确性
- ✅ 每种数据源显示对应的统计指标
- ✅ 提示文字与实际功能匹配
- ✅ 避免混淆和误导

### 2. 界面清晰度
- ✅ 统计面板显示时隐藏小卡片，避免冗余
- ✅ 统一的视觉风格
- ✅ 不同模式有明确的视觉区分

### 3. 用户体验
- ✅ 快速查看：小卡片提供快速概览
- ✅ 深入分析：统计面板提供详细数据
- ✅ 灵活切换：可随时打开/关闭统计面板

### 4. 代码可维护性
- ✅ 集中的条件逻辑
- ✅ 清晰的数据源分支
- ✅ 可扩展的结构（易于添加新模式）

## 测试场景

### 测试 1: Reinsurance 模式
```
1. 选择 Reinsurance
2. 检查 Portfolio Overview 显示 Treaty 统计
3. 检查 Map Legend 显示 "Click region to view treaties"
```

### 测试 2: Direct Insurance 无统计面板
```
1. 选择 Direct Insurance + Map
2. 不点击任何统计维度
3. 检查 Portfolio Overview 显示保单统计（68,762等）
4. 检查 Map Legend 提示 "Click dimension button..."
```

### 测试 3: Direct Insurance 有统计面板
```
1. 选择 Direct Insurance + Map
2. 点击任一统计维度（如 District）
3. 检查小卡片消失
4. 检查统计面板显示
5. 关闭统计面板
6. 检查小卡片重新出现
```

### 测试 4: 数据源切换
```
1. Direct Insurance → Reinsurance
   - 卡片内容应从保单统计切换到Treaty统计
2. Reinsurance → Direct Insurance
   - 卡片内容应从Treaty统计切换到保单统计
```

## 未来改进

### 短期
1. 添加加载状态指示器（当 portfolioStats 加载中）
2. 添加数据刷新按钮
3. 支持自定义显示指标

### 中期
1. 卡片可拖拽调整位置
2. 卡片可折叠/展开
3. 支持更多统计指标选择

### 长期
1. 卡片大小可调整
2. 支持多个卡片同时显示
3. 卡片布局保存到用户偏好

---

**实施日期**: 2025-12-15
**状态**: ✅ 完成
**影响范围**: Direct Insurance 和 Reinsurance 两种模式的右下角卡片显示
