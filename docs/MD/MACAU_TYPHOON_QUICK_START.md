# Macau Typhoon Events - Quick Start Guide
# 澳门台风事件数据接入 - 快速开始

## 📦 准备工作清单

### 数据文件位置确认

- [x] **TIF洪涝模拟结果** (6个文件)
  ```
  D:\web-flood-insurance-model\Data\Typhoon_FloodResult_Macau\
  ├── Hato_MacauPeninsula.tif (4.1 MB)
  ├── Hato_Taipa.tif (7.2 MB)
  ├── Mangkhut_MacauPeninsula.tif (15.6 MB)
  ├── Mangkhut_Taipa.tif (7.2 MB)
  ├── Ragasa_MacauPeninsula.tif (4.1 MB)
  └── Ragasa_Taipa.tif (7.2 MB)
  ```

- [x] **保险数据** (2个Excel文件)
  ```
  D:\web-flood-insurance-model\Data\Insurance_data\
  ├── 承保信息.xlsx (18.7 MB)
  └── 理賠信息(巨災).xlsx (120 KB)
  ```

- [x] **事件元数据** (已创建)
  ```
  public/data/macau-typhoon-events.json
  ```

---

## 🚀 集成步骤

### **步骤1️⃣: 检查保险数据结构**

首先需要了解Excel文件的列名，以便正确解析：

```bash
# 安装依赖（如果还没安装）
pip install pandas openpyxl requests

# 运行检查脚本
python scripts/inspect-insurance-data.py
```

**预期输出：**
- 承保信息的所有列名
- 理赔信息的所有列名
- 前3行样本数据

**行动：**
1. 查看输出的列名
2. 找到以下关键字段：
   - 保单号 (PolicyNo / 保单号 / Policy_ID)
   - 地址 (Address / 地址 / 风险地址 / Location)
   - 保额 (InsuredAmount / 保额 / Sum_Insured)
   - 赔付金额 (ClaimAmount / 赔付金额 / Paid_Amount)
   - 事件名称 (EventName / 事件名称 / Typhoon_Name)

3. 根据实际列名，修改 `scripts/parse-macau-insurance-data.py` 第75-95行的列名映射

---

### **步骤2️⃣: 解析保险数据并地理编码**

```bash
# 运行解析脚本（会调用澳门地籍局API进行地理编码）
python scripts/parse-macau-insurance-data.py
```

**注意事项：**
- 脚本会向澳门GIS API发送请求，需要网络连接
- 对于大量地址（> 1000条），预计耗时30-60分钟
- 可以先测试前10条数据（修改脚本中的limit参数）

**输出文件：**
1. `public/data/macau-insurance-policies.geojson` - 地理编码后的保单位置
2. `public/data/macau-event-summary.json` - 每个台风的理赔统计

---

### **步骤3️⃣: 在GeoServer中发布TIF图层**

#### 选项A：使用GeoServer Web界面（推荐）

1. **访问GeoServer**
   ```
   URL: http://localhost:8080/geoserver/web
   默认账号: admin / geoserver
   ```

2. **创建Workspace**
   - Workspaces → Add new workspace
   - Name: `Macau`
   - Namespace URI: `http://geoserver.org/macau`

3. **为每个TIF文件创建Store**
   
   对于每个TIF文件（共6个），执行：
   
   - Stores → Add new Store → GeoTIFF
   - Workspace: `Macau`
   - Data Source Name: `Hato_Peninsula` (根据文件名调整)
   - URL: `file:///D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/Hato_MacauPeninsula.tif`
   - 点击 "Save"
   - 点击 "Publish" 按钮

4. **配置每个图层**
   
   - Layer Name: `Hato_MacauPeninsula` (保持与文件名一致)
   - Title: `Typhoon Hato - Macau Peninsula Flood Depth`
   - Coordinate Reference System: 
     - 点击 "Find" 搜索 `EPSG:4326` (WGS84)
     - 或使用 "Compute from data" 自动检测
   - Bounding Boxes: 点击 "Compute from data"
   - 保存

5. **应用颜色样式**
   
   - 进入 Styles → Add new style
   - Name: `Macau_Flood_Depth`
   - 复制 `MACAU_TYPHOON_INTEGRATION_GUIDE.md` 中的SLD样式XML
   - 保存
   - 返回每个图层，在 Publishing → Default Style 中选择 `Macau_Flood_Depth`

