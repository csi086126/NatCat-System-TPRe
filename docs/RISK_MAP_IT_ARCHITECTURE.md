# Nat Cat Platform — 系统技术架构与 IT 需求

> **文档目的**: 向 IT 部门说明系统架构、当前状态与需要协助的事项  
> **版本**: v2.0 | **日期**: 2026-02-09  
> **负责人**: Actuarial Analytics Team  
> **更新**: 新增 Portfolio Management 模块完整 IT 需求

---

## 一、系统总览

Nat Cat Platform 是太平再保险的巨灾风险管理平台，涵盖风险地图（Risk Map）、保单组合管理（Portfolio）、巨灾模型（Cat Model）、灾害资料库（Disaster Repository）等模块。

### 当前运行环境

| 项目 | 当前状态 | 说明 |
|------|---------|------|
| **前端应用** | `http://10.253.22.15:3004` | 开发环境，运行在精算部服务器上 |
| **GeoServer #1** | `http://10.253.22.15:8080/geoserver` | 灾害图层服务（精算部服务器） |
| **GeoServer #2** | `http://143.89.22.7:8090/geoserver` | 地理空间底图服务（外部服务器） |
| **数据库** | 尚未部署 | 目前使用静态 JSON 文件，需要 PostgreSQL + PostGIS |
| **巨灾模型** | `localhost:8088` / `localhost:8000` | OasisLMF Docker 容器（本地开发） |

---

## 二、技术栈清单

### 2.1 前端（Web Application）

| 组件 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | **Next.js** (App Router) | 15.1.3 | React 全栈框架，SSR/SSG |
| UI 库 | **React** | 19.0 | 用户界面 |
| 样式 | **Tailwind CSS** | 3.4 | 样式系统 |
| 组件库 | **shadcn/ui** (Radix UI) | — | Select, Dialog, Tabs, Checkbox 等 |
| 地图引擎 | **Leaflet** + react-leaflet | 1.9.4 / 5.0 | 交互式地图渲染 |
| 图表 | **Recharts** | 3.6 | 数据可视化图表 |
| 坐标转换 | **proj4** + proj4leaflet | 2.15 | 地理坐标系转换 |
| PDF 导出 | **jsPDF** + html2canvas | 3.0 / 1.4 | 报告导出 |
| Excel 处理 | **xlsx** (SheetJS) | 0.18.5 | Excel 读写 |
| Shapefile | **shpjs** | 6.2 | Shapefile 解析 |
| 语言 | **TypeScript** | 5.x | 类型安全 |

### 2.2 地理空间服务（GeoServer）

| 实例 | 地址 | 用途 | 图层数量 |
|------|------|------|---------|
| **Primary** | `10.253.22.15:8080` | 灾害模拟图层（洪水、台风、暴雨） | ~300+ |
| **Secondary** | `143.89.22.7:8090` | 行政边界、COP/ITF 地理底图 | ~50+ |

**GeoServer Workspace 规划:**

| Workspace | 区域 | 状态 | 主要图层 |
|-----------|------|------|---------|
| `natcat_platform` | 全局 | ✅ 已上线 | HK 洪水(21层), MO 洪水(270层), IBTrACS 台风路径 |
| `HK` | 香港 | ✅ 已上线 | 行政边界(18区/52/292/4916) |
| `macau` | 澳门 | ✅ 已上线 | 堂区边界, 统计区边界 |
| `SZ` | 深圳 | 🔧 开发中 | 行政边界 |
| `SG` | 新加坡 | 📋 规划中 | — |
| `GLOBAL` | 全球 | 📋 规划中 | IBTrACS, 全球洪水 |

### 2.3 数据处理（后端脚本）

| 组件 | 技术 | 用途 |
|------|------|------|
| 数据处理 | **Python 3.11** (Anaconda) | 保单数据处理、地理编码、统计计算 |
| 洪水模型 | **GDAL / Rasterio** | GeoTIFF 处理与坐标转换 |
| 可视化 | **Folium** + Matplotlib | 生成交互式 HTML 地图与统计图表 |
| GeoServer 管理 | **requests** (REST API) | 批量上传图层、样式管理、缓存清理 |
| 地理计算 | **GeoPandas / Shapely** | 空间分析、面积计算 |

### 2.4 外部 API 集成

| 服务 | 用途 | 认证方式 |
|------|------|---------|
| **Google Maps Geocoding** | 全球地址转坐标 | API Key |
| **高德地图 (Amap)** | 中文地址地理编码（港澳中国） | API Key |
| **Nominatim (OSM)** | 免费地理编码备用 | 无需认证 |
| **Esri World Imagery** | 卫星底图瓦片 | 公开 |
| **CartoDB** | 浅色底图瓦片 | 公开 |

---

## 三、数据架构（当前 vs 目标）

### 3.1 当前状态：静态文件驱动

```
public/data/
├── tphk_portfolio_subset_5000.json     # 保单样本数据 (5000条)
├── by-year/                            # 按年份拆分的保单
│   ├── tphk-portfolio-2021.json
│   ├── tphk-portfolio-2022.json
│   ├── tphk-portfolio-2023.json
│   └── tphk-portfolio-2024.json
├── statistics/                         # 预计算统计数据
│   ├── districts-18-statistics.json    # 18区统计 (含年度版)
│   ├── ppu-statistics.json             # 9大规划区
│   ├── spu-statistics.json             # 52分区
│   ├── tpu-statistics.json             # 292规划小区
│   ├── subunit-statistics.json         # 4916子单元
│   ├── tpu-risk-density.json           # 风险密度
│   └── macau-*-statistics.json         # 澳门统计
├── historical-events.json              # 历史灾害事件
├── macau-typhoon-events.json           # 澳门台风事件
└── hk_blackrain_station_map.html       # 黑雨站点交互地图
```

**当前问题:**
- ❌ 无数据库 — 所有数据为静态 JSON，更新需重新生成
- ❌ 无用户认证系统 — 当前为硬编码登录
- ❌ 无数据版本管理 — 文件覆盖无历史记录
- ❌ 无并发支持 — 文件级读写无锁

