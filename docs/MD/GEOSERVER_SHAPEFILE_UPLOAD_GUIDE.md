# GeoServer Shapefile 上传指南
**使用现有Shapefile上传图层**

## 准备好的文件

### 1. 18区 (Hong_Kong_18_Districts)
📁 位置：`D:\Nat Cat Platform\Data\Shapefile\Hong_Kong_18_Districts\`
- ✅ Hong_Kong_18_Districts.shp (主文件)
- ✅ Hong_Kong_18_Districts.shx (索引)
- ✅ Hong_Kong_18_Districts.dbf (属性表)
- ✅ Hong_Kong_18_Districts.prj (投影信息)

### 2. 18区边界线 (Hong_Kong_18_Districts_Lines)
📁 位置：`D:\Nat Cat Platform\Data\Shapefile\Hong_Kong_18_Districts_Lines\`
- ✅ Hong_Kong_18_Districts_Lines.shp
- ✅ Hong_Kong_18_Districts_Lines.shx
- ✅ Hong_Kong_18_Districts_Lines.dbf
- ✅ Hong_Kong_18_Districts_Lines.prj

### 3. TPU/Subunit (TPUSU_2021)
📁 位置：`D:\Nat Cat Platform\Data\Shapefile\BoundariesofTertiaryPlanningUnitsSubunitsfor2021PopulationCensus_SHP\TPUSU_2021\`
- ✅ TPUSU_2021.shp (4,916个子单元)
- ⚠️ **注意**：此文件包含4,916个subunit，文件较大，上传可能较慢

---

## 上传步骤

### 步骤 1: 登录 GeoServer

1. 访问：http://143.89.22.7:8090/geoserver/web/
2. 点击右上角 **Login**
3. 输入管理员凭据

---

### 步骤 2: 创建 Workspace

1. 左侧菜单点击 **Workspaces**
2. 点击 **Add new workspace**
3. 填写：
   - **Name**: `natcat`
   - **Namespace URI**: `http://natcat.platform/geoserver`
   - **Default Workspace**: ☑️ 勾选
4. 点击 **Save**

---

### 步骤 3: 上传第一个图层 - 18区

#### 3.1 创建 Data Store

1. 左侧菜单点击 **Stores** → **Add new Store**
2. 在 **Vector Data Sources** 下，点击 **Shapefile**
3. 填写：
   - **Workspace**: 选择 `natcat`
   - **Data Source Name**: `hk_districts_18_store`
   - **Description**: "Hong Kong 18 Administrative Districts"
   - **Enabled**: ☑️ 勾选

4. **Connection Parameters**:
   - 点击 **Browse...** 按钮
   - 导航到：`D:\Nat Cat Platform\Data\Shapefile\Hong_Kong_18_Districts\`
   - 选择 `Hong_Kong_18_Districts.shp`
   - 或直接输入完整路径：
     ```
     file:///D:/Nat Cat Platform/Data/Shapefile/Hong_Kong_18_Districts/Hong_Kong_18_Districts.shp
     ```

5. 点击 **Save**

#### 3.2 发布图层

1. 保存后会显示 "New Layer" 页面
2. 找到列表中的图层，点击 **Publish**
3. 在 **Data** 标签页：
   - **Name**: `hk_districts_18` (保持不变)
   - **Title**: `Hong Kong 18 Districts`
   - **Abstract**: `Hong Kong 18 administrative districts for portfolio statistics`

4. 滚动到 **Bounding Boxes** 部分：
   - 点击 **Compute from data**
   - 点击 **Compute from native bounds**

5. 切换到 **Publishing** 标签页：
   - **Default Style**: 选择 `polygon`

6. 点击 **Save**

---

### 步骤 4: 上传第二个图层 - 18区边界线

#### 4.1 创建 Data Store

1. **Stores** → **Add new Store** → **Shapefile**
2. 填写：
   - **Workspace**: `natcat`
   - **Data Source Name**: `hk_districts_18_lines_store`
   - **Description**: "Hong Kong 18 Districts Boundaries (Lines)"
   - **Shapefile location**:
     ```
     file:///D:/Nat Cat Platform/Data/Shapefile/Hong_Kong_18_Districts_Lines/Hong_Kong_18_Districts_Lines.shp
     ```

3. 点击 **Save**

#### 4.2 发布图层

1. 点击 **Publish**
2. 填写：
   - **Name**: `hk_districts_18_lines`
   - **Title**: `Hong Kong 18 Districts Boundaries`
   - **Abstract**: `Boundary lines for 18 administrative districts`

3. **Bounding Boxes**: Compute from data
4. **Publishing** → **Default Style**: 选择 `line`
5. 点击 **Save**

---

### 步骤 5: 上传第三个图层 - TPU/Subunit

#### 选项 A: 上传完整的 TPUSU (4,916 个 subunit)

⚠️ **警告**：文件很大，可能导致性能问题

1. **Stores** → **Add new Store** → **Shapefile**
2. 填写：
   - **Workspace**: `natcat`
   - **Data Source Name**: `hk_tpusu_4916_store`
   - **Description**: "Hong Kong TPUSU 4916 Subunits"
   - **Shapefile location**:
     ```
     file:///D:/Nat Cat Platform/Data/Shapefile/BoundariesofTertiaryPlanningUnitsSubunitsfor2021PopulationCensus_SHP/TPUSU_2021/TPUSU_2021.shp
     ```

3. **Publish**:
   - **Name**: `hk_tpusu_4916`
   - **Title**: `Hong Kong TPUSU (4916 Subunits)`
   - **Bounding Boxes**: Compute from data
   - **Default Style**: `polygon`

#### 选项 B: 使用简化的 TPU 292 (推荐)

如果您需要292个TPU而不是4916个subunit，我们需要先创建简化版：

```bash
cd "D:\Nat Cat Platform\Data\Shapefile"
node create-tpu-shapefile-292.js
```

然后上传生成的Shapefile。

---

### 步骤 6: 验证图层

#### 6.1 Layer Preview 测试

1. 左侧菜单点击 **Layer Preview**
2. 找到您的图层：
   - `natcat:hk_districts_18`
   - `natcat:hk_districts_18_lines`
   - `natcat:hk_tpusu_4916` (或 `natcat:hk_tpu_292`)

3. 点击图层右侧的 **OpenLayers** 链接
4. 确认图层正确显示在地图上

#### 6.2 获取 WMS URLs

您的 WMS 端点将是：

```
Base URL: http://143.89.22.7:8090/geoserver/natcat/wms

