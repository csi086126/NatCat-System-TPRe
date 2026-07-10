# Map Controls Layout Update

## 调整说明

已将地图左上角的控制工具进行了垂直堆叠优化，使图层控制（Overlays）位于绘图工具的上方，并统一了图标大小。

## 新的左上角布局（从上到下）

```
┌─────────────────────────────────┐
│ 📊 Layers Control               │
│ ┌─────────────────────────────┐ │
│ │ Base Layers:                │ │
│ │ ○ OpenStreetMap             │ │
│ │ ● Carto Light (Asset Map)   │ │
│ │                             │ │
│ │ Overlays:                   │ │
│ │ ☐ 18 Districts              │ │
│ │ ☑ 18 Districts Boundaries   │ │
│ │ ☐ PPU (9) - Polygons        │ │
│ │ ☐ PPU (9) - Boundaries      │ │
│ │ ☐ SPU (52) - Polygons       │ │
│ │ ☐ SPU (52) - Boundaries     │ │
│ │ ☐ TPU (292) - Polygons      │ │
│ │ ☐ TPU (292) - Boundaries    │ │
│ │ ☐ Subunit (4,916) - Polygons│ │
│ │ ☐ Subunit (4,916) - Bounds  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
              ↓ (10px gap)
┌─────────────────────────────────┐
│ 🎨 Draw Toolbar                 │
│ ┌───┬───┬───┬───┬───┐          │
│ │ ⭕ │ ▭ │ ▱ │ ✏️ │🗑️│          │
│ └───┴───┴───┴───┴───┘          │
│ Circle Rectangle Polygon Edit  │
└─────────────────────────────────┘
```

## CSS 样式调整

创建了 `src/styles/map-controls.css` 文件，包含以下关键样式：

### 1. 垂直堆叠布局
```css
.leaflet-top.leaflet-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

### 2. 控制顺序
```css
.leaflet-control-layers {
  order: 1;  /* 图层控制在上 */
}

.leaflet-draw {
  order: 2;  /* 绘图工具在下 */
}
```

### 3. 统一图标大小
```css
/* 图层控制图标 */
.leaflet-control-layers-toggle {
  width: 30px !important;
  height: 30px !important;
}

/* 绘图工具按钮 */
.leaflet-draw-toolbar a {
  width: 30px !important;
  height: 30px !important;
}
```

### 4. 视觉一致性
- 统一的边框样式和阴影效果
- 一致的悬停状态 (hover effects)
- 相同的边距和间距
- 统一的圆角设计

## 功能优势

### 1. 逻辑分组
- **图层控制**：选择要显示的底图和边界图层
- **绘图工具**：在地图上绘制分析区域

### 2. 操作流程
1. 首先选择需要显示的行政区划边界（18 Districts、PPU、SPU、TPU、Subunit）
2. 然后使用绘图工具绘制自定义分析区域
3. 自动生成区域统计数据

### 3. 视觉清晰
- 所有工具在左侧垂直排列，一目了然
- 图标大小统一，视觉协调
- 间距合理，不会拥挤

## 技术实现

### 文件修改
1. **PortfolioMap.tsx**
   - 添加 `import '@/styles/map-controls.css'`
   - LayersControl position: `topleft`
   - Draw control position: `topleft` (已在 AreaSelectionTools 中设置)

2. **map-controls.css**
   - Flexbox 垂直布局
   - 图标尺寸统一
   - Z-index 层级管理
   - 视觉样式统一

### 响应式设计
- 控制面板最大宽度限制为 280px
- 在小屏幕上仍然保持可用性
- 滚动条自动出现（如果内容过多）

## 用户体验提升

### Before (之前)
- 图层控制在右上角
- 绘图工具在左上角
- 功能分散，需要跨屏操作

### After (现在)
- 所有地图控制工具集中在左上角
- 图层选择 → 绘图工具，操作流程自然
- 图标大小一致，视觉统一
- 右侧空间留给数据展示

## 兼容性说明

- 使用标准 Leaflet CSS 类名
- 不影响其他地图功能
- 向下兼容现有代码
- 可以通过修改 CSS 轻松调整样式

## 未来扩展

可能的增强方向：
- [ ] 添加快捷键支持（如 Ctrl+L 切换图层面板）
- [ ] 图层分组折叠功能
- [ ] 自定义工具栏主题颜色
- [ ] 工具提示 (tooltips) 显示详细说明