### 3.2 目标状态：数据库驱动

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL + PostGIS                       │
├─────────────────────────────────────────────────────────────┤
│ natcat_portfolio (数据库)                                     │
│                                                              │
│ ┌──────────────────┐  ┌──────────────────┐                   │
│ │ policies         │  │ claims           │                   │
│ │ ─ policy_id      │  │ ─ claim_id       │                   │
│ │ ─ location (geom)│  │ ─ policy_id (FK) │                   │
│ │ ─ tsi            │  │ ─ loss_amount    │                   │
│ │ ─ premium        │  │ ─ event_id (FK)  │                   │
│ │ ─ region         │  │ ─ claim_date     │                   │
│ │ ─ district       │  └──────────────────┘                   │
│ │ ─ uw_year        │                                         │
│ └──────────────────┘  ┌──────────────────┐                   │
│                       │ disaster_events  │                   │
│ ┌──────────────────┐  │ ─ event_id       │                   │
│ │ statistics_cache │  │ ─ type           │                   │
│ │ ─ region         │  │ ─ date           │                   │
│ │ ─ level          │  │ ─ max_wind       │                   │
│ │ ─ year           │  │ ─ rainfall       │                   │
│ │ ─ stats_json     │  │ ─ loss           │                   │
│ │ ─ updated_at     │  │ ─ geometry (geom)│                   │
│ └──────────────────┘  └──────────────────┘                   │
│                                                              │
│ PostGIS Extensions: geometry, geography, raster              │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、系统架构图

```
用户浏览器 (Chrome/Edge)
    │
    ▼
┌────────────────────────────────────────────────┐
│  Next.js 15 Application (Port 3004)            │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Risk Map │ │Portfolio │ │ Disaster Info │  │
│  │ (riskmap)│ │          │ │               │  │
│  └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       │            │               │           │
│  ┌────┴────────────┴───────────────┴────┐      │
│  │         API Routes (Next.js)         │      │
│  │  /api/geoserver/wfs                  │      │
│  │  /api/geoserver/getfeatureinfo       │      │
│  │  /api/portfolio/statistics           │      │
│  └──────────┬───────────────────────────┘      │
└─────────────┼──────────────────────────────────┘
              │
    ┌─────────┼──────────┬─────────────────┐
    ▼         ▼          ▼                 ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌─────────────┐
│GeoSvr  │ │GeoSvr  │ │PostgreSQL  │ │  External   │
│Primary │ │Second. │ │+ PostGIS   │ │  APIs       │
│:8080   │ │:8090   │ │:5432       │ │  Google/Amap│
│        │ │        │ │(需要部署)   │ │  Nominatim  │
│洪水图层 │ │行政边界 │ │保单/理赔   │ │  Esri/Carto │
│台风路径 │ │COP/ITF │ │统计缓存    │ │             │
│暴雨强度 │ │        │ │灾害事件    │ │             │
└────────┘ └────────┘ └────────────┘ └─────────────┘
              │
              ▼
        ┌───────────────┐
        │  OasisLMF     │
        │  Docker 容器   │
        │  :8088/:8000  │
        │  巨灾模型引擎  │
        └───────────────┘
```

---

## 五、需要 IT 部门协助的事项

### 5.1 🔴 高优先级 — 数据库部署

| 需求 | 详情 |
|------|------|
| **数据库类型** | PostgreSQL 15+ with PostGIS 3.4+ |
| **数据库名** | `natcat_portfolio` |
| **预估数据量** | 保单数据 ~50,000-200,000 条/年，理赔数据 ~5,000-20,000 条/年 |
| **存储空间** | 初期 50GB（含 PostGIS 空间数据），预留扩展到 200GB |
| **连接方式** | 内网 TCP `5432`，仅允许应用服务器 IP 访问 |
| **备份策略** | 每日增量备份 + 每周全量备份 |
| **账号需求** | 1个应用账号 (读写) + 1个只读账号 (报表) |

**数据库表结构需求:**

```sql
-- 核心表
CREATE EXTENSION IF NOT EXISTS postgis;

-- 保单表
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    region VARCHAR(10) NOT NULL,           -- hk, mo, sz, sg
    district VARCHAR(100),
    address TEXT,
    location GEOMETRY(Point, 4326),        -- PostGIS 经纬度
    tsi NUMERIC(18,2),                     -- 总保额
    premium NUMERIC(18,2),                 -- 保费
    underwriting_year INT,
    line_of_business VARCHAR(50),
    occupancy_code VARCHAR(20),
    construction_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 理赔表
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES policies(id),
    claim_number VARCHAR(50) UNIQUE,
    event_id INT REFERENCES disaster_events(id),
    loss_amount NUMERIC(18,2),
    claim_date DATE,
    peril_type VARCHAR(30),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 灾害事件表
CREATE TABLE disaster_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(200),
    event_type VARCHAR(30),                -- typhoon, flood, rainstorm, landslide
    region VARCHAR(10),
    event_date DATE,
    end_date DATE,
    max_wind_speed VARCHAR(30),
    total_rainfall VARCHAR(30),
    estimated_loss VARCHAR(50),
    description TEXT,
    track_geometry GEOMETRY(LineString, 4326),
    impact_area GEOMETRY(Polygon, 4326),
    geoserver_layers TEXT[],               -- 关联的 WMS 图层名
    created_at TIMESTAMP DEFAULT NOW()
);

-- 统计缓存表 (加速前端查询)
CREATE TABLE statistics_cache (
    id SERIAL PRIMARY KEY,
    region VARCHAR(10) NOT NULL,
    stat_level VARCHAR(30) NOT NULL,       -- district, ppu, spu, tpu, subunit
    area_code VARCHAR(50),
    year INT,
    stats JSONB NOT NULL,                  -- 灵活存储统计结果
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(region, stat_level, area_code, year)
);

-- 空间索引
CREATE INDEX idx_policies_location ON policies USING GIST(location);
CREATE INDEX idx_events_track ON disaster_events USING GIST(track_geometry);
CREATE INDEX idx_events_impact ON disaster_events USING GIST(impact_area);
CREATE INDEX idx_policies_region_year ON policies(region, underwriting_year);
CREATE INDEX idx_stats_cache_lookup ON statistics_cache(region, stat_level, year);
```

### 5.2 🟡 中优先级 — 服务器与网络

