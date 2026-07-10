# IBTrACS 数据分析报告

## 数据源信息

**文件位置**: `D:\web-flood-insurance-model\Data\IBTrACS.WP.list.v04r01.lines\`

**数据集**: IBTrACS (International Best Track Archive for Climate Stewardship)
- **版本**: v04r01
- **区域**: WP (西太平洋)
- **几何类型**: Lines (台风路径线)

## 文件结构

这是一个标准的 **Shapefile 数据集**，包含以下文件：

| 文件 | 大小 | 说明 |
|------|------|------|
| `IBTrACS.WP.list.v04r01.lines.shp` | 21.3 MB | 几何数据（台风路径线） |
| `IBTrACS.WP.list.v04r01.lines.shx` | 1.9 MB | 空间索引 |
| `IBTrACS.WP.list.v04r01.lines.dbf` | 284.3 MB | 属性数据表 |
| `IBTrACS.WP.list.v04r01.lines.prj` | 145 bytes | 投影信息 |

## 坐标系统

**投影**: WGS 1984 地理坐标系统 (EPSG:4326)
```
GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]
```

## 数据属性字段

### 基本信息
- **SID** (C) - Storm ID, 台风唯一标识符
- **SEASON** (N) - 季节/年份
- **NUMBER** (N) - 编号
- **BASIN** (C) - 海域盆地
- **SUBBASIN** (C) - 子海域
- **NAME** (C) - 台风名称
- **ISO_TIME** (C) - ISO 时间格式
- **NATURE** (C) - 台风性质

### 位置信息
- **LAT** (N) - 纬度
- **LON** (N) - 经度
- **DIST2LAND** (N) - 距离陆地的距离
- **LANDFALL** (N) - 登陆信息

### WMO (世界气象组织) 数据
- **WMO_WIND** (N) - WMO 风速
- **WMO_PRES** (N) - WMO 气压
- **WMO_AGENCY** (C) - WMO 机构

### USA (美国) 数据
- **USA_AGENCY** (C) - 美国机构
- **USA_ATCFID** (C) - ATCF ID
- **USA_LAT** (N) - 美国记录的纬度
- **USA_LON** (N) - 美国记录的经度
- **USA_RECORD** (C) - 记录类型
- **USA_STATUS** (C) - 状态
- **USA_WIND** (N) - 风速
- **USA_PRES** (N) - 气压
- **USA_SSHS** (N) - Saffir-Simpson 飓风等级

#### USA 风圈半径（四个象限）
- **USA_R34_NE/SE/SW/NW** (N) - 34 节风圈半径（东北/东南/西南/西北）
- **USA_R50_NE/SE/SW/NW** (N) - 50 节风圈半径
- **USA_R64_NE/SE/SW/NW** (N) - 64 节风圈半径

#### USA 其他参数
- **USA_POCI** (N) - 外围闭合等压线气压
- **USA_ROCI** (N) - 外围闭合等压线半径
- **USA_RMW** (N) - 最大风速半径
- **USA_EYE** (N) - 台风眼直径

### TOK (日本气象厅) 数据
- **TOK_LAT** (N) - 纬度
- **TOK_LON** (N) - 经度
- **TOK_GRADE** (N) - 等级
- **TOK_WIND** (N) - 风速
- **TOK_PRES** (N) - 气压
- **TOK_R50_DR/L/S** (N) - 50 节风圈半径（方向/长/短）
- **TOK_R30_DR/L/S** (N) - 30 节风圈半径
- **TOK_LAND** (N) - 登陆信息

### CMA (中国气象局) 数据
- **CMA_LAT** (N) - 纬度
- **CMA_LON** (N) - 经度
- **CMA_CAT** (N) - 类别
- **CMA_WIND** (N) - 风速
- **CMA_PRES** (N) - 气压

### HKO (香港天文台) 数据
- **HKO_LAT** (N) - 纬度
- **HKO_LON** (N) - 经度
- **HKO_CAT** (C) - 类别

## 数据类型说明

- **C** = Character (字符型)
- **N** = Numeric (数值型)

## 数据用途

这个数据集非常适合用于：

1. **台风历史路径分析**
   - 研究台风移动轨迹
   - 分析登陆位置和频率

2. **灾害风险评估**
   - 基于历史数据预测未来风险
   - 识别高风险区域

3. **多机构数据对比**
   - 对比不同气象机构的观测数据
   - 验证数据一致性

4. **洪水灾害保险建模**
   - 评估台风引发的洪水风险
   - 计算保险费率

## 与你的系统集成建议

### 1. 数据转换
由于 Shapefile 格式复杂，建议转换为 GeoJSON：

```bash
# 使用 ogr2ogr (GDAL工具)
ogr2ogr -f GeoJSON ibtracs_wp_lines.geojson IBTrACS.WP.list.v04r01.lines.shp

# 或使用在线工具
# https://mapshaper.org
```

### 2. 数据提取
只提取需要的字段：

```javascript
{
  "id": SID,
  "name": NAME,
  "type": "typhoon",
  "season": SEASON,
  "basin": BASIN,
  "maxWind": Math.max(WMO_WIND, USA_WIND, CMA_WIND),
  "minPressure": Math.min(WMO_PRES, USA_PRES, CMA_PRES),
  "coordinates": [LON, LAT],
  "landfall": LANDFALL,
  "date": ISO_TIME,
  "category": "historical"
}
```

### 3. 过滤香港/澳门相关数据
筛选影响香港和澳门地区的台风：

```javascript
// 距离陆地小于某个阈值
DIST2LAND < 100 km

// 或根据纬度经度范围
LAT between 22.0 and 22.6
LON between 113.5 and 114.5
```

### 4. 上传到系统
1. 转换为 GeoJSON 后，可以批量导入
2. 每个台风路径作为一个事件记录
3. 保存几何信息用于地图展示

## 示例事件记录

基于 IBTrACS 数据创建的事件示例：

```json
{
  "id": "2017242N13128",
  "name": "HATO",
  "type": "typhoon",
  "date": "2017-08-23",
  "season": 2017,
  "basin": "WP",
  "impactArea": {
    "level1": "Hong Kong",
    "level2": "Hong Kong Island",
    "level3": "Central and Western"
  },
  "maxWindSpeed": "185 km/h",
  "minPressure": "950 hPa",
  "severity": "critical",
  "coordinates": [114.1694, 22.3193],
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [114.0, 22.0],
      [114.1, 22.2],
      [114.2, 22.3],
      ...
    ]
  },
  "affectedAreas": ["Hong Kong", "Macau", "Guangdong"],
  "category": "historical",
  "dataSource": "IBTrACS v04r01",
  "agencies": {
    "WMO": { "wind": 175, "pressure": 955 },
    "CMA": { "wind": 180, "pressure": 952 },
    "HKO": { "category": "T10" }
  }
}
```

## 下一步建议

1. **转换数据格式**
   - 使用 QGIS 或 ogr2ogr 转换为 GeoJSON
   - 或使用 Python shapelib 库读取

2. **创建导入脚本**
   - 批量读取 Shapefile
   - 提取关键字段
   - 转换为系统格式

3. **数据验证**
   - 检查数据完整性
   - 验证坐标准确性
   - 过滤无效记录

4. **集成到系统**
   - 使用 Event Upload 功能批量导入
   - 在地图上展示台风路径
   - 支持按年份、强度等筛选

## 参考资源

- **IBTrACS 官网**: https://www.ncdc.noaa.gov/ibtracs/
- **数据文档**: https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/
- **在线转换工具**: https://mapshaper.org/
- **GDAL/OGR**: https://gdal.org/
