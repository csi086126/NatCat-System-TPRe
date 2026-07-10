# 统计分析功能集成设计说明

## 设计理念

将统计分析功能从独立的Analytics标签页迁移到主地图视图，采用**悬浮面板叠加**的方式，实现更流畅的数据分析体验。

## 新的交互流程

```
用户操作流程：
1. 选择 "🏢 Direct Insurance" 数据源
2. 选择 "🗺️ Map" 可视化模式
3. 在左侧栏中选择统计维度（District/Year/Occupancy/Construction）
4. 地图右下角自动显示统计结果悬浮面板
5. 可最小化或关闭统计面板，继续查看地图
```

## 界面布局

### 左侧查询栏（新增内容）

位置：在 "🗺️ Visualization" 选择器下方

**新增："📊 Statistics Analysis" 选择器**

```
┌─────────────────────────────────────┐
│  📊 Statistics Analysis              │
├─────────────────┬───────────────────┤
│  📍 District    │  📅 Year          │
├─────────────────┼───────────────────┤
│  🏢 Occupancy   │  🏗️ Construction  │
└─────────────────┴───────────────────┘
  提示：点击维度即可在地图上显示统计面板
```

特性：
- 4个维度按钮（2x2网格布局）
- 点击激活（蓝色高亮），再次点击取消
- 实时提示：已选择时显示 "✓ Statistics panel shown on map (bottom-right)"
- 仅在 Direct Insurance + Map 模式下显示

### 右下角统计面板

**新组件**: `StatisticsFloatingPanel.tsx`

位置：地图右下角，悬浮在地图层之上

```
┌─ Map View ────────────────────────────────┐
│                                           │
│                                           │
│                                           │
│                          ┌────────────────┤
│                          │ 📊 By District │
│                          ├────────────────┤
│                          │ 📊 Summary     │
│                          │ • 68,762 polic │
│                          │ • HKD 127.75B  │
│                          ├────────────────┤
│                          │ 📊 Chart       │
│                          │   [Bar Chart]  │
│                          └────────────────┘
└───────────────────────────────────────────┘
```

面板特性：
- **半透明背景**：`bg-white/95 backdrop-blur-sm`
- **可最小化**：点击 ▼ 图标最小化面板，显示标题栏
- **可关闭**：点击 ✕ 图标完全关闭面板
- **固定定位**：`absolute bottom-6 right-6`
- **高层级**：`z-[1000]` 确保显示在地图上方
- **最大高度**：`max-h-[calc(100vh-200px)]` 自适应屏幕高度
- **滚动支持**：内容区域可滚动

## 实现细节

### 1. 状态管理

**新增状态变量**：
```typescript
const [statisticsDimension, setStatisticsDimension] = useState<'district' | 'year' | 'occupancy' | 'construction' | null>(null);
```

**触发逻辑**：
- 用户点击左侧维度按钮 → `setStatisticsDimension('district')`
- 再次点击相同按钮 → `setStatisticsDimension(null)` （取消选择）
- 点击关闭按钮 → `setStatisticsDimension(null)`

### 2. 条件渲染

**统计面板显示条件**：
```typescript
{dataSource === 'direct' && viewMode === 'map' && statisticsDimension && (
  <StatisticsFloatingPanel
    dimension={statisticsDimension}
    year={selectedYear}
    onClose={() => setStatisticsDimension(null)}
  />
)}
```

必须同时满足：
1. 数据源 = Direct Insurance
2. 视图模式 = Map
3. 已选择统计维度（不为 null）

### 3. 组件通信

**Props传递**：
- `dimension`: 当前选中的统计维度
- `year`: 年份筛选器（来自现有的selectedYear状态）
- `onClose`: 关闭回调函数

### 4. 数据获取

统计面板使用相同的API端点：
```
GET /api/portfolio/statistics?dimension={dimension}&year={year}
```

- 自动调用Python后端或使用mock数据（带降级）
- 支持实时更新：维度或年份变化时自动刷新
- 加载状态和错误处理内置

## 组件功能

### StatisticsFloatingPanel 组件

