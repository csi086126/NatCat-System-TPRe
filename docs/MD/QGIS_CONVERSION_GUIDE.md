# 使用 QGIS 将 GeoJSON 转换为 Shapefile 指南

## 📥 第一步：下载并安装 QGIS

1. 访问 QGIS 官网: https://qgis.org/download/
2. 选择 Windows 版本下载
3. 推荐下载 **QGIS Standalone Installer** (约 500MB)
4. 安装 QGIS（一路默认即可）

## 🔄 第二步：转换 GeoJSON 到 Shapefile

### 1. 打开 QGIS Desktop

安装完成后，从开始菜单打开 **QGIS Desktop**

### 2. 加载 GeoJSON 文件

- 点击顶部菜单: **Layer** → **Add Layer** → **Add Vector Layer...**
- 或者直接按快捷键: `Ctrl + Shift + V`
- 在弹出的对话框中:
  - **Source Type**: 选择 `File`
  - **Vector Dataset(s)**: 点击 `...` 浏览按钮
  - 导航到: `D:\Nat Cat Platform\UI_system\public\data\shapefiles\`
  - 选择: `Hong_Kong_292_TPU.geojson`
  - 点击 **Add**

您应该能在地图上看到香港 292 个 TPU 的边界了！

### 3. 导出为 Shapefile

- 在左侧 **Layers** 面板中，**右键点击** `Hong_Kong_292_TPU` 图层
- 选择: **Export** → **Save Features As...**
- 在弹出的对话框中配置:

  **Format (格式)**:
  - 选择: `ESRI Shapefile`

  **File name (文件名)**:
  - 点击 `...` 浏览按钮
  - 导航到: `D:\Nat Cat Platform\UI_system\public\data\shapefiles\`
  - 文件名输入: `Hong_Kong_292_TPU.shp`
  - 点击 **Save**

  **CRS (坐标系)**:
  - 选择: `EPSG:4326 - WGS 84`
  - (如果看不到，在搜索框输入 4326)

  **Encoding (编码)**:
  - 保持默认: `UTF-8`

- 点击 **OK** 开始转换

### 4. 验证输出

转换完成后，您应该能在 `D:\Nat Cat Platform\UI_system\public\data\shapefiles\` 目录下看到以下文件：

```
Hong_Kong_292_TPU.shp       (主文件 - 几何数据)
Hong_Kong_292_TPU.shx       (索引文件)
Hong_Kong_292_TPU.dbf       (属性数据)
Hong_Kong_292_TPU.prj       (投影信息)
Hong_Kong_292_TPU.cpg       (编码信息)
```

## 📤 第三步：上传到 GeoServer

### 方式 1: 使用 ZIP 文件上传（推荐）

1. **创建 ZIP 文件**:
   - 选择以下 4 个必需文件:
     - `Hong_Kong_292_TPU.shp`
     - `Hong_Kong_292_TPU.shx`
     - `Hong_Kong_292_TPU.dbf`
     - `Hong_Kong_292_TPU.prj`
   - 右键 → **发送到** → **压缩(zipped)文件夹**
   - 命名为: `Hong_Kong_292_TPU.zip`

2. **上传到 GeoServer**:
   - 打开: http://localhost:8080/geoserver
   - 登录: admin / geoserver
   - 点击: **Stores** → **Add new Store**
   - 选择: **Shapefile**
   - 配置:
     - **Workspace**: `natcat_platform`
     - **Data Source Name**: `Hong_Kong_292_TPU_store`
     - **Shapefile location**: 点击 **Browse...** 选择刚才创建的 ZIP 文件
   - 点击: **Save**

3. **发布图层**:
   - 保存后会自动跳转到发布页面
   - 点击: **Publish**
   - 在 **Data** 标签页:
     - **Name**: `Hong_Kong_292_TPU`
     - **Title**: `Hong Kong 292 TPU Boundaries`
   - 滚动到 **Bounding Boxes** 部分:
     - 点击: **Compute from data**
     - 点击: **Compute from native bounds**
   - 点击: **Save**

### 方式 2: 使用目录上传

1. 打开: http://localhost:8080/geoserver
2. 登录: admin / geoserver
3. 点击: **Stores** → **Add new Store**
4. 选择: **Directory of spatial files (shapefiles)**
5. 配置:
   - **Workspace**: `natcat_platform`
   - **Data Source Name**: `Hong_Kong_292_TPU_store`
   - **URL**: `file:///D:/Nat Cat Platform/UI_system/public/data/shapefiles`
6. 点击: **Save**
7. 找到 `Hong_Kong_292_TPU` 并点击 **Publish**
8. 配置边界框并保存

## ✅ 第四步：验证图层

1. 在 GeoServer 中，点击: **Layer Preview**
2. 找到: `natcat_platform:Hong_Kong_292_TPU`
3. 点击: **OpenLayers** 预览
4. 您应该能看到香港 292 个 TPU 的地图！

## 🎯 完成后告诉我

上传成功后，告诉我一声，我会立即：
1. 在 Portfolio Map 中添加 292 TPU 图层
2. 实现点击 TPU 显示统计数据功能
3. 生成 TPU 级别的保单统计

---

## 💡 常见问题

**Q: QGIS 安装很慢怎么办？**
A: QGIS 约 500MB，首次安装需要一些时间。可以下载 **QGIS Standalone Installer** 而不是 OSGeo4W 网络安装器。

**Q: 找不到 EPSG:4326 怎么办？**
A: 在 CRS 搜索框直接输入 `4326`，然后选择 `EPSG:4326 - WGS 84`。

**Q: 转换后文件在哪里？**
A: 就在您选择保存的目录，应该有 .shp, .shx, .dbf, .prj 等文件。

**Q: 可以不用 QGIS 吗？**
A: 如果您有 Python + geopandas 环境，可以运行 Python 脚本。或者下载 GDAL/OGR 命令行工具使用 ogr2ogr 命令。但 QGIS 是最简单的方式。
