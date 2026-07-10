# GADM 全球边界数据使用指南

## 文件信息
- **路径**: `D:\web-flood-insurance-model\Data\Shapefile\gadm_410.gpkg`
- **格式**: GeoPackage (基于 SQLite)
- **大小**: 2.57 GB
- **版本**: GADM 4.1.0
- **内容**: 全球行政边界数据

## 数据结构

GADM 数据包含多个行政级别：
- **Level 0**: 国家边界
- **Level 1**: 省/州边界
- **Level 2**: 市/县边界
- **Level 3**: 区/镇边界
- **Level 4**: 更细粒度的行政区划

## 使用方法

### 方法 1: 使用 QGIS 查看和导出
1. 下载并安装 [QGIS](https://qgis.org/)
2. 在 QGIS 中打开 `gadm_410.gpkg`
3. 选择你需要的图层（如 ADM_ADM_1 表示省级边界）
4. 使用筛选功能选择特定国家/地区
5. 右键导出为 GeoJSON 格式

### 方法 2: 使用 Python 脚本提取
```bash
# 安装依赖
pip install geopandas fiona

# 查看所有图层
python scripts/extract-gadm-country.py --list-layers

# 提取中国省级边界
python scripts/extract-gadm-country.py --country China --level 1 --output public/data/china-provinces.geojson

# 提取日本市级边界
python scripts/extract-gadm-country.py --country Japan --level 2 --output public/data/japan-cities.geojson

# 提取台湾县市边界
python scripts/extract-gadm-country.py --country Taiwan --level 1 --output public/data/taiwan-counties.geojson
```

### 方法 3: 使用在线转换工具
1. 访问 [MyGeodata Converter](https://mygeodata.cloud/converter/)
2. 上传 GeoPackage 文件
3. 选择输出格式为 GeoJSON
4. 下载转换后的文件

### 方法 4: 使用 ogr2ogr 命令行工具
```bash
# 列出所有图层
ogrinfo gadm_410.gpkg

# 转换指定图层
ogr2ogr -f GeoJSON output.geojson gadm_410.gpkg ADM_ADM_1

# 筛选特定国家（使用 SQL）
ogr2ogr -f GeoJSON china.geojson gadm_410.gpkg -sql "SELECT * FROM ADM_ADM_1 WHERE COUNTRY='China'"
```

## 在 Portfolio Management 中使用

### 当前状态
- ✅ 已添加 GADM 数据信息按钮
- ⏳ 待实现：按需加载特定国家/地区

### 推荐工作流程
1. 使用上述方法之一提取你需要的国家/地区边界
2. 将提取的 GeoJSON 文件保存到 `public/data/` 目录
3. 在 Portfolio Management 的 Regional 视图中上传使用

### 示例：创建亚洲灾害风险区域
```bash
# 提取主要亚洲国家的省级边界
python scripts/extract-gadm-country.py --country China --level 1 --output public/data/china-provinces.geojson
python scripts/extract-gadm-country.py --country Japan --level 1 --output public/data/japan-prefectures.geojson
python scripts/extract-gadm-country.py --country "South Korea" --level 1 --output public/data/korea-provinces.geojson
python scripts/extract-gadm-country.py --country Philippines --level 1 --output public/data/philippines-regions.geojson
python scripts/extract-gadm-country.py --country Thailand --level 1 --output public/data/thailand-provinces.geojson
```

## 常见属性字段

GeoPackage 中的常见字段：
- `GID_0`, `COUNTRY`: 国家代码和名称
- `GID_1`, `NAME_1`: 一级行政区（省/州）
- `GID_2`, `NAME_2`: 二级行政区（市/县）
- `GID_3`, `NAME_3`: 三级行政区（区/镇）
- `TYPE_1`, `TYPE_2`: 行政区类型（Province, Prefecture, City等）
- `ENGTYPE_1`: 英文类型名称

## 与 Cresta Zone 的关系

- **GADM**: 官方行政边界，适合精确的地理分析
- **Cresta Zone**: 保险行业标准区域划分，适合再保险业务

你可以：
1. 使用 GADM 作为基础地图显示
2. 叠加 Cresta Zone 进行保险分析
3. 建立 GADM 行政区与 Cresta Zone 的映射关系

## 性能建议

由于 GeoPackage 文件很大（2.57GB）：
- ❌ 不要在浏览器中直接加载完整文件
- ✅ 提取需要的区域后再使用
- ✅ 考虑创建简化版本（减少坐标点数）
- ✅ 或开发服务器端 API 按需加载

## 下一步开发建议

可以考虑添加以下功能：
1. **国家选择器**: 下拉菜单选择国家，从服务器 API 加载对应边界
2. **级别选择器**: 选择行政级别（省/市/县）
3. **缓存机制**: 将常用国家的边界预先提取并缓存
4. **简化工具**: 自动简化几何图形以提高性能

## 参考资源
- [GADM 官网](https://gadm.org/)
- [GeoPackage 规范](https://www.geopackage.org/)
- [QGIS 下载](https://qgis.org/download/)
- [GDAL/OGR 文档](https://gdal.org/)
