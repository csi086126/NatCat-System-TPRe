# GeoServer 图层迁移指南
**从远程 GeoServer 迁移图层到本地 GeoServer**

## 📋 目标

将远程 GeoServer (http://143.89.22.7:8090) 上的可用图层下载到本地 GeoServer (http://localhost:8080)，解决 CORS 问题并统一数据源。

---

## ✅ 需要迁移的图层

根据我们的分析，以下图层在远程服务器上可用，需要迁移：

### 1. Geography Category
- ✅ `COP:taiping_boundary` - Administrative Boundary (行政边界)

### 2. Infrastructure Category
- ✅ `COP:Building` - Building footprints (建筑物)

### 3. Socioeconomic Category
- ✅ `COP:ENTLI` - Nighttime Light Index (夜间灯光指数)

### 4. Weather Category
- ✅ `COP:taiping_Annual_rainfall` - Annual Rainfall (年降雨量)
- ✅ `COP:hkSAR` - Earth Map / Satellite Imagery (卫星影像)

---

## 🛠️ 方法 1: 使用 GeoServer REST API（推荐）

### 步骤 1: 准备工作

1. **确保本地 GeoServer 运行**
   ```bash
   # 检查 GeoServer 是否运行
   curl http://localhost:8080/geoserver/web/
   ```

2. **登录本地 GeoServer**
   - 打开浏览器访问: http://localhost:8080/geoserver/web/
   - 使用管理员账号登录（默认: admin/geoserver）

### 步骤 2: 创建 COP 工作空间

1. 在 GeoServer Web 界面：
   - 左侧菜单点击 **"Workspaces"**
   - 点击 **"Add new workspace"**
   - 填写信息：
     - **Name**: `COP`
     - **Namespace URI**: `http://cop.geoserver.org`
   - 点击 **"Save"**

### 步骤 3: 下载图层数据

#### 选项 A: 使用 WFS 下载矢量数据（GeoJSON/Shapefile）

对于 Building, Boundary 等矢量图层：

```bash
# 下载 Building 图层为 GeoJSON
curl -o "COP_Building.geojson" \
  "http://143.89.22.7:8090/geoserver/COP/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=COP:Building&outputFormat=application/json"

# 下载 Boundary 图层
curl -o "COP_taiping_boundary.geojson" \
  "http://143.89.22.7:8090/geoserver/COP/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=COP:taiping_boundary&outputFormat=application/json"
```

#### 选项 B: 使用 WCS 下载栅格数据（GeoTIFF）

对于 ENTLI, Annual_rainfall, hkSAR 等栅格图层：

```bash
# 下载 ENTLI 栅格图层
curl -o "COP_ENTLI.tif" \
  "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:ENTLI&format=image/tiff"

# 下载 Annual Rainfall 栅格图层
curl -o "COP_taiping_Annual_rainfall.tif" \
  "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:taiping_Annual_rainfall&format=image/tiff"

# 下载 hkSAR 影像
curl -o "COP_hkSAR.tif" \
  "http://143.89.22.7:8090/geoserver/COP/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=COP:hkSAR&format=image/tiff"
```

### 步骤 4: 上传到本地 GeoServer

#### 对于矢量数据 (GeoJSON/Shapefile):

1. 在 GeoServer Web 界面：
   - 点击 **"Stores"** → **"Add new Store"**
   - 选择数据类型：
     - **GeoJSON**: 选择 "GeoJSON"
     - **Shapefile**: 选择 "Shapefile"

2. 填写 Store 信息：
   - **Workspace**: 选择 `COP`
   - **Data Source Name**: `Building` (图层名称)
   - **URL**: 上传你下载的 `.geojson` 或 `.shp` 文件

3. 点击 **"Save"**

4. 发布图层：
   - 保存后会提示发布，点击 **"Publish"**
   - 设置图层名称为 `Building`
   - 计算边界框（Bounding Boxes）：点击 **"Compute from data"** 和 **"Compute from native bounds"**
   - 点击 **"Save"**

#### 对于栅格数据 (GeoTIFF):

1. 在 GeoServer Web 界面：
   - 点击 **"Stores"** → **"Add new Store"**
   - 选择 **"GeoTIFF"**

2. 填写 Store 信息：
   - **Workspace**: 选择 `COP`
   - **Data Source Name**: `ENTLI` (图层名称)
   - **URL**: 选择你下载的 `.tif` 文件路径
     - 例如: `file:data/COP_ENTLI.tif`

3. 点击 **"Save"**

4. 发布图层（同上）

---

## 🛠️ 方法 2: 使用 GeoServer Web 界面手动操作

### 步骤 1: 从远程 GeoServer 导出

1. **登录远程 GeoServer**
   - 访问: http://143.89.22.7:8090/geoserver/web/
   - 如果需要账号，联系管理员获取

2. **查看并导出图层数据**

   **选项 A: 通过 Layer Preview 导出**
   - 左侧菜单 → **"Layer Preview"**
   - 找到目标图层（如 `COP:Building`）
   - 点击右侧下拉菜单，选择导出格式：
     - 矢量图层: `GeoJSON`, `Shapefile`, `GML`
     - 栅格图层: `GeoTIFF`, `PNG`
   - 下载文件

   **选项 B: 通过数据目录直接访问**
   - 如果有服务器访问权限，直接复制 GeoServer 数据目录：
     ```
     远程: /var/lib/geoserver/data/COP/
     本地: C:\Program Files\GeoServer\data_dir\data\COP\
     ```

### 步骤 2: 导入到本地 GeoServer

参考方法 1 的步骤 4。

---

## 🛠️ 方法 3: 使用 Python 脚本自动化迁移

创建自动化脚本下载并上传图层：

```python
import requests
import json
from pathlib import Path

# 配置
REMOTE_GEOSERVER = "http://143.89.22.7:8090/geoserver"
LOCAL_GEOSERVER = "http://localhost:8080/geoserver"
LOCAL_AUTH = ("admin", "geoserver")  # 本地 GeoServer 管理员账号

# 需要迁移的图层
LAYERS_TO_MIGRATE = [
    {"workspace": "COP", "layer": "Building", "type": "vector"},
    {"workspace": "COP", "layer": "taiping_boundary", "type": "vector"},
    {"workspace": "COP", "layer": "ENTLI", "type": "raster"},
    {"workspace": "COP", "layer": "taiping_Annual_rainfall", "type": "raster"},
    {"workspace": "COP", "layer": "hkSAR", "type": "raster"},
]

def download_vector_layer(workspace, layer_name):
    """下载矢量图层为 GeoJSON"""
    url = f"{REMOTE_GEOSERVER}/{workspace}/ows"
    params = {
        "service": "WFS",
        "version": "1.0.0",
        "request": "GetFeature",
        "typeName": f"{workspace}:{layer_name}",
        "outputFormat": "application/json"
    }

    print(f"📥 Downloading {workspace}:{layer_name}...")
    response = requests.get(url, params=params)

    if response.status_code == 200:
        output_file = f"{workspace}_{layer_name}.geojson"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"✅ Saved to {output_file}")
        return output_file
    else:
        print(f"❌ Failed to download: {response.status_code}")
        return None

def download_raster_layer(workspace, layer_name):
    """下载栅格图层为 GeoTIFF"""
    url = f"{REMOTE_GEOSERVER}/{workspace}/wcs"
    params = {
        "service": "WCS",
        "version": "2.0.1",
        "request": "GetCoverage",
        "coverageId": f"{workspace}:{layer_name}",
        "format": "image/tiff"
    }

    print(f"📥 Downloading {workspace}:{layer_name}...")
    response = requests.get(url, params=params, stream=True)

    if response.status_code == 200:
        output_file = f"{workspace}_{layer_name}.tif"
        with open(output_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Saved to {output_file}")
        return output_file
    else:
        print(f"❌ Failed to download: {response.status_code}")
        return None

def create_workspace_if_not_exists(workspace):
    """在本地 GeoServer 创建工作空间"""
    url = f"{LOCAL_GEOSERVER}/rest/workspaces"

    # 检查工作空间是否存在
    check_url = f"{url}/{workspace}.json"
    response = requests.get(check_url, auth=LOCAL_AUTH)

    if response.status_code == 200:
        print(f"✅ Workspace '{workspace}' already exists")
        return True

    # 创建工作空间
    workspace_data = {
        "workspace": {
            "name": workspace
        }
    }

    response = requests.post(
        url,
        auth=LOCAL_AUTH,
        json=workspace_data,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code in [200, 201]:
        print(f"✅ Created workspace '{workspace}'")
        return True
    else:
        print(f"❌ Failed to create workspace: {response.status_code}")
        return False

def upload_to_local_geoserver(workspace, layer_name, file_path, layer_type):
    """上传图层到本地 GeoServer"""
    # 这部分需要根据具体情况调整
    # 通常涉及创建 DataStore 和 Layer
    print(f"📤 Uploading {layer_name} to local GeoServer...")
    print(f"⚠️  Please manually upload {file_path} through GeoServer web interface")
    print(f"   1. Go to http://localhost:8080/geoserver/web/")
    print(f"   2. Stores → Add new Store → {'GeoJSON' if layer_type == 'vector' else 'GeoTIFF'}")
    print(f"   3. Upload file: {file_path}")
    print(f"   4. Publish layer with name: {layer_name}")

# 主流程
if __name__ == "__main__":
    print("🚀 Starting GeoServer Layer Migration...")
    print(f"Remote: {REMOTE_GEOSERVER}")
    print(f"Local: {LOCAL_GEOSERVER}\n")

    # 创建工作空间
    create_workspace_if_not_exists("COP")

    # 下载并上传每个图层
    for layer_info in LAYERS_TO_MIGRATE:
        workspace = layer_info["workspace"]
        layer_name = layer_info["layer"]
        layer_type = layer_info["type"]

        print(f"\n{'='*60}")
        print(f"Processing: {workspace}:{layer_name} ({layer_type})")
        print(f"{'='*60}")

        # 下载图层
        if layer_type == "vector":
            file_path = download_vector_layer(workspace, layer_name)
        else:
            file_path = download_raster_layer(workspace, layer_name)

        # 上传到本地（需要手动操作）
        if file_path:
            upload_to_local_geoserver(workspace, layer_name, file_path, layer_type)

    print("\n✅ Migration process completed!")
    print("⚠️  Remember to manually upload files through GeoServer web interface")
```

**运行脚本:**
```bash
cd d:\web-flood-insurance-model\flood-catastrophe-insurance-system\scripts
python migrate_geoserver_layers.py
```

---

## 📝 迁移完成后的配置

### 更新 .env.local

迁移完成后，修改环境变量文件，让所有图层都使用本地 GeoServer：

```bash
# .env.local

# 统一使用本地 GeoServer
NEXT_PUBLIC_GEOSERVER_WMS_URL=http://localhost:8080/geoserver/wms
NEXT_PUBLIC_GEOSERVER_GEOSPATIAL_URL=http://localhost:8080/geoserver/wms
```

### 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

---

## ✅ 验证迁移结果

### 1. 检查 GeoServer Layer Preview

1. 打开 http://localhost:8080/geoserver/web/
2. 左侧菜单 → **"Layer Preview"**
3. 查找并预览迁移的图层：
   - `COP:Building`
   - `COP:taiping_boundary`
   - `COP:ENTLI`
   - `COP:taiping_Annual_rainfall`
   - `COP:hkSAR`

### 2. 测试 WMS GetCapabilities

```bash
curl "http://localhost:8080/geoserver/wms?service=WMS&version=1.1.0&request=GetCapabilities" | grep "COP:"
```

应该看到所有迁移的图层列在输出中。

### 3. 在应用中测试

1. 打开 http://10.253.22.15:3003/riskmap
2. 点击 **"📍 Geospatial Layers"**
3. 选择 **"🏗️ Infrastructure"**
4. 勾选 **"Building"**
5. 地图上应该显示建筑物图层

---

## 🔧 故障排除

### 问题 1: curl 下载失败

**错误**: `curl: (7) Failed to connect`

**解决**:
- 检查远程 GeoServer 是否可访问
- 检查网络连接
- 尝试在浏览器中访问 URL 测试

### 问题 2: WFS/WCS 请求返回错误

**错误**: `Service not enabled` 或 `Layer not found`

**解决**:
- 确认远程 GeoServer 上 WFS/WCS 服务已启用
- 检查图层名称是否正确（区分大小写）
- 联系远程 GeoServer 管理员确认权限

### 问题 3: 本地 GeoServer 上传失败

**错误**: `Cannot publish layer`

**解决**:
- 检查文件格式是否正确
- 确保 COP 工作空间已创建
- 检查文件路径权限
- 查看 GeoServer 日志: `logs/geoserver.log`

### 问题 4: 图层显示空白

**错误**: 图层加载但不显示内容

**解决**:
- 检查图层边界框（Bounding Box）是否正确
- 确认坐标系（CRS）设置正确
- 查看浏览器控制台的 WMS 请求错误
- 验证数据完整性

---

## 📚 补充资源

### GeoServer 官方文档
- **REST API**: https://docs.geoserver.org/stable/en/user/rest/
- **WFS 下载**: https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
- **WCS 下载**: https://docs.geoserver.org/stable/en/user/services/wcs/reference.html

### 常用 WFS 输出格式
- `application/json` - GeoJSON
- `SHAPE-ZIP` - Shapefile (压缩包)
- `application/gml+xml` - GML
- `csv` - CSV

### 常用 WCS 输出格式
- `image/tiff` - GeoTIFF
- `image/png` - PNG
- `application/x-netcdf` - NetCDF

---

## 🎯 下一步

迁移完成后:

1. ✅ 所有图层统一使用本地 GeoServer
2. ✅ 解决 CORS 问题
3. ✅ 提高访问速度（本地网络）
4. ✅ 便于调试和修改图层样式

如果需要，还可以：
- 配置图层样式 (SLD)
- 设置图层缓存
- 优化栅格图层金字塔
- 添加图层元数据
