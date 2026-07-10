# Sample (5K) 模式 - 功能测试指南

**测试日期**: 2025年12月15日
**测试环境**: http://localhost:3004/asset
**数据量**: 5,000条保单样本数据
**状态**: ✅ 完全可用

---

## 测试准备

### 1. 访问页面
浏览器打开: **http://localhost:3004/asset**

### 2. 默认状态确认
- ✅ 页面应该默认显示 **Direct Insurance** 模式
- ✅ 默认视图为 **Map**
- ✅ 默认性能模式为 **Sample (5K)**

---

## 核心功能测试清单

### 📊 一、数据源切换测试

#### 测试1.1: Direct Insurance → Reinsurance
**操作步骤**:
1. 当前在Direct Insurance模式
2. 点击左侧边栏 "🔄 Reinsurance" 按钮

**预期结果**:
- ✅ 按钮变为蓝色高亮
- ✅ 地图上显示6个Treaty标记（不同颜色和大小）
- ✅ 左侧统计显示Treaty数据
- ✅ Performance Mode区域消失（因为只对Direct有效）

#### 测试1.2: Reinsurance → Direct Insurance
**操作步骤**:
1. 当前在Reinsurance模式
2. 点击左侧边栏 "🏢 Direct Insurance" 按钮

**预期结果**:
- ✅ 按钮变为绿色高亮
- ✅ 地图上显示蓝色圆点（5,000个保单位置）
- ✅ Performance Mode区域出现
- ✅ 统计数据显示5,000条记录

---

### 🗺️ 二、视图模式测试（Direct Insurance）

#### 测试2.1: Map视图
**操作步骤**:
1. 确保在Direct Insurance模式
2. 点击 "🗺️ Map" 按钮

**预期结果**:
- ✅ 地图显示5,000个蓝色圆点
- ✅ 点击任意圆点显示保单信息弹窗
- ✅ 弹窗包含: ID、地址、保额、用途、建筑等级、建造年份
- ✅ 右下角统计卡显示数据概览

**详细检查**:
- 点击圆点查看弹窗内容是否完整
- 地图缩放和拖动是否流畅
- 坐标显示是否正确（右下角）

#### 测试2.2: Analytics视图
**操作步骤**:
1. 在Direct Insurance模式下
2. 点击 "📈 Analytics" 按钮

**预期结果**:
- ✅ 切换到完整的Dashboard界面
- ✅ 显示5个Tab标签: Overview, Map View, Districts, Analysis, Trends
- ✅ 年份选择器显示: All Years, 2021, 2022, 2023, 2024

**Tab测试**:
- **Overview Tab**:
  - ✅ 显示总保单数、总保额、平均保额
  - ✅ KPI卡片正常显示

- **Map View Tab**:
  - ✅ 热力图正常渲染
  - ✅ 地图交互流畅

- **Districts Tab**:
  - ✅ 18个区域的排名表格
  - ✅ 按保额排序

- **Analysis Tab**:
  - ✅ 多维度筛选器
  - ✅ 图表正常显示

- **Trends Tab**:
  - ✅ 时间序列图表
  - ✅ 年度趋势分析

#### 测试2.3: Regional视图（应该被禁用）
**操作步骤**:
1. 在Direct Insurance模式下
2. 尝试点击 "🌍 Regional" 按钮

**预期结果**:
- ✅ 按钮呈现灰色禁用状态
- ✅ 无法点击
- ✅ 提示文字显示: "Map: Geographic view | Analytics: Dashboard with charts"

---

### 🗺️ 三、视图模式测试（Reinsurance）

#### 测试3.1: Map视图
**操作步骤**:
1. 切换到Reinsurance模式
2. 确保在Map视图

**预期结果**:
- ✅ 地图显示6个Treaty标记
- ✅ 标记大小不同（代表Exposure大小）
- ✅ 标记颜色不同（代表Utilization程度）:
  - 绿色: <70% (Safe)
  - 黄色: 70-79% (Moderate)
  - 橙色: 80-89% (High)
  - 红色: ≥90% (Critical)

**详细检查**:
- 点击任意Treaty标记查看详细信息
- 弹窗应包含: ID, Name, Cedant, Type, Exposure, Utilization, Premium, Loss Ratio
- 高Utilization的Treaty应显示警告标记

#### 测试3.2: Regional视图
**操作步骤**:
1. 在Reinsurance模式下
2. 点击 "🌍 Regional" 按钮

**预期结果**:
- ✅ 界面切换到Regional视图
- ✅ 左侧显示Shapefile上传区域
- ✅ 左侧显示Portfolio CSV上传区域
- ✅ 如果没有上传文件，地图显示空白或默认聚合圆圈

