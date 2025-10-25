# Risk Map 模块排版优化说明

## ✅ 完成的优化

### 1. 侧边栏宽度调整
**调整前**：`w-80` (320px)
**调整后**：`w-96` (384px)

**原因**：
- 原来的宽度导致长文本换行太多，拥挤
- 增加宽度后，选项文字更易读
- 地图区域仍有足够空间显示

---

### 2. 面板间距优化

**左侧面板**：
- 调整前：`py-4 space-y-1`
- 调整后：`py-6 space-y-6`
- 效果：卡片之间间距从 4px 增加到 24px，视觉更清晰

**右侧面板**：
- 调整前：`p-4 space-y-1`
- 调整后：`p-6 space-y-4`
- 效果：整体更宽敞，内容不拥挤

---

### 3. 卡片内部间距

**调整前**：`space-y-3` (12px)
**调整后**：`space-y-4` (16px)

**应用于**：
- Multi-hazard Selection 卡片
- Exposure 卡片

**效果**：选项之间更易区分，不会挤在一起

---

### 4. 标签样式优化

**添加的样式**：
```tsx
className="font-normal text-sm leading-relaxed cursor-pointer"
```

**改进**：
- `leading-relaxed`：行高更舒适，多行文字不拥挤
- `cursor-pointer`：鼠标悬停显示手型，提示可点击
- `text-sm`：保持一致的字体大小

---

### 5. 空状态优化

**调整前**：
```tsx
<div className="flex items-center justify-center h-full">
  <p>Select a hazard...</p>
</div>
```

**调整后**：
```tsx
<div className="flex items-center justify-center h-64 border border-dashed border-gray-300 rounded-lg">
  <p className="text-center text-gray-500 px-6 py-4">
    Select a hazard or exposure option<br />
    from the left panel to view<br />
    details and controls.
  </p>
</div>
```

**效果**：
- 固定高度，不会占满整个面板
- 虚线边框，视觉上更友好
- 文字分行显示，更易读

---

### 6. Legend 图例优化

**调整前**：
- 位置：`bottom-4 left-4`
- 标题：`text-lg`
- 色块：`w-5 h-5`
- 间距：`space-y-1`

**调整后**：
- 位置：`bottom-6 left-6` (更宽松)
- 标题：`text-base` + "Flood Depth (m)" (更明确)
- 色块：`w-6 h-5` + `rounded` (更美观)
- 间距：`space-y-1.5` (更清晰)
- 边框：`border-gray-300` (更柔和)

---

## 📐 布局结构

```
┌─────────────────────────────────────────────────────────┐
│                        Header                            │
├──────────┬───────────────────────────────┬───────────────┤
│          │                               │               │
│  Left    │         Map Area              │   Right       │
│  Panel   │      (Leaflet Map)            │   Panel       │
│  384px   │                               │   384px       │
│          │    ┌──────────────┐           │               │
│ [卡片1]  │    │   Legend     │           │ [查询卡片]    │
│          │    └──────────────┘           │               │
│ spacing  │                               │               │
│  24px    │                               │ [详细卡片]    │
│          │                               │               │
│ [卡片2]  │                               │ 或            │
│          │                               │               │
│          │                               │ [空状态]      │
│          │                               │               │
└──────────┴───────────────────────────────┴───────────────┘
```

---

## 🎨 视觉层次

### 主要层级：
1. **Header** - 导航栏
2. **三栏布局** - 左(筛选) / 中(地图) / 右(分析)
3. **卡片** - 功能分组
4. **表单元素** - 具体操作

### 间距规范：
- 面板外边距：`p-6` (24px)
- 卡片间距：`space-y-6` (24px) 左侧
- 卡片间距：`space-y-4` (16px) 右侧
- 卡片内部：`space-y-4` (16px)
- 表单项间距：`space-y-3` (12px)

---

## 💡 设计原则

### 1. 呼吸感
- 增加间距，避免拥挤
- 固定高度的空状态，不占满整个区域

### 2. 可读性
- 增加行高 (`leading-relaxed`)
- 适当的字体大小 (`text-sm`)
- 充足的内边距

### 3. 一致性
- 左右面板宽度一致 (384px)
- 卡片间距统一
- 标签样式统一

### 4. 交互性
- `cursor-pointer` 提示可点击
- 虚线边框引导操作
- 清晰的视觉反馈

---

## 🔍 进一步优化建议

### 可选优化（未实施）：

1. **添加页面标题**
   ```tsx
   <div className="px-8 py-4 bg-white border-b">
     <h1 className="text-2xl font-bold">Risk Map Analysis</h1>
     <p className="text-gray-600 text-sm">
       Visualize and analyze multi-hazard risks across Hong Kong
     </p>
   </div>
   ```

2. **卡片标题图标**
   ```tsx
   <CardTitle className="text-base flex items-center gap-2">
     <AlertTriangle size={16} />
     Multi-hazard Selection
   </CardTitle>
   ```

3. **响应式布局**
   - 小屏幕时侧边栏可折叠
   - 使用 `md:w-96` 等响应式类

4. **Loading 状态**
   - 地图加载时显示骨架屏
   - 查询时显示加载动画

---

## 📱 当前屏幕适配

**最佳显示**：
- 屏幕宽度：≥ 1440px
- 左面板 384px + 地图区域 672px + 右面板 384px = 1440px

**建议**：
- 最小屏幕宽度：1280px
- 推荐屏幕宽度：1920px

---

## ✨ 优化总结

| 项目 | 调整前 | 调整后 | 改进效果 |
|------|--------|--------|----------|
| 侧边栏宽度 | 320px | 384px | ✅ 内容不拥挤 |
| 面板垂直间距 | 4px | 24px | ✅ 视觉清晰 |
| 卡片间距 | 4px | 24px | ✅ 层次分明 |
| 卡片内部间距 | 12px | 16px | ✅ 易于操作 |
| 标签行高 | 默认 | relaxed | ✅ 可读性好 |
| 空状态显示 | 占满 | 固定高度 | ✅ 更友好 |
| Legend样式 | 基础 | 优化 | ✅ 更专业 |

**整体评价**：✅ 排版更专业、更易用、视觉层次更清晰