| 需求 | 详情 |
|------|------|
| **应用服务器** | 当前运行在 `10.253.22.15`（精算部机器），需要迁移到正式服务器 |
| **操作系统** | Linux (Ubuntu 22.04 LTS) 或 Windows Server 2022 |
| **CPU / 内存** | 最低 4核 / 8GB，建议 8核 / 16GB |
| **Node.js** | v20 LTS |
| **端口开放** | `3004` (Next.js)、`8080` (GeoServer)、`5432` (PostgreSQL) |
| **域名/SSL** | 需要内网域名（如 `natcat.tpre.com`）+ HTTPS 证书 |
| **反向代理** | Nginx 反向代理，统一入口 |

**Nginx 配置建议:**

```nginx
server {
    listen 443 ssl;
    server_name natcat.tpre.com;

    # Next.js 应用
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # GeoServer 代理 (解决 CORS)
    location /geoserver/ {
        proxy_pass http://localhost:8080/geoserver/;
        proxy_set_header Host $host;
    }
}
```

### 5.3 🟡 中优先级 — GeoServer 运维

| 需求 | 详情 |
|------|------|
| **当前状态** | 运行在精算部服务器，Jetty 默认部署，无高可用 |
| **数据目录** | GeoServer data_dir 约 15GB（含 GeoTIFF 栅格数据） |
| **建议** | Tomcat 部署 + 专用存储卷（GeoTIFF 数据量大） |
| **Java** | JDK 11+ (GeoServer 2.24+) |
| **内存** | GeoServer JVM 建议 `-Xmx4g`（大量栅格图层） |
| **缓存** | GWC (GeoWebCache) tile cache ~5GB |

**当前图层清单:**

| 类别 | 数量 | 数据格式 | 空间覆盖 |
|------|------|---------|---------|
| HK 洪水设计场景 | 21 层 | GeoTIFF | 香港全域 |
| MO 洪水设计场景 | 143 层 | GeoTIFF | 澳门全域 |
| MO 历史台风洪水 | 98 层 | GeoTIFF | 澳门全域 |
| MO 历史暴雨洪水 | 29 层 | GeoTIFF | 澳门全域 |
| IBTrACS 全球台风 | 2 层 | Shapefile (线/点) | 西太平洋 |
| HK 行政边界 | 5 层 | Shapefile (面) | 香港 |
| MO 行政边界 | 2 层 | Shapefile (面) | 澳门 |
| **合计** | **~300 层** | | |

### 5.4 🟢 低优先级 — 用户认证

| 需求 | 详情 |
|------|------|
| **当前状态** | 硬编码用户名密码，localStorage 存储 |
| **目标** | 接入公司 AD/LDAP 或 OAuth2 SSO |
| **用户角色** | Admin(管理员), Analyst(精算分析), Viewer(只读查看) |
| **建议方案** | NextAuth.js + Azure AD / Okta / 公司统一认证 |

### 5.5 🟢 低优先级 — Docker 化部署

```yaml
# docker-compose.yml (目标部署方案)
version: '3.8'
services:
  # 前端应用
  nextjs:
    build: ./UI_system
    ports: ["3004:3004"]
    environment:
      - DATABASE_URL=postgresql://natcat:password@postgres:5432/natcat_portfolio
    depends_on: [postgres, geoserver]

  # 数据库
  postgres:
    image: postgis/postgis:15-3.4
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: natcat_portfolio
      POSTGRES_USER: natcat
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  # 地理空间服务
  geoserver:
    image: kartoza/geoserver:2.24.0
    ports: ["8080:8080"]
    environment:
      GEOSERVER_ADMIN_USER: admin
      GEOSERVER_ADMIN_PASSWORD: ${GS_PASSWORD}
      INITIAL_MEMORY: 2g
      MAXIMUM_MEMORY: 4g
    volumes:
      - geoserver_data:/opt/geoserver/data_dir
      - ./geotiffs:/opt/geoserver/geotiffs

  # 反向代理
  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on: [nextjs, geoserver]

volumes:
  pgdata:
  geoserver_data:
```

---

## 六、网络拓扑与端口需求

```
                    ┌─── 公司内网 ───┐
                    │                │
用户浏览器 ───443──▶│  Nginx (SSL)   │
                    │    │           │
                    │    ├──3004──▶ Next.js App
                    │    ├──8080──▶ GeoServer #1 (灾害图层)
                    │    └──5432──▶ PostgreSQL + PostGIS
                    │                │
                    └────────────────┘
                           │
                    ┌──────┴───────┐
                    │  外部服务    │
                    │  (出站)      │
                    ├──────────────┤
                    │ Google API   │ ← 需要出站 HTTPS
                    │ Amap API     │ ← 需要出站 HTTPS
                    │ OSM/Nominatim│ ← 需要出站 HTTPS
                    │ Esri Tiles   │ ← 需要出站 HTTPS
                    │ CartoDB Tiles│ ← 需要出站 HTTPS
                    │ Leaflet CDN  │ ← 需要出站 HTTPS
                    └──────────────┘
```

**防火墙 / 出站白名单:**

| 域名 | 端口 | 用途 |
|------|------|------|
| `maps.googleapis.com` | 443 | 地理编码 |
| `restapi.amap.com` | 443 | 高德地理编码 |
| `nominatim.openstreetmap.org` | 443 | OSM 地理编码 |
| `server.arcgisonline.com` | 443 | Esri 卫星底图 |
| `*.basemaps.cartocdn.com` | 443 | CartoDB 底图 |
| `cdn.jsdelivr.net` | 443 | Leaflet JS/CSS CDN |
| `unpkg.com` | 443 | JS 库 CDN |

---

## 七、Portfolio Management 模块详细 IT 需求

> Portfolio Management（保单组合管理）是平台的**核心业务数据模块**，负责保单数据导入、地理编码、空间分析、区域累积监控和风险密度计算。该模块对数据库、Python 后端和数据处理管线有严格的 IT 基础设施要求。

### 7.1 模块功能概览

| 功能模块 | 说明 | 当前状态 |
|----------|------|---------|
| **Portfolio Map** | 保单空间可视化（热力图、标记点、GeoServer WMS 叠加、区域选择、choropleth 着色） | ✅ 已上线（静态数据） |
| **Districts Analysis** | 18 区/堂区暴露统计表 + 图表 | ✅ 已上线 |
| **Cross Analysis** | 多维交叉分析（占用性质 × 区域 × 险种等） | ✅ 已上线 |
| **Premium Trends** | 保费/保额时间序列趋势分析 (2021–2024) | ✅ 已上线 |
| **Zone Accumulation** | 区域累积限额监控 + 红黄绿灯预警 | 🔧 待数据库上线 |
| **Claims Integration** | 理赔数据关联分析 | 🔧 待数据库上线 |
| **FastAPI Backend** | 独立 API 服务（Python 后端） | 🔧 待部署 |