6. **测试WMS**
   
   打开浏览器访问：
   ```
   http://localhost:8080/geoserver/Macau/wms?
     service=WMS&
     request=GetMap&
     layers=Macau:Hato_MacauPeninsula&
     bbox=113.52,22.14,113.58,22.22&
     width=768&
     height=768&
     srs=EPSG:4326&
     format=image/png
   ```
   
   应该看到洪涝深度的彩色图像。

#### 选项B：使用GDAL命令行（高级用户）

```bash
# 转换为Cloud Optimized GeoTIFF以提高性能
gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2 ^
  D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/Hato_MacauPeninsula.tif ^
  D:/geoserver_data/Hato_MacauPeninsula_COG.tif

# 生成金字塔（多分辨率预览）
gdaladdo -r average D:/geoserver_data/Hato_MacauPeninsula_COG.tif 2 4 8 16 32
```

然后在GeoServer中指向COG文件。

---

### **步骤4️⃣: 更新前端代码集成数据**

#### 4.1 加载Macau事件数据

打开 `src/app/riskmap/page.tsx`，在文件顶部添加：

```typescript
// 在现有imports后添加
import macauTyphoonEvents from '@/../public/data/macau-typhoon-events.json';
```

#### 4.2 合并到Historical Events

找到 `mockHistoricalEvents` 的位置（约第90行），修改为：

```typescript
// 原来的代码：
const mockHistoricalEvents = [ ... ];

// 修改为：
const baseHistoricalEvents = [ ... ]; // 保持原有的mock数据

// 在组件内部，使用useState合并
const [historicalEvents, setHistoricalEvents] = useState([
  ...baseHistoricalEvents,
  ...macauTyphoonEvents
]);
```

#### 4.3 添加WMS图层配置

在 `wmsLayersConfig` 对象中（约第50行）添加：

```typescript
const wmsLayersConfig = {
  // ... 现有配置 ...
  
  // Macau Typhoon Flood Events
  macauHatoPeninsula: { name: 'Hato - Macau Peninsula', layer: 'Macau:Hato_MacauPeninsula' },
  macauHatoTaipa: { name: 'Hato - Taipa', layer: 'Macau:Hato_Taipa' },
  macauMangkhutPeninsula: { name: 'Mangkhut - Macau Peninsula', layer: 'Macau:Mangkhut_MacauPeninsula' },
  macauMangkhutTaipa: { name: 'Mangkhut - Taipa', layer: 'Macau:Mangkhut_Taipa' },
  macauRagasaPeninsula: { name: 'Ragasa - Macau Peninsula', layer: 'Macau:Ragasa_MacauPeninsula' },
  macauRagasaTaipa: { name: 'Ragasa - Taipa', layer: 'Macau:Ragasa_Taipa' },
};
```

#### 4.4 添加到visibleLayers状态

在 `visibleLayers` state定义中（约第600行）添加：

```typescript
const [visibleLayers, setVisibleLayers] = useState({
  // ... 现有图层 ...
  
  // Macau typhoon layers
  macauHatoPeninsula: false,
  macauHatoTaipa: false,
  macauMangkhutPeninsula: false,
  macauMangkhutTaipa: false,
  macauRagasaPeninsula: false,
  macauRagasaTaipa: false,
});
```

#### 4.5 在地图上渲染WMS图层

找到地图渲染部分（MapContainer内），添加：

```tsx
{/* Macau Typhoon Flood Layers */}
{visibleLayers.macauHatoPeninsula && (
  <WMSTileLayer
    url="http://localhost:8080/geoserver/Macau/wms"
    layers="Macau:Hato_MacauPeninsula"
    format="image/png"
    transparent={true}
    opacity={0.7}
  />
)}
{/* 重复以上模式为其他5个图层 */}
```

#### 4.6 加载保险数据GeoJSON

在组件内添加：

```typescript
const [insurancePolicies, setInsurancePolicies] = useState<any>(null);

useEffect(() => {
  fetch('/data/macau-insurance-policies.geojson')
    .then(res => res.json())
    .then(data => {
      setInsurancePolicies(data);
      console.log(`✅ Loaded ${data.features.length} insurance policies`);
    })
    .catch(err => console.error('Failed to load insurance data:', err));
}, []);
```

#### 4.7 显示保单标记

在地图上添加保单位置标记（参考详细指南中的代码）。