**Shapefile上传测试**（可选）:
1. 准备一个.zip格式的Shapefile
2. 点击"上传"按钮选择文件
3. 等待加载完成
4. 选择显示文件
5. 地图应显示地理边界

**CSV上传测试**（可选）:
1. 准备一个Portfolio CSV文件
2. 上传CSV
3. 选择匹配字段
4. 选择显示数值列
5. 点击"应用匹配"
6. 地图应显示热力图

#### 测试3.3: Analytics视图（应该被禁用）
**操作步骤**:
1. 在Reinsurance模式下
2. 尝试点击 "📈 Analytics" 按钮

**预期结果**:
- ✅ 按钮呈现灰色禁用状态
- ✅ 无法点击

---

### ⚡ 四、性能模式测试（Direct Insurance + Map）

#### 测试4.1: Sample模式（默认）
**操作步骤**:
1. Direct Insurance + Map视图
2. 确保选中 "🚀 Sample (5K)" 按钮

**预期结果**:
- ✅ 按钮为黄色高亮
- ✅ 地图显示5,000个点
- ✅ 底部提示: "✓ Showing 5,000 sample policies for fast rendering"
- ✅ 左侧统计: Total Policies: 5,000
- ✅ 加载速度快（<1秒）

#### 测试4.2: Full模式（临时使用Sample数据）
**操作步骤**:
1. Direct Insurance + Map视图
2. 点击 "📊 Full (68K)" 按钮

**预期结果**:
- ✅ 按钮变为黄色高亮
- ✅ 底部提示: "⚠️ Full mode temporarily uses sample data (Python API pending)"
- ✅ 地图仍然显示5,000个点（因为临时用Sample数据）
- ✅ 开发者控制台显示警告: "⚠️ Full mode: Python analytics script not available, using sample data"
- ✅ 左侧统计: Total Policies: 5,000

**注意**: Full模式目前实际加载的仍是Sample数据，这是预期行为。

---

### 📊 五、统计数据准确性测试

#### 测试5.1: Direct Insurance统计
**操作步骤**:
1. Direct Insurance + Sample模式
2. 查看左侧边栏 "📈 Portfolio Summary" 区域

**预期数据**:
- Total Policies: **5,000**
- Mode: **Sample (5K)**
- Total Exposure: 显示总保额（格式化为$XXM）
- Avg Exposure: 显示平均保额

**验证方法**:
- 数值应该合理（不为0或NaN）
- 格式化正确（使用千位分隔符）

#### 测试5.2: Reinsurance统计
**操作步骤**:
1. 切换到Reinsurance模式
2. 查看左侧边栏统计区域

**预期数据**:
- Total: **6**
- Active: **4-5** (取决于mock数据)
- Expiring: **1-2**
- Exposure: 显示总暴露（$XXM）
- Avg Util: 显示平均利用率（XX%）

---

### 🔍 六、筛选功能测试（Reinsurance模式）

#### 测试6.1: Treaty Type筛选
**操作步骤**:
1. Reinsurance + Map模式
2. 左侧 "📋 Treaty Type" 下拉框
3. 选择 "Cat XL"

**预期结果**:
- ✅ 地图只显示Cat XL类型的Treaty
- ✅ 统计数据更新
- ✅ 其他类型的Treaty消失

#### 测试6.2: Status筛选
**操作步骤**:
1. "📊 Status" 下拉框
2. 选择 "Active"

**预期结果**:
- ✅ 只显示Active状态的Treaty
- ✅ Expired和Expiring的Treaty消失

#### 测试6.3: 搜索功能
**操作步骤**:
1. 顶部搜索框输入 "HK"

**预期结果**:
- ✅ 只显示包含"HK"的Treaty（ID或Name）
- ✅ 实时搜索（输入时立即过滤）

#### 测试6.4: 重置筛选
**操作步骤**:
1. 应用若干筛选条件
2. 点击 "Reset Filters" 按钮

**预期结果**:
- ✅ 所有筛选条件清空
- ✅ 显示全部6个Treaty
- ✅ 统计数据恢复

---

### 🎯 七、交互功能测试

#### 测试7.1: 地图缩放和平移
**操作步骤**:
1. 使用鼠标滚轮放大/缩小地图
2. 拖动地图平移

**预期结果**:
- ✅ 缩放流畅无卡顿
- ✅ 标记点随地图缩放调整
- ✅ 右下角坐标实时更新

