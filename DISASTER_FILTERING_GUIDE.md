# 灾害事件筛选系统使用指南

## 🎯 系统概述

Disaster Repository 页面现在支持两大类事件的独立筛选和展示：
- **Historical Events（历史灾害）**: 真实发生的灾害事件（几百个）
- **Stochastic Events（随机事件集）**: 基于历史特征构建的虚拟事件（几万个）

## 📋 筛选功能说明

### 一、Historical Events（历史事件）

#### 筛选属性（按顺序逐级筛选）：

1. **Event Type（事件类型）**
   - Typhoon（台风）- 代码：T
   - Rainstorm（暴雨）- 代码：R
   - Flood（洪水）- 代码：F
   - Storm Surge（风暴潮）- 代码：S
   - Landslide（滑坡）- 代码：L
   - All Types（不筛选）

2. **Time（时间范围）**
   - 起始年份：1850
   - 结束年份：当前年份（2025）
   - 支持范围查询：From Year - To Year

3. **Impact Area（影响区域）**
   - **Level 1 - Region（地区）**: 
     - Hong Kong（香港）
     - Macau（澳门）
     - 未来扩展：大湾区、东南亚其他地区
   
   - **Level 2 - Area（区域）**: 
     - Hong Kong: Hong Kong Island（港岛）, Kowloon（九龙）, New Territories（新界）
     - Macau: Macau Peninsula（澳门半岛）, Taipa（氹仔）, Coloane（路环）
   
   - **Level 3 - District（地区）**: 
     - **Hong Kong 18 Districts（香港18区）**:
       * Hong Kong Island: Central and Western, Wan Chai, Eastern, Southern
       * Kowloon: Yau Tsim Mong, Sham Shui Po, Kowloon City, Wong Tai Sin, Kwun Tong
       * New Territories: Kwai Tsing, Tsuen Wan, Tuen Mun, Yuen Long, North, Tai Po, Sha Tin, Sai Kung, Islands
     - **Macau Districts（澳门堂区）**:
       * Macau Peninsula: Nossa Senhora de Fátima, Santo António, São Lázaro, Sé, São Lourenço
       * Taipa: Our Lady of Carmel
       * Coloane: St. Francis Xavier

4. **Event ID（事件编号）**
   - 命名规则：`Peril-Year-No.`
   - 示例：
     - `T-2012-3`: 2012年第3个台风
     - `R-2022-4`: 2022年第4场暴雨
     - `F-1998-1`: 1998年第1次洪水
     - `S-2014-1`: 2014年第1次风暴潮
     - `L-2024-2`: 2024年第2次滑坡

### 二、Stochastic Events（随机事件集）

#### 筛选属性（按顺序逐级筛选）：

1. **Event Type（事件类型）**
   - Typhoon（台风）
   - Rainstorm（暴雨）
   - Flood（洪水）
   - Storm Surge（风暴潮）
   - All Types（不筛选）

2. **Time（模拟年份范围）**
   - 起始年份：1
   - 结束年份：10000
   - 10000年随机事件集

3. **Impact Area（影响区域）**
   - 同历史事件，三级区域划分
   - Level 1 - Region（地区）: Hong Kong / Macau
   - Level 2 - Area（区域）: 港岛/九龙/新界 或 澳门半岛/氹仔/路环
   - Level 3 - District（地区）: 香港18区 或 澳门堂区

4. **Event ID（事件编号）**
   - 命名规则：`Peril-Year-No.`
   - 年份为5位数，前面补0
   - 示例：
     - `T-00001-3`: 第1年第3个台风
     - `R-09991-4`: 第9991年第4场暴雨
     - `F-01998-1`: 第1998年第1次洪水

## 🗺️ 地图展示方式

### Historical Events（历史事件）
- **展示方式**: Leaflet Marker 标记点
- **交互**:
  - 点击地图标记查看详情
  - 点击左侧列表定位事件
  - Popup 显示简要信息
- **优点**: 交互性强，适合少量数据

### Stochastic Events（随机事件）
- **展示方式**: GeoServer WMS 图层
- **特点**:
  - 大数据量优化（50,000+ 事件）
  - 按需加载，性能优秀
  - 支持 CQL_FILTER 动态筛选
- **说明**: 不显示单个标记点，而是以图层形式展示

## 🎮 使用流程

### 1. 选择事件类别
```
点击顶部按钮切换：
[Historical Events]  [Stochastic Events]
```

