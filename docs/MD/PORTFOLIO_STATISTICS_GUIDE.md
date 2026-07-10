# 多维度数据分析功能使用指南

**创建日期**: 2025年12月15日
**功能状态**: ✅ 已部署
**访问地址**: http://10.253.22.15:3004/asset

---

## 📊 功能概览

现在你可以利用PostgreSQL数据库中的68,762条保单数据进行**多维度统计分析和可视化展示**!

### 可用的分析维度

1. **🏘️ 按地区分析 (By District)**
   - 18个行政区的保单分布
   - 各区总保额、平均保额对比
   - 区域风险集中度分析

2. **📅 按年份分析 (By Year)**
   - 2021-2024年度保单增长趋势
   - 年度保额变化分析
   - 跨年度对比

3. **🏢 按业务类型分析 (By Occupancy)**
   - 经营性质分类统计(商业、住宅等)
   - 不同业务类型的风险暴露
   - 行业分布分析

4. **🏗️ 按建筑类型分析 (By Construction)**
   - 建筑等级分类统计
   - 结构类型风险评估
   - 建筑质量分布

---

## 🚀 如何使用

### 步骤 1: 切换到Direct Insurance模式

1. 打开 http://10.253.22.15:3004/asset
2. 在左侧边栏点击 **"🏢 Direct Insurance"** 按钮(绿色高亮)

### 步骤 2: 进入Analytics视图

由于当前UI已简化,Analytics视图默认不显示切换按钮。你需要:

**方法A: 通过代码临时启用Analytics模式**

在浏览器控制台(F12)输入:
```javascript
// 这会切换到analytics视图
window.location.href = 'http://10.253.22.15:3004/asset?view=analytics'
```

**方法B: 恢复Visualization选择器**

如果需要长期使用,我可以为你恢复Visualization选择器UI,包含:
- 🗺️ Map
- 📈 Analytics (新增统计分析功能)

### 步骤 3: 使用统计分析功能

一旦进入Analytics Dashboard,你会看到6个Tab标签:

1. **📊 Statistics** (新增) - 多维度数据分析
2. Overview - 概览
3. Map View - 地图视图
4. Districts - 18区分析
5. Analysis - 多维度分析
6. Trends - 趋势分析

点击 **"📊 Statistics"** Tab即可进入多维度分析界面。

---

## 📈 统计分析界面功能

### 顶部汇总卡片

显示3个关键指标:
- **Total Policies**: 总保单数
- **Total Exposure**: 总风险暴露(保额总和)
- **Average Exposure**: 平均保额

### 分析维度切换

4个Tab标签可切换分析维度:

#### 🏘️ By District (按地区)

**可视化图表:**
1. **柱状图**: 各区总保额对比
2. **饼图**: 保单数量分布(Top 10区域)
3. **详细表格**: 包含以下列
   - District (区域名称)
   - Policies (保单数量)
   - Total Exposure (总保额)
   - Avg Exposure (平均保额)
   - Min/Max Exposure (最小/最大保额)

**使用场景:**
- 识别风险集中的区域
- 对比不同区域的暴露水平
- 为区域定价策略提供依据

#### 📅 By Year (按年份)

**可视化图表:**
1. **折线图**: 保单数量和总保额的年度趋势
2. **柱状图**: 年度总保额对比
3. **详细表格**: 年度统计数据

**使用场景:**
- 分析业务增长趋势
- 识别风险累积速度
- 年度绩效评估

#### 🏢 By Occupancy (按业务类型)

**可视化图表:**
1. **水平柱状图**: 各业务类型的总保额对比
2. **详细表格**: 业务类型统计

**使用场景:**
- 了解业务结构
- 识别主要业务类型
- 行业风险评估

#### 🏗️ By Construction (按建筑类型)

**可视化图表:**
1. **柱状图**: 各建筑等级的总保额
2. **详细表格**: 建筑类型统计

**使用场景:**
- 评估建筑质量分布
- 结构风险分析
- 承保策略优化

---

## 🔍 年份筛选功能

在所有分析中,你可以使用顶部的年份选择器:

- **All Years**: 查看2021-2024年全部数据
- **2024**: 仅查看2024年数据
- **2023**: 仅查看2023年数据
- **2022**: 仅查看2022年数据
- **2021**: 仅查看2021年数据

选择年份后,所有统计和图表会自动更新为该年份的数据。

---

## 🛠️ 技术实现

### API端点

新增API: `/api/portfolio/statistics`

**请求参数:**
- `dimension`: 分析维度 (`district` | `year` | `occupancy` | `construction`)
- `year` (可选): 年份筛选 (2021-2024)

**示例请求:**
```
GET /api/portfolio/statistics?dimension=district&year=2024
GET /api/portfolio/statistics?dimension=year
GET /api/portfolio/statistics?dimension=occupancy&year=2023
```

