# Risk Map 模块功能设计

## 🎯 模块定位

**Risk Map 是什么？**
- 一个**地理空间风险可视化平台**
- 显示不同地区的洪水、台风等灾害风险等级
- 帮助承保人员快速判断某个地点/区域的风险水平

**核心价值**：
> "这栋楼在哪里？那个地方危险吗？"
> "如果我要承保香港湾仔的一栋写字楼，风险有多高？"

---

## 🔍 再保险公司的使用场景

### 场景 1：承保决策支持
```
业务经理：某香港直保公司想投保中环一栋商业楼
我需要知道：
❓ 这栋楼在地图上的具体位置
❓ 该位置的洪水风险等级（高/中/低）
❓ 历史上这里发生过洪水吗？
❓ 100年/200年/500年一遇洪水的淹水深度是多少？
❓ 周边是否有其他高风险区域（风险集中度）
```

### 场景 2：区域风险评估
```
精算师：需要评估整个香港岛的承保组合风险
我需要看到：
❓ 香港岛哪些区域是高风险区（红色）
❓ 我们承保的资产有多少在高风险区
❓ 风险热力图（风险密度分布）
❓ 按行政区划统计风险
```

### 场景 3：灾害情景模拟
```
风险管理：台风季节来临前做压力测试
我需要模拟：
❓ 如果发生类似2017年Hato的超强台风
❓ 影响范围有多大？
❓ 风圈覆盖哪些区域？
❓ 预计暴雨+风暴潮会淹到哪里？
❓ 我们承保的资产有多少会受影响？
```

### 场景 4：快速点查询
```
承保经理：客户发来一个地址
我需要快速：
❓ 输入地址或坐标
❓ 立即显示该位置的风险评分
❓ 生成风险报告（PDF/Excel）
❓ 用于定价参考
```

---

## 📋 核心功能清单

### ✅ 已有功能（当前实现）

#### 1. **多灾害图层选择**
```
☑ 台风风险
☑ 暴雨风险
☑ 洪水风险（5个重现期）
  - 500年一遇
  - 200年一遇
  - 100年一遇
  - 50年一遇
  - 20年一遇
☑ 地质灾害风险
```

#### 2. **暴露度图层**
```
☑ 人口密度热力图
☑ 建筑重置成本热力图
☑ 关键基础设施（医院、学校、发电站）
```

#### 3. **位置风险查询**
```
☑ 输入地址或坐标
☑ 查询该位置的风险
☑ 显示风险报告摘要
☑ 下载报告（TXT格式）
```

#### 4. **地图基础功能**
```
☑ Leaflet 地图
☑ 卫星底图
☑ WMS 图层叠加
☑ 图例显示
```

---

## 🚀 建议增强的功能

### 🔥 高优先级（建议立即添加）

#### 1. **地址搜索和地图定位**
**当前问题**：输入地址后，地图不会自动定位到该位置

**建议实现**：
```typescript
// 用户输入地址
Input: "中环金融街8号"

// 调用地理编码API（Geocoding）
→ Google Maps API / OpenStreetMap Nominatim

// 获取坐标
Result: { lat: 22.2847, lon: 114.1578 }

// 地图自动跳转并标记
→ 地图飞到该位置
→ 显示一个红色标记点
→ 弹出该位置的风险信息
```

**技术实现**：
```tsx
// 使用 Nominatim 免费地理编码
const geocodeAddress = async (address: string) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${address}`
  );
  const data = await response.json();
  return { lat: data[0].lat, lon: data[0].lon };
};

// 地图跳转
mapRef.current?.flyTo([lat, lon], 16);

// 添加标记
<Marker position={[lat, lon]}>
  <Popup>
    <h3>{address}</h3>
    <p>Flood Risk: High</p>
  </Popup>
</Marker>
```

---

#### 2. **改进风险查询结果**
**当前问题**：风险数据是假的（Dummy Data）

**建议实现**：
```typescript
// 真实风险计算逻辑

1. 地理编码：地址 → 坐标 (lat, lon)

