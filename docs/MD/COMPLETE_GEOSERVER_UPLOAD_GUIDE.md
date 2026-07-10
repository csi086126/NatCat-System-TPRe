# GeoServer 图层上传完整指南
**所有已下载图层的上传步骤 - 更新版**

## ✅ 已成功下载的图层清单

共 **11 个图层**，总大小约 **785 MB**

### 📊 图层分类统计

| 类别 | 矢量图层 | 栅格图层 | 总计 |
|------|---------|---------|------|
| Geography (地理) | 1 | 0 | 1 |
| Infrastructure (基础设施) | 6 | 0 | 6 |
| Socioeconomic (社会经济) | 1 | 0 | 1 |
| Weather (气象) | 0 | 1 | 1 |
| Hazard (灾害) | 0 | 2 | 2 |
| **总计** | **8** | **3** | **11** |

---

## 📋 详细图层列表

### 矢量图层 (GeoJSON) - 8个

| # | 文件名 | 大小 | 图层名称 | 类别 | 用途 |
|---|--------|------|---------|------|------|
| 1 | `COP_Building.geojson` | 329 MB | Building | Infrastructure | 建筑物轮廓 |
| 2 | `COP_taiping_boundary.geojson` | 1.9 MB | taiping_boundary | Geography | 太平行政边界 |
| 3 | `COP_ENTLI.geojson` | 43 MB | ENTLI | Socioeconomic | 夜间灯光指数 |
| 4 | `COP_HKDistrict.geojson` | 2.9 MB | HKDistrict | Geography | 香港行政区 |
| 5 | `COP_flexible_barriers.geojson` | 791 KB | flexible_barriers | Infrastructure | 柔性防护栏 |
| 6 | `COP_rigid_barriers.geojson` | 433 KB | rigid_barriers | Infrastructure | 刚性防护栏 |
| 7 | `COP_Man_made_slope2326.geojson` | 146 MB | Man_made_slope2326 | Infrastructure | 人工边坡 |
| 8 | `COP_HongKong_landslide.geojson` | 84 KB | HongKong_landslide | Hazard | 香港滑坡点 |

### 栅格图层 (GeoTIFF) - 3个

| # | 文件名 | 大小 | 图层名称 | 类别 | 用途 |
|---|--------|------|---------|------|------|
| 9 | `COP_taiping_Annual_rainfall.tif` | 7.6 MB | taiping_Annual_rainfall | Weather | 年降雨量 |
| 10 | `COP_hkSAR.tif` | 239 MB | hkSAR | Weather | 香港卫星影像 |
| 11 | `COP_Flood_Depth_Return_Period_100yr.tif` | 16 MB | Flood_Depth _Return_Period_100yr | Hazard | 百年一遇洪水深度 |

**文件位置：** `d:\web-flood-insurance-model\flood-catastrophe-insurance-system\scripts\downloaded_layers\`

---

## 🚀 上传步骤

### 前提条件

1. ✅ 本地 GeoServer 正在运行
2. ✅ 可以访问 http://localhost:8080/geoserver/web/
3. ✅ 拥有管理员登录凭据（默认：admin/geoserver）

---

### 第一步：创建 COP 工作空间

1. 登录 GeoServer Web 界面：http://localhost:8080/geoserver/web/

2. 左侧菜单点击 **"Workspaces"**

3. 检查是否已有 `COP` 工作空间
   - 如果已存在，跳到第二步
   - 如果不存在，继续以下操作

4. 点击 **"Add new workspace"**

5. 填写：
   - **Name**: `COP`
   - **Namespace URI**: `http://cop.geoserver.org`

6. 点击 **"Save"**

---

### 第二步：上传矢量图层（8个 GeoJSON 文件）

对每个矢量图层，按照以下步骤操作：

#### 通用上传流程

1. **创建 Store**
   - 左侧菜单 → **Stores** → **Add new Store**
   - 在 "Vector Data Sources" 部分选择 **"GeoJSON"**

2. **配置 Store**
   - **Workspace**: 选择 `COP`
   - **Data Source Name**: 填写图层名称（见下表）
   - **Enabled**: 勾选

3. **设置文件路径**
   - **URL**: 输入文件路径（见下表）
   - 或使用绝对路径格式：`file:///d:/web-flood-insurance-model/flood-catastrophe-insurance-system/scripts/downloaded_layers/[文件名]`

4. **发布图层**
   - 点击 **"Save"**
   - 在弹出的 "New Layer" 页面，点击图层旁边的 **"Publish"**

