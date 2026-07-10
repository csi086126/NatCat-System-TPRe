# TPHK Portfolio Management - 开发路线图完成总结

## 方案A执行总结

基于现有19.4万条已geocoded的数据，我们完成了完整的后续开发基础设施。

---

## 已完成工作

### 1. 数据预处理 ✅

**文件**: `data_processing/extract_geocoded_success.py`

**完成内容**:
- 从47.4万条记录中提取19.4万条geocoding成功的记录
- 过滤掉坐标超出香港范围的无效数据
- 生成三个文件:
  - `output/tphk-geocoded-success.json` (376.5 MB) - 成功记录
  - `public/data/tphk-geocoded-portfolio.json` (376.5 MB) - 前端访问副本
  - `output/tphk-geocoding-failed.json` - 失败记录日志

**数据概况**:
```
总记录: 474,044
成功率: 41.0% (194,506条)
年份分布:
  2021: 3,649 条
  2022: 46,834 条
  2023: 101,135 条 ← 数据最完整
  2024: 42,888 条
```

---

### 2. 数据库Schema设计 ✅

**文件**: `database/schema.sql`

**核心表结构**:

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `portfolio.policies` | 保单主表 | 保留所有Excel原始字段(中英文) + PostGIS地理坐标 |
| `portfolio.hk_districts` | 18区+3大区映射表 | district_name_zh, region_group |
| `portfolio.zone_accumulations` | 预计算聚合统计 | 按区域预聚合的暴露度 |
| `portfolio.claims` | 理赔数据表 | 待理赔数据导入后使用 |
| `portfolio.events` | 巨灾事件表 | 事件级别统计 |

**特色功能**:
- ✅ PostGIS空间索引 (GIST index)
- ✅ 全文搜索索引 (地址搜索)
- ✅ 视图自动聚合 (v_district_exposure, v_region_exposure)
- ✅ 空间查询函数 (get_policies_near_point, get_district_stats)

---

### 3. 数据加载脚本 ✅

**文件**: `database/load_data.py` + `run-load-data.bat`

**功能**:
- 从JSON读取19.4万条记录
- 批量插入PostgreSQL (batch_size=1000)
- 自动创建PostGIS geometry字段
- 数据验证和统计报告
- 支持幂等性 (ON CONFLICT DO UPDATE)

**使用方法**:
```bash
# 1. 配置.env文件 (数据库连接信息)
# 2. 运行
run-load-data.bat
```

---

### 4. 综合统计分析API ✅

**文件**: `analytics/portfolio_analytics.py`

**核心功能 - 支持按所有Excel列字段筛选和统计**:

#### 4.1 基础统计
```python
# 18区暴露度统计
analytics.get_18_districts_exposure(year=2024)

# 3大区暴露度统计
analytics.get_3_major_regions_exposure(year=2023)
```

#### 4.2 按任意字段分组统计 🌟
```python
# 按险种名称统计保额
analytics.group_by_field(
    group_by='險種名稱',
    aggregations={'公司保額': 'sum', 'policy_id': 'count'}
)

# 按占用性质统计，筛选特定区域
analytics.group_by_field(
    group_by='佔用性質',
    aggregations={'公司保額': 'sum'},
    filters={'分區': '中西區', '業務類別': '1-直接業務'}
)

# 按建筑等级统计
analytics.group_by_field(
    group_by='建築等級',
    aggregations={
        '公司保額': 'sum',
        '共保前總保險金額': 'sum',
        'policy_id': 'count'
    }
)
```

#### 4.3 双维度交叉分析 (Excel透视表风格) 🌟
```python
# 各区各险种的保额分布
analytics.cross_analysis(
    dimension1='分區',
    dimension2='險種名稱',
    metric='公司保額',
    agg_func='sum'
)

# 各区各占用性质的保额分布
analytics.cross_analysis(
    dimension1='分區',
    dimension2='佔用性質',
    metric='公司保額',
    agg_func='avg',
    filters={'保單起期': '2024-01-01'}  # 只看2024年
)
```

#### 4.4 时间序列分析 🌟
```python
# 月度保额趋势
analytics.time_series_analysis(
    time_grain='month',
    metric='公司保額',
    agg_func='sum'
)

# 各区月度趋势对比
analytics.time_series_analysis(
    time_grain='month',
    metric='公司保額',
    agg_func='sum',
    group_by='分區',
    start_date='2023-01-01',
    end_date='2024-12-31'
)

# 各险种年度对比
analytics.time_series_analysis(
    time_grain='year',
    metric='公司保額',
    agg_func='sum',
    group_by='險種名稱'
)
```