2. 空间查询：坐标 → 风险图层数值
   - 查询该点位于哪个风险区
   - 从 WMS 图层提取风险值
   - 或查询本地风险数据库

3. 综合评分：
   - 洪水风险分数 (0-10)
   - 台风风险分数 (0-10)
   - 地质风险分数 (0-10)
   - 加权平均 → 总体风险等级

4. 生成报告：
   Risk Assessment Report
   ========================
   Location: 中环金融街8号
   Coordinates: 22.2847, 114.1578
   District: Central & Western
   
   Flood Risk Analysis:
   - 20-yr return: 0.3m depth (Low)
   - 50-yr return: 0.8m depth (Medium)
   - 100-yr return: 1.5m depth (High)
   - 500-yr return: 3.2m depth (Very High)
   
   Historical Events:
   - 2023-09-15: Typhoon Mangkhut (0.5m inundation)
   - 2017-08-23: Typhoon Hato (1.2m inundation)
   
   Overall Risk Rating: HIGH
   Recommended Actions:
   - Require flood mitigation measures
   - Apply 15% premium loading
   - Consider flood defense requirements
```

---

#### 3. **图层控制优化**
**当前问题**：
- 左侧选择灾害类型，右侧再选择具体图层，逻辑不清晰
- 用户可能不理解为什么要点两次

**建议改进**：
```
方案A：统一到左侧面板
├── 洪水风险图层
│   ☐ 500年一遇
│   ☐ 200年一遇
│   ☑ 100年一遇  ← 默认选中
│   ☐ 50年一遇
│   ☐ 20年一遇
├── 台风风险图层
│   ☐ 历史台风路径
│   ☐ 风圈影响范围
│   ☐ 累积降雨量
├── 暴雨风险图层
│   ☐ 短时强降雨
│   ☐ 24小时累积降雨
└── 地质灾害图层
    ☐ 滑坡易发区
    ☐ 泥石流易发区

方案B：分组折叠面板
▼ 洪水风险 [展开]
  ☑ 100年一遇淹水深度
▶ 台风风险 [折叠]
▶ 暴雨风险 [折叠]
▶ 地质灾害 [折叠]
```

---

#### 4. **改进报告导出**
**当前问题**：只能导出 TXT 文本文件，不够专业

**建议实现**：
```typescript
导出格式：
1. ✅ PDF 报告（推荐）
   - 带公司Logo
   - 带地图截图
   - 专业排版
   - 可直接发给客户

2. ✅ Excel 数据表
   - 包含详细风险数据
   - 可用于进一步分析
   
3. ⚠️ Word 文档（可选）
   - 可编辑的报告模板

// 使用 jsPDF 生成 PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const generatePDFReport = async () => {
  const pdf = new jsPDF();
  
  // 添加标题
  pdf.setFontSize(20);
  pdf.text('Risk Assessment Report', 20, 20);
  
  // 添加基本信息
  pdf.setFontSize(12);
  pdf.text(`Location: ${riskReportData.address}`, 20, 40);
  pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 50);
  
  // 添加地图截图
  const mapElement = document.querySelector('.leaflet-container');
  const canvas = await html2canvas(mapElement);
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 20, 60, 170, 100);
  
  // 添加风险分析
  pdf.text('Risk Analysis:', 20, 170);
  pdf.text(`Flood Risk: ${riskReportData.floodRisk}`, 30, 180);
  pdf.text(`Typhoon Risk: ${riskReportData.typhoonRisk}`, 30, 190);
  
  // 保存
  pdf.save(`Risk_Report_${Date.now()}.pdf`);
};
```

---

### 🔶 中优先级（建议后续添加）

#### 5. **批量地址查询**
**场景**：客户提供一个Excel，包含50个地址，需要批量评估风险

**实现**：
```tsx
<Card>
  <CardHeader>
    <CardTitle>Batch Risk Query</CardTitle>
  </CardHeader>
  <CardContent>
    <Label>Upload Address List (Excel/CSV)</Label>
    <Input type="file" accept=".xlsx,.csv" />
    <Button onClick={handleBatchQuery}>
      Analyze All Addresses
    </Button>
    
    {/* 结果表格 */}
    <Table>
      <thead>
        <tr>
          <th>Address</th>
          <th>Flood Risk</th>
          <th>Typhoon Risk</th>
          <th>Overall</th>
        </tr>
      </thead>
      <tbody>
        {results.map(r => (
          <tr>
            <td>{r.address}</td>
            <td className={getRiskColor(r.flood)}>{r.flood}</td>
            <td className={getRiskColor(r.typhoon)}>{r.typhoon}</td>
            <td className={getRiskColor(r.overall)}>{r.overall}</td>
          </tr>
        ))}
      </tbody>
    </Table>
    
    <Button>Export All Results</Button>
  </CardContent>
