# TPHK 完整字段保留方案

## 📊 数据结构说明

增强版geocoding脚本现在会**保留所有原始字段**，并添加标准化的英文字段名，方便前端使用。

## 🔄 字段映射对照表

### **承保信息字段（全部保留）**

| 原始字段（中文） | 标准化字段（英文） | 类型 | 说明 |
|-----------------|-------------------|------|------|
| 保單號 | policy_id | String | 保单号码 |
| 保險處所 | address | String | 完整地址（用于geocoding） |
| 分區 | region | String | 香港行政区（自动提取/补充） |
| 公司保額 | sum_insured | Number | 公司承担的保额（TSI核心字段） |
| 佔用性質 | occupancy | String | 占用类型（住宅/商业/工业等） |
| 建築等級 | construction_class | String | 建筑风险等级 |
| 樓層數 | floors | String | 楼层数量 |
| 建造年份 | year_built | String | 建筑年份 |
| 巨災代碼 | event_code | String | 历史事件代码 |
| 巨災名稱 | event_name | String | 历史事件名称（如：台风山竹） |
| 業務類別 | business_type | String | 业务分类 |
| 保單起期 | policy_start | Date | 保单生效日期 |
| 保單止期 | policy_end | Date | 保单终止日期 |
| 險種名稱 | coverage_name | String | 险种名称 |
| 承保地區範圍名稱 | coverage_area | String | 承保区域范围 |
| 所處洲 | continent | String | 所在洲 |
| 國家或地區 | country | String | 国家或地区 |
| 保單幣別 | currency | String | 保单币种 |
| 共保前建築重置價值 | building_replacement_value | Number | 建筑重置价值（Gross） |
| 共保前室內財物價值 | contents_value | Number | 室内财物价值（Gross） |
| 共保前總保險金額 | total_sum_insured_gross | Number | 总保险金额（Gross，分保前） |
| 承保份額 | share_percentage | Number | 承保份额比例 |
| 免賠信息 | deductible_info | String | 免赔额信息 |

### **新增字段（geocoding生成）**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| location | Object | Geocoding结果 |
| location.lat | Number | 纬度 |
| location.lng | Number | 经度 |
| location.formatted_address | String | Google标准化地址 |
| location.place_id | String | Google Place ID |
| location.provider | String | 'google' 或 'amap' |
| location.timestamp | String | Geocoding时间戳 |
| district_source | String | 分区来源：'original'/'geocoding_api'/'address_text' |

## 📦 输出JSON示例

```json
{
  "保單號": "060101012021002085",
  "巨災代碼": "202109",
  "巨災名稱": "台风狮子山",
  "業務類別": "财产险",
  "保單起期": "2021-01-01",
  "保單止期": "2021-12-31",
  "險種名稱": "财产一切险",
  "承保地區範圍名稱": "香港",
  "所處洲": "亚洲",
  "國家或地區": "香港",
  "分區": "葵青區",
  "保險處所": "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.",
  "建築等級": "01E01-CLASS 1 CONSTRUCTION",
  "佔用性質": "STORAGE",
  "樓層數": "8",
  "建造年份": "2015",
  "保單幣別": "HKD",
  "共保前建築重置價值": 5000000,
  "共保前室內財物價值": 2000000,
  "共保前總保險金額": 7000000,
  "承保份額": 0.8,
  "公司保額": 5600000,
  "免賠信息": "HKD 10,000",

  "policy_id": "060101012021002085",
  "address": "8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD, KWAI CHUNG, N.T.",
  "region": "葵青區",
  "sum_insured": 5600000,
  "occupancy": "STORAGE",
  "construction_class": "01E01-CLASS 1 CONSTRUCTION",
  "floors": "8",
  "year_built": "2015",
  "event_code": "202109",
  "event_name": "台风狮子山",
  "business_type": "财产险",
  "policy_start": "2021-01-01",
  "policy_end": "2021-12-31",
  "coverage_name": "财产一切险",
  "coverage_area": "香港",
  "continent": "亚洲",
  "country": "香港",
  "currency": "HKD",
  "building_replacement_value": 5000000,
  "contents_value": 2000000,
  "total_sum_insured_gross": 7000000,
  "share_percentage": 0.8,
  "deductible_info": "HKD 10,000",

  "location": {
    "lat": 22.3580189,
    "lng": 114.1188065,
    "formatted_address": "2-12 Wing Kei Rd, Kwai Chung, Hong Kong",
    "place_id": "ChIJwVAdk8D4AzQRGpmI9DjtZm8",
    "provider": "google",
    "timestamp": "2025-12-05T17:29:36.589770"
  },
  "district_source": "original"
}
```

## 🎯 Portfolio Management 可用字段分析

### **风险累积 (Exposure Management)**

```javascript
// 按分区聚合
groupBy(data, 'region')
  .sum('sum_insured')
  .sum('total_sum_insured_gross')

// 按占用类型分类
groupBy(data, 'occupancy')
  .count('policy_id')

// 按建筑等级分类
groupBy(data, 'construction_class')
  .avg('sum_insured')
```

### **容量管理 (Capacity Management)**

```javascript
// Gross vs Net Exposure
{
  gross: sum('total_sum_insured_gross'),
  net: sum('sum_insured'),
  shareRatio: sum('share_percentage') / count()
}

// 免赔额统计
parse('deductible_info')
  .avg()
```

### **事件关联 (Event Linkage)**

```javascript
// 按历史事件统计
groupBy(data, 'event_name')
  .sum('sum_insured')
  .count('policy_id')

// 时间序列分析
filter(data, {
  policy_start: { $gte: '2020-01-01' },
  policy_end: { $lte: '2024-12-31' }
})
```

### **业务分析 (Business Analytics)**

```javascript
// 按险种分类
groupBy(data, 'coverage_name')
  .sum('sum_insured')
  .count('policy_id')

// 建筑年龄风险
filter(data, {
  year_built: { $lt: '1980' }
})
  .sum('sum_insured')
```

## 💡 前端使用建议

### **1. 使用标准化字段名**
```typescript
// ✅ 推荐：使用英文字段
portfolio.sum_insured
portfolio.occupancy
portfolio.region

// ❌ 避免：直接使用中文字段（可能有编码问题）
portfolio['公司保額']
```

### **2. 保留中文字段用于导出**
```typescript
// 导出Excel时使用中文字段名
exportToExcel(portfolio, {
  headers: 'chinese' // 使用原始中文字段名
})
```

### **3. 双语支持**
```typescript
interface Portfolio {
  // 英文字段用于程序逻辑
  policy_id: string;
  sum_insured: number;
  region: string;

  // 中文字段用于显示和导出
  保單號: string;
  公司保額: number;
  分區: string;
}
```

## 📊 数据统计

### **字段完整性保障**

- ✅ **所有原始字段**：100%保留
- ✅ **中文字段名**：原样保留
- ✅ **英文字段名**：新增标准化映射
- ✅ **Geocoding结果**：完整嵌入
- ✅ **分区信息**：自动提取/补充

### **数据质量增强**

- 分区覆盖率：从 ~60% → 预计 ~98%
- 地理坐标：从 0% → 预计 95%+
- 字段标准化：新增23个英文字段映射

---

**创建时间**: 2025-12-05
**版本**: 2.0 Enhanced
**状态**: 保留所有字段 ✅