**核心功能**：
1. ✅ 多维度统计数据展示（District/Year/Occupancy/Construction）
2. ✅ 交互式图表可视化（Bar/Line/Pie Charts）
3. ✅ 汇总统计卡片（Total Policies/Exposure/Avg）
4. ✅ 最小化/展开控制
5. ✅ 关闭按钮
6. ✅ 加载状态和错误处理
7. ✅ 数据源标识（PostgreSQL/Mock）

**图表类型映射**：
| 维度 | 图表类型 | 说明 |
|------|---------|------|
| District | Bar Chart | 按地区显示总保额分布 |
| Year | Line Chart | 年度趋势（双Y轴：保额+保单数） |
| Occupancy | Pie Chart | 经营性质占比 |
| Construction | Pie Chart | 建筑等级占比 |

**响应式尺寸**：
- 面板宽度：450px
- 图表高度：250px
- 最大高度：视口高度 - 200px

## 用户体验优势

### 相比独立Analytics页面

**之前的问题**：
- ❌ 需要切换到独立标签页，离开地图视图
- ❌ 无法同时查看地图和统计数据
- ❌ 上下文切换造成认知负担
- ❌ 需要6个标签页导航（Overview/Map/Districts/Analysis/Trends/Statistics）

**新设计的优势**：
- ✅ 统计数据叠加在地图上，无需切换页面
- ✅ 地图和统计数据可同时查看
- ✅ 左侧控制栏集中所有查询条件
- ✅ 右下角结果展示，符合F型视觉路径
- ✅ 可随时最小化或关闭，灵活控制
- ✅ 简化为2个可视化模式（Map/Analytics）

### 符合数据分析平台标准

典型的GIS分析平台布局：
```
┌─ 控制栏 ─┬─ 主视图（地图/图表） ─────┐
│ • 筛选   │                           │
│ • 查询   │     [主内容区域]          │
│ • 设置   │                           │
│          │  ┌───── 统计结果 ─────┐  │
│          │  │ • 图表             │  │
│          │  │ • 指标             │  │
│          │  └────────────────────┘  │
└──────────┴──────────────────────────┘
```

典型案例：
- **ArcGIS Online**: 左侧图层控制 + 右下角统计面板
- **QGIS**: 左侧浏览器 + 右下角属性表/统计信息
- **Tableau**: 左侧数据窗格 + 主工作区 + 右侧分析面板
- **Power BI**: 左侧字段 + 中央画布 + 右侧格式/可视化面板

## 技术实现要点

### 1. Z-Index层级管理

```css
Map Container:         z-index: 0 (默认)
Map Controls:          z-index: 400 (Leaflet默认)
Map Popups:           z-index: 600 (Leaflet默认)
Portfolio Overview:    z-index: 1000
Statistics Panel:      z-index: 1000 (悬浮统计面板)
```

确保统计面板显示在地图上方，但不遮挡弹出窗口。

### 2. 绝对定位

```typescript
className="absolute bottom-6 right-6 z-[1000] w-[450px]"
```

- `absolute`: 相对于最近的positioned父元素（main标签）
- `bottom-6 right-6`: 距离右下角24px
- 不占据正常文档流空间

### 3. Pointer Events

```typescript
style={{ pointerEvents: 'auto' }}
```

确保面板可以接收鼠标事件（点击、滚动等），而不会穿透到下方的地图。

### 4. 响应式高度

```typescript
max-h-[calc(100vh-200px)]
```

动态计算最大高度，确保在任何屏幕尺寸下都不会溢出视口。

## 数据流

```
用户点击 District 按钮
    ↓
setStatisticsDimension('district')
    ↓
触发 StatisticsFloatingPanel 渲染
    ↓
useEffect 监听 dimension/year 变化
    ↓
fetch('/api/portfolio/statistics?dimension=district&year=2024')
    ↓
Python Backend / Mock Data
    ↓
返回 JSON 数据
    ↓
更新 useState(data)
    ↓
重新渲染图表和汇总卡片
    ↓
用户查看统计结果（地图仍然可见）
```