图层名称:
- natcat:hk_districts_18
- natcat:hk_districts_18_lines
- natcat:hk_tpusu_4916 (或 natcat:hk_tpu_292)
```

**测试 WMS URL**:
```
http://143.89.22.7:8090/geoserver/natcat/wms?
  service=WMS&
  version=1.1.0&
  request=GetMap&
  layers=natcat:hk_districts_18&
  bbox=113.8,22.1,114.5,22.6&
  width=768&
  height=768&
  srs=EPSG:4326&
  format=image/png&
  transparent=true
```

---

## 样式配置 (可选)

### 为 18 Districts 创建自定义样式

1. 左侧菜单 **Styles** → **Add a new style**
2. **Workspace**: `natcat`
3. **Name**: `districts_style`
4. **Format**: SLD
5. 粘贴以下 SLD 代码：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer>
    <Name>Districts Style</Name>
    <UserStyle>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3B82F6</CssParameter>
              <CssParameter name="fill-opacity">0.3</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#1E40AF</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

6. 点击 **Validate**，然后 **Save**

### 应用样式到图层

1. **Layers** → 点击 `hk_districts_18`
2. **Publishing** 标签页
3. **Default Style** 改为 `districts_style`
4. **Save**

---

## 下一步：集成到 Portfolio Map

上传完成后，我将帮您：

1. ✅ 在 PortfolioMap 组件中添加 WMS 图层
2. ✅ 实现图层切换器 (18区 / TPU)
3. ✅ 添加点击交互显示统计数据
4. ✅ 连接到预计算的统计 JSON 文件

---

## 故障排除

### 问题：找不到 Shapefile
**解决方案**：
- 确保路径使用正斜杠 `/` 而不是反斜杠 `\`
- 使用 `file:///` 前缀
- 示例：`file:///D:/Nat Cat Platform/Data/Shapefile/...`

### 问题：图层显示为空
**解决方案**：
- 检查 Bounding Box 是否正确计算
- 确认坐标系统是 EPSG:4326
- 查看 GeoServer 日志: `logs/geoserver.log`

### 问题：上传 TPUSU 很慢
**解决方案**：
- 4,916 个 subunit 确实很大
- 建议使用简化版 TPU 292
- 或者在 GeoServer 中启用图层缓存 (Tile Caching)

---

## 完成清单

上传完成后检查：

- [ ] `natcat` workspace 已创建
- [ ] `hk_districts_18` 图层可在 Layer Preview 中查看
- [ ] `hk_districts_18_lines` 图层可在 Layer Preview 中查看
- [ ] TPU/TPUSU 图层可在 Layer Preview 中查看
- [ ] WMS URL 在浏览器中可访问
- [ ] (可选) 自定义样式已应用

---

**创建日期**: 2024-12-17
**状态**: 使用现有 Shapefile 上传
**GeoServer**: http://143.89.22.7:8090/geoserver/web/