### 2. 逐级筛选
```
1. Event Type → 选择灾害类型
2. Time → 设置年份范围
3. Impact Area → 逐级筛选区域
   - Level 1 - All Regions（选择地区）
   - Level 2 - All Areas（选择区域，依赖Level 1）
   - Level 3 - All Districts（选择地区，依赖Level 2）
4. Event ID → 输入特定事件编号
```

### 3. 查看结果
- **历史事件**: 
  - 左侧列表显示筛选结果
  - 地图显示标记点
  - 右侧面板显示详情

- **随机事件**: 
  - 地图显示WMS图层
  - 支持ID精确查询
  - 实时过滤显示

### 4. 清除筛选
```
点击 [Clear All Filters] 按钮重置所有条件
```

## 📊 数据结构示例

### Historical Event 数据格式
```json
{
  "id": "T-2023-1",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "impactArea": {
    "level1": "Hong Kong",        // Region: Hong Kong or Macau
    "level2": "New Territories",  // Area: Hong Kong Island/Kowloon/New Territories
    "level3": "Tai Po"            // District: One of 18 districts
  },
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  }
}
```

### Stochastic Event GeoServer 表结构
```sql
CREATE TABLE stochastic_typhoon_10000yr (
  id VARCHAR(50) PRIMARY KEY,        -- T-00001-3
  event_type VARCHAR(20),            -- Typhoon
  year INTEGER,                      -- 1-10000
  sequence_no INTEGER,               -- 事件序号
  impact_area_l1 VARCHAR(100),       -- Hong Kong (Region)
  impact_area_l2 VARCHAR(100),       -- New Territories (Area)
  impact_area_l3 VARCHAR(100),       -- Tai Po (District)
  intensity NUMERIC,                 -- 强度
  geom GEOMETRY(Point, 4326),        -- 地理位置
  properties JSONB                   -- 其他属性
);
```

## 🔧 数据导入步骤

### 1. 准备历史事件数据
```bash
# 将你的D盘数据转换为JSON格式
# 确保包含所有必需字段
python scripts/convert_historical_data.py
```

### 2. 放置数据文件
```bash
# 复制到项目目录
cp your_data.json public/data/historical-events.json
```

### 3. 准备随机事件数据
```bash
# 导入到 PostgreSQL + PostGIS
ogr2ogr -f "PostgreSQL" \
  PG:"dbname=geoserver user=admin password=xxx" \
  stochastic_typhoon.shp \
  -nln stochastic_typhoon_10000yr
```

### 4. 配置 GeoServer 图层
```
1. 登录 GeoServer: http://143.89.22.7:8090/geoserver
2. 创建数据存储（PostgreSQL）
3. 发布图层：COP:stochastic_typhoon_10000yr
4. 配置样式（可选）
```

## 🎨 界面说明

### 左侧边栏（查询区）
- 切换按钮：选择事件类别
- 筛选卡片：4个筛选条件
- 事件列表：显示筛选结果
- Actions：导出/上传功能

### 中央地图区
- 底图：Esri WorldImagery 卫星图
- 历史事件：红色标记点
- 随机事件：WMS 图层叠加
- 交互：缩放、平移、点击

### 右侧详情区
- 事件名称
- 影响概况
- 受灾地区
- 统计数据

## 🚀 高级功能（待实现）

1. **动态 Level 3 选项**
   - 根据 Level 2 实时加载区域列表

2. **多事件对比**
   - 同时选择多个事件对比

3. **时间轴动画**
   - 播放历史事件演变

4. **统计图表**
   - 按年份/类型统计
   - 损失趋势分析

5. **导出功能**
   - 导出筛选结果为Excel
   - 生成PDF报告

## ❓ 常见问题

**Q: 为什么随机事件不显示标记点？**
A: 随机事件数量巨大（5万+），使用WMS图层展示可以提高性能。

**Q: 如何查看特定ID的事件？**
A: 在Event ID输入框输入ID，系统会自动筛选和定位。

**Q: Level 2/3 为什么灰色不可选？**
A: 需要先选择上一级区域，才能选择下一级。Level 1 → Level 2 → Level 3 逐级筛选。

**Q: 数据可以上云吗？**
A: 可以！参考 DISASTER_DATA_GUIDE.md 中的上云方案。

## 📞 技术支持

如需帮助，请提供：
1. 数据文件格式和样例
2. 遇到的具体问题
3. 错误信息截图

我可以帮你：
- 编写数据转换脚本
- 配置 GeoServer
- 优化查询性能
- 部署到云端