5. **配置图层属性**
   - **Name**: 保持默认（图层名称）
   - **Title**: 填写友好的显示名称
   - 在 "Bounding Boxes" 部分：
     - 点击 **"Compute from data"**
     - 点击 **"Compute from native bounds"**

6. **保存**
   - 滚动到底部，点击 **"Save"**

---

#### 矢量图层详细信息

##### 1️⃣ Building（建筑物）

```
Data Source Name: Building
Description: Building footprints for infrastructure analysis
URL: file:scripts/downloaded_layers/COP_Building.geojson
Title: Building Footprints
```

##### 2️⃣ taiping_boundary（太平边界）

```
Data Source Name: taiping_boundary
Description: Administrative boundary of Taiping
URL: file:scripts/downloaded_layers/COP_taiping_boundary.geojson
Title: Taiping Administrative Boundary
```

##### 3️⃣ ENTLI（夜间灯光指数）

```
Data Source Name: ENTLI
Description: Nighttime Light Index for socioeconomic analysis
URL: file:scripts/downloaded_layers/COP_ENTLI.geojson
Title: Nighttime Light Index (ENTLI)
```

##### 4️⃣ HKDistrict（香港行政区）

```
Data Source Name: HKDistrict
Description: Hong Kong administrative districts
URL: file:scripts/downloaded_layers/COP_HKDistrict.geojson
Title: Hong Kong Districts
```

##### 5️⃣ flexible_barriers（柔性防护栏）

```
Data Source Name: flexible_barriers
Description: Flexible debris barriers for landslide protection
URL: file:scripts/downloaded_layers/COP_flexible_barriers.geojson
Title: Flexible Debris Barriers
```

##### 6️⃣ rigid_barriers（刚性防护栏）

```
Data Source Name: rigid_barriers
Description: Rigid debris barriers for landslide protection
URL: file:scripts/downloaded_layers/COP_rigid_barriers.geojson
Title: Rigid Debris Barriers
```

##### 7️⃣ Man_made_slope2326（人工边坡）

```
Data Source Name: Man_made_slope2326
Description: Man-made slopes in Hong Kong
URL: file:scripts/downloaded_layers/COP_Man_made_slope2326.geojson
Title: Man-made Slopes
```

##### 8️⃣ HongKong_landslide（香港滑坡点）

```
Data Source Name: HongKong_landslide
Description: Historical landslide locations in Hong Kong
URL: file:scripts/downloaded_layers/COP_HongKong_landslide.geojson
Title: Hong Kong Landslide Points
```

---

### 第三步：上传栅格图层（3个 GeoTIFF 文件）

对每个栅格图层，按照以下步骤操作：

#### 通用上传流程

1. **创建 Store**
   - 左侧菜单 → **Stores** → **Add new Store**
   - 在 "Raster Data Sources" 部分选择 **"GeoTIFF"**

2. **配置 Store**
   - **Workspace**: 选择 `COP`
   - **Data Source Name**: 填写图层名称（见下表）
   - **Enabled**: 勾选

3. **设置文件路径**
   - **URL**: 输入文件路径（见下表）

4. **发布图层**
   - 点击 **"Save"**
   - 点击图层旁边的 **"Publish"**

5. **配置图层属性**
   - 在 "Bounding Boxes" 部分：
     - 点击 **"Compute from data"**
     - 点击 **"Compute from native bounds"**

6. **保存**
   - 点击 **"Save"**

---

#### 栅格图层详细信息

##### 9️⃣ taiping_Annual_rainfall（年降雨量）

```
Data Source Name: taiping_Annual_rainfall
Description: Annual rainfall climatology for Taiping region
URL: file:scripts/downloaded_layers/COP_taiping_Annual_rainfall.tif
Title: Annual Rainfall
```

##### 🔟 hkSAR（香港卫星影像）

```
Data Source Name: hkSAR
Description: Hong Kong SAR satellite imagery
URL: file:scripts/downloaded_layers/COP_hkSAR.tif
Title: Hong Kong Satellite Imagery
```

##### 1️⃣1️⃣ Flood_Depth _Return_Period_100yr（百年洪水深度）

```
Data Source Name: Flood_Depth_Return_Period_100yr
Description: 100-year return period flood depth
URL: file:scripts/downloaded_layers/COP_Flood_Depth_Return_Period_100yr.tif
Title: Flood Depth (100-year Return Period)
```

**注意：** 图层名称中有空格，在 GeoServer 中会自动处理，但在代码中使用时需要注意。

---

## ✅ 第四步：验证图层

1. 左侧菜单点击 **"Layer Preview"**

2. 在搜索框输入 `COP` 过滤图层

