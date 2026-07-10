# 资产管理数据来源方案

## 📊 数据来源分析

在真实的保险业务系统中，资产数据通常来自**多个渠道**，而不是单一的手动录入。

## 🔄 数据来源方案对比

### 方案1: 手动单条录入 ❌
**适用场景**: 极少使用，仅用于临时或特殊资产

**优点**:
- 灵活，可以录入任何特殊情况
- 适合小规模测试

**缺点**:
- ❌ 效率极低
- ❌ 容易出错
- ❌ 无法处理大规模数据
- ❌ 不符合实际业务流程

**结论**: 不推荐作为主要数据来源

---

### 方案2: 批量文件导入 ✅ (推荐)
**适用场景**: 初始化数据、定期更新、数据迁移

**数据格式**:
- Excel (.xlsx, .xls)
- CSV
- GeoJSON (含地理位置)
- Shapefile (GIS数据)

**典型使用场景**:
```
1. 承保部门提供承保清单 Excel
2. 风险管理部门提供资产GIS数据
3. 从旧系统迁移历史数据
4. 定期批量更新资产信息
```

**优点**:
- ✅ 高效，一次导入成千上万条
- ✅ 可以由业务部门准备数据
- ✅ 支持模板标准化
- ✅ 易于审核和验证

**实现方式**:
```javascript
// 1. 下载模板
GET /api/assets/template
返回: assets_template.xlsx

// 2. 上传文件
POST /api/assets/import
Body: FormData { file: assets.xlsx }

// 3. 预览和验证
返回: {
  total: 1500,
  valid: 1480,
  invalid: 20,
  errors: [...]
}

// 4. 确认导入
POST /api/assets/import/confirm
```

---

### 方案3: API接口集成 ⭐⭐⭐ (最佳实践)
**适用场景**: 与公司核心业务系统实时对接

**集成系统**:
1. **核心业务系统 (Core System)**
   - 承保系统 (Underwriting System)
   - 保单管理系统 (Policy Administration)
   - 理赔系统 (Claims System)

2. **客户关系管理 (CRM)**
   - 客户资产清单
   - 投保信息

3. **企业资源计划 (ERP)**
   - 资产台账
   - 财务数据

4. **GIS系统**
   - 地理信息
   - 空间数据

**数据流向**:
```
核心业务系统 → API Gateway → 洪水灾害系统
     ↓
  自动同步
     ↓
实时更新资产信息
```

**实现方式**:
```javascript
// A. 推送模式 (Push) - 业务系统主动推送
POST /api/assets/sync
Headers: { Authorization: "Bearer xxx" }
Body: {
  source: "underwriting_system",
  timestamp: "2024-10-16T10:00:00Z",
  assets: [
    {
      policyId: "TP-PROP-2024-888",
      insuredName: "ABC Corporation",
      propertyAddress: "1 Connaught Road Central",
      sumInsured: 5200000000,
      ...
    }
  ]
}

// B. 拉取模式 (Pull) - 灾害系统主动查询
GET /external-api/policies?status=active&type=property
返回业务系统中的资产数据

// C. 实时订阅 (WebSocket/Webhook)
业务系统变更 → 触发Webhook → 自动更新
```

**优点**:
- ✅ 数据实时同步
- ✅ 自动化，无需人工干预
- ✅ 数据一致性有保障
- ✅ 支持双向同步（理赔数据回写）
- ✅ 符合企业级架构

---

### 方案4: 数据库直连 ⚠️ (谨慎使用)
**适用场景**: 同一数据中心内，受控环境

**实现方式**:
```sql
-- 直接查询业务系统数据库
SELECT 
  policy_id,
  insured_name,
  property_address,
  sum_insured,
  ...
FROM 
  core_system.policies
WHERE 
  status = 'active'
  AND coverage_type = 'property';
```

**优点**:
- ✅ 数据获取快速
- ✅ 实时性最强

**缺点**:
- ❌ 安全风险
- ❌ 系统耦合度高
- ❌ 难以跨系统
- ❌ 可能影响业务系统性能

**结论**: 仅在受控环境下使用，生产环境推荐API方式

---

## 🏢 太平保险实际场景建议

### 推荐架构：混合模式

```
┌─────────────────────────────────────────────────┐
│           洪水灾害保险系统 (你的系统)              │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. API接口层 (主要数据来源)                     │
│     ↓                                           │
│     接收来自核心系统的保单数据                    │
│     - 新保单自动推送                             │
│     - 保单变更实时同步                           │
│     - 理赔数据回传                               │
│                                                 │
│  2. 批量导入层 (辅助/初始化)                     │
│     ↓                                           │
│     - Excel/CSV批量导入                         │
│     - GIS数据导入                               │
│     - 历史数据迁移                               │
│                                                 │
│  3. 手动录入层 (特殊情况)                        │
│     ↓                                           │
│     - 测试数据                                   │
│     - 临时资产                                   │
│     - 数据修正                                   │
│                                                 │
└─────────────────────────────────────────────────┘
         ↓ 存储到本地数据库/文件系统
         ↓
    资产数据持久化
```

### 具体实施步骤

#### Phase 1: 初期开发 (当前阶段)
**数据来源**: 
- ✅ 批量导入 (Excel/CSV)
- ✅ 手动录入 (测试数据)
- ✅ Mock数据 (演示)

**原因**: 
- 快速开发和测试
- 不依赖外部系统
- 验证功能可行性

#### Phase 2: 内部测试
**数据来源**: 
- ✅ 导入真实保单样本数据
- ✅ 使用脱敏的生产数据
- ✅ 小范围API对接测试

**原因**: 
- 验证数据处理能力
- 测试系统性能
- 准备生产环境

