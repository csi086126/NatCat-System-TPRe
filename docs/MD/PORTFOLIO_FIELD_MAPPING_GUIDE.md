# Portfolio 字段映射功能使用指南

## 功能概述

这是一个灵活的数据匹配系统，允许你将**任意 CSV 保单数据**与 **Shapefile 地理边界**进行匹配，并在地图上可视化显示。

### 核心特性
✅ **智能字段检测** - 自动识别 CSV 和 Shapefile 中的可用字段  
✅ **灵活匹配配置** - 支持任意字段的匹配（不区分大小写）  
✅ **多列数据显示** - 可选择任意数值列进行可视化  
✅ **详细数据弹窗** - 点击地图区域查看所有数据列  
✅ **风险热图** - 基于选定数值列的颜色深度映射  

---

## 使用步骤

### 步骤 1: 上传 Shapefile

1. 切换到 **Regional** 视图
2. 在 "Cresta Zone Shapefile" 区域上传你的 Shapefile（.zip 或 .shp）
3. 系统会自动检测所有字段（如 `ADM1_PCODE`, `ADM1_EN`, `ZONE_CODE` 等）
4. 从下拉菜单选择要显示的 Shapefile

**示例 - 泰国行政边界:**
```
文件: tha_admbnda_adm1_rtsd_20190221.zip
字段: ADM1_EN, ADM1_PCODE, ADM1_TH, ADM0_EN, Shape_Area...
```

### 步骤 2: 上传 CSV 保单数据

1. 在 "Portfolio CSV 数据" 区域上传你的 CSV 文件
2. 系统会自动检测所有列名和数值列
3. CSV 会被解析并等待字段映射配置

**示例 - 泰国保单数据:**
```csv
ADM1_EN,ADM1_PCODE,Gross_FL_Fire,Gross_FL_IAR,Gross_FL_Eng,Gross_FL_Total,...
Amnat Charoen,TH37,0.75,0.4,0,1.15,...
Ang Thong,TH35,1.32,1.91,0.03,3.26,...
Bangkok,TH10,45.67,23.45,1.23,70.35,...
```

### 步骤 3: 配置字段映射

在 "🔧 字段匹配配置" 区域：

1. **Shapefile 匹配字段**: 选择 Shapefile 中的字段（如 `ADM1_PCODE`）
2. **CSV 匹配字段**: 选择 CSV 中对应的字段（如 `ADM1_PCODE`）
3. **显示数值列**: 选择要在地图上可视化的列（如 `Gross_FL_Fire`）

**匹配逻辑:**
- 不区分大小写（`TH37` = `th37` = `Th37`）
- 自动去除首尾空格
- 支持任意文本或数字字段匹配

### 步骤 4: 应用匹配

点击 **"✓ 应用匹配"** 按钮，系统会：
1. 根据选定字段进行数据匹配
2. 生成热图（颜色深度反映数值大小）
3. 在地图上显示匹配结果

---

## 地图可视化

### 颜色方案

地图使用蓝色渐变来表示数值大小：

| 风险等级 | 数值范围 | 颜色 | 说明 |
|---------|---------|------|------|
| **Very High** | > 80% | 深蓝 #1E40AF | 最高值区域 |
| **High** | 60-80% | 蓝色 #3B82F6 | 高值区域 |
| **Medium** | 40-60% | 中蓝 #60A5FA | 中等值区域 |
| **Low** | 20-40% | 浅蓝 #93C5FD | 低值区域 |
| **Very Low** | < 20% | 极浅蓝 #BFDBFE | 最低值区域 |
| **No Data** | 无数据 | 灰色 #D1D5DB | 未匹配区域 |

### 交互功能

- **鼠标悬停**: 区域边框加粗，颜色加深
- **点击区域**: 显示详细数据弹窗
- **弹窗内容**:
  - 区域名称和匹配字段值
  - 选定的显示列（高亮显示）
  - 所有其他数值列
  - 风险等级评估
  - 高风险警告（>60%）

---

## 实际应用示例

### 示例 1: 泰国洪水保险暴露分析

**数据文件:**
- Shapefile: `tha_admbnda_adm1_rtsd_20190221.zip`（泰国省级行政边界）
- CSV: `Thailand_Portfolio.csv`（泰国保单数据）

**字段映射:**
- Shapefile 字段: `ADM1_PCODE`
- CSV 字段: `ADM1_PCODE`
- 显示列: `Gross_FL_Fire`（洪水火灾总暴露）

**用途:**
向领导展示各省的洪水保险暴露分布，识别高风险累积区域。

### 示例 2: Cresta Zone 风险分析

**数据文件:**
- Shapefile: `cresta-zones-asia.geojson`
- CSV: `portfolio-by-cresta.csv`

**字段映射:**
- Shapefile 字段: `CRESTA`
- CSV 字段: `zone_code`
- 显示列: `TSI`（Total Sum Insured）

**用途:**
分析再保险组合在 Cresta Zone 上的暴露累积。

### 示例 3: 多列对比分析

**显示列切换:**
1. 选择 `Gross_FL_Fire` 查看火灾暴露
2. 切换到 `Gross_EQ_Total` 查看地震暴露
3. 对比不同风险的地理分布

---

## 数据格式要求

### CSV 文件要求

```csv
✅ 必须包含：
- 至少一个匹配字段（文本或数字）
- 至少一个数值列用于显示

✅ 支持的数值格式：
- 整数: 100, 1000, 50000
- 小数: 1.5, 23.45, 0.75
- 科学计数: 1.5e6, 2.3E5

❌ 不支持：
- 包含货币符号的数字: $100, ¥1000
- 百分比: 50%, 75%（需要去除%符号）
- 包含逗号的数字: 1,000,000（应为 1000000）
```

