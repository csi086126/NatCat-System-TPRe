# 巨灾风险管理平台 (Nat Cat Platform) - 需求与技术规格书

## 1. 项目愿景 (Project Vision)

**目标**：构建一个基于 Web 的地理空间分析平台，用于直观展示和量化自然灾害（如洪水、台风）对保险投资组合（Portfolio）的潜在风险。

**核心价值**：解决传统表格数据无法识别“地理风险累积 (Accumulation Risk)”的问题，通过地图可视化帮助承保人 (Underwriters) 做出更精准的风险决策。

---

## 2. 系统架构设计 (System Architecture)

我们将从“基于文件和脚本”的模式，转型为“基于数据库和 API”的现代化架构。

### 2.1 整体架构图

```mermaid
graph TD
    User[业务用户 (Underwriter)] -->|浏览器访问| Client[前端应用 (Next.js Dashboard)]
    
    subgraph "前端层 (Frontend Presentation)"
        Client -->|展示地图| MapEngine[Leaflet Map Engine]
        Client -->|操作交互| UI[UI Components (Tailwind/Radix)]
        Client -->|数据请求| API[Next.js API Routes]
    end
    
    subgraph "服务层 (Service Layer)"
        API -->|SQL 聚合查询| DBS[数据库服务]
        API -->|触发任务| ETL[ETL 处理服务]
        MapEngine -->|请求矢量瓦片/WFS| GeoServer[GeoServer 地图服务]
    end
    
    subgraph "数据存储层 (Data Layer)"
        DBS -->|存储业务数据 & 空间计算| PG[(PostgreSQL + PostGIS)]
        GeoServer -->|读取空间数据| PG
        GeoServer -->|读取静态文件| SHP[Shapefiles (Legacy)]
    end

    subgraph "数据处理管道 (Data Pipeline)"
        RawData[原始保单 Excel/CSV] -->|上传| ETL
        ETL -->|1. 清洗 & 格式化| Python[Python Pandas]
        Python -->|2. 地理编码 (Geocoding)| GeoCoder[离线/在线 Geocoders]
        Python -->|3. 空间关联 (Spatial Join)| PG
    end
```

### 2.2 技术栈要求 (Tech Stack)

| 组件 | 选型 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | **Next.js 15.1** (React 19) | 采用 App Router 架构，支持服务端组件 (RSC) |
| **UI 组件库** | **Tailwind CSS** + Radix UI | 追求高性能渲染和现代化 UI |
| **地图可视化** | **React-Leaflet** | 轻量级地图交互，需支持大数据量渲染优化 |
| **地图服务** | **GeoServer** | 托管地理数据，提供标准的 WMS (图片) 和 WFS (矢量) 服务 |
| **核心数据库** | **PostgreSQL 16+** | 必须安装 **PostGIS** 扩展，用于空间计算 |
| **数据处理** | **Python 3.10+** | Pandas (数据清洗), Geopandas (空间处理), SQLAlchemy |

---

## 3. 详细功能需求 (Functional Requirements)

### 模块一：投资组合地图可视化 (Portfolio Map Visualization)
这是用户最常用的核心界面。

*   **FR-1.1: 基础底图**: 加载高精度的街道地图和卫星影像（通过 Mapbox 或 OSM）。
*   **FR-1.2: 视图模式切换**:
    *   **单点模式 (Individual Risk)**: 显示每一个保单的具体位置。
        *   *子功能*: **热力图 (Heatmap)** - 宏观展示风险密度。
        *   *子功能*: **聚类标记 (Markers)** - 微观展示具体位置，支持点击弹窗查看保单详情（保额、结构、年份）。
    *   **区域风险模式 (Area Risk Aggregation)**: **核心功能**。
        *   不显示具体的点，而是给行政区域（如香港 TPU、澳门堂区）上色。
        *   颜色深浅代表风险高低（如：红色代表该区域总保额 > 10 亿）。
*   **FR-1.3: 动态筛选**: 用户可以通过时间轴（年份）、危险等级（High/Low）、险种类型实时过滤地图数据。

### 模块二：多层级行政区域分析 (Hierarchical Analysis)
系统必须支持不同精度的空间聚合计算。

*   **FR-2.1: 澳门层级 (Macau Hierarchy)**:
    *   Level 1: 整体 (Territory)
    *   Level 2: 堂区 (District - 7个)
    *   Level 3: 统计区 (Statistical Area - 25个)
*   **FR-2.2: 香港层级 (Hong Kong Hierarchy)**:
    *   Level 1: 18区 (District)
    *   Level 2: **第三规划单元 (TPU - 292个)** - *目前的开发重点*
    *   Level 3: 街区 (Street Block) / Subunit
