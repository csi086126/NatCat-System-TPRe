# 太平香港 Nat Cat Platform 数据库设计方案

## 1. 数据库选择：PostgreSQL + PostGIS

### 技术栈
- **数据库**：PostgreSQL 15+
- **空间扩展**：PostGIS 3.3+
- **ORM**：Prisma (Next.js)
- **连接池**：pg-pool

### 优势
- ✅ 1.7M 记录查询毫秒级响应
- ✅ 支持地理空间查询
- ✅ 强大的索引和统计功能
- ✅ 与 Next.js 无缝集成

---

## 2. 表结构设计

### 主表：tphk_portfolio

```sql
CREATE TABLE tphk_portfolio (
  -- 主键
  id SERIAL PRIMARY KEY,

  -- OED 标准字段
  port_number VARCHAR(10),
  acc_number VARCHAR(20),
  loc_number VARCHAR(50) NOT NULL,  -- 保單號 (唯一标识)
  loc_name TEXT,                     -- 保險處所
  loc_group VARCHAR(100),            -- 分區

  -- 地理位置
  country_code VARCHAR(2),
  area_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326),   -- PostGIS 地理点 (自动从 lat/lng 生成)

  -- 建筑属性
  occupancy_code INTEGER,            -- OED 占用性质代码
  construction_code INTEGER,         -- OED 建筑等级代码
  year_built INTEGER,
  number_of_storeys DECIMAL(5, 1),

  -- 保额 (TIV)
  building_tiv DECIMAL(20, 2),
  contents_tiv DECIMAL(20, 2),
  other_tiv DECIMAL(20, 2),
  bi_tiv DECIMAL(20, 2),
  loc_tiv DECIMAL(20, 2),

  -- 货币和承保
  loc_currency VARCHAR(3),
  loc_perils_covered TEXT,

  -- 保单信息
  policy_number VARCHAR(50),
  policy_inception_date DATE,
  policy_expiry_date DATE,

  -- 用户自定义字段
  loc_user_def1 VARCHAR(100),        -- 業務類別
  loc_user_def2 VARCHAR(100),        -- 險種名稱
  loc_user_def3 VARCHAR(100),        -- 巨災名稱
  loc_user_def4 TEXT,                -- 原始佔用性質
  loc_user_def5 TEXT,                -- 原始建築等級

  -- 提取字段来源标记
  year_built_source VARCHAR(20),     -- 'Original' / 'Extracted' / 'Missing'
  number_of_storeys_source VARCHAR(20),
  year_built_extracted INTEGER,
  number_of_storeys_extracted DECIMAL(5, 1),

  -- 原始 Excel 数据 (存为 JSONB)
  original_data JSONB,               -- 所有 Original_ 字段

  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引 (关键性能优化!)
CREATE INDEX idx_loc_number ON tphk_portfolio(loc_number);
CREATE INDEX idx_area_code ON tphk_portfolio(area_code);
CREATE INDEX idx_occupancy_code ON tphk_portfolio(occupancy_code);
CREATE INDEX idx_construction_code ON tphk_portfolio(construction_code);
CREATE INDEX idx_policy_number ON tphk_portfolio(policy_number);
CREATE INDEX idx_year_built ON tphk_portfolio(year_built);
CREATE INDEX idx_loc_user_def2 ON tphk_portfolio(loc_user_def2);  -- 險種名稱
CREATE INDEX idx_policy_dates ON tphk_portfolio(policy_inception_date, policy_expiry_date);

-- PostGIS 空间索引
CREATE INDEX idx_location_gist ON tphk_portfolio USING GIST(location);

-- JSONB 索引 (用于查询原始数据)
CREATE INDEX idx_original_data_gin ON tphk_portfolio USING GIN(original_data);
```

---

## 3. 数据导入策略

### 方式 1：使用 Python 脚本导入 (推荐)

```python
import json
import psycopg2
from psycopg2.extras import execute_batch

# 连接数据库
conn = psycopg2.connect(
    host="localhost",
    database="natcat_platform",
    user="postgres",
    password="your_password"
)

# 读取 JSON
with open('tphk-portfolio-oed-geocoded-final.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 准备插入语句
insert_sql = """
INSERT INTO tphk_portfolio (
    port_number, acc_number, loc_number, loc_name, loc_group,
    country_code, area_code, latitude, longitude,
    occupancy_code, construction_code, year_built, number_of_storeys,
    building_tiv, contents_tiv, loc_tiv,
    loc_currency, loc_perils_covered,
    policy_number, policy_inception_date, policy_expiry_date,
    loc_user_def1, loc_user_def2, loc_user_def3, loc_user_def4, loc_user_def5,
    year_built_source, number_of_storeys_source,
    year_built_extracted, number_of_storeys_extracted,
    original_data
) VALUES (
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s,
    %s, %s, %s, %s,
    %s, %s, %s,
    %s, %s,
    %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s,
    %s, %s,
    %s
)
"""

# 转换数据
batch_data = []
for record in data:
    # 提取原始字段存为 JSONB
    original_fields = {k: v for k, v in record.items() if k.startswith('Original_')}

    batch_data.append((
        record.get('PortNumber'),
        record.get('AccNumber'),
        record.get('LocNumber'),
        record.get('LocName'),
        record.get('LocGroup'),
        record.get('CountryCode'),
        record.get('AreaCode'),
        record.get('Latitude'),
        record.get('Longitude'),
        record.get('OccupancyCode'),
        record.get('ConstructionCode'),
        record.get('YearBuilt'),
        record.get('NumberOfStoreys'),
        record.get('BuildingTIV'),
        record.get('ContentsTIV'),
        record.get('LocTIV'),
        record.get('LocCurrency'),
        record.get('LocPerilsCovered'),
        record.get('PolicyNumber'),
        record.get('PolicyInceptionDate'),
        record.get('PolicyExpiryDate'),
        record.get('LocUserDef1'),
        record.get('LocUserDef2'),
        record.get('LocUserDef3'),
        record.get('LocUserDef4'),
        record.get('LocUserDef5'),
        record.get('YearBuilt_Source'),
        record.get('NumberOfStoreys_Source'),
        record.get('YearBuilt_ExtractedFromAddress'),
        record.get('NumberOfStoreys_ExtractedFromAddress'),
        json.dumps(original_fields)
    ))

# 批量插入 (每次 1000 条)
cursor = conn.cursor()
execute_batch(cursor, insert_sql, batch_data, page_size=1000)
conn.commit()

# 创建 PostGIS 地理点
cursor.execute("""
    UPDATE tphk_portfolio
    SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
""")
conn.commit()

print(f"✓ 导入完成: {len(batch_data):,} 条记录")
```