---

### **步骤5️⃣: 测试验证**

```bash
# 启动开发服务器
npm run dev
```

1. **打开Risk Map**: http://localhost:3003/riskmap

2. **导航到澳门**
   - 使用RegionSelector选择 "Macau"
   - 或手动缩放到坐标 (22.1987, 113.5439)

3. **测试Historical Events**
   - 打开 "Geospatial & Disaster Data Hub" → "Historical Events"
   - 筛选类型 = "Typhoon"
   - 应该看到3个澳门台风事件：
     * Typhoon Hato (天鸽) - 2017-08-23
     * Typhoon Mangkhut (山竹) - 2018-09-16
     * Typhoon Ragasa (桦加沙) - 2023-09-02

4. **测试TIF图层显示**
   - 点击某个事件，查看详情
   - 勾选 "Macau Peninsula Flood Extent" 和 "Taipa Flood Extent"
   - 地图上应显示蓝色渐变的洪涝深度图

5. **测试保险数据**
   - 地图上应显示小圆点标记（保单位置）
   - 点击标记查看弹窗：
     * 保单号
     * 地址
     * 保额
     * 赔付金额
     * 赔付率

---

## 🎯 预期效果展示

### 地图视图
```
┌─────────────────────────────────────────────────────┐
│  🗺️ Macau Map View                                  │
│                                                     │
│  🟦 蓝色区域 = 洪涝深度0.5-2米 (TIF图层)               │
│  🟥 红点 = 高赔付率保单 (>50%)                        │
│  🟨 黄点 = 中赔付率保单 (30-50%)                      │
│  🟩 绿点 = 低赔付率保单 (<30%)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 事件详情卡片
```
╔════════════════════════════════════════════╗
║ 🌪️ Typhoon Hato (天鸽)                     ║
╠════════════════════════════════════════════╣
║ 📅 Date: 2017-08-23                        ║
║ 💨 Max Wind: 185 km/h (Severe Typhoon)    ║
║ 🌧️ Rainfall: 320 mm                       ║
║ 🌊 Storm Surge: 2.5 m                     ║
║ 💰 Est. Loss: $1.65 Billion USD           ║
║                                            ║
║ 📊 Insurance Impact                        ║
║ ├─ Total Claims: 1,250                    ║
║ ├─ Total Paid: $1.65 Billion              ║
║ └─ Avg Claim: $1.32 Million               ║
║                                            ║
║ 🗺️ Flood Layers                           ║
║ ☑️ Macau Peninsula Flood Extent           ║
║ ☑️ Taipa Flood Extent                     ║
╚════════════════════════════════════════════╝
```

---

## 📝 常见问题

### Q1: GeoServer找不到TIF文件
**A:** 检查文件路径是否使用正斜杠 `/` 而不是反斜杠 `\`
```
正确: file:///D:/web-flood-insurance-model/...
错误: file:///D:\web-flood-insurance-model\...
```

### Q2: 地理编码失败率很高
**A:** 
1. 检查地址格式是否包含"澳门"前缀
2. 尝试简化地址（去掉楼层、单位号）
3. 检查网络连接到 api.gis.gov.mo

### Q3: TIF图层显示为灰色
**A:** 
1. 检查SLD样式配置
2. 使用 `gdalinfo` 检查TIF数据范围
3. 确认ColorMap的quantity范围与实际数据匹配

### Q4: 保险数据列名不匹配
**A:** 
1. 运行 `inspect-insurance-data.py` 查看实际列名
2. 修改 `parse-macau-insurance-data.py` 中的列名映射
3. 重新运行解析脚本

---

## 📚 相关文档

- 📖 [完整集成指南](./MACAU_TYPHOON_INTEGRATION_GUIDE.md) - 详细技术文档
- 🐍 [保险数据解析脚本](../scripts/parse-macau-insurance-data.py) - Python源码
- 📊 [事件元数据](../public/data/macau-typhoon-events.json) - JSON数据结构

---

## 🤝 需要帮助？

如果遇到问题，请检查：
1. GeoServer日志: `{GEOSERVER_HOME}/logs/geoserver.log`
2. 浏览器控制台: F12 → Console
3. 网络请求: F12 → Network → 筛选 "wms"

---

**最后更新:** 2025-11-18  
**版本:** 1.0  
**状态:** ✅ 就绪