</Card>
```

---

#### 6. **历史灾害事件叠加**
**功能**：从 Disaster Repository 获取历史事件，显示在地图上

**实现**：
```tsx
// 连接 Disaster Repository
import { getEvents } from '@/lib/api/events';

// 获取历史事件
const historicalEvents = await getEvents('historical');

// 在地图上显示
<LayerGroup>
  {historicalEvents.map(event => (
    <GeoJSON
      key={event.id}
      data={event.geometry}
      style={{ color: 'red', weight: 2 }}
    >
      <Popup>
        <h3>{event.name}</h3>
        <p>Date: {event.date}</p>
        <p>Loss: ${event.estimatedLoss}M</p>
      </Popup>
    </GeoJSON>
  ))}
</LayerGroup>

// 左侧添加历史事件选择
<Card>
  <CardHeader>
    <CardTitle>Historical Events</CardTitle>
  </CardHeader>
  <CardContent>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select event" />
      </SelectTrigger>
      <SelectContent>
        {historicalEvents.map(e => (
          <SelectItem value={e.id}>{e.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button onClick={showEventOnMap}>
      Show on Map
    </Button>
  </CardContent>
</Card>
```

---

#### 7. **绘制工具（Drawing Tools）**
**功能**：在地图上手动绘制区域，查询该区域的风险统计

**实现**：
```tsx
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';

<FeatureGroup>
  <EditControl
    position="topright"
    onCreated={handleDrawComplete}
    draw={{
      rectangle: true,
      circle: true,
      polygon: true,
      polyline: false,
      marker: false,
      circlemarker: false,
    }}
  />
</FeatureGroup>

// 用户绘制完成后
const handleDrawComplete = (e) => {
  const layer = e.layer;
  const area = layer.toGeoJSON();
  
  // 查询该区域内的风险统计
  const stats = analyzeAreaRisk(area);
  
  // 显示结果
  showModal({
    title: 'Area Risk Analysis',
    content: `
      Area: ${stats.areaKm2} km²
      High Risk Zone: ${stats.highRiskPercent}%
      Medium Risk Zone: ${stats.mediumRiskPercent}%
      Low Risk Zone: ${stats.lowRiskPercent}%
      Estimated Assets at Risk: $${stats.exposureValue}M
    `
  });
};
```

---

#### 8. **风险对比功能**
**功能**：对比两个地址或两个区域的风险差异

**实现**：
```tsx
<Card>
  <CardHeader>
    <CardTitle>Risk Comparison</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Location A</Label>
        <Input placeholder="Address 1" />
      </div>
      <div>
        <Label>Location B</Label>
        <Input placeholder="Address 2" />
      </div>
    </div>
    
    <Button onClick={compareRisks}>Compare</Button>
    
    {/* 对比结果 */}
    <Table>
      <thead>
        <tr>
          <th>Risk Factor</th>
          <th>Location A</th>
          <th>Location B</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Flood Risk</td>
          <td className="text-red-600">High (8.5)</td>
          <td className="text-green-600">Low (3.2)</td>
          <td>+5.3 (A higher)</td>
        </tr>
        <tr>
          <td>Typhoon Risk</td>
          <td>Medium (6.0)</td>
          <td>Medium (5.5)</td>
          <td>+0.5</td>
        </tr>
      </tbody>
    </Table>
  </CardContent>
</Card>
```

---

### 🔵 低优先级（未来考虑）

#### 9. **3D 地形可视化**
- 显示海拔高度
- 3D 淹水模拟

#### 10. **实时气象数据接入**
- 台风实时路径
- 降雨实时监测

#### 11. **AI 风险预测**
- 机器学习模型
- 预测未来风险趋势

---

## 🎨 推荐的界面布局调整

### 建议的左侧面板结构：

```tsx
Left Panel (384px):

┌─────────────────────────────┐
│ 🗺️ Map Layers               │
├─────────────────────────────┤
│ ▼ Flood Risk Layers         │
│   ☑ 100-year return (1.5m)  │
│   ☐ 200-year return         │
│   ☐ 500-year return         │
│                             │
│ ▶ Typhoon Risk Layers       │
│ ▶ Rainfall Risk Layers      │
│ ▶ Geological Hazard         │
├─────────────────────────────┤
│ 📍 Base Layers              │
│   ◉ Satellite Imagery       │
│   ○ Street Map              │
│   ○ Topographic Map         │
├─────────────────────────────┤
│ 📊 Exposure Layers          │
│   ☐ Population Density      │
│   ☐ Building Cost           │
│   ☐ Infrastructure          │
├─────────────────────────────┤
│ 🎯 Historical Events        │
│   Select: [Typhoon Mangkhut]│
│   [Show on Map]             │
└─────────────────────────────┘
```

### 建议的右侧面板结构：

```tsx
Right Panel (384px):

┌─────────────────────────────┐
│ 🔍 Quick Risk Query         │
├─────────────────────────────┤
│ Address or Coordinates:     │
│ [________________]  [Query] │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📍 Result:              │ │
│ │ Location: Central Plaza │ │
│ │ Flood Risk: ⚠️ High     │ │
│ │ Typhoon Risk: 🔶 Medium │ │
│ │ Overall: ⚠️ High        │ │
│ └─────────────────────────┘ │
│                             │
│ [Download PDF] [Add to Map] │
├─────────────────────────────┤
│ 📊 Batch Query              │
│ [Upload Excel/CSV]          │
├─────────────────────────────┤
│ 🔀 Compare Locations        │
│ Location A: [__________]    │
│ Location B: [__________]    │
│ [Compare]                   │
├─────────────────────────────┤
│ 📐 Area Analysis            │
│ [Enable Drawing]            │
│ Draw a polygon on map       │
└─────────────────────────────┘
```

---

## 💡 我的建议：分阶段实现

### 🎯 Phase 1：核心功能完善（1-2周）
✅ 必须做：
1. **地址搜索 + 地图定位** - 最重要！
2. **真实风险计算逻辑** - 连接WMS数据
3. **PDF报告导出** - 替换TXT
4. **图层控制优化** - 简化操作流程

### 🎯 Phase 2：增强功能（2-3周）
⭐ 建议做：
5. **批量地址查询**
6. **历史灾害叠加**
7. **风险对比功能**

### 🎯 Phase 3：高级功能（未来）
🔮 可以做：
8. **绘制工具**
9. **Excel数据导出**
10. **3D可视化**

---

## ❓ 现在请你回答：

1. **你觉得哪些功能最重要？**
   - 地址搜索？
   - 真实风险计算？
   - PDF报告？
   - 批量查询？

2. **你有真实的风险数据吗？**
   - WMS图层能提供风险值吗？
   - 还是需要我帮你设计风险计算逻辑？

3. **你的地理编码服务？**
   - 用 Google Maps API（收费）
   - 还是 OpenStreetMap Nominatim（免费）
   - 还是国内的高德/百度地图？

4. **排版是否满意？**
   - 需要调整布局吗？
   - 还是直接开始实现功能？

告诉我你的优先级，我帮你实现！🚀
