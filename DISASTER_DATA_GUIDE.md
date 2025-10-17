# 灾害数据管理与展示指南

## 📊 系统架构

### 1. 历史灾害事件（几百个）
- **存储位置**: `public/data/historical-events.json`
- **展示方式**: Leaflet Marker 标记点
- **优点**: 可点击查看详情，交互性强
- **数据结构**:
```json
{
  "id": "TY2023-001",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "region": "Hong Kong",
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "affectedAreas": ["Hong Kong", "Guangdong"],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  }
}
```

### 2. 随机事件集（几万个）
- **存储位置**: GeoServer 数据库
- **展示方式**: WMS 图层
- **优点**: 性能好，支持大数据量
- **图层配置**: 在代码中的 `stochasticWMSLayers`

## 🔧 如何添加你的数据

### 方法1: 添加历史事件数据

1. **准备你的数据文件**
   - 将 D 盘的历史事件数据整理成 JSON 格式
   - 每个事件必须包含经纬度坐标

2. **放置数据文件**
   ```
   复制文件到: public/data/historical-events.json
   ```

3. **启用数据加载**（在 `disasterinfo/page.tsx` 中）
   ```typescript
   useEffect(() => {
     // 取消注释这段代码
     fetch('/data/historical-events.json')
       .then(res => res.json())
       .then(data => {
         setHistoricalEvents(data);
         setFilteredHistoricalEvents(data);
         if (data.length > 0) setSelectedEvent(data[0]);
       })
       .catch(err => console.error('Failed to load:', err));
   }, []);
   ```

### 方法2: 添加随机事件数据到 GeoServer

1. **准备 PostGIS 数据库**
   ```sql
   CREATE TABLE stochastic_typhoon_10000yr (
     id VARCHAR(50) PRIMARY KEY,
     type VARCHAR(50),
     intensity NUMERIC,
     return_period INTEGER,
     geom GEOMETRY(Point, 4326),
     properties JSONB
   );
   ```

2. **导入数据**
   ```bash
   # 使用 ogr2ogr 导入 Shapefile 或 GeoJSON
   ogr2ogr -f "PostgreSQL" PG:"dbname=geoserver user=admin" \
     your_data.shp -nln stochastic_typhoon_10000yr
   ```

3. **在 GeoServer 中发布图层**
   - 登录 GeoServer (http://143.89.22.7:8090/geoserver)
   - 创建图层，命名为 `COP:stochastic_typhoon_10000yr`
   - 设置样式（可选：根据强度着色）

4. **代码中已自动支持**
   - 图层会在输入 ID 时自动加载
   - 支持 CQL_FILTER 筛选特定事件

## 🌐 上云方案

### 方案A: 轻量级（推荐先用）

**1. 历史事件数据 → 阿里云 OSS**

```bash
# 安装阿里云 CLI
pip install oss2

# 上传文件
ossutil cp public/data/historical-events.json oss://your-bucket/data/
```

修改代码中的数据源：
```typescript
fetch('https://your-bucket.oss-cn-hangzhou.aliyuncs.com/data/historical-events.json')
```

**费用**: 约 5-10 元/月（包含存储和流量）

### 方案B: 专业级

**1. 数据库 → 阿里云 RDS PostgreSQL + PostGIS**
- 选择最小配置: 1核2GB, 20GB存储
- 费用: 约 200-300 元/月
- 优点: 支持空间查询，性能好

**2. GeoServer → 阿里云 ECS**
- 配置: 2核4GB
- 费用: 约 100-150 元/月
- 安装: Docker 部署 GeoServer

```bash
# Docker 部署 GeoServer
docker run -d -p 8080:8080 \
  -e GEOSERVER_ADMIN_PASSWORD=yourpassword \
  -v /data/geoserver:/opt/geoserver/data_dir \
  kartoza/geoserver:2.23.0
```

## 🎯 当前功能说明

### 1. 灾害筛选（Disaster Filtering）
- **时间筛选**: 按年月筛选历史事件
- **类型筛选**: Typhoon / Rainstorm / Flood / Storm Surge
- **区域筛选**: Hong Kong / Shenzhen / Guangdong / Macau
- **清除筛选**: 一键重置所有筛选条件

### 2. 历史事件展示
- 左侧列表显示筛选后的事件
- 点击事件查看详情
- 地图上显示标记点（红色图钉）
- 点击标记点弹出信息窗口

### 3. 随机事件展示
- 在 "Stochastic Events" 输入框中输入 ID
- 自动加载对应的 WMS 图层
- 支持同时显示多种类型的随机事件
- 支持通过 ID 筛选特定事件

### 4. 事件详情
- 右侧面板显示选中事件的详细信息
- 包括: 影响概况、受灾地区等

## 📝 数据准备检查清单

- [ ] 历史事件数据已整理为 JSON 格式
- [ ] 每个事件都有经纬度坐标
- [ ] 随机事件数据已导入 PostGIS
- [ ] GeoServer 图层已发布并可访问
- [ ] 测试数据加载和筛选功能
- [ ] （可选）云服务已配置

## 🚀 下一步优化建议

1. **数据可视化**
   - 添加热力图显示事件密度
   - 按损失金额/影响人口着色

2. **高级筛选**
   - 损失金额范围筛选
   - 影响人口数量筛选
   - 多条件组合查询

3. **数据统计**
   - 按类型统计事件数量
   - 按年份统计趋势图
   - 损失金额汇总

4. **导出功能**
   - 导出筛选结果为 Excel
   - 生成统计报告 PDF
   - 事件对比分析

## 📧 需要帮助？

如果你在数据导入或上云过程中遇到问题，请告诉我：
1. 你的数据文件格式（CSV, Excel, Shapefile, GeoJSON等）
2. 数据量级（多少个事件）
3. 遇到的具体错误信息

我可以帮你写数据转换脚本或提供详细的部署指南！