*   **FR-2.3: 联动统计**: 当用户在地图上点击某个区域（例如“湾仔区”）时，侧边栏应立即显示：
    *   该区域内的总保单数 (Policy Count)
    *   总风险保额 (Total Sum Insured)
    *   Top 3 风险类型分布图表

### 模块三：数据处理与地理编码 (Geocoding & ETL Pipeline)
这是后台数据处理的关键部分。

*   **FR-3.1: 自动地理编码**: 将用户上传 Excel 中的文本地址（如 "Flat A, 10/F, Block 1..."）自动转换为精确的经纬度坐标。
*   **FR-3.2: 坐标纠错机制**:
    *   系统需识别落在海里或境外的错误坐标。
    *   提供手动修正界面（Drag & Drop 修正坐标位置）。
*   **FR-3.3: 空间关联 (Spatial Join)**:
    *   **这是数据库层面的核心需求**。
    *   当新保单入库时，自动计算它落在哪个 TPU、哪个堂区，并将这些 ID 写入保单记录中，避免每次查询时重复计算。

### 模块四：持续数据运营与自动入库 (Continuous Data Operations)
系统上线后的核心功能，支持保险/再保险公司用户自助上传新数据，实现“即传即用”。

*   **FR-4.1: 文件上传门户 (Upload Portal)**:
    *   提供 Web 界面支持业务人员直接拖拽上传 Excel/CSV 保单文件。
    *   **增量更新策略**: 系统需自动识别 Policy ID。如果是旧保单的新年份数据，创建新记录；如果是修正数据，提供“覆盖更新”选项。
*   **FR-4.2: 全自动处理链路 (Automated Pipeline)**:
    *   **步骤 1 解析**: 自动映射 Excel 列头到数据库字段（支持并兼容不同公司的不同模板）。
    *   **步骤 2 实时地理编码**: 后台调用 Geocoding API 将新地址转为经纬度。
    *   **步骤 3 自动空间计算 (Instant Spatial Join)**: 数据入库瞬间，利用 **PostGIS 触发器 (Trigger)** 自动计算该点落在哪个 TPU/堂区。
    *   **步骤 4 即时呈现**: 地图和统计面板无需手动刷新缓存，直接查询数据库即可展示最新上传数据的风险分布。
*   **FR-4.3: 异常处理中心 (Error Handling)**:
    *   如果新上传的批次中有部分地址匹配失败，系统不应中断整个流程。
    *   生成一份“未成功匹配列表 (Exception Report)”，允许用户在线手动修正并重新提交。

### 模块五：灾害风险地图与叠加分析 (Natural Hazard Risk Map)
这是“巨灾平台”区别于普通地图应用的核心。不仅要看保单在哪里，还要看灾害在哪里。

*   **FR-5.1: 多灾种风险图层 (Multi-Hazard Layers)**:
    *   系统需集成 GeoServer 的 WMS 服务，渲染栅格 (Raster) 风险数据。
    *   **支持图层**:
        *   **洪水深度 (Flood Depth)**: 显示不同重现期（如 100年一遇）的淹没深度。
        *   **滑坡风险 (Landslide)**: 结合地形的滑坡易发性分区。
        *   **台风路径与风圈 (Typhoon Track)**: 动态矢量图层。
        *   **实时降雨 (Real-time Rainfall)**: 雷达反射率或格点降雨量。
*   **FR-5.2: 时间序列演进 (Time-Series Animation)**:
    *   针对具有时间戳的图层（如 `202309071800_Rainfall`），前端需提供**时间轴播放器 (Time Slider)**。
    *   功能: 播放、暂停、拖动时间轴，动态展示灾害随时间的推移和变化。
*   **FR-5.3: 风险叠加分析 (Risk Overlay Analysis)**:
    *   **视觉叠加**: 允许用户同时开启“保单热力图”和“洪水深度图”，直观识别重叠的高危区域。
    *   **点击查询 (Point Inspection)**: 点击地图上任意一个保单点，系统需调用 API 查询该坐标点下的洪水深度值 (GetFeatureInfo)，并显示在弹窗中：“该保单位于 1.5m 洪水淹没区”。
    *   **影响评估 (Exposure at Risk)**: 后台需支持计算“当前选定时间点下，受灾（如积水 > 0.5m）的保单总保额是多少”。

---

## 4. 数据库架构设计 (Database Schema Design)

必须建立标准的关系型数据库，从 Excel/JSON 模式迁移到 PostGIS。

### 4.1 混合存储策略 (Hybrid Storage Strategy) - **关键架构决策**
为了平衡从空间计算能力与大文件渲染性能，需采用混合存储模式：

