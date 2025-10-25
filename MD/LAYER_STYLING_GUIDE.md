# 🎨 Geospatial Data Hub - 图层样式优化指南

## ✨ 已完成的改进

### 1. 透明度优化
所有 WMS 图层现在都有精心调整的透明度，使图层叠加更加美观：

| 图层 | 透明度 | 说明 |
|------|--------|------|
| Building (建筑物) | 70% | 柔和显示，不遮挡底图 |
| Boundary (边界) | 80% | 边界线较明显，便于识别区域 |
| Annual Rainfall (年降雨量) | 60% | 更透明，方便查看下层信息 |
| Drainage Conduits (排水管道) | 75% | 适中透明度，清晰可见管网 |
| Drainage Junctions (排水节点) | 80% | 节点较明显，重要连接点 |
| Drainage Outfalls (排水出口) | 85% | 最明显，关键设施 |
| Population Density (人口密度) | 65% | 热力图效果，平衡可读性 |
| Land Cover (土地覆盖) | 60% | 背景层，不干扰主要信息 |
| Service Reservoirs (水库) | 80% | 重要基础设施，较明显 |

### 2. 配色方案系统

#### 🔵 Professional (专业蓝色系)
适用于：水利工程、城市规划、专业报告
- 主色：蓝色 (#2196F3)
- 辅色：青色 (#00BCD4)
- 强调：橙色 (#FF9800)

#### 🟢 Natural (自然柔和系)
适用于：环境分析、生态评估、自然资源管理
- 主色：绿色 (#66BB6A)
- 辅色：天蓝色 (#42A5F5)
- 强调：金黄色 (#FFCA28)

#### 🟣 High Contrast (高对比度)
适用于：演示展示、大屏幕显示、公开汇报
- 主色：靛蓝色 (#3F51B5)
- 辅色：粉红色 (#E91E63)
- 强调：琥珀色 (#FFC107)

#### ⚫ Dark Mode (夜间模式)
适用于：深色底图、夜间工作、降低眼睛疲劳
- 主色：亮蓝色 (#64B5F6)
- 辅色：亮绿色 (#81C784)
- 强调：亮黄色 (#FFD54F)

## 🎯 使用方法

### 在界面上切换配色方案
1. 打开 **Geospatial Data Hub** 页面
2. 在左侧边栏顶部找到 **Color Scheme** 卡片
3. 点击四个按钮之一选择配色方案
4. 所有已启用的图层会立即应用新配色

### 调整单个图层透明度
如果你想自定义某个图层的透明度，可以修改 `src/app/cityinfo/page.tsx` 文件：

```tsx
{urbanElements.buildingRisk && (
  <WMSTileLayer
    key="buildingRisk"
    url="http://143.89.22.7:8090/geoserver/wms"
    params={{ layers: 'COP:Building', ... }}
    opacity={0.7}  // ← 修改这个值（0.0 - 1.0）
    attribution="GeoServer Data"
  />
)}
```

## 🔧 高级自定义

### 方法1：修改配色方案文件
编辑 `src/app/cityinfo/layerStyles.ts` 来：
- 添加新的配色方案
- 调整现有配色方案的颜色
- 为特定图层设置自定义样式

```typescript
// 添加自己的配色方案
export const colorSchemes = {
  ...existing schemes,
  
  myCustomScheme: {
    primary: '#YOUR_COLOR',
    secondary: '#YOUR_COLOR',
    accent: '#YOUR_COLOR',
    danger: '#YOUR_COLOR',
    success: '#YOUR_COLOR',
  },
};
```

### 方法2：使用 SLD 样式（GeoServer 服务端）
如果你想要更复杂的样式（渐变、图案、分类着色），需要在 GeoServer 中创建 SLD 样式：

1. 登录 GeoServer 管理界面
2. 进入 **Styles** 管理
3. 创建新的 SLD 样式文件
4. 在 `page.tsx` 中引用该样式：

```tsx
params={{ 
  layers: 'COP:Building',
  styles: 'my_custom_style',  // ← 你的 SLD 样式名称
  ...
}}
```

### 方法3：使用 ENV 参数动态着色
通过 `env` 参数传递颜色和样式参数：

```tsx
params={{ 
  layers: 'ITF:Conduits',
  env: 'color:#00BCD4;width:3',  // 青色管道，3像素宽
  ...
}}
```

## 📊 推荐配色组合

### 水利工程项目
- 配色方案：**Professional**
- 建筑物：蓝灰色
- 排水系统：青色系
- 水库：深蓝色
- 边界：红色

### 环境评估项目
- 配色方案：**Natural**
- 土地覆盖：自然色调
- 人口密度：暖色渐变
- 绿地：绿色
- 水体：蓝色

### 演示展示
- 配色方案：**High Contrast**
- 提高所有图层对比度
- 使用鲜艳颜色
- 适合投影仪和大屏幕

## 🎨 颜色选择建议

### 选择原则
1. **对比度**：确保图层在底图上清晰可见
2. **色盲友好**：避免红绿搭配，考虑色盲用户
3. **语义化**：
   - 蓝色 → 水相关（排水、水库、降雨）
   - 绿色 → 植被、自然环境
   - 红色/橙色 → 警告、危险、高密度
   - 黄色 → 注意、中等风险
   - 灰色 → 建筑、道路、基础设施

### 工具推荐
- [Coolors.co](https://coolors.co/) - 配色方案生成器
- [ColorBrewer](https://colorbrewer2.org/) - 地图配色工具
- [Adobe Color](https://color.adobe.com/) - 色轮和配色

## 🚀 未来增强计划

### 计划功能
- [ ] 图层透明度滑块（实时调整）
- [ ] 自定义配色方案保存功能
- [ ] 图层混合模式选择（正片叠底、滤色等）
- [ ] 导入/导出配色方案
- [ ] 预设场景模板（防洪、城市规划、环境监测等）

## 📝 常见问题

### Q: 为什么我的配色方案没有生效？
A: 目前配色方案主要影响透明度。要改变实际颜色，需要：
1. 在 GeoServer 中创建自定义 SLD 样式，或
2. 使用 `env` 参数传递颜色（需要 GeoServer 样式支持该参数）

### Q: 如何恢复默认样式？
A: 选择 "Professional" 配色方案即可恢复默认设置。

### Q: 可以为不同图层设置不同配色方案吗？
A: 目前配色方案是全局的。如需单独控制，请直接修改各图层的 `opacity` 和 `params` 参数。

### Q: 图层颜色太亮/太暗怎么办？
A: 调整 `opacity` 值：
- 太亮 → 降低透明度（如 0.5）
- 太暗 → 提高透明度（如 0.9）

## 💡 最佳实践

1. **图层叠加顺序**：
   - 底层：面状图层（土地覆盖、人口密度）
   - 中层：线状图层（排水管道、道路）
   - 顶层：点状图层（节点、出水口）

2. **透明度设置**：
   - 背景层：50-60%
   - 参考层：70-80%
   - 重点层：85-95%

3. **颜色选择**：
   - 使用一致的色系表达相关要素
   - 避免过多颜色造成视觉混乱
   - 保持足够对比度确保可读性

## 📞 技术支持

如需更多帮助或建议，请联系开发团队。

---

**最后更新：** 2025-10-20
**版本：** 1.0.0