#### 4.5 元数据查询 🌟
```python
# 获取所有可用字段列表
fields = analytics.get_available_fields()
# 返回: {'chinese_fields': [...], 'numeric_fields': [...], ...}

# 获取某个字段的所有唯一值 (用于前端筛选器下拉菜单)
districts = analytics.get_field_values('分區')
# 返回: ['中西區', '灣仔區', '東區', ...]

coverages = analytics.get_field_values('險種名稱')
# 返回: ['財產全險', '建築工程一切險', ...]
```

---

## 可进行的所有分析维度

基于PostgreSQL schema中保留的所有Excel字段，可按以下任意维度筛选和统计:

### 中文字段 (23个)
| 字段名 | 说明 | 可用于分组 | 可用于筛选 |
|--------|------|-----------|-----------|
| 保單號 | 保单号 | ✅ | ✅ |
| 巨災代碼 | 巨灾代码 | ✅ | ✅ |
| 巨災名稱 | 巨灾名称 | ✅ | ✅ |
| 業務類別 | 业务类别 | ✅ | ✅ |
| 保單起期 | 保单开始日期 | ✅ (时间序列) | ✅ |
| 保單止期 | 保单结束日期 | ✅ (时间序列) | ✅ |
| 險種名稱 | 险种名称 | ✅ | ✅ |
| 承保地區範圍名稱 | 承保区域 | ✅ | ✅ |
| 所處洲 | 所在洲 | ✅ | ✅ |
| 國家或地區 | 国家地区 | ✅ | ✅ |
| 分區 | 区域(18区) | ✅ | ✅ |
| 保險處所 | 地址 | ❌ (全文搜索) | ✅ |
| 建築等級 | 建筑等级 | ✅ | ✅ |
| 佔用性質 | 占用性质 | ✅ | ✅ |
| 樓層數 | 楼层数 | ✅ | ✅ |
| 建造年份 | 建造年份 | ✅ | ✅ |
| 保單幣別 | 币种 | ✅ | ✅ |
| 共保前建築重置價值 | 建筑重置价值 | ❌ | ✅ (范围查询) |
| 共保前室內財物價值 | 室内财物价值 | ❌ | ✅ (范围查询) |
| 共保前總保險金額 | 总保险金额(gross) | ❌ | ✅ (范围查询) |
| 承保份額 | 承保份额 | ❌ | ✅ (范围查询) |
| 公司保額 | 公司保额(net) | ❌ | ✅ (范围查询) |
| 免賠信息 | 免赔额 | ✅ | ✅ |

### 数值型字段 (可进行SUM/AVG/MIN/MAX聚合)
- 共保前建築重置價值
- 共保前室內財物價值
- 共保前總保險金額
- 承保份額 (%)
- 公司保額 ⭐ (最常用)

### Geocoding字段
- latitude, longitude
- formatted_address
- place_id
- geocoding_provider (google/amap)
- district_source (original/geocoded)

---

## API使用示例

### 示例1: 查看2024年中西區的险种分布
```python
from analytics.portfolio_analytics import PortfolioAnalytics

with PortfolioAnalytics() as analytics:
    result = analytics.group_by_field(
        group_by='險種名稱',
        aggregations={
            '公司保額': 'sum',
            '共保前總保險金額': 'sum'
        },
        filters={
            '分區': '中西區',
            '保單起期': ('>=', '2024-01-01')
        }
    )

    for row in result:
        print(f"{row['group_value']}: HKD {row['sum_公司保額']:,.2f}")
```

### 示例2: 各区各占用性质交叉分析
```python
result = analytics.cross_analysis(
    dimension1='分區',
    dimension2='佔用性質',
    metric='公司保額',
    agg_func='sum',
    filters={'業務類別': '1-直接業務'}
)
```

### 示例3: 2023-2024月度保额趋势
```python
result = analytics.time_series_analysis(
    time_grain='month',
    metric='公司保額',
    agg_func='sum',
    start_date='2023-01-01',
    end_date='2024-12-31'
)
```

---

## 下一步操作指南

### Step 1: 初始化数据库
```bash
# 1. 确保PostgreSQL 18 + PostGIS 3.6已安装
# 2. 创建数据库
psql -U postgres -c "CREATE DATABASE natcat_platform;"
psql -U postgres -d natcat_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 3. 加载schema
cd "D:\Nat Cat Platform\UI_system\scripts\portfolio_management"
psql -U postgres -d natcat_platform -f database/schema.sql
```

### Step 2: 配置数据库连接
```bash
# 复制环境变量模板
copy .env.template .env

# 编辑.env文件，填入数据库信息
notepad .env
```

### Step 3: 导入数据
```bash
# 运行数据导入脚本
run-load-data.bat

# 预期结果: 194,506条记录导入成功
```

### Step 4: 刷新聚合统计
```sql
-- 在PostgreSQL中运行
SELECT portfolio.refresh_zone_accumulations();
```

