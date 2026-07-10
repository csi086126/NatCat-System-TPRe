# Layers Control - Horizontal Expansion Update

## 问题
1. 之前的图层控制面板向下展开，会遮挡下方的绘图工具栏，影响用户体验。
2. 悬停时面板自动展开导致闪烁，鼠标定位不准确。

## 解决方案
1. 修改CSS使图层面板**向右展开**而不是向下展开，这样就不会遮挡绘图工具了。
2. **禁用悬停展开**，改为只有点击图标才展开面板，避免闪烁和误触发。

## 视觉效果对比

### Before (向下展开) ❌
```
┌─────────┐
│  图层   │ ← 折叠状态
└─────────┘
     │
     ↓ 点击后向下展开
┌─────────────────┐
│ Base Layers:    │
│ ● Carto Light   │
│                 │
│ Overlays:       │
│ ☑ 18 Districts  │
│ ☐ PPU (9)       │
│ ☐ SPU (52)      │
│ ☐ TPU (292)     │  ← 遮挡了下方内容！
└─────────────────┘
     ↓
┌───┬───┬───┐
│ ⭕ │ ▭ │ ▱ │  ← 绘图工具被遮挡
└───┴───┴───┘
```

### After (向右展开) ✅
```
┌─────────┐     ┌──────────────────────┐
│  图层   │ ──→ │ Base Layers:         │
└─────────┘     │ ● Carto Light        │
                │                      │
                │ Overlays:            │
┌───┬───┬───┐   │ ☑ 18 Districts       │
│ ⭕ │ ▭ │ ▱ │   │ ☐ PPU (9) - Polygons │
└───┴───┴───┘   │ ☐ SPU (52) - Polygons│
                │ ☐ TPU (292) - Polygons│
绘图工具        │ ☐ Subunit (4,916)    │
保持可见        └──────────────────────┘
```

## CSS 关键修改

### 1. 核心样式 - 向右展开
```css
/* 使面板向右展开 */
.leaflet-control-layers-expanded {
  position: absolute !important;
  left: 100% !important;    /* 紧贴在切换按钮右侧 */
  top: 0 !important;
  margin-left: 5px !important;
  min-width: 250px;
  max-width: 320px;
}
```

### 2. 禁用悬停展开 - 只响应点击
```css
/* 禁用悬停时自动展开 */
.leaflet-control-layers:hover {
  width: 30px !important;
  height: 30px !important;
}
```
**重要**: 这个CSS规则会覆盖Leaflet默认的悬停展开行为，防止鼠标悬停时面板闪烁。

**React组件配置**:
```tsx
<LayersControl position="topleft" collapsed={true}>
```
`collapsed={true}` 确保面板初始状态是折叠的，只有点击才会展开。

### 3. 附加优化

1. **滚动条优化**
   ```css
   .leaflet-control-layers-overlays {
     max-height: 400px;
     overflow-y: auto;
   }
   ```
   - 如果图层太多，会出现滚动条
   - 自定义滚动条样式（仅6px宽）

2. **宽度控制**
   ```css
   .leaflet-control-layers-expanded {
     width: auto !important;
     height: auto !important;
   }
   ```
   - 覆盖Leaflet默认的向下展开行为
   - 自动适应内容大小

## 用户体验改进

### 优势
1. ✅ **不遮挡工具** - 绘图工具始终可见可点击
2. ✅ **空间利用** - 横向空间通常比纵向更充裕
3. ✅ **操作流畅** - 选择图层后可立即使用绘图工具
4. ✅ **视觉清晰** - 所有控制元素保持在左侧区域
5. ✅ **点击展开** - 禁用悬停展开，避免闪烁和误触发
6. ✅ **精确控制** - 鼠标定位准确，不会意外触发面板

### 使用场景
- 用户想选择显示"TPU (292) - Boundaries"
- **点击**图层控制图标 → 面板向右展开（不再是悬停展开）
- 选择需要的图层
- 点击空白处或图标关闭面板
- 下方的绘图工具（圆形/矩形/多边形）保持可见和可用

## 技术细节

### 定位逻辑
```
图层按钮宽度: 30px + 边框/边距 = ~34px
面板左偏移: left: 100% (紧贴按钮右侧)
面板与按钮间距: margin-left: 5px
面板宽度: 250-320px (自适应内容)
```

### 交互行为
```
默认状态: collapsed={true} (折叠)
触发方式: 只响应点击，不响应悬停
展开方向: 向右 (left: 100%)
闪烁问题: 已通过禁用悬停展开解决
```

### Z-index 层级
```
图层控制面板: z-index: 800
绘图工具栏: z-index: 799
```
确保图层面板在打开时显示在绘图工具之上。

### 响应式考虑
- 面板最大宽度: 280px
- 图层列表最大高度: 400px
- 超出时自动滚动
- 小屏幕上仍然可用

## 浏览器兼容性

### 自定义滚动条
```css
::-webkit-scrollbar { ... }
```
- ✅ Chrome/Edge/Safari
- ⚠️ Firefox (使用默认滚动条)
- ⚠️ 需要时可添加 `scrollbar-width: thin;` (Firefox)

### CSS Important 声明
使用 `!important` 覆盖 Leaflet 内置样式，确保横向展开生效。

## 未来优化建议

1. **触摸设备优化**
   - 增大点击区域
   - 添加触摸反馈

2. **键盘导航**
   - Tab 键切换图层
   - Enter/Space 切换选中状态

3. **图层分组**
   - 可折叠的子分组
   - 例如：行政区划 / 风险图层 / 底图

4. **搜索功能**
   - 当图层很多时添加搜索框
   - 快速定位需要的图层

## 文件清单

修改的文件：
- `src/styles/map-controls.css` - CSS样式调整
- `src/components/portfolio/PortfolioMap.tsx` - 导入CSS文件

无需修改的文件：
- Leaflet 核心代码
- LayersControl 组件逻辑
- 其他地图功能