### 7.2 前端组件架构

**核心页面:**

| 文件 | 代码行数 | 功能 |
|------|---------|------|
| `src/app/portfolio/page.tsx` | 298 行 | 主页面 — 4 Tab 仪表盘（Map / Districts / Analysis / Trends） |
| `src/app/portfolio-statistics/page.tsx` | 356 行 | 统计详情页 |
| `src/app/portfolio-backup/page.tsx` | 82 行 | 备份页面 |

**20 个前端组件 (`src/components/portfolio/`):**

| 组件 | 代码行数 | 功能 |
|------|---------|------|
| **PortfolioMap.tsx** | 2,178 行 | 核心地图组件 — 热力图/标记/WMS/choropleth/区域选择 |
| **GeoServerLayers.tsx** | 489 行 | WMS 图层交互 + Feature Info 弹窗 |
| **PortfolioTable.tsx** | ~300 行 | 保单数据表格（搜索/排序/分页） |
| **DistrictExposure.tsx** | ~250 行 | 18区暴露统计图表 |
| **CrossAnalysis.tsx** | ~200 行 | 多维交叉分析面板 |
| **PremiumTrend.tsx** | ~180 行 | 保费趋势折线图（Recharts） |
| **StatisticsPanel.tsx** | ~400 行 | 统计数据展示面板 |
| 其他 13 个组件 | ~1,500 行 | Filter/Legend/Export/Summary 等辅助组件 |

### 7.3 API 路由架构（当前 vs 目标）

#### 7.3.1 当前架构：Next.js API Route → Python child_process

```
┌─────────────────────────────────────────────────────────────────────────┐
│  浏览器                                                                  │
│  GET /api/portfolio/statistics?dimension=region                         │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js API Route (route.ts)                                           │
│                                                                          │
│  import { spawn } from 'child_process';                                  │
│  const PYTHON_PATH = 'C:\\Users\\sichen\\...\\anaconda3\\python.exe';     │
│                                                                          │
│  // 每次请求 spawn 一个新的 Python 进程                                    │
│  const python = spawn(PYTHON_PATH, ['-c', pythonCode]);                  │
│                                                                          │
│  // pythonCode = f"""                                                     │
│  //   from portfolio_analytics import PortfolioAnalytics                  │
│  //   with PortfolioAnalytics() as pa:                                    │
│  //       result = pa.group_by_field('region')                           │
│  //       print(json.dumps(result))                                       │
│  // """                                                                    │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Python Process (每次请求创建 → 执行 → 销毁)                              │
│  PortfolioAnalytics.connect() → psycopg2.connect(DB_CONFIG)              │
│  → SQL Query → 返回结果 → json.dumps → stdout → Node.js 接收              │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
               PostgreSQL:5432  (或 JSON 文件静态返回)
```

**当前 7 个 API 端点:**

| 端点 | 方法 | 功能 | 后端实现 |
|------|------|------|---------|
| `/api/portfolio/statistics` | GET | 多维统计分析（按区域/险种/占用性质等） | spawn Python `portfolio_analytics.py` |
| `/api/portfolio/18-districts` | GET | 18 区暴露统计 | spawn Python `get_18_districts_exposure()` |
| `/api/portfolio/region-stats` | GET | TPU/PPU/SPU/District/Subunit 分级统计 | spawn Python |
| `/api/portfolio/group-by` | POST | 灵活字段聚合分析 | spawn Python `group_by_field()` |
| `/api/portfolio/fields` | GET | 数据库字段列表 | spawn Python |
| `/api/portfolio/time-series` | GET | 时间序列分析 | spawn Python `time_series_analysis()` |
| `/api/portfolio/all-policies` | GET | 所有保单（含地理坐标） | spawn Python → JSON |

**⚠️ 当前问题:**
- ❌ Python 路径**硬编码**为开发者本地 Anaconda 路径：`C:\Users\sichen\AppData\Local\anaconda3\python.exe`
- ❌ 每次 API 请求都 **spawn 新进程** → 启动开销大（~500ms-2s），无连接复用
- ❌ 无连接池 → 每次请求创建新的 DB 连接
- ❌ 无错误恢复 → Python 进程崩溃直接返回 500
- ❌ 数据库配置在两处代码中**重复定义**（`database.py` vs `portfolio_analytics.py`），默认值不一致

#### 7.3.2 目标架构：独立 FastAPI 后端服务

```
┌─────────────────────────────────────────────────────────────────────────┐
│  浏览器                                                                  │
│  GET /api/portfolio/stats/summary                                        │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js Proxy / Nginx 反向代理                                          │
│  → proxy_pass http://localhost:8000/api/                                 │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FastAPI Application (Port 8000)        常驻进程，连接池复用               │
│                                                                          │
│  app = FastAPI(title="Portfolio Management API")                         │
│                                                                          │
│  路由模块:                                                                │
│  ├── /api/policies     → 保单 CRUD + GeoJSON 导出                        │
│  ├── /api/zones        → 区域累积查询 + 限额监控                           │
│  ├── /api/events       → 灾害事件查询 + 关联保单                           │
│  ├── /api/stats        → 统计摘要 / 热力图 / 分布直方图 / 建筑年龄         │
│  └── /health           → 数据库健康检查                                    │
│                                                                          │
│  依赖:                                                                    │
│  psycopg2 → 直连 PostgreSQL (RealDictCursor)                             │
│  pydantic → 请求/响应数据验证                                              │
│  python-dotenv → 环境变量配置                                              │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
               PostgreSQL + PostGIS (:5432)
```

**FastAPI 已开发的端点 (共 13 个):**

