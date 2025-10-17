# 再保险公司资产数据来源策略

## 🌍 再保险业务特点

作为**再保险公司**（Reinsurer），与直保公司（Direct Insurer）的数据来源完全不同：

### 关键差异
```
直保公司 (Direct Insurer):
├── 直接面对客户
├── 自己的承保系统
└── 掌握完整的资产详情

再保险公司 (Reinsurer):
├── 客户是保险公司（Cedent/Ceding Company）
├── 接收来自多个业务伙伴的数据
├── 覆盖多个国家和地区
├── 数据格式和标准不统一
└── 需要数据整合和标准化
```

---

## 📊 再保险公司的数据来源

### 1. 来自分出公司（Ceding Companies）的数据

#### 1.1 数据提交方式

**A. 定期数据报送（Most Common）**
```
业务伙伴每季度/半年提交数据：
├── Excel 文件
├── CSV 文件
├── PDF 报告
└── 标准化数据模板
```

**特点**：
- ✅ 最常见的方式
- ✅ 分出公司按约定格式提交
- ⚠️ 格式可能不统一
- ⚠️ 数据质量参差不齐
- ⚠️ 更新频率较低（季度/半年）

**示例数据结构**：
```javascript
// 分出公司A（香港某直保公司）提交的数据
{
  "cedentName": "Hong Kong Insurance Co.",
  "cedentCode": "HKIC",
  "reportingPeriod": "2024-Q3",
  "treaty": "Property Cat XL 2024",
  "exposureData": [
    {
      "policyId": "HKIC-2024-001",
      "insuredName": "Central Plaza",
      "propertyType": "Commercial",
      "address": "18 Harbour Road, Wan Chai",
      "coordinates": [114.1722, 22.2783],
      "totalInsuredValue": 8500000000,
      "reinsuranceShare": 0.6, // 再保份额 60%
      "sumInsured": 5100000000, // 再保承担金额
      "premium": 720000,
      "occupancy": "Office",
      "construction": "Concrete",
      "yearBuilt": 1992
    },
    // ... 更多资产
  ]
}

// 分出公司B（澳门某直保公司）提交的数据
{
  "cedentName": "Macau Property Insurance Ltd.",
  "cedentCode": "MPIL",
  "reportingPeriod": "2024-Q3",
  "treaty": "Property Cat XL 2024",
  "exposureData": [
    {
      "policyNumber": "MAC-2024-0123",
      "propertyName": "Grand Lisboa Hotel",
      "propertyCategory": "Hotel",
      "location": "Avenida de Lisboa, Macau",
      "latitude": 22.1897,
      "longitude": 113.5439,
      "insuredAmount": 3200000000,
      "reinsurancePercentage": 75,
      "reinsuredAmount": 2400000000,
      // ... 不同的字段命名
    }
  ]
}
```

**问题**：
- 不同分出公司使用不同的字段名
- 数据格式不统一
- 需要数据映射和清洗

---

#### 1.2 API对接（Modern Approach）

**适用场景**：
- 大型、技术先进的分出公司
- 长期战略合作伙伴
- 高价值业务

**数据流向**：
```
分出公司承保系统
    ↓ API推送
再保险公司数据接收平台
    ↓ 数据清洗和标准化
洪水灾害风险系统
```

**优点**：
- ✅ 实时或准实时数据
- ✅ 数据质量较好
- ✅ 自动化程度高

**挑战**：
- ⚠️ 需要技术对接成本
- ⚠️ 不是所有分出公司都有能力
- ⚠️ 需要统一标准

---

#### 1.3 经纪人/中介提供的数据

**场景**：
```
客户（分出公司）
    ↓
再保险经纪人（Reinsurance Broker）
    ↓ 整合数据
再保险公司
```

**特点**：
- 经纪人会整理和标准化数据
- 通常提供Excel/PDF格式
- 包含多个分出公司的合并数据

---

### 2. 行业数据库和第三方数据

#### 2.1 商业风险数据提供商

**主要供应商**：
- **RMS (Risk Management Solutions)**
  - 全球资产数据库
  - 灾害模型数据
  
- **AIR Worldwide**
  - 暴露度数据
  - 风险评估工具

- **CoreLogic**
  - 房地产数据
  - GIS数据

- **Verisk**
  - 保险行业数据
  - 承保数据

**数据内容**：
```javascript
// RMS 提供的标准化资产数据
{
  "geocode": "HKG-HKI-CW-001",
  "address": "1 Connaught Road Central",
  "coordinates": [114.1589, 22.2853],
  "occupancy": "Office",
  "constructionClass": "C1", // RMS标准
  "yearBuilt": 2003,
  "numberOfStories": 52,
  "totalArea": 120000,
  "replacementValue": 6000000000,
  "floodZone": "High",
  "tsunamiZone": "Medium",
  "earthquakeZone": "Low"
}
```

