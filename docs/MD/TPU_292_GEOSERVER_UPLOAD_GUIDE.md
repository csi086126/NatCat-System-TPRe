# 香港 292 TPU 图层上传到 GeoServer 指南

## 📄 已生成文件

GeoJSON 文件位置:
```
D:\Nat Cat Platform\UI_system\public\data\shapefiles\Hong_Kong_292_TPU.geojson
```

包含 **292 个 TPU 多边形**，从 4,916 个子单元合并而成。

## 🚀 上传到 GeoServer (推荐方法 - 直接使用 GeoJSON)

GeoServer 可以直接使用 GeoJSON 文件，不需要转换成 Shapefile！

### 步骤 1: 登录 GeoServer

1. 打开浏览器访问: http://localhost:8080/geoserver
2. 使用管理员账号登录 (通常是 admin/geoserver)

### 步骤 2: 创建 Data Store

1. 点击左侧 **Stores** -> **Add new Store**
2. 选择 **GeoJSON** (在 "Vector Data Sources" 下)
3. 填写表单:
   - **Workspace**: 选择 `natcat_platform`
   - **Data Source Name**: `Hong_Kong_292_TPU_store`
   - **Description**: `Hong Kong 292 TPU Boundaries`
   - **Enabled**: 勾选
   - **URL**: 点击 "Browse..." 按钮，导航到:
     ```
     file:///D:/Nat%20Cat%20Platform/UI_system/public/data/shapefiles/Hong_Kong_292_TPU.geojson
     ```
     或者直接输入:
     ```
     D:\Nat Cat Platform\UI_system\public\data\shapefiles\Hong_Kong_292_TPU.geojson
     ```
4. 点击 **Save**

### 步骤 3: 发布图层

1. 保存 Data Store 后，会自动跳转到 "New Layer" 页面
2. 在列表中找到 `Hong_Kong_292_TPU`
3. 点击 **Publish**
4. 在 "Edit Layer" 页面配置:

   **Data 标签页**:
   - **Name**: `Hong_Kong_292_TPU`
   - **Title**: `Hong Kong 292 TPU Boundaries`
   - **Abstract**: `Tertiary Planning Units (TPU) boundaries for Hong Kong (292 units)`

   **Bounding Boxes 部分**:
   - 点击 "Compute from data" (从数据计算)
   - 点击 "Compute from native bounds" (从原生边界计算)

5. 点击 **Save** 发布图层

### 步骤 4: 验证图层

1. 点击左侧 **Layer Preview**
2. 找到 `natcat_platform:Hong_Kong_292_TPU`
3. 点击 **OpenLayers** 预览
4. 应该能看到香港 292 个 TPU 的边界

## 🔄 备选方法: 使用 Shapefile (如果需要)

如果您需要 Shapefile 格式，可以使用 QGIS:

1. **下载并安装 QGIS**: https://qgis.org/download/
2. **打开 QGIS Desktop**
3. **添加图层**:
   - Layer -> Add Layer -> Add Vector Layer
   - Source: 选择 `Hong_Kong_292_TPU.geojson`
   - Add
4. **导出为 Shapefile**:
   - 右键点击图层 -> Export -> Save Features As...
   - Format: ESRI Shapefile
   - File name: `Hong_Kong_292_TPU.shp`
   - CRS: EPSG:4326
   - Save
5. **上传到 GeoServer**:
   - 使用生成的 .shp, .shx, .dbf, .prj 文件
   - 在 GeoServer 中选择 "Directory of spatial files (shapefiles)"

## 📊 图层信息

- **TPU 数量**: 292
- **源数据**: 4,916 个子单元
- **坐标系**: EPSG:4326 (WGS84)
- **属性字段**:
  - `TPU`: TPU 编号 (111-976)
  - `PPU`: Primary Planning Unit 编号
  - `SPU`: Secondary Planning Unit 编号
  - `NUM_SUBUNITS`: 该 TPU 包含的子单元数量

## 🎯 下一步

上传完成后，我将帮您:
1. 在 Portfolio Map 中添加 292 TPU 图层
2. 创建 TPU 点击查询功能
3. 生成 292 TPU 的统计数据
4. 集成到现有的地图界面中