### Shapefile 要求

```
✅ 支持格式：
- .zip（包含 .shp, .shx, .dbf, .prj）
- .shp（需要手动上传所有相关文件）
- .geojson

✅ 必须包含：
- geometry（几何图形数据）
- properties（属性数据，包含匹配字段）

✅ 推荐字段命名：
- ADM1_PCODE, ADM2_PCODE（行政区划代码）
- ADM1_EN, ADM2_EN（英文名称）
- ZONE_CODE, CRESTA（区域代码）
```

---

## 故障排查

### 问题 1: 无法匹配数据

**症状**: 地图全部显示为灰色（无数据）

**可能原因:**
1. 匹配字段选择错误
2. 字段值格式不一致（如带前缀、后缀）
3. CSV 或 Shapefile 编码问题

**解决方法:**
```javascript
// 检查字段值示例
console.log('Shapefile 样例:', feature.properties.ADM1_PCODE);  // "TH37"
console.log('CSV 样例:', csvRow.ADM1_PCODE);  // "TH37"

// 确保值完全一致（不区分大小写）
```

### 问题 2: 部分区域无数据

**症状**: 部分区域有颜色，部分显示灰色

**可能原因:**
- CSV 数据不完整，缺少某些区域的记录
- 字段值拼写不一致

**解决方法:**
- 检查 CSV 是否包含所有区域
- 验证字段值的一致性

### 问题 3: 数值列无法选择

**症状**: "显示数值列" 下拉菜单为空

**可能原因:**
- CSV 中的数值列被识别为文本
- 数值包含非数字字符

**解决方法:**
```csv
❌ 错误格式:
Gross_FL_Fire
"1,234.56"       // 包含引号和逗号
$1000            // 包含货币符号

✅ 正确格式:
Gross_FL_Fire
1234.56          // 纯数字
1000             // 纯数字
```

---

## 高级功能

### 1. 查看所有数据列

点击地图区域的弹窗会显示：
- **高亮显示**: 当前选择的显示列
- **完整列表**: 所有其他数值列及其值

这使得你可以向领导展示某个区域的完整保单信息，而不仅仅是单一指标。

### 2. 风险等级评估

系统自动计算每个区域的风险等级：
- 基于该区域数值占最大值的百分比
- 提供直观的颜色标识和文字说明
- 高风险区域（>60%）会显示警告信息

### 3. 动态切换显示列

无需重新上传数据：
1. 在字段映射配置中更改 "显示数值列"
2. 点击 "应用匹配"
3. 地图立即更新为新的数值分布

### 4. 多 Shapefile 管理

- 可以上传多个 Shapefile
- 从下拉菜单切换显示不同的边界
- 每个 Shapefile 可以有不同的字段配置

---

## 最佳实践

### 1. 数据准备

```bash
# 确保 CSV 使用 UTF-8 编码
iconv -f GBK -t UTF-8 input.csv > output.csv

# 检查 CSV 字段名（首行）
head -1 portfolio.csv

# 检查数值格式
awk -F',' '{print $3}' portfolio.csv | head -5
```

### 2. 字段命名建议

| 数据类型 | 推荐字段名 | 示例值 |
|---------|-----------|--------|
| 行政区划代码 | ADM1_PCODE, ADM2_PCODE | TH37, TH10 |
| 区域名称 | ADM1_EN, province | Bangkok, Chiang Mai |
| 区域代码 | zone_code, CRESTA | Z001, CRE123 |
| 暴露金额 | tsi, exposure, sum_insured | 1000000 |
| 保费 | premium, gross_premium | 50000 |
| 保单数 | policy_count, num_policies | 150 |

### 3. 演示技巧

向领导展示时：
1. **先展示整体分布**: 选择总暴露（TSI）作为显示列
2. **切换到具体险种**: 如洪水暴露、地震暴露
3. **点击高风险区域**: 展示详细数据和警告信息
4. **对比多个指标**: 快速切换不同数值列

---

## API 集成（未来扩展）

当前版本为前端实现。未来可扩展为：

```typescript
// API 端点示例
POST /api/portfolio/match
{
  "shapefileId": "sf-12345",
  "csvData": [...],
  "matchFields": {
    "shapefile": "ADM1_PCODE",
    "csv": "ADM1_PCODE"
  },
  "displayField": "Gross_FL_Fire"
}

// 响应
{
  "matchedZones": 77,
  "unmatchedZones": 3,
  "totalExposure": 125000000,
  "maxValue": 45670000,
  "data": [...]
}
```

---

## 参考资源

- [Shapefile 规范](https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf)
- [GeoJSON 格式](https://geojson.org/)
- [GADM 数据库](https://gadm.org/) - 全球行政边界
- [Leaflet 文档](https://leafletjs.com/) - 地图库

---

## 技术支持

如遇问题，请检查：
1. 浏览器控制台的日志输出
2. CSV 和 Shapefile 的字段名列表
3. 字段值的示例数据

常用调试命令（浏览器控制台）：
```javascript
// 查看 CSV 列名
console.log(csvHeaders);

// 查看 Shapefile 字段
console.log(shapefileFields);

// 查看匹配配置
console.log({ matchFieldShapefile, matchFieldCSV, displayField });

// 查看匹配结果
console.log(portfolioData);
```

---

**版本**: 1.0.0  
**更新日期**: 2025-10-28  
**作者**: Portfolio Management System
