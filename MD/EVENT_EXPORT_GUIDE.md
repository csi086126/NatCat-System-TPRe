# Event Export 功能说明

## 📄 功能概述

Event Export功能可以将选中的灾害事件详情导出为PDF文档，包括：
- 事件基本信息
- 影响概况统计
- 受影响地区列表
- 事件位置地图截图

## 🎯 使用流程

### 1. 选择事件
```
在左侧筛选栏：
1. 设置筛选条件（Event Type, Time, Impact Area）
2. 在 Event List 下拉菜单中选择事件
3. 地图自动定位到事件位置
4. 右侧显示 Event Details
```

### 2. 导出PDF
```
在右侧 Event Details 底部：
点击 "Export Event Details" 按钮
→ 系统自动生成PDF
→ 浏览器下载到本地
```

## 📋 PDF文档内容

### 1. 标题部分
```
Event Details Report
━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 事件基本信息
```
Typhoon Mangkhut
Typhoon • 2023-09-16
```

### 3. Impact Summary（影响概况）
```
Max Wind Speed: 285 km/h
Total Rainfall: 350 mm
Estimated Loss: $6.27 Billion
Affected Population: 3.6 Million
```

### 4. Affected Areas（受影响地区）
```
• Central and Western District
• Wan Chai District
• Eastern District
• ...
```

### 5. Event Location Map（事件位置地图）
```
[地图截图]
- 包含卫星底图
- 事件位置标记点
- 当前地图视图
```

### 6. 页脚
```
Generated on 2025-10-16 15:30:25
```

## 🔧 技术实现

### 使用的库
- **jsPDF**: 生成PDF文档
- **html2canvas**: 截取地图区域为图片

### 工作原理
1. **信息采集**: 从selectedEvent对象获取所有事件数据
2. **地图截图**: 使用html2canvas截取Leaflet地图容器
3. **PDF生成**: 使用jsPDF创建A4文档
4. **内容排版**: 
   - 文本信息按标题、正文分级显示
   - 地图图片自适应页面宽度
   - 保持图片宽高比
5. **文件下载**: 自动触发浏览器下载

### 文件命名规则
```
Event_{EventID}_{Date}.pdf

示例：
Event_T-2023-1_2023-09-16.pdf
Event_R-2024-2_2024-06-15.pdf
```

## ⚙️ 配置说明

### PDF设置
```javascript
- 纸张大小: A4 (210 x 297 mm)
- 方向: 纵向 (Portrait)
- 边距: 20mm
- 字体: Helvetica
```

### 地图截图设置
```javascript
- 格式: PNG
- 分辨率: 2x (高清)
- 背景: 白色
- CORS: 启用
```

## 🎨 PDF样式

### 字体大小
- 主标题: 20pt (粗体)
- 章节标题: 12pt (粗体)
- 事件名称: 16pt
- 正文: 10pt
- 页脚: 8pt (灰色)

### 间距
- 标题后: 15mm
- 章节间: 10mm
- 行间距: 6mm

## 📊 示例PDF结构

```
┌─────────────────────────────────────────┐
│                                         │
│      Event Details Report               │
│                                         │
│  Typhoon Mangkhut                       │
│  Typhoon • 2023-09-16                   │
│  ─────────────────────────────────      │
│                                         │
│  Impact Summary                         │
│  Max Wind Speed: 285 km/h               │
│  Total Rainfall: 350 mm                 │
│  Estimated Loss: $6.27 Billion          │
│  Affected Population: 3.6 Million       │
│                                         │
│  Affected Areas                         │
│  • Central and Western District         │
│  • Wan Chai District                    │
│  • Eastern District                     │
│  • Southern District                    │
│                                         │
│  Event Location Map                     │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     [地图截图显示在这里]         │   │
│  │                                 │   │
│  │         📍 Event Location        │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│                                         │
│  Generated on 2025-10-16 15:30:25      │
└─────────────────────────────────────────┘
```

## 🚀 功能特点

### 1. 自动化
- ✅ 一键生成完整报告
- ✅ 自动截图地图区域
- ✅ 自动命名文件
- ✅ 自动下载到本地

### 2. 高质量
- ✅ 2倍分辨率截图
- ✅ 清晰的文字排版
- ✅ 专业的PDF布局
- ✅ 完整的事件信息

### 3. 易用性
- ✅ 点击按钮即可导出
- ✅ 无需额外配置
- ✅ 支持所有筛选事件
- ✅ 浏览器直接下载

## 🔍 常见问题

### Q: PDF中地图显示空白？
A: 等待1-2秒让地图图块加载完成后再点击导出。

### Q: 导出失败怎么办？
A: 
1. 检查浏览器是否允许下载
2. 确保已选中事件
3. 刷新页面重试

### Q: 能否自定义PDF样式？
A: 可以修改 `handleExportEventDetails` 函数中的字体大小、颜色、间距等参数。

### Q: 支持哪些浏览器？
A: 支持所有现代浏览器（Chrome, Firefox, Edge, Safari）。

### Q: PDF文件大小？
A: 通常在500KB - 2MB之间，取决于地图截图的复杂度。

## 📝 未来改进

- [ ] 支持导出多个事件对比
- [ ] 添加统计图表
- [ ] 支持Word格式导出
- [ ] 自定义PDF模板
- [ ] 添加水印和公司Logo
- [ ] 生成事件时间轴
- [ ] 添加损失趋势图

## 🛠️ 开发者指南

### 修改PDF内容
编辑 `handleExportEventDetails` 函数：
```javascript
// 添加新内容
pdf.setFontSize(12);
pdf.text('新标题', 20, yPosition);
yPosition += 8;

pdf.setFontSize(10);
pdf.text('新内容', 20, yPosition);
yPosition += 6;
```

### 调整地图截图质量
```javascript
const canvas = await html2canvas(mapElement, {
  scale: 3, // 提高到3倍分辨率（更清晰但文件更大）
  useCORS: true,
  allowTaint: true,
  backgroundColor: '#ffffff'
});
```

### 自定义文件名
```javascript
const fileName = `CustomName_${selectedEvent.id}.pdf`;
pdf.save(fileName);
```

## 📞 技术支持

如需帮助，请提供：
1. 浏览器类型和版本
2. 操作系统
3. 错误信息截图
4. 控制台日志