| 数据类型 | 示例内容 | 存储位置 | 理由 |
| :--- | :--- | :--- | :--- |
| **业务矢量数据** (Business Vectors) | 保单点位 (Portfolio Points) | **PostGIS 数据库** | 需要频繁进行 CRUD 操作和统计查询。 |
| **行政矢量数据** (Reference Vectors) | 澳门堂区边界、香港 TPU、台风路径线 | **PostGIS 数据库** | 需要与保单点位进行 `ST_Contains` 等空间几何计算。 |
| **环境栅格数据** (Hazard Rasters) | 降雨分布图、洪水水深图、卫星影像 | **文件系统 + GeoServer** | Raster 数据量巨大，存数据库性能差。应以 **GeoTIFF** 格式存储在磁盘，GeoServer 直接读取发布。 |

### 4.2 实体关系图 (ER Diagram) 设计思路


必须建立标准的关系型数据库，从 Excel/JSON 模式迁移到 PostGIS。

### 4.1 实体关系图 (ER Diagram) 设计思路

我们采用 **星型模型 (Star Schema)**，以保单为中心事实，地理位置为核心维度。

#### A. 核心事实表：`portfolio.policies` (保单事实表)
记录每一张保单的详细业务数据。
*   `policy_id` (PK, UUID): 唯一标识符
*   `location_id` (FK): 关联到位置维度表
*   `underwriting_year` (Integer): 承保年份，用于时间筛选
*   `sum_insured` (Decimal): 总保额 (TSI)
*   `occupancy_type` (Varchar): 占用类型 (Residential/Commercial)
*   `construction_class` (Varchar): 建筑结构
*   *性能优化*: 在 `underwriting_year` 和 `sum_insured` 上建立索引。

#### B. 核心维度表：`geo.locations` (空间位置维度表)
这是 PostGIS 发挥核心作用的地方。
*   `location_id` (PK, UUID)
*   `raw_address` (Text): 原始地址文本
*   `formatted_address` (Text): 格式化后的标准地址
*   `geom` (Geometry Point): **核心字段**，存储经纬度对象 (SRID 4326)。
*   `match_quality` (Enum): 地理编码的置信度 (High/Medium/Low)。
*   `fk_tpu_id`: (自动计算) 所属香港 TPU ID
*   `fk_macau_district_id`: (自动计算) 所属澳门堂区 ID

#### C. 空间参考表：`geo.ref_hk_tpu_polygons` (香港 TPU 边界表)
存储行政区划的形状，数据来源于 GeoServer/Shapefile。
*   `tpu_id` (PK)
*   `tpu_name_en`, `tpu_name_cn`
*   `geom` (Geometry MultiPolygon): 区域的多边形形状。

#### D. 空间参考表：`geo.ref_macau_districts` (澳门堂区边界表)
*   同上，存储澳门的行政边界数据。

### 4.2 关键数据流逻辑 (Trigger/Stored Procedure)

**自动化空间计算逻辑**:
工程师需要实现数据库触发器或处理流程：
> 当向 `geo.locations` 表插入或更新 `geom` (经纬度) 时，自动触发 PostGIS 函数 `ST_Within()`。
> 即时计算该点位于哪个 TPU 多边形内，并更新 `fk_tpu_id` 字段。

**价值**: 确保查询“某区域总保额”时，不需要进行耗时的实时空间几何计算，直接 `GROUP BY tpu_id` 即可，实现毫秒级响应。

---

## 5. 开发路线图 (Roadmap)

建议按以下顺序安排开发工作：

1.  **Phase 1: 数据底层重构 (High Priority)**
    *   搭建 PostGIS 数据库环境。
    *   将现有的 Shapefile (TPU, Districts) 导入数据库。
    *   编写 Python 脚本，将所有历史 CSV 数据清洗并入库。
2.  **Phase 2: GeoServer 改造**
    *   配置 GeoServer 从 PostGIS 读取数据，停止使用文件型存储。
    *   优化 WFS 服务设置。
3.  **Phase 3: 前端 API 改造**
    *   修改 Next.js 后端，废弃静态 JSON 读取逻辑。
    *   实现基于数据库 SQL 的动态聚合接口 (API Routes)。
4.  **Phase 4: 增强分析功能**
    *   实现自动化的 Geocoding 质量报告。
    *   添加更多自然灾害风险图层（如洪水深度图、台风路径等）。

---

### 给开发者的一句话总结 (Developer Summary)
> **“我们正在将一个基于静态文件原型的系统迁移到企业级架构。核心任务是利用 PostGIS 的空间计算能力来解决‘点与面’的实时聚合问题，并通过 Next.js 和 GeoServer 提供高性能的前端交互体验。”**