| 路由模块 | 端点 | 方法 | 功能 |
|----------|------|------|------|
| **Policies** | `/api/policies/` | GET | 保单列表（分页、筛选：region/occupancy/coverage/event/TSI范围） |
| | `/api/policies/{policy_id}` | GET | 单个保单详情 |
| | `/api/policies/geojson/all` | GET | 保单 GeoJSON 导出（地图可视化用，上限 50,000） |
| **Zones** | `/api/zones/` | GET | 所有区域累积统计 |
| | `/api/zones/{region}` | GET | 单个区域累积详情 |
| | `/api/zones/{region}/policies` | GET | 某区域内所有保单 |
| | `/api/zones/limits/monitoring` | GET | 限额利用率监控（红黄绿灯视图） |
| **Events** | `/api/events/` | GET | 灾害事件列表 |
| | `/api/events/{event_code}` | GET | 单个事件详情 |
| | `/api/events/{event_code}/policies` | GET | 事件影响保单列表 |
| **Stats** | `/api/stats/summary` | GET | 总览统计（保单数/TSI/区域/占用，TOP10排名） |
| | `/api/stats/heatmap` | GET | 热力图数据点（归一化强度） |
| | `/api/stats/distribution/sum_insured` | GET | 保额分布直方图（WIDTH_BUCKET） |
| | `/api/stats/building_age` | GET | 建筑年龄分组统计 |

### 7.4 数据库详细需求

#### 7.4.1 数据库 Schema 设计（已完成定义）

完整 Schema 文件：`scripts/portfolio_management/database/schema.sql`（404 行）

```
database: natcat_portfolio
schema:   portfolio

┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  ┌─────────────────────┐       ┌─────────────────────┐                        │
│  │  portfolio.policies │◄──FK──│  portfolio.claims    │                        │
│  │  (保单主表)          │       │  (理赔数据表)         │                        │
│  │                     │       │                      │                        │
│  │  id (PK)            │       │  id (PK)             │                        │
│  │  保單號 (UNIQUE)     │       │  立案號 (UNIQUE)      │                        │
│  │  巨災代碼 / 巨災名稱 │       │  巨災代碼 / 巨災名稱  │                        │
│  │  業務類別            │       │  險種代碼 / 險種名稱  │                        │
│  │  保單起期 / 保單止期  │       │  出險日期 / 結案日期  │                        │
│  │  險種名稱            │       │  已決賠款 / 已決賠款HKD│                       │
│  │  承保地區範圍名稱     │       │  末決賠款 / 末決賠款HKD│                       │
│  │  國家或地區 / 分區    │       │  出險原因描述 / 水浸深度│                      │
│  │  保險處所 (地址)      │       │  geom (PostGIS Point) │                       │
│  │  建築等級 / 佔用性質  │       │  policy_id_fk (FK)   │                        │
│  │  共保前總保險金額     │       └──────────────────────┘                        │
│  │  公司保額 / 承保份額  │                                                      │
│  │  geom (PostGIS Point)│       ┌─────────────────────┐                        │
│  │  formatted_address   │       │  portfolio.events    │                        │
│  │  geocoding_provider  │       │  (巨灾事件表)         │                        │
│  │  data_quality_score  │       │                      │                        │
│  │  ...80+ 字段         │       │  id (PK)             │                        │
│  └─────────────────────┘       │  event_code (UNIQUE) │                        │
│                                │  event_type          │                        │
│  ┌─────────────────────┐       │  affected_regions    │                        │
│  │  zone_accumulations │       │  total_exposure      │                        │
│  │  (分区累积统计表)     │       └─────────────────────┘                        │
│  │                     │                                                      │
│  │  id (PK)            │       ┌─────────────────────┐                        │
│  │  region (UNIQUE)    │       │  portfolio.zone_limits│                       │
│  │  total_sum_insured  │◄─JOIN─│  (分区限额配置表)      │                       │
│  │  policy_count       │       │                      │                        │
│  │  occupancy_breakdown│       │  capacity_limit      │                        │
│  │  max_single_risk    │       │  warning_threshold   │ → 80% 黄灯             │
│  │  concentration_ratio│       │  critical_threshold  │ → 90% 红灯             │
│  └─────────────────────┘       │  utilization         │                        │
│                                └─────────────────────┘                        │
│                                                                                │
│  ┌─────────────────────────────────────────────┐                              │
│  │  VIEW: portfolio.v_limit_monitoring          │                              │
│  │  → JOIN zone_limits + zone_accumulations     │                              │
│  │  → 实时计算 utilization + alert_status        │                              │
│  │  → alert_status: 'safe' / 'warning' / 'critical' │                         │
│  └─────────────────────────────────────────────┘                              │
│                                                                                │
│  ┌────────────────────────┐                                                   │
│  │  processing_logs       │  记录所有 geocoding / aggregation / import 操作      │
│  └────────────────────────┘                                                   │
│                                                                                │
│  FUNCTION: refresh_zone_accumulations() → 刷新分区累积统计                      │
│  TRIGGER:  update_updated_at → 自动维护 updated_at 时间戳                       │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### 7.4.2 保单表字段详情（80+ 字段，中英文双命名）

**特殊设计说明:**
- 保单表同时包含**原始中文字段**（`保單號`、`巨災代碼`、`分區`、`公司保額`等）和**标准化英文字段**（`policy_id`、`event_code`、`region`、`sum_insured`等），原因是：
  - 原始数据来自中文 Excel（太平再保险业务系统导出）
  - 英文字段用于 API 查询和前端展示
  - 中文字段保留用于审计追溯和精算分析脚本
- **PostGIS 空间列**: `geom GEOMETRY(Point, 4326)` 存储 WGS84 经纬度
- **全文搜索索引**: `GIN(to_tsvector('english', address))` 用于地址模糊搜索
- **数据质量评分**: `data_quality_score NUMERIC(3,2)` 评估 geocoding 结果可靠性

#### 7.4.3 索引策略

| 索引类型 | 表 | 字段 | 用途 |
|----------|---|------|------|
| **GIST 空间** | policies | geom | 空间查询（点在面内、距离计算） |
| **GIST 空间** | claims | geom | 理赔数据空间查询 |
| **GIN 全文** | policies | address | 地址模糊搜索 |
| **B-tree** | policies | region | 按区域过滤 |
| **B-tree** | policies | event_name | 按事件过滤 |
| **B-tree** | policies | occupancy | 按占用性质过滤 |
| **B-tree** | policies | (policy_start, policy_end) | 保单有效期范围查询 |
| **B-tree** | policies | sum_insured | 保额分布排序 |
| **B-tree** | claims | 分區 | 理赔区域统计 |
| **B-tree** | claims | 巨災名稱 | 按事件查理赔 |
| **B-tree** | claims | 出險日期 | 理赔时间序列 |
| **B-tree** | zone_limits | alert_status | 预警状态过滤 |
| **B-tree** | events | (event_start_date, event_end_date) | 事件时间范围 |

#### 7.4.4 数据量预估

| 表 | 初始数据量 | 年增长 | 5年预估 |
|----|-----------|-------|---------|
| **policies** | ~68,762 条 (HK) + ~15,000 条 (MO) | ~20,000 条/年 | ~180,000+ |
| **claims** | ~5,000 条 | ~2,000 条/年 | ~15,000+ |
| **zone_accumulations** | ~300 条 (区域数) | 基本稳定 | ~500 |
| **zone_limits** | ~300 条 | 随业务扩展 | ~500 |
| **events** | ~50 条 | ~5-10 条/年 | ~100 |
| **processing_logs** | — | ~1,000 条/年 | ~5,000 |

**存储空间估算:**
- 保单表单行约 2KB（80+ 字段 + geom） × 180,000 行 ≈ **360MB**
- 索引空间 ≈ **150MB**（含 GIST + GIN + B-tree）
- 理赔 + 事件 + 日志 ≈ **50MB**
- **建议初始分配: 2GB 数据空间 + 1GB 索引空间，预留扩展到 10GB**

### 7.5 Python 后端基础设施需求

#### 7.5.1 Python 运行环境

| 需求 | 详情 |
|------|------|
| **Python 版本** | 3.11+ (当前开发使用 Anaconda 3.11/3.13) |
| **安装方式** | 建议使用系统 Python + venv 虚拟环境（非 Anaconda） |
| **虚拟环境路径** | `/opt/natcat/venv/` 或 `D:\natcat\venv\` |
| **包管理** | pip + requirements.txt |

**核心 Python 依赖 (`requirements.txt`):**

| 包 | 版本 | 用途 |
|----|------|------|
| **fastapi** | ≥0.104.0 | Web API 框架 |
| **uvicorn[standard]** | ≥0.24.0 | ASGI 服务器（HTTP 服务） |
| **psycopg2-binary** | ≥2.9.9 | PostgreSQL 数据库驱动 |
| **sqlalchemy** | ≥2.0.23 | ORM（备选，当前直接 SQL） |
| **geoalchemy2** | ≥0.14.2 | PostGIS SQLAlchemy 扩展 |
| **pandas** | ≥2.2.0 | 数据处理框架 |
| **numpy** | ≥1.26.0 | 数值计算 |
| **openpyxl** | ≥3.1.2 | Excel 文件读取 |
| **shapely** | ≥2.0.0 | 空间几何计算 |
| **requests** | ≥2.31.0 | HTTP 请求（geocoding API） |
| **pydantic** | ≥2.5.0 | 数据验证 |
| **python-dotenv** | ≥1.0.0 | 环境变量管理 |
| **python-multipart** | ≥0.0.6 | 文件上传支持 |
| **python-dateutil** | ≥2.8.2 | 日期处理 |

#### 7.5.2 FastAPI 服务部署配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **监听地址** | `0.0.0.0:8000` | 所有网卡 |
| **Workers** | 4 (生产) / 1 (开发) | Uvicorn worker 数量 |
| **启动命令** | `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4` | 生产模式 |
| **自动重载** | `--reload`(仅开发) | 代码修改后自动重启 |
| **CORS 白名单** | `http://localhost:3000`, `http://10.253.22.15:3004`, 生产域名 | 跨域访问 |
| **日志格式** | `%(asctime)s - %(name)s - %(levelname)s - %(message)s` | 标准日志 |

