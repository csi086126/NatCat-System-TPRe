# 太平再保险 Portfolio Management 系统设计方案

> **版本：** 1.0  
> **日期：** 2025-10-26  
> **目标用户：** 太平再保险承保部门、风险管理部门、精算部门

---

## 📋 目录

1. [业务背景](#业务背景)
2. [核心功能模块](#核心功能模块)
3. [页面布局设计](#页面布局设计)
4. [数据结构设计](#数据结构设计)
5. [Extensions 功能规划](#extensions-功能规划)
6. [实施路线图](#实施路线图)

---

## 🎯 业务背景

### 再保险业务特点

与原保险公司不同，**再保险公司的 Portfolio Management** 需要管理：

1. **多层级风险暴露**
   - Treaty（合约）层级
   - Cedant（原保险公司）层级
   - 地理区域层级
   - 灾害类型层级

2. **复杂的合约结构**
   - Quota Share（比例再保险）
   - Excess of Loss（超额赔款）
   - Stop Loss（停止损失）
   - Catastrophe XL（巨灾超赔）

3. **风险累积监控**
   - 单一事件可能触发多个合约
   - 需要实时监控累积暴露
   - 限额使用率预警

4. **监管合规要求**
   - Solvency II（欧盟）
   - C-ROSS（中国）
   - RBC（美国）

---

## 🏗️ 核心功能模块

### 模块 1：Treaty Portfolio Management（合约组合管理）

**功能描述：**
管理所有再保险合约的基本信息、条款、限额和费率。

**核心数据：**
- Treaty ID / Name
- Cedant（原保险公司）
- Treaty Type（QS, XL, Stop Loss, Cat XL）
- Coverage（Property, Casualty, Marine）
- Geographic Scope（HK, Macau, GBA, ASEAN）
- Treaty Limit（合约限额）
- Premium（保费）
- Comission（佣金）
- Retention（自留额）
- Layer（责任层级，如 $10M xs $5M）
- Effective Period（生效期）
- Status（Active, Expired, Pending）

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────┐
│ Left Sidebar (Treaty Filter)                                    │
├─────────────────────────────────────────────────────────────────┤
│ □ By Treaty Type                                                │
│   □ Quota Share                                                 │
│   □ Excess of Loss                                              │
│   □ Catastrophe XL                                              │
│   □ Stop Loss                                                   │
│                                                                 │
│ □ By Cedant                                                     │
│   Select: [Dropdown with cedants]                              │
│                                                                 │
│ □ By Region                                                     │
│   □ Hong Kong                                                   │
│   □ Macau                                                       │
│   □ GBA                                                         │
│   □ ASEAN                                                       │
│                                                                 │
│ □ By Status                                                     │
│   □ Active                                                      │
│   □ Expiring Soon (<90 days)                                   │
│   □ Expired                                                     │
│                                                                 │
│ [Button: Export Treaty List]                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Main Area (Treaty Data Table)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Treaty ID | Cedant    | Type    | Region | Limit      | Status │
│ TP-HK-001 | ABC Ins.  | Cat XL  | HK     | $50M       | Active │
│ TP-GBA-05 | XYZ Re    | QS      | GBA    | $100M      | Active │
│ TP-MO-012 | DEF Life  | XL      | Macau  | $20M xs 5M | Active │
│ ...                                                             │
│                                                                 │
│ [Pagination: 1 2 3 ... Next]                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Right Sidebar (Treaty Detail)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Treaty: TP-HK-001                                               │
│ Cedant: ABC Insurance Company                                   │
│ Type: Catastrophe XL                                            │
│ Coverage: Property - Typhoon & Flood                            │
│                                                                 │
│ Financial Terms:                                                │
│ - Treaty Limit: $50,000,000                                     │
│ - Layer: $50M xs $10M                                           │
│ - Premium: $2,500,000                                           │
│ - Loss Ratio: 65%                                               │
│                                                                 │
│ Geographic Scope:                                               │
│ - Hong Kong Island                                              │
│ - Kowloon                                                       │
│ - New Territories                                               │
│                                                                 │
│ [Button: View on Map]                                           │
│ [Button: View Exposure Analysis]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### 模块 2：Risk Accumulation Dashboard（风险累积仪表板）

**功能描述：**
实时监控风险在不同维度的累积情况，识别潜在的集中风险。

**核心指标：**

1. **地理累积（Geographic Accumulation）**
   - 按国家/地区统计总暴露
   - 热力图展示高风险区域
   - 单点最大累积（如：香港中环 CBD）

2. **灾害类型累积（Peril Accumulation）**
   - 台风暴露总额
   - 洪水暴露总额
   - 地震暴露总额
   - 多灾害叠加风险

3. **行业累积（Industry Accumulation）**
   - 金融业累积暴露
   - 制造业累积暴露
   - 房地产累积暴露

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Banner (Key Metrics Cards)                                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│ │Total        │ │Hong Kong    │ │Typhoon      │ │Highest    │ │
│ │Exposure     │ │Exposure     │ │Exposure     │ │Single     │ │
│ │             │ │             │ │             │ │Event PML  │ │
│ │$2.5 Billion │ │$800 Million │ │$1.2 Billion │ │$350M      │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Main Area (Interactive Map + Charts)                            │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌───────────────────────────────┐ │
│ │                          │ │ Exposure by Region (Pie)      │ │
│ │                          │ │                               │ │
│ │  [GEOGRAPHIC HEATMAP]    │ │  Hong Kong: 32%               │ │
│ │                          │ │  GBA: 45%                     │ │
│ │  Shows concentration     │ │  ASEAN: 18%                   │ │
│ │  of insured values       │ │  Other: 5%                    │ │
│ │                          │ │                               │ │
│ └──────────────────────────┘ └───────────────────────────────┘ │
│                                                                 │
│ ┌──────────────────────────┐ ┌───────────────────────────────┐ │
│ │ Exposure by Peril (Bar)  │ │ Top 10 Cedants (Table)        │ │
│ │                          │ │                               │ │
│ │ Typhoon   ████████████   │ │ 1. ABC Ins    $500M           │ │
│ │ Flood     ████████       │ │ 2. XYZ Re     $420M           │ │
│ │ Earthquake ████          │ │ 3. DEF Group  $380M           │ │
│ │ Fire       ███           │ │ ...                           │ │
│ │                          │ │                               │ │
│ └──────────────────────────┘ └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Bottom Section (Scenario Analysis)                              │
├─────────────────────────────────────────────────────────────────┤
│ What-If Scenario:                                               │
│ ⚠️ Super Typhoon hitting Hong Kong (Category 5)                 │
│                                                                 │
│ Estimated Impact:                                               │
│ - Triggered Treaties: 23 contracts                              │
│ - Total Gross Loss: $450 Million                                │
│ - Net Loss (after retro): $320 Million                          │
│ - Loss Ratio Impact: +18%                                       │
│                                                                 │
│ [Button: Run Full Catastrophe Model]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 模块 3：Limit Management（限额管理）

**功能描述：**
监控各类限额的使用情况，实时预警超限风险。

**限额类型：**

1. **Treaty Level Limits（合约层级限额）**
   - 单一合约年度限额
   - Event Limit（单次事件限额）
   - Aggregate Limit（累积限额）

2. **Regional Limits（区域限额）**
   - 香港总限额
   - 大湾区总限额
   - 东南亚总限额

3. **Peril Limits（灾害限额）**
   - 台风总限额
   - 洪水总限额
   - 地震总限额

4. **Cedant Limits（原保险公司限额）**
   - 单一 Cedant 最大承保额

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────┐
│ Limit Utilization Dashboard                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Regional Limits:                                                │
│                                                                 │
│ Hong Kong:  ████████████░░░░  85% ($425M / $500M) ⚠️ Warning   │
│ GBA:        ████████░░░░░░░░  60% ($600M / $1B)                │
│ ASEAN:      ██████░░░░░░░░░░  45% ($450M / $1B)                │
│                                                                 │
│ Peril Limits:                                                   │
│                                                                 │
│ Typhoon:    ██████████████░░  92% ($920M / $1B)  🔴 Critical   │
│ Flood:      ████████░░░░░░░░  58% ($290M / $500M)              │
│ Earthquake: █████░░░░░░░░░░░  35% ($175M / $500M)              │
│                                                                 │
│ Top 5 Approaching Limits:                                       │
│                                                                 │
│ 1. Treaty TP-HK-001  ████████████████  95% ($47.5M / $50M) 🔴  │
│ 2. Treaty TP-GBA-05  █████████████░░░  88% ($88M / $100M)  ⚠️  │
│ 3. Cedant ABC Ins.   ████████████░░░░  82% ($410M / $500M) ⚠️  │
│ 4. Hong Kong Region  ████████████░░░░  85% ($425M / $500M) ⚠️  │
│ 5. Treaty TP-TH-032  ███████████░░░░░  78% ($15.6M / $20M)     │
│                                                                 │
│ [Button: Generate Limit Breach Alert]                          │
│ [Button: Request Additional Capacity]                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Limit Exception Management                                      │
├─────────────────────────────────────────────────────────────────┤
│ Pending Approvals:                                              │
│                                                                 │
│ 1. [⏳] Treaty TP-HK-088 - Requesting $10M increase             │
│    Current: $50M → Proposed: $60M                               │
│    Reason: Cedant portfolio growth                              │
│    [Approve] [Reject]                                           │
│                                                                 │
│ 2. [⏳] Hong Kong Regional Limit Override                        │
│    Request $50M temporary increase for Q4                       │
│    Reason: Typhoon season adjustment                            │
│    [Approve] [Reject]                                           │
│                                                                 │
│ Recent History:                                                 │
│ - 2024-10-20: Approved $20M increase for GBA region             │
│ - 2024-10-15: Rejected typhoon limit increase (risk too high)   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 模块 4：Exposure Analysis（暴露分析）

**功能描述：**
深度分析特定区域、灾害或合约的风险暴露。

**分析维度：**

1. **PML Analysis（最大可能损失分析）**
   - PML @ 100-year return period
   - PML @ 250-year return period
   - PML @ 500-year return period

2. **Concentration Analysis（集中度分析）**
   - Top 10 locations by TIV
   - Single risk concentration
   - Industry concentration

3. **Treaty Performance（合约表现）**
   - Loss Ratio trend
   - Premium vs. Claims
   - Renewal likelihood

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────┐
│ PML Curve (Exceedance Probability)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Loss ($M)                                                       │
│   │                                                             │
│ 500 │                     ╱                                     │
│ 400 │                  ╱                                        │
│ 300 │              ╱                                            │
│ 200 │          ╱                                                │
│ 100 │      ╱                                                    │
│   0 └──────┴──────┴──────┴──────┴─────► Return Period (years) │
│          10    50   100   250   500                             │
│                                                                 │
│ Key Metrics:                                                    │
│ - PML 100yr: $185 Million                                       │
│ - PML 250yr: $320 Million                                       │
│ - PML 500yr: $450 Million                                       │
│                                                                 │
│ [Button: Export PML Report]                                    │
│ [Button: Run Stress Test]                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Top Risk Concentrations                                         │
├─────────────────────────────────────────────────────────────────┤
│ By Location:                                                    │
│ 1. Hong Kong Central    $250M  ████████████ 10% of portfolio   │
│ 2. Shenzhen Futian      $180M  ████████░    7.2%               │
│ 3. Singapore CBD        $150M  ██████░░     6.0%               │
│                                                                 │
│ By Industry:                                                    │
│ 1. Financial Services   $600M  ████████████ 24%                │
│ 2. Manufacturing        $450M  █████████░   18%                │
│ 3. Real Estate          $400M  ████████░    16%                │
│                                                                 │
│ Risk Assessment: ⚠️ MODERATE CONCENTRATION                      │
│ - Top 10 locations = 45% of portfolio                           │
│ - Recommend: Increase geographic diversification               │
│                                                                 │
│ [Button: View Detailed Breakdown]                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### 模块 5：Reporting & Compliance（报告与合规）

**功能描述：**
生成监管报告和内部管理报告。

**报告类型：**

1. **Regulatory Reports（监管报告）**
   - Solvency II QRT (Quantitative Reporting Template)
   - C-ROSS Solvency Report
   - RBC Report (US states)

2. **Internal Reports（内部报告）**
   - Monthly Underwriting Report
   - Quarterly Portfolio Review
   - Annual Treaty Summary

3. **Board Reports（董事会报告）**
   - Risk Dashboard
   - Capital Adequacy Summary
   - Strategic Recommendations

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────┐
│ Report Generation Center                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Regulatory Reports:                                             │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ □ Solvency II QRT                                           ││
│ │   Period: [Q3 2024 ▼]                                       ││
│ │   [Generate PDF] [Generate Excel]                           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ □ C-ROSS Report                                             ││
│ │   Period: [2024 Annual ▼]                                   ││
│ │   [Generate PDF]                                            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Internal Reports:                                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ □ Portfolio Summary                                         ││
│ │   As of: [2024-10-26]                                       ││
│ │   Include: ☑ Treaties  ☑ Limits  ☑ PML  ☑ Loss Ratios     ││
│ │   [Generate Report]                                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ □ Executive Dashboard                                       ││
│ │   Format: [PowerPoint ▼]                                    ││
│ │   Recipients: [Select mailing list ▼]                       ││
│ │   Schedule: [Monthly - 1st day ▼]                           ││
│ │   [Save Schedule] [Send Now]                                ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Report History:                                                 │
│ - 2024-10-25: Monthly Underwriting Report sent to team         │
│ - 2024-10-01: Q3 Solvency II report submitted to regulator     │
│ - 2024-09-30: Board Risk Dashboard generated                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 数据结构设计

### Treaty 表结构

```typescript
interface Treaty {
  id: string;                    // TP-HK-001
  name: string;                  // HK Property Cat XL 2024
  cedantId: string;              // Reference to Cedant
  cedantName: string;            // ABC Insurance Co.
  
  // Treaty Type
  type: 'QS' | 'XL' | 'StopLoss' | 'CatXL' | 'Facultative';
  coverage: string[];            // ['Property', 'Typhoon', 'Flood']
  
  // Geographic Scope
  regions: string[];             // ['HK', 'Macau']
  countries: string[];           // ['Hong Kong', 'Macau']
  locations?: GeoJSON;           // Optional detailed geographic data
  
  // Financial Terms
  treatyLimit: number;           // 50000000 (USD)
  eventLimit?: number;           // 50000000
  aggregateLimit?: number;       // 100000000
  retention: number;             // 10000000
  layer?: {                      // For XL treaties
    limit: number;               // 50000000
    attachment: number;          // 10000000
    description: string;         // "$50M xs $10M"
  };
  premium: number;               // 2500000
  commission?: number;           // 25% (for QS)
  
  // Period
  effectiveDate: string;         // ISO date
  expiryDate: string;            // ISO date
  status: 'Active' | 'Expired' | 'Pending' | 'Cancelled';
  
  // Exposure Metrics
  currentExposure: number;       // Real-time exposure
  limitUtilization: number;      // Percentage used
  
  // Performance Metrics
  claimsPaid: number;
  lossRatio: number;             // Claims / Premium
  
  // Metadata
  underwriter: string;           // Employee ID
  lastUpdated: string;           // ISO timestamp
  documents: string[];           // URLs to contract PDFs
}
```

### Risk Accumulation 表结构

```typescript
interface RiskAccumulation {
  id: string;
  asOfDate: string;              // ISO date
  
  // Geographic Accumulation
  byRegion: {
    regionId: string;            // 'HK', 'GBA', 'ASEAN'
    regionName: string;
    totalExposure: number;
    treatyCount: number;
    cedantCount: number;
    limitUtilization: number;    // Percentage
  }[];
  
  // Peril Accumulation
  byPeril: {
    perilType: string;           // 'Typhoon', 'Flood', 'Earthquake'
    totalExposure: number;
    pml100yr: number;
    pml250yr: number;
    pml500yr: number;
  }[];
  
  // Cedant Concentration
  byCedant: {
    cedantId: string;
    cedantName: string;
    totalExposure: number;
    treatyCount: number;
  }[];
  
  // Top Concentrations
  topLocations: {
    locationId: string;
    locationName: string;
    coordinates: [number, number];
    totalExposure: number;
    percentOfPortfolio: number;
  }[];
  
  // Overall Metrics
  totalPortfolioExposure: number;
  treatyCount: number;
  cedantCount: number;
  averageLossRatio: number;
}
```

### Limit Monitoring 表结构

```typescript
interface LimitStatus {
  id: string;
  limitType: 'Treaty' | 'Regional' | 'Peril' | 'Cedant';
  referenceId: string;           // Treaty ID, Region ID, etc.
  referenceName: string;
  
  // Limit Details
  limitAmount: number;
  currentUtilization: number;    // Dollar amount
  utilizationPercent: number;    // Percentage
  
  // Alert Thresholds
  warningThreshold: number;      // e.g., 80%
  criticalThreshold: number;     // e.g., 90%
  status: 'Normal' | 'Warning' | 'Critical';
  
  // Breach Prediction
  projectedUtilization?: number; // Based on current trend
  daysToBreach?: number;         // Estimated days until breach
  
  // Approval Workflow
  overrideRequests: {
    requestId: string;
    requestedBy: string;
    requestDate: string;
    requestedIncrease: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approvedBy?: string;
    approvalDate?: string;
  }[];
  
  lastUpdated: string;
}
```

---

## 🚀 Extensions 功能规划

### 模块 1：气候变化影响分析（Climate Change Impact）

**功能：**
- 气候变化情景分析（RCP 2.6, 4.5, 8.5）
- 未来 30 年灾害频率/强度预测
- Portfolio 在气候变化下的脆弱性评估

**数据来源：**
- IPCC 气候模型
- NOAA Climate Data
- 学术研究论文

**展示方式：**
- 时间序列图表（历史 + 预测）
- 热力图（区域脆弱性）
- 情景对比仪表板

---

### 模块 2：实时灾害监控（Real-time Hazard Monitoring）

**功能：**
- 实时台风路径追踪
- 实时降雨量监控
- 实时地震监测
- 自动触发 Portfolio 影响分析

**数据来源：**
- 香港天文台 API
- USGS Earthquake API
- NOAA Hurricane API
- 本地气象站数据

**展示方式：**
- 动态地图（台风路径、雨量云图）
- 受影响 Treaty 列表
- 潜在损失预估

---

### 模块 3：灾害预警系统（Early Warning System）

**功能：**
- 多灾害预警聚合
- 智能风险评分（基于 Portfolio 暴露）
- 自动通知承保人/风险经理
- 预警升级机制（绿→黄→橙→红）

**预警类型：**
- 台风预警（3-7天提前量）
- 洪水预警（暴雨触发）
- 地震预警（实时）
- 限额超限预警

**通知渠道：**
- 系统内通知
- 邮件
- 短信（紧急）
- 企业微信/钉钉

---

### 模块 4：Earth Nullschool（气象可视化）

**功能：**
- 全球风场、气压、温度可视化
- 台风生成监控
- 海洋环流分析

**用途：**
- 辅助承保决策
- 教育培训
- 客户演示

**集成方式：**
- iframe 嵌入（已实现）
- 可选：叠加 Portfolio 暴露数据

---

### 模块 5：HKUST 巨灾模型（Catastrophe Model）

**功能：**
- Stochastic 事件模拟（10,000 年事件集）
- Monte Carlo 损失模拟
- Portfolio 损失分布
- Exceedance Probability (EP) 曲线

**用途：**
- PML 计算
- 资本充足率评估
- Treaty 定价

**集成方式：**
- iframe 嵌入（已实现）
- 数据接口（未来）

---

## 📅 实施路线图

### Phase 1: Foundation（基础功能）- 4周

**Week 1-2: Treaty Portfolio Management**
- [ ] Treaty 数据模型设计
- [ ] Treaty 列表页面
- [ ] Treaty 详情页面
- [ ] Treaty CRUD 操作
- [ ] Mock 数据准备

**Week 3-4: Risk Accumulation Dashboard**
- [ ] 数据聚合逻辑
- [ ] 地理热力图
- [ ] 图表组件（Pie, Bar, Line）
- [ ] 关键指标卡片

---

### Phase 2: Core Features（核心功能）- 6周

**Week 5-7: Limit Management**
- [ ] 限额监控仪表板
- [ ] 实时限额计算
- [ ] 预警阈值设置
- [ ] 邮件通知集成

**Week 8-10: Exposure Analysis**
- [ ] PML 曲线生成
- [ ] 集中度分析
- [ ] What-If 场景模拟
- [ ] 与 HKUST 模型集成

---

### Phase 3: Advanced Features（高级功能）- 8周

**Week 11-14: Reporting & Compliance**
- [ ] 报告模板设计
- [ ] PDF 生成功能
- [ ] Excel 导出功能
- [ ] 定时任务调度

**Week 15-18: Extensions Integration**
- [ ] 实时灾害监控集成
- [ ] 预警系统开发
- [ ] 气候变化数据接入
- [ ] 通知系统开发

---

### Phase 4: Production Ready（生产就绪）- 4周

**Week 19-20: Testing & QA**
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 安全测试

**Week 21-22: Deployment & Training**
- [ ] 生产环境部署
- [ ] 用户培训
- [ ] 文档编写
- [ ] 运维监控

---

## 🎨 技术栈建议

### Frontend
- **Framework:** Next.js 14 (已有)
- **UI Components:** Shadcn/ui (已有)
- **Charts:** Recharts / Chart.js
- **Maps:** Leaflet (已有) / Mapbox GL JS
- **State Management:** React Context / Zustand

### Backend
- **API:** Next.js API Routes / FastAPI (Python)
- **Database:** PostgreSQL / MongoDB
- **Cache:** Redis
- **Job Queue:** Bull / Celery

### Data Sources
- **Internal:** Treaty database
- **External:** 
  - Weather APIs (OpenWeatherMap, NOAA)
  - Earthquake APIs (USGS)
  - Climate Data (IPCC, Copernicus)

### Integration
- **OasisLMF:** REST API (localhost:8000)
- **HKUST Model:** iframe + postMessage API
- **Earth Nullschool:** iframe

---

## 📊 数据流架构

```
┌─────────────────┐
│ User Interface  │
│ (Next.js)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ API Layer       │────▶│ External APIs    │
│ (Next.js API)   │     │ - Weather        │
└────────┬────────┘     │ - Earthquake     │
         │              │ - Climate        │
         ▼              └──────────────────┘
┌─────────────────┐
│ Business Logic  │
│ - Aggregation   │
│ - Limit Check   │
│ - Alert         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Database        │◀───▶│ OasisLMF API     │
│ (PostgreSQL)    │     │ (Catastrophe     │
│                 │     │  Model)          │
└─────────────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Background Jobs │
│ - Daily Agg     │
│ - Alert Check   │
│ - Report Gen    │
└─────────────────┘
```

---

## 🎯 成功指标（KPIs）

1. **系统性能**
   - 页面加载时间 < 2秒
   - 数据刷新延迟 < 5秒
   - 系统可用性 > 99.5%

2. **用户采用**
   - 月活跃用户 > 50
   - 平均使用时长 > 15分钟/天
   - 用户满意度 > 4.5/5

3. **业务价值**
   - 减少限额超限事件 30%
   - 提高报告生成效率 50%
   - 加快承保决策速度 40%

---

## 📞 后续讨论

**需要进一步明确的问题：**

1. Treaty 数据来源？
   - 手动录入？
   - 从现有系统导入？
   - Excel 批量上传？

2. 实时数据频率？
   - 每小时更新？
   - 每天更新？
   - 事件触发更新？

3. 用户权限管理？
   - Underwriter 只能查看自己的 Treaty？
   - Risk Manager 可以查看全部？
   - 是否需要审批流？

4. 与 OasisLMF 的集成深度？
   - 仅展示结果？
   - 自动触发分析？
   - 双向数据同步？

---

**准备好开始实施了吗？我可以先帮您：**
1. 创建改进后的 `/asset` 页面（Treaty Portfolio Management）
2. 添加 Risk Accumulation Dashboard
3. 完善 `/fuzhu` 页面的 Extensions 模块

您想从哪个开始？ 🚀
