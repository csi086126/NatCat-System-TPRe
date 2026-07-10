# 📊 Portfolio Statistics - 独立页面使用指南

## ✅ 新页面已创建

我创建了一个全新的独立统计分析页面，避免修改复杂的 `page.tsx` 文件。

## 🔗 访问地址

```
http://10.253.22.15:3004/portfolio-statistics
```

或

```
http://localhost:3004/portfolio-statistics
```

## 🎯 功能特性

### 1. 页面布局
- **顶部导航栏**：AppHeader（与其他页面一致）
- **返回按钮**：快速返回上一页
- **页面标题**：Portfolio Statistics with icon
- **数据源提示**：当前使用Mock数据的提示卡片
- **年份筛选器**：快速筛选 All Years / 2021 / 2022 / 2023 / 2024
- **地图显示开关**：Show/Hide Map 按钮 ✨ **NEW**
- **交互式地图**：显示geocoded保单位置（500px高度，CARTO Light底图）✨ **NEW**
- **统计分析主体**：完整的4维度统计面板
- **快速链接**：跳转到Portfolio Management、Risk Map、API文档
- **页脚信息**：平台名称和技术支持链接

### 2. 地图功能 ✨ **NEW**
- **底图类型**：CARTO Light（与/asset页面一致）
- **中心点**：香港 (22.3193°N, 114.1694°E)
- **缩放级别**：11（最适合香港区域）
- **保单标记**：显示所有带有有效坐标的保单
- **标记详情**：点击标记查看保单ID、地址、保额、占用性质、建筑等级
- **年份过滤**：地图自动随年份筛选器更新
- **统计信息卡**：右上角显示地图上的保单数量统计
- **坐标显示**：右下角显示鼠标位置的经纬度

### 3. 统计维度（4个标签）
- **📍 By District**：18个香港地区的保额分布（柱状图）
- **📅 By Year**：2021-2024年度趋势（折线图）
- **🏢 By Occupancy**：6种经营性质占比（饼图）
- **🏗️ By Construction**：4种建筑等级分布（饼图）

### 4. 每个维度显示
- **汇总卡片**：Total Policies、Total Exposure、Avg Exposure
- **可视化图表**：自动选择最合适的图表类型
- **详细数据表格**：可排序、可搜索的数据列表
- **数据源标识**：显示当前使用的数据源（PostgreSQL或Mock）

## 📋 使用步骤

### 步骤 1: 访问页面
打开浏览器访问：`http://10.253.22.15:3004/portfolio-statistics`

### 步骤 2: 查看地图 ✨ **NEW**
- 页面加载时，地图默认显示
- 地图显示所有geocoded保单位置
- 右上角统计卡显示保单数量
- 点击任意标记查看保单详情

### 步骤 3: 选择年份（可选）
- 点击顶部的年份按钮筛选特定年份的数据
- 或保持 "All Years" 查看所有数据
- 地图和统计图表会同时更新

### 步骤 4: 切换地图显示 ✨ **NEW**
- 点击 "Hide Map" 按钮隐藏地图
- 点击 "Show Map" 按钮重新显示地图
- 适合在需要更多空间查看统计图表时使用

### 步骤 5: 切换统计维度
- 点击 4 个标签页之一查看不同维度的分析
- 每个标签都会自动加载对应的数据和图表

### 步骤 6: 查看详细数据
- 向下滚动查看详细的数据表格
- 使用搜索框查找特定地区/年份/类型
- 点击列标题进行排序

### 步骤 7: 导航到其他页面
- 使用 "Back" 按钮返回
- 或使用 "Quick Links" 跳转到其他模块

## 🎨 界面特点

### 清晰的视觉层次
```
┌─ AppHeader ────────────────────────────────────────┐
│ Natural Catastrophe Risk Platform                  │
└────────────────────────────────────────────────────┘
┌─ Main Content (max-w-7xl centered) ───────────────┐
│                                                    │
│  [← Back]  📊 Portfolio Statistics                │
│            TPHK Insurance - 68,762 Policies       │
│                                                    │
│  ┌─ Info Card (Blue) ─────────────────────────┐  │
│  │ 🗄️ Data Source: Mock Sample Data          │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Filter by Year: [All][2021][2022][2023][2024]   │
│                                                    │
│  ┌─ Statistics Panel ──────────────────────────┐  │
│  │ [📍District][📅Year][🏢Occupancy][🏗️Const] │  │
│  ├──────────────────────────────────────────────│  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐                │  │
│  │ │68,762│ │127.75│ │1.86M │  Summary Cards │  │
│  │ └──────┘ └──────┘ └──────┘                │  │
│  ├──────────────────────────────────────────────│  │
│  │ [Bar Chart / Line / Pie Chart]             │  │
│  ├──────────────────────────────────────────────│  │
│  │ [Data Table with Search & Sort]            │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌─ Quick Links ───────────────────────────────┐  │
│  │ [📊 Portfolio] [🗺️ Risk Map] [🔧 API Docs] │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Platform Info • Documentation Links               │
└────────────────────────────────────────────────────┘
```