**系统服务配置 (Linux systemd `natcat-api.service`):**

```ini
[Unit]
Description=Nat Cat Portfolio API
After=postgresql.service network.target

[Service]
Type=simple
User=natcat
Group=natcat
WorkingDirectory=/opt/natcat/portfolio_management/api
Environment=PATH=/opt/natcat/venv/bin
EnvironmentFile=/opt/natcat/portfolio_management/.env
ExecStart=/opt/natcat/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Windows 服务配置 (如使用 NSSM):**

```cmd
nssm install NatCatAPI "D:\natcat\venv\Scripts\uvicorn.exe"
nssm set NatCatAPI AppParameters "main:app --host 0.0.0.0 --port 8000 --workers 4"
nssm set NatCatAPI AppDirectory "D:\natcat\portfolio_management\api"
nssm set NatCatAPI AppEnvironmentExtra "DB_HOST=localhost" "DB_PORT=5432" "DB_NAME=natcat_portfolio"
```

### 7.6 数据处理管线（Data Pipeline）

#### 7.6.1 数据流全景图

```
┌──────────────────── 数据源 ────────────────────┐
│                                                  │
│  Excel 文件 (太平再保险业务系统导出)                │
│  D:\...\TPHK\2412 巨災統計-承保信息 (香港地區).xlsx │
│  D:\...\TPHK\2412 巨災統計-理赔信息 (香港地區).xlsx │
│  D:\...\TPMO\...                                 │
│                                                  │
└───────────────────┬──────────────────────────────┘
                    │  ① 数据读取 (openpyxl + pandas)
                    ▼
┌──────────────────────────────────────────────────┐
│  Python Data Pipeline                             │
│                                                   │
│  Step 1: Excel → DataFrame (清洗 + 标准化)         │
│            中文字段 → 英文字段映射                   │
│            数据验证 + 质量评分                       │
│                                                   │
│  Step 2: 地理编码 (Geocoding)                      │
│            保險處所 → (latitude, longitude)          │
│            ├── Google Maps API (全球地址)            │
│            ├── 高德地图 API (中文地址优化)            │
│            └── Nominatim (免费备选)                  │
│            速率: 10 req/s, 批量: 100 条/批            │
│                                                   │
│  Step 3: 空间关联                                   │
│            (lat, lng) → TPU / PPU / SPU / 18区      │
│            ├── GeoServer WFS 查询                   │
│            └── PostGIS ST_Contains()                │
│                                                   │
│  Step 4: 统计生成 (5 级 HK + 2 级 MO)               │
│            ├── 18 Districts (含年度版本)              │
│            ├── 9 PPU (主要规划区)                     │
│            ├── 52 SPU (次级规划区)                    │
│            ├── 292 TPU (规划小区)                     │
│            ├── 4,916 Subunits (子单元)               │
│            ├── 7 Macau Parishes (堂区)               │
│            └── 25 Macau Statistical Areas            │
│                                                   │
└───────────────────┬──────────────────────────────┘
                    │
           ┌────────┼────────┐
           ▼                 ▼