### Step 5: 测试Analytics API
```bash
# 运行测试
"C:\Users\sichen\AppData\Local\anaconda3\python.exe" analytics/portfolio_analytics.py
```

### Step 6: 创建前端API接口
参考 `analytics/portfolio_analytics.py` 中的 `api_*` 函数，集成到你的Next.js后端:

```typescript
// app/api/portfolio/18-districts/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')

  // 调用Python API或直接查询PostgreSQL
  const result = await api_get_18_districts(year)

  return Response.json(result)
}
```

---

## 前端集成建议

### 1. Portfolio Dashboard页面结构
```
/portfolio (Portfolio Management主页)
  ├─ Overview (总览)
  │   ├─ 总保额 KPI
  │   ├─ 保单数量 KPI
  │   ├─ 平均保额 KPI
  │   └─ 年度增长趋势图
  │
  ├─ 地图可视化 (Map View)
  │   ├─ 热力图 (Heatmap) - 按坐标显示保额密度
  │   ├─ 区域边界 (18区geojson overlay)
  │   └─ 点击区域显示详情
  │
  ├─ 区域分析 (Regional Analysis)
  │   ├─ 18区暴露度排名表格
  │   ├─ 3大区对比图表
  │   └─ 区域钻取 (点击查看详细保单列表)
  │
  ├─ 多维分析 (Multi-Dimensional Analysis)
  │   ├─ 动态筛选器 (所有Excel字段可选)
  │   │   ├─ 区域: [下拉多选]
  │   │   ├─ 险种: [下拉多选]
  │   │   ├─ 占用性质: [下拉多选]
  │   │   ├─ 年份: [范围选择]
  │   │   └─ 保额: [范围滑块]
  │   │
  │   ├─ 分组统计表格
  │   └─ 交叉分析透视表
  │
  └─ 时间序列 (Time Series)
      ├─ 月度趋势图
      ├─ 年度对比图
      └─ 可按区域/险种分组显示
```

### 2. 推荐可视化组件
- **地图**: Mapbox GL / Leaflet + 热力图插件
- **图表**: Recharts / ECharts
- **表格**: TanStack Table (支持排序、筛选、分页)
- **筛选器**: Headless UI Select + 多选
- **Dashboard布局**: Grid / Flexbox

---

## 文件清单

### 数据文件
```
output/
├── tphk-geocoded-full.json (750 MB) - 原始geocoding结果
├── tphk-geocoded-success.json (376.5 MB) - 成功记录
└── tphk-geocoding-failed.json - 失败记录日志

public/data/
└── tphk-geocoded-portfolio.json (376.5 MB) - 前端访问副本
```

### 脚本文件
```
scripts/portfolio_management/
├── data_processing/
│   └── extract_geocoded_success.py - 数据预处理
│
├── database/
│   ├── schema.sql - 数据库schema
│   ├── load_data.py - 数据导入脚本
│   └── (run-load-data.bat - Windows启动脚本)
│
├── analytics/
│   └── portfolio_analytics.py - 统计分析API ⭐⭐⭐
│
├── .env.template - 环境变量模板
└── analyze_years.py - 年份分析工具
```

---

## 技术栈总结

| 层级 | 技术 | 用途 |
|------|------|------|
| 数据存储 | PostgreSQL 18 + PostGIS 3.6 | 空间数据库 |
| 数据处理 | Python 3.13 (Anaconda) | ETL和分析 |
| 分析引擎 | psycopg2 + SQL | 灵活查询 |
| API层 | portfolio_analytics.py | 统计API |
| 前端框架 | Next.js 14 | 待集成 |
| 地图可视化 | Mapbox / Leaflet | 待集成 |

---

## 优势对比

### 方案A (当前方案) vs 方案B (等API)

| 对比项 | 方案A | 方案B |
|--------|-------|-------|
| 可用数据量 | 19.4万条 (足够) | 全部47.4万条 + 澳门数据 |
| 开发时间 | 立即开始 | 等待1-2周IT审批 |
| 技术验证 | 完整验证所有步骤 | 一次性处理，风险高 |
| API成本 | $0 (用现有数据) | $3,500 |
| 功能完整性 | 100%功能可测试 | 100%功能可测试 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 成果展示

✅ **数据准备完成**: 19.4万条有效记录
✅ **数据库设计完成**: 支持PostGIS空间查询
✅ **ETL脚本完成**: 一键导入数据
✅ **分析API完成**: 支持所有Excel字段的灵活查询
✅ **文档完善**: 完整使用指南

**下一步**: 集成到前端UI，验证整个workflow

---

## 联系人

开发者: 【你的名字】
项目: Nat Cat Platform - Portfolio Management
日期: 2025-12-15

---

*此文档涵盖方案A的所有已完成工作。后续可在此基础上快速迭代前端功能。*