### 响应式设计
- 自动适应不同屏幕尺寸
- 图表自动调整大小
- 表格支持横向滚动

### 友好的用户体验
- 加载状态指示器
- 错误信息提示
- 空数据状态处理
- 流畅的动画过渡

## 🔌 API 端点

页面使用以下API获取数据：

```
GET /api/portfolio/statistics?dimension={dimension}&year={year}
```

**参数**：
- `dimension`: district | year | occupancy | construction
- `year`: 2021 | 2022 | 2023 | 2024（可选）

**示例**：
```
/api/portfolio/statistics?dimension=district&year=2024
/api/portfolio/statistics?dimension=year
/api/portfolio/statistics?dimension=occupancy&mock=true
```

## 📊 数据源

### 当前状态：Mock Data
- 使用示例数据进行演示
- 数据结构与真实数据一致
- 适合功能测试和UI验证

### 切换到数据库：
1. 配置数据库密码（见 `DATABASE_CONFIGURATION_GUIDE.md`）
2. 测试Python脚本连接
3. 页面会自动切换到实时数据
4. 无需修改任何前端代码

## 🚀 优势

### 相比集成到 page.tsx 的方案

✅ **更安全**：独立页面，不会影响现有功能
✅ **更简单**：无需修改复杂的2000行代码
✅ **更灵活**：可以独立开发和测试
✅ **更快速**：页面加载更快，路由更清晰
✅ **更易维护**：代码结构清晰，易于扩展

### 与Analytics标签页的区别

| 特性 | 独立页面 | Analytics标签页 |
|------|----------|-----------------|
| URL | `/portfolio-statistics` | `/asset?view=analytics` |
| 布局 | 全屏独立页面 | 嵌入在Asset页面中 |
| 导航 | 直接访问 | 需要切换标签 |
| 开发 | 独立开发 | 依赖Asset页面 |
| 加载 | 按需加载 | 随Asset页面加载 |
| 推荐 | ✅ **推荐使用** | 保留为备选方案 |

## 🔧 技术实现

### 文件结构
```
src/app/portfolio-statistics/
└── page.tsx  (新创建的独立页面)

src/components/portfolio/
├── PortfolioStatistics.tsx  (统计主组件)
└── StatisticsFloatingPanel.tsx  (浮动面板，备用)

src/app/api/portfolio/statistics/
└── route.ts  (API端点)

scripts/portfolio_management/analytics/
└── portfolio_analytics.py  (Python后端)
```

### 组件复用
- 使用现有的 `PortfolioStatistics` 组件
- 使用统一的 `AppHeader`
- 使用shadcn/ui组件库
- 保持一致的设计语言

## 📚 相关文档

1. [DATABASE_STATISTICS_IMPLEMENTATION.md](DATABASE_STATISTICS_IMPLEMENTATION.md) - 数据库实现详解
2. [DATABASE_CONFIGURATION_GUIDE.md](DATABASE_CONFIGURATION_GUIDE.md) - 数据库配置步骤
3. [STATISTICS_QUICK_GUIDE.md](STATISTICS_QUICK_GUIDE.md) - 快速使用指南
4. [STATISTICS_INTEGRATION_DESIGN.md](STATISTICS_INTEGRATION_DESIGN.md) - 集成设计文档

## 🎯 下一步

### 立即体验
访问：**http://10.253.22.15:3004/portfolio-statistics**

### 配置数据库（可选）
按照 `DATABASE_CONFIGURATION_GUIDE.md` 配置PostgreSQL连接

### 添加快捷入口（可选）
在其他页面添加跳转链接：
```tsx
<Button onClick={() => router.push('/portfolio-statistics')}>
  📊 View Statistics
</Button>
```

## ❓ 常见问题

### Q: 页面打不开？
A: 确保开发服务器正在运行：`npm run dev`

### Q: 显示404错误？
A: 检查URL是否正确：`/portfolio-statistics`（注意是复数）

### Q: 数据不更新？
A: 刷新浏览器或清除缓存（Ctrl+F5）

### Q: 如何返回主页？
A: 点击左上角的 "Back" 按钮或访问 `/asset`

### Q: 可以自定义吗？
A: 可以！编辑 `src/app/portfolio-statistics/page.tsx`

---

**创建日期**: 2025-12-15
**状态**: ✅ 已上线，可立即使用
**推荐度**: ⭐⭐⭐⭐⭐