┌─────────────────┐  ┌─────────────────────────────┐
│  PostgreSQL     │  │  Static JSON Files           │
│  (目标存储)      │  │  (当前存储 - 49个文件)        │
│                 │  │                              │
│  INSERT INTO    │  │  public/data/statistics/     │
│  portfolio.     │  │  ├── districts-18-*.json     │
│  policies       │  │  ├── ppu-*.json              │
│                 │  │  ├── spu-*.json              │
│  REFRESH        │  │  ├── tpu-*.json              │
│  zone_          │  │  ├── subunit-*.json          │
│  accumulations  │  │  ├── macau-parish-*.json     │
│                 │  │  └── macau-stat-area-*.json   │
└─────────────────┘  └─────────────────────────────┘
```

#### 7.6.2 地理编码 API 配额需求

| API | 月免费额度 | 当前用量/次 | 费用（超额） |
|-----|-----------|------------|-------------|
| **Google Maps Geocoding** | 40,000 次/月 ($200 credit) | ~70,000 次/全量 | $5 / 1000 次 |
| **高德地图 Geocoding** | 300,000 次/天 | ~70,000 次/全量 | 免费（企业认证） |
| **Nominatim (OSM)** | 无限制（1 req/s） | 备选 | 免费 |

> ⚠️ **全量 geocoding 约需 70,000+ 次 API 调用**（HK 68,762 + MO 15,000），建议首次处理后缓存结果，增量更新仅处理新保单。

#### 7.6.3 已生成的统计 JSON 文件清单（49 个文件）

```
public/data/statistics/
├── districts-18-statistics.json           # 18区总览
├── districts-18-statistics-2021.json      # 18区 2021年
├── districts-18-statistics-2022.json      # 18区 2022年
├── districts-18-statistics-2023.json      # 18区 2023年
├── districts-18-statistics-2024.json      # 18区 2024年
├── ppu-statistics.json                    # 9大规划区
├── ppu-statistics-{2021..2024}.json       # 年度版本
├── spu-statistics.json                    # 52分区
├── spu-statistics-{2021..2024}.json
├── tpu-statistics.json                    # 292规划小区
├── tpu-statistics-{2021..2024}.json
├── tpu-risk-density.json                  # 风险密度
├── subunit-statistics.json                # 4916子单元
├── subunit-statistics-{2021..2024}.json
├── macau-parish-statistics.json           # 澳门7堂区
├── macau-parish-statistics-{2021..2024}.json
├── macau-statistical-area-statistics.json  # 澳门25统计区
└── macau-statistical-area-statistics-{2021..2024}.json
```

### 7.7 地理层级体系

#### 7.7.1 香港 5 级行政地理体系

```
香港地理层级 (HK Geographic Hierarchy)

Level 1:  18 Districts (区/地区)
          例: 九龙城区, 油尖旺区, 湾仔区, 中西区...
              │
Level 2:  9 PPU (主要规划区 / Primary Planning Unit)
          例: 香港岛, 九龙城, 观塘, 黄大仙...
              │
Level 3:  52 SPU (次级规划区 / Secondary Planning Unit)
          例: 深水埗, 旺角, 油麻地, 尖沙咀...
              │
Level 4:  292 TPU (规划小区 / Tertiary Planning Unit)
          例: TPU 2/1/1, TPU 2/1/2...
              │
Level 5:  4,916 Subunits (子单元)
          最细粒度，用于高精度风险密度计算
```

#### 7.7.2 澳门 2 级行政地理体系

```
澳门地理层级 (Macau Geographic Hierarchy)

Level 1:  7 Parishes (堂区)
          花地瑪堂區, 聖安多尼堂區, 大堂區, 風順堂區,
          望德堂區, 嘉模堂區, 聖方濟各堂區
              │
Level 2:  25 Statistical Areas (统计区)
          各堂区下的细分统计区域
```

#### 7.7.3 GeoServer 空间数据支撑

| 图层 | GeoServer 实例 | Workspace | 类型 | 用途 |
|------|---------------|-----------|------|------|
| HK 18 Districts | 143.89.22.7:8090 | HK | Polygon | 18区边界叠加 |
| HK PPU | 143.89.22.7:8090 | HK | Polygon | 9大规划区 |
| HK SPU | 143.89.22.7:8090 | HK | Polygon | 52分区 |
| HK TPU | 143.89.22.7:8090 | HK | Polygon | 292规划小区 |
| HK Subunits | 143.89.22.7:8090 | HK | Polygon | 4916子单元 |
| MO Parishes | 143.89.22.7:8090 | macau | Polygon | 7堂区 |
| MO Statistical Areas | 143.89.22.7:8090 | macau | Polygon | 25统计区 |

### 7.8 环境变量配置清单

**`.env` 完整配置 (生产环境需修改):**

```dotenv
# ====== 数据库 ======
DB_HOST=<IT分配的PostgreSQL地址>    # 开发: localhost
DB_PORT=5432
DB_NAME=natcat_portfolio
DB_USER=natcat_app                   # IT创建的应用账号
DB_PASSWORD=<strong_password>        # IT设置的安全密码

# ====== API 服务 ======
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=false                     # 生产环境禁用

# ====== API 安全 ======
API_SECRET_KEY=<random_256bit_key>   # IT生成安全密钥
API_ALGORITHM=HS256
API_ACCESS_TOKEN_EXPIRE_MINUTES=30

# ====== 数据源路径 ======
TPHK_POLICY_FILE=/data/insurance/TPHK/承保信息.xlsx   # 需要IT配置共享路径
TPHK_CLAIM_FILE=/data/insurance/TPHK/理赔信息.xlsx

# ====== 输出路径 ======
OUTPUT_DATA_DIR=/opt/natcat/UI_system/public/data
CACHE_DIR=/opt/natcat/cache
LOG_DIR=/var/log/natcat

# ====== Geocoding API ======
GOOGLE_MAPS_API_KEY=<IT申请的API Key>
AMAP_API_KEY=<IT申请的API Key>

# ====== 处理配置 ======
GEOCODING_RATE_LIMIT=10
BATCH_SIZE=100
MAX_WORKERS=4

# ====== 缓存 (可选) ======
# REDIS_HOST=localhost
# REDIS_PORT=6379
# CACHE_EXPIRE_SECONDS=3600