3. 应该看到所有 11 个图层：
   - ✅ COP:Building
   - ✅ COP:taiping_boundary
   - ✅ COP:ENTLI
   - ✅ COP:HKDistrict
   - ✅ COP:flexible_barriers
   - ✅ COP:rigid_barriers
   - ✅ COP:Man_made_slope2326
   - ✅ COP:HongKong_landslide
   - ✅ COP:taiping_Annual_rainfall
   - ✅ COP:hkSAR
   - ✅ COP:Flood_Depth _Return_Period_100yr

4. 对每个图层点击 **"OpenLayers"** 预览，确认数据正确显示

---

## 🔧 第五步：更新应用配置

编辑 `.env.local` 文件：

```bash
# .env.local

# 统一使用本地 GeoServer
NEXT_PUBLIC_GEOSERVER_WMS_URL=http://localhost:8080/geoserver/wms
NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL=http://localhost:8080/geoserver/wms
```

---

## 🔄 第六步：重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)

# 重新启动
npm run dev
```

---

## 🧪 第七步：在应用中测试

### 需要在代码中添加新图层

已下载的新图层需要在 `src/app/riskmap/page.tsx` 中添加对应的 WMSTileLayer 组件：

#### 新增的图层映射

```typescript
// 新增图层（需要在代码中添加）

// Geography 类别
- COP:HKDistrict → 香港行政区

// Infrastructure 类别
- COP:flexible_barriers → 柔性防护栏
- COP:rigid_barriers → 刚性防护栏
- COP:Man_made_slope2326 → 人工边坡

// Hazard 类别（新类别）
- COP:HongKong_landslide → 香港滑坡点
- COP:Flood_Depth _Return_Period_100yr → 百年洪水深度
```

---

## 📊 迁移总结

### 下载统计

| 状态 | 数量 | 说明 |
|------|------|------|
| ✅ 成功下载 | 11 个 | 矢量图层 8个，栅格图层 3个 |
| ❌ 下载失败 | 1 个 | COP:slope（图层可能不存在或需要特殊权限） |
| ❌ 不存在 | 9 个 | Land Use, Drainage 系列, Topography 等 |

### 文件大小

- **总大小：** 约 785 MB
- **最大文件：** COP_Building.geojson (329 MB)
- **最小文件：** COP_HongKong_landslide.geojson (84 KB)

---

## ⚠️ 故障排除

### 问题 1: 无法找到文件

**错误：** `Error: Could not find file`

**解决：**
- 确保使用 `file:scripts/downloaded_layers/文件名` 格式
- 或使用完整路径：`file:///d:/web-flood-insurance-model/...`
- 检查文件名拼写是否正确
- 确保 GeoServer 有权限访问该目录

### 问题 2: 图层边界框错误

**错误：** `Unable to compute bounds from data`

**解决：**
- 检查 GeoJSON/GeoTIFF 文件是否损坏
- 确认坐标参考系统（CRS）
- 手动输入边界框坐标

### 问题 3: 大文件上传慢

**说明：**
- `COP_Building.geojson` (329 MB) 和 `COP_hkSAR.tif` (239 MB) 较大
- 上传和发布可能需要几分钟时间
- 这是正常现象，请耐心等待

### 问题 4: 图层名称包含空格

**图层：** `Flood_Depth _Return_Period_100yr`

**注意：**
- GeoServer 会自动处理名称中的空格
- 在 WMS 请求中使用时，空格可能需要编码为 `%20`
- 建议在代码中使用准确的图层名称

---

## 🎯 下一步

完成所有图层上传后：

1. ✅ 验证所有 11 个图层在 Layer Preview 中可用
2. ✅ 更新 `.env.local` 使用本地 GeoServer
3. ✅ 重启开发服务器
4. ⏳ 在 `src/app/riskmap/page.tsx` 中添加新图层的 UI 和 WMSTileLayer 组件
5. ⏳ 测试所有图层在应用中正确显示
6. ⏳ 根据需要调整图层样式和透明度

---

## 📝 可选优化

- **配置图层样式 (SLD)：** 自定义颜色和符号表示
- **添加图层缓存：** 使用 GeoWebCache 提升性能
- **创建图层组：** 方便批量管理相关图层
- **设置访问权限：** 配置不同用户的图层访问权限
- **优化栅格金字塔：** 为大型 GeoTIFF 文件创建金字塔加速渲染

---

**完成时间估计：** 约 30-45 分钟（取决于网络速度和文件大小）

**难度级别：** ⭐⭐☆☆☆ 中等（需要重复操作，但流程清晰）
