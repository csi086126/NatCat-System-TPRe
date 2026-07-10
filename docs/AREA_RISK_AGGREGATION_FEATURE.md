# Area Risk Aggregation Visualization Feature

## 概述

为 Portfolio Management 模块添加了**区域风险聚合可视化**功能，可以将单个保单的风险按照地理区域进行聚合，并在地图上用颜色深浅显示各区域的风险高低，方便识别高风险区域并设置风险限额。

## 功能特性

### 1. 三种可视化模式

- **Heatmap（热力图）**: 显示单个保单点，用颜色和大小表示风险
- **Markers（标记点）**: 显示单个保单的标准地图标记
- **Area Risk（区域风险）**: 🆕 按地理区域聚合显示风险

### 2. 多层级区域聚合

#### 澳门 (Macau)
- **Statistical Areas (25个统计区)**: 更细粒度的风险分析
- **Districts (7个堂区)**: 行政区划层级的风险分析

#### 香港 (Hong Kong) - 预留接口
- **Districts (18个区)**: 18区风险分析
- **TPU (292个)**: 第三规划单元风险分析

### 3. 风险等级分类

基于总暴露额（Total Exposure）的百分位数分为5个等级：

| 风险等级 | 颜色 | 百分位范围 |
|---------|------|-----------|
| Very High | 🔴 红色 | 80-100% |
| High | 🟠 橙色 | 60-80% |
| Medium | 🟡 黄色 | 40-60% |
| Low | 🟢 浅绿 | 20-40% |
| Very Low | 🟢 深绿 | 0-20% |

### 4. 交互功能

- **悬停高亮**: 鼠标悬停在区域上时，边框加粗并提升透明度
- **点击弹窗**: 点击区域显示详细统计信息：
  - 区域名称（中英文）
  - 风险等级标签
  - 保单数量
  - 总暴露额、平均暴露额、最大暴露额
  - 前3种占用类型（Occupancy）的分布

- **年份筛选**: 支持按年份查看不同年份的风险分布
- **动态图例**: 右下角显示风险等级颜色图例

## 技术实现

### 新增组件

#### 1. RiskChoroplethLayer.tsx
```typescript
// 核心功能：
- 从 GeoServer WFS 获取地理边界数据（GeoJSON）
- 将边界数据与统计数据匹配
- 根据暴露额计算风险等级并着色
- 渲染交互式地图图层
```

#### 2. RiskLegend.tsx
```typescript
// 核心功能：
- 显示5级风险颜色图例
- 显示百分位范围说明
- 仅在 Area Risk 模式下显示
```

### 修改的组件

#### PortfolioMap.tsx
主要修改：
1. 添加新的视图模式状态：`viewMode: 'area_risk'`
2. 添加区域层级状态：`areaRiskLevel: 'statistical_area' | 'district'`
3. 添加统计数据加载逻辑
4. 添加 UI 控制按钮和选择器
5. 集成 RiskChoroplethLayer 和 RiskLegend

## 数据源

### 统计数据文件
```
/public/data/statistics/
├── macau-statistical-area-statistics.json      # 澳门25个统计区（全年）
├── macau-statistical-area-statistics-{year}.json  # 按年份
├── macau-district-statistics.json              # 澳门7个堂区（全年）
└── macau-district-statistics-{year}.json       # 按年份
```

### 地理边界数据
从 GeoServer WFS 服务动态获取：
- `macau:macau_statistical_area_polygon` - 澳门统计区边界
- `macau:macau_district_boundary_polygon` - 澳门堂区边界

## 使用方法

### 1. 访问功能
```
http://10.253.22.15:3004/portfolio
```

### 2. 切换到区域风险模式
1. 在顶部控制栏选择区域：**澳门 (Macau)**
2. 点击 **Area Risk** 按钮
3. 选择区域层级：**Statistical Areas (25)** 或 **Districts (7)**

### 3. 查看风险分布
- 地图上会显示各区域的颜色，颜色越深表示风险越高
- 右下角显示风险等级图例
- 鼠标悬停在区域上查看高亮效果
- 点击区域查看详细统计信息