**优点**：
- ✅ 数据标准化
- ✅ 覆盖范围广
- ✅ 包含风险评估
- ✅ 定期更新

**成本**：
- 💰 需要购买数据服务
- 💰 按使用量付费

---

#### 2.2 公开数据源

**免费/低成本数据**：
- **OpenStreetMap** - 建筑物位置
- **Government GIS** - 各国政府地理数据
- **USGS/NOAA** - 灾害历史数据
- **World Bank** - 经济和资产数据

---

### 3. 历史理赔数据

**来源**：
```
再保险公司自己的理赔系统
├── 历史分出公司理赔记录
├── 损失金额
├── 事件关联
└── 资产损失历史
```

**用途**：
- 验证资产风险评分
- 改进损失预测模型
- 识别高风险资产

---

## 🏗️ 再保险公司的数据架构

### 推荐架构：多源数据整合平台

```
┌─────────────────────────────────────────────────────────┐
│                   洪水灾害风险系统                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         数据标准化和清洗层                        │    │
│  │  - 字段映射                                       │    │
│  │  - 数据验证                                       │    │
│  │  - 坐标转换                                       │    │
│  │  - 格式统一                                       │    │
│  └─────────────────────────────────────────────────┘    │
│                         ↑                                │
│  ┌──────────┬──────────┼──────────┬──────────┐         │
│  │          │          │          │          │          │
│  │  分出公司A │  分出公司B │  经纪人C  │  RMS数据 │  历史理赔│
│  │  (Excel) │  (API)   │ (Excel)  │  (API)   │ (数据库) │
│  │  香港     │  澳门    │  多地区   │  全球    │  内部   │
│  │          │          │          │          │          │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 📋 数据标准化流程

### 步骤1: 接收多源数据

**支持的输入格式**：
```
1. Excel文件 (.xlsx, .xls)
   - 不同分出公司的模板
   - 需要映射配置

2. CSV文件
   - 标准化字段
   - 批量导入

3. API接口
   - JSON格式
   - 实时推送

4. GeoJSON / Shapefile
   - GIS数据
   - 空间数据

5. PDF报告
   - OCR提取
   - 人工核验