---

## 4. API 设计 (Next.js)

### API 路由结构
```
/api/portfolio
  ├── /summary          - 总体统计
  ├── /by-district      - 按 18 区统计
  ├── /by-occupancy     - 按占用性质统计
  ├── /by-construction  - 按建筑等级统计
  ├── /by-year          - 按年份统计
  ├── /heatmap          - 热力图数据
  └── /details          - 详细列表 (分页)
```

### 示例：按分区统计 API

```typescript
// app/api/portfolio/by-district/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 可选筛选条件
  const filters = {
    year_from: searchParams.get('year_from'),
    year_to: searchParams.get('year_to'),
    occupancy: searchParams.get('occupancy'),
    coverage: searchParams.get('coverage'), // 险种
  };

  try {
    let query = `
      SELECT
        area_code,
        loc_group AS district,
        COUNT(*) AS policy_count,
        SUM(loc_tiv) AS total_tiv,
        AVG(year_built) AS avg_year_built,
        COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) AS geocoded_count
      FROM tphk_portfolio
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // 动态添加筛选条件
    if (filters.year_from && filters.year_to) {
      query += ` AND year_built BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(parseInt(filters.year_from), parseInt(filters.year_to));
      paramIndex += 2;
    }

    if (filters.occupancy) {
      query += ` AND occupancy_code = $${paramIndex}`;
      params.push(parseInt(filters.occupancy));
      paramIndex++;
    }

    if (filters.coverage) {
      query += ` AND loc_user_def2 = $${paramIndex}`;
      params.push(filters.coverage);
      paramIndex++;
    }

    query += `
      GROUP BY area_code, loc_group
      ORDER BY total_tiv DESC
    `;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      filters: filters,
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { success: false, error: 'Database query failed' },
      { status: 500 }
    );
  }
}
```

---

## 5. 性能对比

### JSON 文件 vs PostgreSQL

| 操作 | JSON 文件 | PostgreSQL |
|------|-----------|------------|
| 加载全部数据 | ~30-60秒 | 不需要 |
| 按分区统计 | ~5-10秒 | ~50ms |
| 按多条件筛选 | ~10-20秒 | ~100ms |
| 热力图数据 | ~15-30秒 | ~200ms |
| 分页查询 | 需全量加载 | ~20ms |

### 预期性能
- ✅ 统计查询：< 100ms
- ✅ 详细列表（分页）：< 50ms
- ✅ 热力图数据：< 500ms
- ✅ 地图图层加载：< 1s

---

## 6. 部署建议

### 开发环境
```bash
# 使用 Docker 快速启动 PostgreSQL + PostGIS
docker run -d \
  --name natcat-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=natcat_platform \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

### 生产环境
- AWS RDS PostgreSQL
- Google Cloud SQL PostgreSQL
- Azure Database for PostgreSQL

---

## 7. 数据更新策略

### 增量更新
```sql
-- 如果有新的保单数据
INSERT INTO tphk_portfolio (...) VALUES (...)
ON CONFLICT (loc_number)
DO UPDATE SET ...
```

### 定期刷新
- 每月重新导入最新 Excel 数据
- 保留历史快照用于对比

---

## 8. 下一步行动

1. ✅ 安装 PostgreSQL + PostGIS
2. ✅ 创建数据库和表结构
3. ✅ 编写 JSON → PostgreSQL 导入脚本
4. ✅ 导入 1.7M 条数据
5. ✅ 创建 Next.js API 路由
6. ✅ 前端接入 API 进行统计展示

---

## 9. 替代方案对比

### 方案 A: PostgreSQL ⭐ 推荐
- 优点：性能最优，空间查询，成熟稳定
- 缺点：需要部署数据库服务器

### 方案 B: SQLite + SpatiaLite
- 优点：无需服务器，单文件数据库
- 缺点：性能较差，不支持并发写入

### 方案 C: MongoDB
- 优点：灵活 schema，地理索引
- 缺点：统计查询不如 PostgreSQL，空间查询弱

### 方案 D: 保留 JSON + 内存缓存
- 优点：简单，无需数据库
- 缺点：每次启动加载慢，内存占用大 (4GB+)

---

**建议：使用 PostgreSQL + PostGIS**
