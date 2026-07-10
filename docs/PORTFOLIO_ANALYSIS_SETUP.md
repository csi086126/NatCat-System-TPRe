# Portfolio Analysis by Geographic Regions

这个功能允许你在地图上显示不同的行政区划层级（18 Districts, PPU, SPU, TPU, Subunit），并通过点击或悬停来查看每个区域的保单统计信息。

## 功能特性

1. **多层级地理区划显示**
   - 18 Districts（香港18区）
   - PPU (9 Polygons) - Primary Planning Unit
   - SPU (52 Polygons) - Secondary Planning Unit
   - TPU (292 Polygons) - Tertiary Planning Unit
   - Subunit (4,916 Polygons) - 最小规划单元

2. **交互式统计查询**
   - 鼠标悬停时高亮显示区域
   - 显示区域名称/ID的Tooltip
   - 点击区域后显示详细的保单统计信息面板

3. **统计信息包括**
   - 保单数量 (Policy Count)
   - 总保额 (Total Exposure)
   - 平均保额 (Average Exposure)
   - 业务类型数量 (Business Type Count)

## 使用方法

### 1. 前端使用

在 Geospatial Data Hub 页面（`/cityinfo`）：

1. 在左侧面板找到 "Portfolio Analysis" 卡片
2. 勾选你想要显示的地理层级（例如：TPU (292 Polygons)）
3. 地图上会显示对应的区域边界
4. 鼠标悬停在任意区域上会高亮显示
5. 点击区域后，右上角会弹出统计信息面板

### 2. 数据库设置（重要！）

目前功能已经实现，但需要完成以下数据库配置才能查询TPU/PPU/SPU的保单统计：

#### 步骤1：添加Planning Unit列到数据库

```bash
# 进入PostgreSQL
psql -U postgres -d natcat_platform

# 运行SQL脚本添加列
\i UI_system/scripts/portfolio_management/database/add_planning_units.sql
```

#### 步骤2：导入Shapefile到PostGIS

你需要将shapefile导入到PostGIS数据库，以便进行空间关联：

**方法A：使用shp2pgsql命令行工具**

```bash
# 安装PostGIS工具（如果还没有）
# Windows: 已随PostgreSQL安装

# 导入TPU shapefile
shp2pgsql -s 4326 -I Hong_Kong_292_TPU.shp planning.tpu_polygons | psql -U postgres -d natcat_platform

# 导入其他层级（如果有shapefile）
shp2pgsql -s 4326 -I Hong_Kong_18_Districts.shp planning.districts | psql -U postgres -d natcat_platform
```

**方法B：使用QGIS图形界面**

1. 打开QGIS
2. 连接到PostgreSQL数据库（natcat_platform）
3. 拖拽GeoJSON文件到QGIS
4. 右键图层 → Export → Save Features As...
5. Format: PostgreSQL
6. 表名: planning.tpu_polygons
7. 保存

#### 步骤3：空间关联更新保单数据

```sql
-- 创建planning schema（如果不存在）
CREATE SCHEMA IF NOT EXISTS planning;

-- 空间关联更新TPU字段
UPDATE portfolio.policies p
SET
    TPU = t."TPU",
    PPU = t."PPU",
    SPU = t."SPU"
FROM planning.tpu_polygons t
WHERE ST_Within(p.geom, t.geom) AND p.geom IS NOT NULL;

-- 查看更新结果
SELECT
    COUNT(*) FILTER (WHERE TPU IS NOT NULL) as policies_with_tpu,
    COUNT(*) as total_policies,
    ROUND(100.0 * COUNT(*) FILTER (WHERE TPU IS NOT NULL) / COUNT(*), 2) as coverage_percentage
FROM portfolio.policies;
```

### 3. 当前状态说明

✅ **已完成的功能：**
- 前端UI：图层选择器和交互控件
- 地图显示：GeoJSON图层渲染和样式
- 事件处理：点击、悬停、高亮
- 统计面板：弹出窗口组件
- API接口：`/api/portfolio/region-stats`
- Python分析脚本：`region_portfolio_analytics.py`

⚠️ **待完成的配置：**
- 数据库中添加TPU/PPU/SPU/SUBUNIT列
- 导入shapefile到PostGIS
- 运行空间关联更新保单数据

📝 **临时方案：**
目前只有 DISTRICT（18区）可以直接查询，因为数据库中已有"分區"字段。如果你点击TPU/PPU/SPU区域，会显示提示信息说明需要配置数据库。

## API接口

### GET /api/portfolio/region-stats

查询特定区域的保单统计。

**查询参数：**
- `district` - 18区名称（例如：Wan Chai）
- `tpu` - TPU编号（例如：542）
- `ppu` - PPU编号
- `spu` - SPU编号
- `subunit` - Subunit编号

**示例：**

```bash
# 查询湾仔区
GET /api/portfolio/region-stats?district=Wan%20Chai

# 查询TPU 542
GET /api/portfolio/region-stats?tpu=542
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "region_type": "TPU",
    "region_id": "542",
    "policy_count": 150,
    "total_exposure": 45000000.00,
    "avg_exposure": 300000.00,
    "min_exposure": 50000.00,
    "max_exposure": 2000000.00,
    "business_type_count": 5
  },
  "metadata": {
    "region_type": "TPU",
    "region_id": "542",
    "timestamp": "2025-12-29T02:30:00.000Z"
  }
}
```

## 文件结构

```
UI_system/
├── src/
│   ├── app/
│   │   ├── cityinfo/page.tsx           # 主页面（已更新）
│   │   └── api/
│   │       └── portfolio/
│   │           └── region-stats/
│   │               └── route.ts         # API路由（新建）
│   └── public/
│       └── data/
│           └── shapefiles/
│               └── Hong_Kong_292_TPU.geojson
└── scripts/
    └── portfolio_management/
        ├── analytics/
        │   └── region_portfolio_analytics.py  # Python分析脚本（新建）
        └── database/
            └── add_planning_units.sql          # 数据库迁移脚本（新建）
```

## 下一步建议

1. **立即可测试（使用18 Districts）**
   - 勾选 "18 Districts" 图层
   - 点击任意区域查看保单统计
   - 这个功能已经可以工作（如果数据库中有"分區"数据）

2. **完整功能需要**
   - 运行数据库迁移脚本添加Planning Unit列
   - 导入所有shapefile到PostGIS
   - 运行空间关联查询更新保单数据

3. **可选优化**
   - 添加加载状态指示器
   - 缓存GeoJSON数据以提高性能
   - 添加图表可视化（使用Chart.js或Recharts）
   - 支持时间范围筛选

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Leaflet
- **后端**: Next.js API Routes, Python
- **数据库**: PostgreSQL + PostGIS
- **地图**: Leaflet + react-leaflet
- **空间数据**: GeoJSON, Shapefiles

## 故障排除

### 问题：点击区域后没有显示统计信息

**解决方案：**
1. 检查浏览器控制台是否有API错误
2. 确认数据库中有对应的保单数据
3. 检查Python脚本路径配置
4. 验证数据库连接配置

### 问题：GeoJSON图层不显示

**解决方案：**
1. 检查GeoJSON文件路径：`public/data/shapefiles/`
2. 打开浏览器开发者工具Network面板查看文件是否成功加载
3. 验证GeoJSON格式是否正确

### 问题：提示需要空间分析

**解决方案：**
这是正常的！说明你选择的图层（TPU/PPU/SPU）还没有在数据库中配置。请按照上面的"数据库设置"部分完成配置。

## 联系与支持

如有问题，请查看：
- PostgreSQL日志
- Python错误输出
- 浏览器控制台
- Next.js开发服务器日志