**响应格式:**
```json
{
  "success": true,
  "dimension": "district",
  "data": [
    {
      "district": "中西區",
      "policy_count": 5234,
      "total_exposure": 12500000000,
      "avg_exposure": 2387000,
      "min_exposure": 50000,
      "max_exposure": 150000000
    },
    ...
  ],
  "summary": {
    "totalPolicies": 68762,
    "totalExposure": 285000000000,
    "avgExposure": 4142000
  }
}
```

### 数据源

所有数据从PostgreSQL数据库实时查询:

- **Database**: `natcat_platform`
- **Schema**: `portfolio`
- **Table**: `policies`
- **Total Records**: 68,762条

### 可视化库

使用 `recharts` 库生成所有图表:
- 柱状图 (BarChart)
- 折线图 (LineChart)
- 饼图 (PieChart)

---

## 📋 使用建议

### 1. 风险集中度分析

**操作路径:**
1. 切换到 "By District" Tab
2. 查看柱状图识别保额最高的前5个区域
3. 在详细表格中对比这些区域的平均保额

**分析要点:**
- 如果某区域Total Exposure占比>20%,存在地理风险集中
- 对比Avg Exposure可识别高价值vs高数量区域

### 2. 业务增长追踪

**操作路径:**
1. 切换到 "By Year" Tab
2. 观察折线图的增长趋势
3. 查看表格中的年度增长率

**分析要点:**
- Policy Count增长>30%表示快速扩张
- Total Exposure增长与Policy Count不成比例可能表示大额保单增加

### 3. 业务结构优化

**操作路径:**
1. 切换到 "By Occupancy" Tab
2. 识别占比最高的3个业务类型
3. 对比各类型的Avg Exposure

**分析要点:**
- 商业类型通常Avg Exposure更高
- 住宅类型Policy Count更多但Avg Exposure较低
- 可据此调整承保策略

### 4. 建筑质量评估

**操作路径:**
1. 切换到 "By Construction" Tab
2. 查看不同建筑等级的分布
3. 识别高风险建筑类型

**分析要点:**
- 低等级建筑Total Exposure占比过高需警惕
- 高等级建筑可考虑优惠费率

---

## ⚠️ 当前限制

1. **数据库连接**
   - API需要PostgreSQL数据库运行
   - 数据库密码需要在.env中正确配置
   - 如果API返回错误,检查数据库连接状态

2. **性能考虑**
   - 首次加载可能需要2-3秒(查询68K条记录)
   - 建议使用年份筛选减少数据量
   - 图表渲染大数据集可能稍慢

3. **数据更新**
   - 统计数据实时从数据库查询
   - 如需刷新,切换Tab或年份即可重新加载

---

## 🔧 故障排查

### 问题1: Statistics Tab显示"Failed to load statistics"

**原因**: 数据库连接失败或Python脚本执行错误

**解决方案**:
1. 检查PostgreSQL是否运行:
   ```bash
   psql -U postgres -d natcat_platform -c "SELECT COUNT(*) FROM portfolio.policies;"
   ```

2. 检查.env文件中数据库密码是否正确

3. 查看浏览器控制台(F12)的错误信息

### 问题2: 图表不显示或显示空白

**原因**: 数据格式问题或recharts库未加载

**解决方案**:
1. 刷新页面(Ctrl+F5)强制重新加载
2. 检查浏览器控制台是否有JavaScript错误
3. 确认recharts已安装: `npm list recharts`

### 问题3: Analytics视图无法访问

**原因**: 当前UI已简化,去除了Visualization选择器

**解决方案**:
- 使用URL参数: `http://10.253.22.15:3004/asset?view=analytics`
- 或恢复Visualization选择器(需要修改代码)

---

## 📞 后续增强建议

### 短期优化

1. **恢复Analytics入口**
   - 重新添加Visualization选择器
   - 在Direct Insurance模式下显示Analytics按钮

2. **数据导出功能**
   - 添加"Export CSV"按钮
   - 导出当前维度的统计数据

3. **更多筛选维度**
   - 按保额范围筛选(<1M, 1-10M, >10M)
   - 按建造年份分组
   - 复合维度分析(区域+年份)

### 长期规划

1. **实时监控**
   - WebSocket实时数据更新
   - 新增保单自动刷新统计

2. **预测分析**
   - 基于历史数据的增长预测
   - 风险趋势预警

3. **对比分析**
   - 同比/环比增长率
   - 区域对比排名变化

---

## 📚 相关文档

- [统一架构实现文档](UNIFIED_ARCHITECTURE_IMPLEMENTATION.md)
- [完整架构报告](UNIFIED_ARCHITECTURE_COMPLETION_REPORT.md)
- [Sample模式测试指南](SAMPLE_MODE_TESTING_GUIDE.md)
- [Full模式状态说明](FULL_MODE_STATUS.md)

---

**文档版本**: 1.0
**维护者**: Claude Code Development Team
**最后更新**: 2025年12月15日