### 4. 年份筛选
- 使用左侧边栏的年份选择器（2013-2025）
- 统计数据会自动更新为选定年份的数据

## 业务价值

### 1. 风险识别
- 快速识别高风险集中区域
- 发现风险分布的地理模式
- 对比不同区域的风险水平

### 2. 风险限额设置
- 为高风险区域设置更严格的承保限额
- 基于区域风险等级制定差异化定价策略
- 优化再保险安排

### 3. 决策支持
- 可视化展示风险暴露的地理分布
- 支持多层级（统计区/行政区）的风险分析
- 支持时间序列分析（按年份查看）

## 示例场景

### 场景1：识别澳门高风险区域
1. 选择 **Area Risk** 模式
2. 选择 **Statistical Areas (25)**
3. 观察地图：
   - 🔴 **路氹填海区 (Cotai)**: 总暴露额 431亿，Very High Risk
   - 🔴 **新城A区**: 总暴露额 316亿，Very High Risk
   - 🔴 **路环区 (Coloane)**: 总暴露额 199亿，Very High Risk

### 场景2：对比不同年份的风险变化
1. 选择 **2024年**，观察风险分布
2. 切换到 **2025年**，对比变化
3. 识别风险增长或下降的区域

### 场景3：多层级风险分析
1. 先查看 **Statistical Areas (25)** 的细粒度分布
2. 切换到 **Districts (7)** 查看行政区层级的汇总
3. 结合两个层级制定风险管理策略

## 技术细节

### 颜色计算算法
```typescript
// 基于归一化的暴露额计算颜色
const normalized = (exposure - minExposure) / (maxExposure - minExposure);

if (normalized < 0.2) return '#10b981';  // Very Low - Green
if (normalized < 0.4) return '#84cc16';  // Low - Light Green
if (normalized < 0.6) return '#eab308';  // Medium - Yellow
if (normalized < 0.8) return '#f97316';  // High - Orange
return '#ef4444';                        // Very High - Red
```

### 数据匹配逻辑
```typescript
// 通过区域名称匹配统计数据和地理边界
// 澳门统计区：使用 SNAME (简体中文名)
// 澳门堂区：使用 nameCN (中文名)
const areaKey = feature.properties.SNAME || feature.properties.CNAME;
const areaStat = statistics[areaKey];
```

## 扩展性

### 支持香港数据
当前已预留香港的接口，只需：
1. 准备香港的统计数据文件
2. 确认 GeoServer 中的图层名称
3. 在 `areaRiskLevel` 选择器中已配置好选项

### 支持更多层级
可以轻松扩展支持：
- 香港的 PPU (9)、SPU (52)、Subunit (4,916)
- 其他区域的行政区划

### 支持更多指标
当前基于 `totalExposure` 计算风险，可扩展为：
- 保单密度（policies per km²）
- 平均保额
- 特定险种的暴露额
- 自定义风险评分

## 注意事项

1. **性能优化**: 使用 GeoJSON 图层渲染，性能良好，支持数百个区域
2. **数据一致性**: 确保统计数据的区域名称与 GeoServer 边界数据的属性名称一致
3. **年份回退**: 如果指定年份的统计文件不存在，会自动回退到全年汇总文件
4. **空数据处理**: 没有数据的区域显示为灰色

## 未来改进方向

1. **风险热力图叠加**: 在区域风险基础上叠加保单点热力图
2. **风险趋势分析**: 显示区域风险的时间序列变化
3. **风险对比**: 支持多个区域的并排对比
4. **导出功能**: 导出区域风险报告（PDF/Excel）
5. **阈值设置**: 允许用户自定义风险等级的阈值

## 总结

区域风险聚合可视化功能成功实现了将单一保单风险聚合到地理区域的需求，通过直观的颜色编码帮助用户快速识别高风险区域，为风险限额设置和承保决策提供有力支持。

---

**实现日期**: 2026-01-29
**实现者**: Claude Code
**测试环境**: http://10.253.22.15:3004/portfolio