#### Phase 3: 生产环境
**数据来源**: 
- ⭐ **API接口 (主要)** - 与核心系统实时对接
- ✅ 批量导入 (辅助) - 特殊场景
- ✅ 手动录入 (极少) - 紧急情况

**数据流程**:
```
1. 客户投保 
   → 核心承保系统录入保单
   → API自动推送到灾害系统
   → 资产数据入库
   → 自动风险评估

2. 保单变更
   → 核心系统更新
   → Webhook触发通知
   → 灾害系统更新资产
   → 重新计算风险

3. 定期批量更新
   → 每日凌晨全量同步
   → 增量更新检查
   → 数据一致性验证
```

---

## 💾 数据映射关系

### 核心系统字段 → 灾害系统字段

```javascript
// 核心系统保单数据
{
  "policyNumber": "TP-PROP-2024-888",
  "insuredName": "ABC Corporation",
  "propertyAddress": "1 Connaught Road Central, Hong Kong",
  "sumInsured": 5200000000,
  "annualPremium": 1200000,
  "deductible": 500000,
  "coverageType": "Property All Risks",
  "policyStartDate": "2024-01-01",
  "policyEndDate": "2024-12-31",
  "propertyType": "Commercial Building",
  "constructionType": "Reinforced Concrete",
  "yearBuilt": 2015,
  "grossFloorArea": 120000,
  "latitude": 22.3193,
  "longitude": 114.1694
}

// 映射为
↓

// 灾害系统资产数据
{
  "id": "ASSET-" + generateUniqueId(),
  "name": insuredName + " - " + propertyAddress,
  "policyId": policyNumber,
  "address": propertyAddress,
  "coordinates": [longitude, latitude],
  "totalInsuredValue": sumInsured,
  "premium": annualPremium,
  "deductible": deductible,
  "coverageType": coverageType,
  "policyStartDate": policyStartDate,
  "policyEndDate": policyEndDate,
  "type": propertyType,
  "construction": constructionType,
  "yearBuilt": yearBuilt,
  "buildingArea": grossFloorArea,
  "status": "Active",
  "dataSource": "core_system",
  "lastSyncTime": new Date()
}
```

---

## 🔧 技术实现

### 1. API接口实现

**创建同步API**:
```typescript
// src/app/api/assets/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证API密钥
    const apiKey = request.headers.get('X-API-Key');
    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 接收数据
    const { source, assets } = await request.json();

    // 3. 数据转换和验证
    const validatedAssets = assets.map(transformAsset);

    // 4. 存储到数据库
    await saveAssets(validatedAssets);

    // 5. 触发风险评估
    await calculateRiskScores(validatedAssets);

    return NextResponse.json({
      success: true,
      message: `${validatedAssets.length} assets synced`,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

### 2. 批量导入实现

**Excel导入**:
```typescript
// 使用 xlsx 库解析 Excel
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 1. 读取Excel
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // 2. 转换为JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  // 3. 验证和转换
  const assets = data.map((row: any) => ({
    id: generateAssetId(),
    name: row['资产名称'],
    type: row['资产类型'],
    address: row['地址'],
    coordinates: [row['经度'], row['纬度']],
    totalInsuredValue: parseFloat(row['保险金额']),
    // ... 更多字段映射
  }));

  // 4. 保存
  await saveAssets(assets);

  return NextResponse.json({
    success: true,
    imported: assets.length
  });
}
```

### 3. 定时同步任务

**使用 node-cron 定时同步**:
```typescript
// 每天凌晨2点同步
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily asset sync...');
  
  // 从核心系统拉取最新数据
  const response = await fetch('https://core-system/api/policies', {
    headers: { 'Authorization': 'Bearer xxx' }
  });
  
  const policies = await response.json();
  
  // 更新本地数据
  await syncAssets(policies);
  
  console.log('Daily sync completed');
});
```

---

## 📋 实施建议

### 当前阶段 (开发测试)
1. ✅ **先实现批量导入功能**
   - 提供Excel模板下载
   - 实现文件上传和解析
   - 数据验证和错误提示

2. ✅ **准备测试数据**
   - 创建50-100条模拟资产数据
   - 包含不同类型、地区、风险等级
   - 用于测试各项功能

3. ✅ **手动录入作为补充**
   - 用于特殊测试场景
   - 快速添加单个资产

### 近期目标 (内部测试)
4. ✅ **设计API接口规范**
   - 定义数据格式
   - 设计认证机制
   - 文档化API

5. ✅ **小范围对接测试**
   - 与IT部门沟通
   - 获取测试环境访问权限
   - 验证数据同步

### 长期目标 (生产环境)
6. ⭐ **完整API集成**
   - 实时数据同步
   - 双向数据流
   - 监控和告警

7. ⭐ **数据治理**
   - 数据质量监控
   - 一致性检查
   - 审计日志

---

## 🎯 结论

**对于你的项目，建议采用以下策略**:

### 短期 (现在-1个月)
- **主要**: 批量导入 (Excel/CSV)
- **辅助**: 手动录入
- **目的**: 快速开发和功能验证

### 中期 (1-3个月)
- **主要**: 批量导入 + API接口测试
- **辅助**: 手动录入
- **目的**: 内部测试和准备上线

### 长期 (3个月后)
- **主要**: API接口自动同步
- **辅助**: 批量导入 (特殊场景)
- **极少**: 手动录入
- **目的**: 生产环境稳定运行

---

## 💡 立即行动

我建议先实现 **批量导入功能**，这样可以：
1. 快速导入测试数据
2. 不依赖外部系统
3. 验证所有功能
4. 为API集成做准备

需要我帮你实现以下哪个？

1. **创建Excel导入模板和导入功能**
2. **设计API接口规范文档**
3. **生成测试数据集**
4. **实现资产数据展示功能**

选择一个，我立即开始！🚀