#### 测试7.2: 弹窗交互
**操作步骤**:
1. 点击地图上的标记点
2. 查看弹窗内容
3. 点击弹窗中的"View Details"按钮（如果有）

**预期结果**:
- ✅ 弹窗正确显示数据
- ✅ 关闭弹窗后可再次打开
- ✅ 数据格式正确（日期、金额等）

#### 测试7.3: 年份切换（Analytics模式）
**操作步骤**:
1. Direct Insurance + Analytics视图
2. 点击年份按钮: 2024, 2023, 2022, 2021, All Years

**预期结果**:
- ✅ 按钮高亮切换
- ✅ Dashboard数据更新（如果API支持）
- ✅ 切换流畅无延迟

---

### 🐛 八、错误处理测试

#### 测试8.1: 数据加载失败
**操作步骤**:
1. 打开浏览器开发者工具（F12）
2. Network标签中阻止 `/data/tphk_portfolio_subset_5000.json` 请求
3. 刷新页面

**预期结果**:
- ✅ 不应该崩溃
- ✅ 控制台显示错误日志
- ✅ 界面显示空状态或错误提示

#### 测试8.2: NaN值处理
**操作步骤**:
1. Direct Insurance + Map模式
2. 点击若干保单标记查看 `year_built` 字段

**预期结果**:
- ✅ `year_built` 为 null 或 "N/A"，而不是显示 "NaN"
- ✅ 不会导致页面崩溃
- ✅ 其他数据正常显示

---

### 📈 九、性能测试

#### 测试9.1: 初始加载时间
**操作步骤**:
1. 清除浏览器缓存
2. 刷新页面
3. 记录加载时间

**预期指标**:
- ✅ 页面首次渲染: <2秒
- ✅ 5K数据加载: <1秒
- ✅ 地图完全渲染: <3秒

#### 测试9.2: 视图切换响应
**操作步骤**:
1. 快速切换不同视图模式
2. Map ↔ Analytics ↔ Regional

**预期结果**:
- ✅ 切换延迟 <500ms
- ✅ 无明显卡顿
- ✅ 数据正确更新

#### 测试9.3: 内存占用
**操作步骤**:
1. 打开开发者工具 → Performance/Memory
2. 使用各种功能
3. 观察内存占用

**预期指标**:
- ✅ Sample模式内存: <200 MB
- ✅ 无明显内存泄漏
- ✅ 长时间使用稳定

---

### 🎨 十、UI/UX测试

#### 测试10.1: 响应式布局
**操作步骤**:
1. 调整浏览器窗口大小
2. 测试不同分辨率

**预期结果**:
- ✅ 布局自适应调整
- ✅ 侧边栏正常显示
- ✅ 按钮和文字不重叠

#### 测试10.2: 视觉反馈
**操作步骤**:
1. 悬停在按钮上
2. 点击按钮
3. 切换状态

**预期结果**:
- ✅ 悬停时显示高亮效果
- ✅ 选中状态明显（颜色、阴影）
- ✅ 禁用按钮呈现灰色
- ✅ 过渡动画流畅

---

## 已知问题和限制

### ⚠️ 当前限制

1. **Full (68K) 模式**
   - 状态: 临时使用Sample数据
   - 原因: Python API脚本尚未创建
   - 影响: Full模式实际只加载5K数据

2. **Analytics Dashboard**
   - 部分Tab可能使用样本数据
   - 年份筛选功能取决于后端API

3. **TypeScript警告**
   - ~30个关于 `selectedTreaty` 可能为null的警告
   - 不影响功能，仅编译警告

### ✅ 已修复问题

1. **JSON NaN错误** - ✅ 已修复
   - 问题: `year_built: NaN` 导致解析失败
   - 解决: 自动替换为 `null`

2. **架构混乱** - ✅ 已优化
   - 问题: 4个独立模式关系不清
   - 解决: 统一为2-tier架构

---

## 测试结论模板

### 测试通过标准

- [ ] 所有数据源切换正常
- [ ] 所有视图模式正确显示
- [ ] 性能模式按预期工作
- [ ] 统计数据准确
- [ ] 筛选功能正常
- [ ] 地图交互流畅
- [ ] 无JavaScript错误
- [ ] 无明显性能问题

### 测试报告

**测试人**: _________
**测试日期**: _________
**测试结果**: ☐ 通过 ☐ 部分通过 ☐ 未通过

**发现的问题**:
1. _________________________________________
2. _________________________________________
3. _________________________________________

**建议改进**:
1. _________________________________________
2. _________________________________________
3. _________________________________________

---

**文档版本**: 1.0
**创建日期**: 2025年12月15日
**维护者**: Claude Code Development Team