## 文件清单

### 新增文件
1. `src/components/portfolio/StatisticsFloatingPanel.tsx` - 悬浮统计面板组件

### 修改文件
1. `src/app/asset/page.tsx`
   - 新增状态变量：`statisticsDimension`
   - 新增导入：`StatisticsFloatingPanel`
   - 新增左侧栏：Statistics Analysis 选择器（lines 966-1020）
   - 新增地图叠加：浮动统计面板（lines 1839-1846）

## 测试场景

### 场景 1: 基本功能
1. 访问 http://10.253.22.15:3004
2. 确保已选择 "🏢 Direct Insurance"
3. 确保已选择 "🗺️ Map"
4. 点击 "📍 District" 按钮
5. **预期**：右下角出现统计面板，显示按地区的统计数据和柱状图

### 场景 2: 维度切换
1. 在District统计面板显示时
2. 点击 "📅 Year" 按钮
3. **预期**：面板切换为年度趋势统计，显示折线图

### 场景 3: 最小化/展开
1. 统计面板显示时
2. 点击标题栏的 ▼ 图标
3. **预期**：面板最小化，只显示标题栏
4. 再次点击 ▲ 图标
5. **预期**：面板展开，显示完整内容

### 场景 4: 关闭面板
1. 统计面板显示时
2. 点击标题栏的 ✕ 图标
3. **预期**：面板完全关闭，左侧维度按钮取消高亮

### 场景 5: 年份筛选
1. 显示District统计面板
2. 在左侧年份选择器中选择 "2023"
3. **预期**：统计面板自动刷新，显示2023年的数据

### 场景 6: 数据源切换
1. 统计面板显示时
2. 切换到 "🔄 Reinsurance" 数据源
3. **预期**：统计面板自动隐藏（因为只支持Direct Insurance）

### 场景 7: 视图模式切换
1. 统计面板显示时
2. 切换到 "📈 Analytics" 视图
3. **预期**：统计面板隐藏，显示完整Analytics仪表板

## 数据库状态

**当前状态**：
- ✅ API完全实现（支持Python后端 + Mock降级）
- ⚠️ 数据库连接待配置（密码未设置）
- ✅ Mock数据完全可用

**行为**：
- 当前会使用 Mock 数据
- 配置数据库后自动切换到实时数据
- 无需修改前端代码

## 性能考虑

1. **按需加载**：只在选择维度时才发起API请求
2. **缓存机制**：相同维度+年份的数据会被React缓存
3. **降级策略**：数据库失败时自动使用Mock数据
4. **轻量图表**：使用recharts库，性能优异
5. **虚拟滚动**：未来可在数据表格中实现

## 未来扩展

### 短期（下一迭代）
1. 添加"固定/取消固定"按钮（pin panel）
2. 支持拖拽调整面板位置
3. 记住用户的维度选择偏好（localStorage）
4. 添加导出功能（CSV/Excel）

### 中期
1. 支持多个统计面板同时显示（比较分析）
2. 添加时间轴动画（年度数据回放）
3. 与地图交互联动（点击地区高亮对应统计条）
4. 添加自定义图表配置

### 长期
1. AI驱动的智能分析建议
2. 实时数据流更新（WebSocket）
3. 协作功能（多用户共享视图）
4. 高级统计模型（回归分析、预测等）

## 总结

这次重构将统计分析功能从独立页面迁移到地图视图的叠加层，实现了：

1. ✅ **更流畅的用户体验**：无需页面切换
2. ✅ **更符合行业标准**：左控制+主视图+右结果的经典布局
3. ✅ **更灵活的交互**：可最小化、关闭、随时调用
4. ✅ **保持功能完整**：所有统计功能保持不变
5. ✅ **代码结构清晰**：组件独立、职责分明

用户现在可以在查看地图的同时，通过左侧快速选择统计维度，在右下角查看分析结果，实现真正的"所见即所得"数据分析体验。

---

**实施日期**: 2025-12-15
**实施状态**: ✅ 完成
**兼容性**: 完全向后兼容，Analytics页面保留但不再是主要入口