# ====== CORS ======
CORS_ORIGINS=http://localhost:3000,https://natcat.tpre.com
CORS_ALLOW_CREDENTIALS=true

# ====== 日志 ======
LOG_LEVEL=INFO
```

### 7.9 Portfolio 模块 IT 需求汇总

#### 🔴 高优先级（数据库 + 后端服务）

| # | 需求 | 详情 | 工作量评估 |
|---|------|------|-----------|
| **P1** | **部署 PostgreSQL + PostGIS** | 数据库名 `natcat_portfolio`，schema `portfolio`，6表 + 1视图 + 2函数 + 2触发器。初始 2GB，预留 10GB | 1-2 天 |
| **P2** | **创建数据库账号** | 应用账号 `natcat_app`（SELECT/INSERT/UPDATE/DELETE） + 只读账号 `natcat_readonly`（SELECT only） | 0.5 天 |
| **P3** | **执行建表 SQL** | 运行 `schema.sql`（404行），包含 PostGIS Extension + 所有表/索引/视图/函数 | 0.5 天 |
| **P4** | **配置 Python 环境** | Python 3.11+、创建 venv、pip install requirements.txt（14个核心包） | 0.5 天 |
| **P5** | **部署 FastAPI 服务** | 端口 8000，systemd/NSSM 注册为系统服务，开机自启，故障自动重启 | 1 天 |
| **P6** | **Nginx 反向代理增加 /api 路由** | FastAPI 8000 端口代理到 `https://natcat.tpre.com/api/` | 0.5 天 |

#### 🟡 中优先级（数据管线 + 安全）

| # | 需求 | 详情 | 工作量评估 |
|---|------|------|-----------|
| **P7** | **配置数据源共享路径** | Excel 原始文件需要从本地 `D:\` 迁移到服务器共享路径 | 0.5 天 |
| **P8** | **定时任务配置** | cron/Task Scheduler 定期刷新统计聚合（`refresh_zone_accumulations()`） | 0.5 天 |
| **P9** | **数据库备份策略** | 每日增量 + 每周全量，保留 30 天。含 PostGIS 空间数据备份验证 | 1 天 |
| **P10** | **API Key 安全管理** | Google Maps / 高德地图 API Key 需要 IT 统一申请和管理 | 1 天 |

#### 🟢 低优先级（优化 + 扩展）

| # | 需求 | 详情 | 工作量评估 |
|---|------|------|-----------|
| **P11** | **Redis 缓存（可选）** | 缓存高频统计查询，减少 DB 压力。`localhost:6379` | 0.5 天 |
| **P12** | **数据库连接池优化** | 当前无连接池，建议 pgbouncer 或 SQLAlchemy pool | 1 天 |
| **P13** | **日志集中管理** | FastAPI + 数据处理日志集中到 `/var/log/natcat/`，接入公司日志系统 | 1 天 |
| **P14** | **监控告警** | PostgreSQL 连接数 / 磁盘用量 / API 响应时间 / Python 进程存活性 | 1 天 |

---

## 八、总结：IT 沟通要点

### Phase 1 — 立即需要（基础设施搭建）
1. **部署 PostgreSQL 15 + PostGIS 3.4** — 数据库 `natcat_portfolio`，执行 `schema.sql` 建表，初始 2GB + 预留 10GB
2. **创建数据库账号** — 应用账号 `natcat_app` (读写) + `natcat_readonly` (只读报表)
3. **配置 Python 3.11+ 环境** — venv 虚拟环境 + pip install 14 个核心包
4. **部署 FastAPI 服务** — 端口 8000，注册为系统服务（systemd/NSSM），自动重启
5. **分配正式服务器** — 迁移 `10.253.22.15` 上的应用到 IT 管理服务器
6. **配置内网域名** — `natcat.tpre.com` + HTTPS 证书
7. **Nginx 反向代理** — 3004 (Next.js) + 8000 (FastAPI) + 8080 (GeoServer) 统一入口
8. **出站白名单** — Google/Amap/OSM/Esri/CartoDB API

### Phase 2 — 后续规划（安全 + 运维）
9. **Docker 化部署** — docker-compose 统一管理（Next.js + PostgreSQL + GeoServer + FastAPI + Nginx）
10. **接入公司认证** — AD/LDAP 或 SSO（替换当前硬编码登录）
11. **备份策略** — PostgreSQL 每日增量 + 每周全量 + GeoServer data_dir 备份
12. **定时任务** — 统计聚合刷新 + 数据质量检查
13. **Redis 缓存** — 高频查询缓存（可选）
14. **监控告警** — 服务健康检查 + DB连接数 + 磁盘/内存 + API 响应时间

### 端口汇总

| 端口 | 服务 | 方向 | 说明 |
|------|------|------|------|
| **443** | Nginx (HTTPS) | 入站 | 用户访问统一入口 |
| **80** | Nginx (HTTP→HTTPS redirect) | 入站 | 重定向到 HTTPS |
| **3004** | Next.js | 内部 | 前端应用（Nginx 代理） |
| **8000** | FastAPI (Python) | 内部 | Portfolio API（Nginx 代理） |
| **8080** | GeoServer #1 | 内部 | 灾害图层（Nginx 代理） |
| **8090** | GeoServer #2 | 出站 | 外部地理底图服务 |
| **5432** | PostgreSQL | 内部 | 数据库（仅应用服务器访问） |
| **6379** | Redis (可选) | 内部 | 缓存（可选部署） |

### 服务器资源需求（汇总）

| 资源 | 最低配置 | 建议配置 |
|------|---------|---------|
| **CPU** | 4 核 | 8 核 |
| **内存** | 8 GB | 16 GB |
| **磁盘** | 100 GB | 200 GB |
| **分配**: Next.js | 1 核 / 2 GB | |
| **分配**: FastAPI (4 workers) | 1 核 / 2 GB | |
| **分配**: GeoServer (JVM -Xmx4g) | 1 核 / 4 GB | |
| **分配**: PostgreSQL + PostGIS | 1 核 / 2 GB | |
| **磁盘**: GeoServer data_dir | 15 GB (GeoTIFF 栅格) | |
| **磁盘**: PostgreSQL data | 2 GB (初始) → 10 GB (5年) | |
| **磁盘**: 应用代码 + 静态文件 | 5 GB | |
| **磁盘**: 日志 + 备份 | 20 GB | |