```

### 步骤2: 数据映射配置

**为每个分出公司配置映射规则**：
```javascript
// 配置文件：cedent-mappings.json
{
  "HKIC": { // 香港某直保公司
    "name": "Hong Kong Insurance Co.",
    "fieldMapping": {
      "policyId": "policyNumber",
      "insuredName": "propertyName",
      "totalInsuredValue": "sumInsured",
      "coordinates": {
        "lat": "latitude",
        "lon": "longitude"
      }
    },
    "valueTransforms": {
      "totalInsuredValue": "multiply:1000000", // 转换单位
      "construction": {
        "RC": "Reinforced Concrete",
        "ST": "Steel",
        "WD": "Wood"
      }
    }
  },
  "MPIL": { // 澳门某直保公司
    "name": "Macau Property Insurance Ltd.",
    "fieldMapping": {
      "policyNumber": "policyId",
      "propertyName": "insuredName",
      "insuredAmount": "totalInsuredValue",
      // ... 不同的映射
    }
  }
}
```

### 步骤3: 数据验证和清洗

**验证规则**：
```javascript
const validationRules = {
  required: ['id', 'name', 'coordinates', 'totalInsuredValue'],
  
  coordinates: {
    lat: { min: -90, max: 90 },
    lon: { min: -180, max: 180 }
  },
  
  totalInsuredValue: {
    min: 0,
    max: 100000000000 // 100B
  },
  
  yearBuilt: {
    min: 1800,
    max: new Date().getFullYear()
  },
  
  // 地区验证
  region: ['Hong Kong', 'Macau', 'Singapore', 'Taiwan', ...]
};
```

### 步骤4: 统一存储

**标准化后的数据结构**：
```javascript
{
  // 基本信息
  "id": "ASSET-HKIC-2024-001",
  "name": "Central Plaza",
  "type": "Commercial Building",
  "address": "18 Harbour Road, Wan Chai, Hong Kong",
  "coordinates": [114.1722, 22.2783],
  
  // 分出公司信息
  "cedentInfo": {
    "cedentCode": "HKIC",
    "cedentName": "Hong Kong Insurance Co.",
    "cedentCountry": "Hong Kong",
    "originalPolicyId": "HKIC-2024-001"
  },
  
  // 再保险信息
  "reinsuranceInfo": {
    "treaty": "Property Cat XL 2024",
    "layer": "2nd Layer",
    "reinsuranceShare": 0.6,
    "sumInsured": 5100000000,
    "premium": 720000,
    "deductible": 500000
  },
  
  // 资产信息
  "totalInsuredValue": 8500000000,
  "construction": "Reinforced Concrete",
  "yearBuilt": 1992,
  "occupancy": "Office",
  "buildingArea": 45000,
  
  // 风险信息
  "region": "Hong Kong",
  "district": "Wan Chai",
  "floodZone": "Medium",
  "floodRiskScore": 6.8,
  
  // 元数据
  "dataSource": "cedent_submission",
  "submissionDate": "2024-10-01",
  "lastUpdated": "2024-10-16",
  "dataQuality": "verified"
}
```

---

## 🔧 技术实现

### 1. 多源数据导入API

```typescript
// src/app/api/assets/import/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const cedentCode = formData.get('cedentCode') as string;
  const dataType = formData.get('dataType') as string; // 'excel' | 'csv' | 'geojson'
  
  try {
    // 1. 读取文件
    const data = await parseFile(file, dataType);
    
    // 2. 获取该分出公司的映射配置
    const mapping = await getCedentMapping(cedentCode);
    
    // 3. 应用映射规则
    const mappedData = applyMapping(data, mapping);
    
    // 4. 数据验证
    const validation = validateData(mappedData);
    
    if (validation.hasErrors) {
      return NextResponse.json({
        success: false,
        errors: validation.errors,
        validCount: validation.validCount,
        invalidCount: validation.invalidCount
      });
    }
    
    // 5. 数据标准化
    const standardizedAssets = standardizeAssets(mappedData, cedentCode);
    
    // 6. 保存到数据库
    await saveAssets(standardizedAssets);
    
    // 7. 触发风险计算
    await calculateRiskScores(standardizedAssets);
    
    return NextResponse.json({
      success: true,
      imported: standardizedAssets.length,
      cedent: mapping.name,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### 2. 分出公司管理API

```typescript
// src/app/api/cedents/route.ts

// 获取所有分出公司
export async function GET() {
  const cedents = await getAllCedents();
  return NextResponse.json({ cedents });
}

// 添加新的分出公司
export async function POST(request: NextRequest) {
  const { code, name, country, mapping } = await request.json();
  
  await createCedent({
    code,
    name,
    country,
    fieldMapping: mapping,
    status: 'active'
  });
  
  return NextResponse.json({ success: true });
}

// 更新映射配置
export async function PUT(request: NextRequest) {
  const { code, mapping } = await request.json();
  
  await updateCedentMapping(code, mapping);
  
  return NextResponse.json({ success: true });
}
```

### 3. 数据映射工具

```typescript
function applyMapping(data: any[], mapping: CedentMapping): any[] {
  return data.map(row => {
    const mapped: any = {};
    
    // 应用字段映射
    for (const [targetField, sourceField] of Object.entries(mapping.fieldMapping)) {
      if (typeof sourceField === 'string') {
        mapped[targetField] = row[sourceField];
      } else if (typeof sourceField === 'object') {
        // 复杂映射（如坐标）
        mapped[targetField] = Object.entries(sourceField).reduce((acc, [key, field]) => {
          acc[key] = row[field as string];
          return acc;
        }, {} as any);
      }
    }
    
    // 应用值转换
    if (mapping.valueTransforms) {
      for (const [field, transform] of Object.entries(mapping.valueTransforms)) {
        if (typeof transform === 'string' && transform.startsWith('multiply:')) {
          const factor = parseFloat(transform.split(':')[1]);
          mapped[field] = mapped[field] * factor;
        } else if (typeof transform === 'object') {
          // 值映射（如代码转文本）
          mapped[field] = transform[mapped[field]] || mapped[field];
        }
      }
    }
    
    return mapped;
  });
}
```

---

## 📊 UI设计：资产管理界面

### 左侧边栏新增：分出公司管理

```tsx
<Card>
  <CardHeader>
    <CardTitle>Data Import</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* 选择分出公司 */}
    <div>
      <Label>Ceding Company</Label>
      <Select value={selectedCedent} onValueChange={setSelectedCedent}>
        <SelectTrigger>
          <SelectValue placeholder="Select cedent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="HKIC">Hong Kong Insurance Co.</SelectItem>
          <SelectItem value="MPIL">Macau Property Insurance Ltd.</SelectItem>
          <SelectItem value="SGIG">Singapore Insurance Group</SelectItem>
          <SelectItem value="TWPC">Taiwan Property & Casualty</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {/* 上传文件 */}
    <div>
      <Label>Data File</Label>
      <Input type="file" accept=".xlsx,.xls,.csv,.geojson" onChange={handleFileSelect} />
    </div>
    
    {/* 导入按钮 */}
    <Button onClick={handleImport} className="w-full">
      Import Data
    </Button>
    
    {/* 下载模板 */}
    <Button variant="outline" className="w-full">
      Download Template
    </Button>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>Asset Filtering</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* 按分出公司筛选 */}
    <div>
      <Label>Ceding Company</Label>
      <Select>
        <SelectTrigger><SelectValue placeholder="All cedents" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cedents</SelectItem>
          <SelectItem value="HKIC">Hong Kong Insurance Co.</SelectItem>
          <SelectItem value="MPIL">Macau Property Insurance</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {/* 按国家/地区筛选 */}
    <div>
      <Label>Region</Label>
      <Select>
        <SelectTrigger><SelectValue placeholder="All regions" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          <SelectItem value="HK">Hong Kong</SelectItem>
          <SelectItem value="MO">Macau</SelectItem>
          <SelectItem value="SG">Singapore</SelectItem>
          <SelectItem value="TW">Taiwan</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {/* 按合约筛选 */}
    <div>
      <Label>Treaty</Label>
      <Select>
        <SelectTrigger><SelectValue placeholder="All treaties" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Treaties</SelectItem>
          <SelectItem value="cat-xl-2024">Property Cat XL 2024</SelectItem>
          <SelectItem value="qsh-2024">Quota Share 2024</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {/* 其他筛选条件 */}
    <div>
      <Label>Asset Value Range</Label>
      <Input placeholder="e.g., 1M - 100M" />
    </div>
    
    <Button variant="outline" className="w-full">
      Apply Filters
    </Button>
  </CardContent>
</Card>
```

### 右侧面板：资产详情（增强版）

```tsx
<Card>
  <CardHeader>
    <CardTitle>Asset Details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 基本信息 */}
    <div>
      <h3 className="font-semibold">Basic Information</h3>
      <div className="text-sm space-y-1">
        <div>ID: {asset.id}</div>
        <div>Name: {asset.name}</div>
        <div>Address: {asset.address}</div>
      </div>
    </div>
    
    {/* 分出公司信息 */}
    <div>
      <h3 className="font-semibold text-blue-600">Cedent Information</h3>
      <div className="text-sm space-y-1">
        <div>Cedent: {asset.cedentInfo.cedentName}</div>
        <div>Country: {asset.cedentInfo.cedentCountry}</div>
        <div>Original Policy: {asset.cedentInfo.originalPolicyId}</div>
      </div>
    </div>
    
    {/* 再保险信息 */}
    <div>
      <h3 className="font-semibold text-green-600">Reinsurance Terms</h3>
      <div className="text-sm space-y-1">
        <div>Treaty: {asset.reinsuranceInfo.treaty}</div>
        <div>RI Share: {asset.reinsuranceInfo.reinsuranceShare * 100}%</div>
        <div>RI Sum Insured: ${(asset.reinsuranceInfo.sumInsured / 1000000).toFixed(1)}M</div>
        <div>RI Premium: ${(asset.reinsuranceInfo.premium / 1000).toFixed(1)}K</div>
      </div>
    </div>
    
    {/* 风险评估 */}
    <div>
      <h3 className="font-semibold text-orange-600">Risk Assessment</h3>
      <div className="text-sm space-y-1">
        <div>Flood Risk Score: {asset.floodRiskScore}/10</div>
        <div>Flood Zone: {asset.floodZone}</div>
        <div>PML (100-yr): $XXM</div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🎯 实施建议

### Phase 1: 数据导入基础（当前）
1. ✅ 实现Excel/CSV文件导入
2. ✅ 支持2-3个主要分出公司的数据格式
3. ✅ 基本的字段映射配置
4. ✅ 数据验证和错误报告

### Phase 2: 多源数据整合
5. ✅ 添加更多分出公司配置
6. ✅ 实现可视化映射配置界面
7. ✅ 数据质量报告
8. ✅ 批量导入历史数据

### Phase 3: 高级功能
9. ✅ API接口对接（大型分出公司）
10. ✅ 第三方数据集成（RMS/AIR）
11. ✅ 自动化数据更新
12. ✅ 数据血缘追踪

---

## 💡 立即行动

对于你的再保险业务，我建议：

### 立即实现：
1. **多分出公司数据导入功能**
   - 支持Excel/CSV上传
   - 配置2-3个分出公司的字段映射
   - 数据验证和清洗

2. **生成测试数据**
   - 模拟3个分出公司的数据
   - 覆盖香港、澳门、新加坡等地区
   - 包含不同的数据格式

需要我帮你实现哪个？🚀
