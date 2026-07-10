# GeoServer批量配置方案 - 处理数百个灾害事件

## 📋 问题背景

当有多个城市/地区的数百个灾害事件TIF文件时，手动在GeoServer中逐个配置将非常耗时。本文档提供自动化批量配置方案。

---

## 🎯 推荐方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|-----|------|------|---------|
| **方案1: GeoServer REST API** | 自动化程度高，灵活 | 需要编程 | 100+事件，频繁更新 |
| **方案2: GeoTIFF Mosaic插件** | 统一管理，性能好 | 配置复杂 | 同类型大量TIF |
| **方案3: 目录自动扫描** | 简单，无需编程 | 功能有限 | 静态数据，少量更新 |
| **方案4: 云存储COG** | 性能最优，无需GeoServer | 需要云服务 | 大规模部署 |

---

## ⭐ 方案1: 使用GeoServer REST API批量配置（推荐）

### 1.1 架构设计

```
数据目录结构：
D:/GeoData/
├── HongKong/
│   ├── TY2023-Mangkhut/
│   │   ├── HK_Peninsula_Flood.tif
│   │   └── HK_NewTerritories_Flood.tif
│   ├── TY2022-Hato/
│   │   └── HK_Kowloon_Flood.tif
│   └── RS2024-BlackRain/
│       └── HK_IslandEast_Flood.tif
├── Macau/
│   ├── TY2017-Hato/
│   │   ├── Hato_MacauPeninsula.tif
│   │   └── Hato_Taipa.tif
│   └── TY2018-Mangkhut/
│       ├── Mangkhut_MacauPeninsula.tif
│       └── Mangkhut_Taipa.tif
└── Thailand/
    ├── FL2023-Bangkok/
    │   └── Bangkok_Flood_2023.tif
    └── TY2022-Noru/
        └── Noru_Chonburi.tif

GeoServer图层命名规范：
{Region}:{EventID}_{Area}
例如：
- HongKong:TY2023-Mangkhut_Peninsula
- Macau:TY2017-Hato_MacauPeninsula
- Thailand:FL2023-Bangkok_Flood
```

### 1.2 Python批量配置脚本

```python
"""
GeoServer批量TIF发布脚本
使用REST API自动创建workspace、store和layer
"""

import requests
import json
from pathlib import Path
from typing import List, Dict
import time

class GeoServerBatchPublisher:
    def __init__(self, 
                 geoserver_url: str = "http://localhost:8080/geoserver",
                 username: str = "admin",
                 password: str = "geoserver"):
        self.base_url = geoserver_url
        self.rest_url = f"{geoserver_url}/rest"
        self.auth = (username, password)
        self.headers = {"Content-Type": "application/json"}
    
    def create_workspace(self, workspace_name: str) -> bool:
        """创建工作空间"""
        url = f"{self.rest_url}/workspaces"
        data = {
            "workspace": {
                "name": workspace_name
            }
        }
        
        try:
            response = requests.post(url, auth=self.auth, json=data, headers=self.headers)
            if response.status_code == 201:
                print(f"✅ Workspace '{workspace_name}' created")
                return True
            elif response.status_code == 409:
                print(f"⚠️  Workspace '{workspace_name}' already exists")
                return True
            else:
                print(f"❌ Failed to create workspace: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error creating workspace: {e}")
            return False
    
    def create_coveragestore(self, workspace: str, store_name: str, tif_path: str) -> bool:
        """创建GeoTIFF数据存储"""
        url = f"{self.rest_url}/workspaces/{workspace}/coveragestores"
        
        # 转换Windows路径为file:// URL
        file_url = f"file:///{tif_path.replace(chr(92), '/')}"
        
        data = {
            "coverageStore": {
                "name": store_name,
                "type": "GeoTIFF",
                "enabled": True,
                "workspace": {
                    "name": workspace
                },
                "url": file_url
            }
        }
        
        try:
            response = requests.post(url, auth=self.auth, json=data, headers=self.headers)
            if response.status_code == 201:
                print(f"  ✅ Store '{store_name}' created")
                return True
            elif response.status_code == 409:
                print(f"  ⚠️  Store '{store_name}' already exists")
                return True
            else:
                print(f"  ❌ Failed to create store: {response.text}")
                return False
        except Exception as e:
            print(f"  ❌ Error creating store: {e}")
            return False
    
    def publish_coverage(self, workspace: str, store_name: str, layer_name: str) -> bool:
        """发布图层"""
        url = f"{self.rest_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages"
        
        data = {
            "coverage": {
                "name": layer_name,
                "title": layer_name.replace('_', ' '),
                "enabled": True,
                "nativeCRS": "EPSG:4326"
            }
        }
        
        try:
            response = requests.post(url, auth=self.auth, json=data, headers=self.headers)
            if response.status_code == 201:
                print(f"    ✅ Layer '{layer_name}' published")
                return True
            else:
                print(f"    ❌ Failed to publish layer: {response.text}")
                return False
        except Exception as e:
            print(f"    ❌ Error publishing layer: {e}")
            return False
    
    def apply_style(self, workspace: str, layer_name: str, style_name: str = "flood_depth") -> bool:
        """应用样式到图层"""
        url = f"{self.rest_url}/layers/{workspace}:{layer_name}"
        
        data = {
            "layer": {
                "defaultStyle": {
                    "name": style_name
                }
            }
        }
        
        try:
            response = requests.put(url, auth=self.auth, json=data, headers=self.headers)
            if response.status_code == 200:
                print(f"    ✅ Style '{style_name}' applied")
                return True
            else:
                print(f"    ⚠️  Failed to apply style: {response.text}")
                return False
        except Exception as e:
            print(f"    ⚠️  Error applying style: {e}")
            return False
    
    def scan_and_publish_directory(self, base_path: Path, region: str) -> Dict[str, int]:
        """扫描目录并批量发布所有TIF文件"""
        stats = {"total": 0, "success": 0, "failed": 0}
        
        print(f"\n{'='*80}")
        print(f"🔍 Scanning directory: {base_path}")
        print(f"📍 Region: {region}")
        print(f"{'='*80}\n")
        
        # 创建workspace
        self.create_workspace(region)
        
        # 查找所有TIF文件
        tif_files = list(base_path.rglob("*.tif"))
        print(f"📊 Found {len(tif_files)} TIF files\n")
        
        for tif_file in tif_files:
            stats["total"] += 1
            
            # 生成store和layer名称
            relative_path = tif_file.relative_to(base_path)
            event_folder = relative_path.parts[0] if len(relative_path.parts) > 1 else "Unknown"
            file_name = tif_file.stem
            
            store_name = f"{event_folder}_{file_name}"
            layer_name = store_name
            
            print(f"[{stats['total']}/{len(tif_files)}] Processing: {tif_file.name}")
            print(f"  Event: {event_folder}")
            print(f"  Store: {store_name}")
            print(f"  Layer: {layer_name}")
            
            # 创建store
            if self.create_coveragestore(region, store_name, str(tif_file)):
                # 发布layer
                if self.publish_coverage(region, store_name, layer_name):
                    # 应用样式
                    self.apply_style(region, layer_name)
                    stats["success"] += 1
                else:
                    stats["failed"] += 1
            else:
                stats["failed"] += 1
            
            print()  # 空行分隔
            time.sleep(0.5)  # 避免请求过快
        
        return stats


def main():
    """主函数 - 批量发布配置"""
    
    # 配置参数
    GEOSERVER_URL = "http://localhost:8080/geoserver"
    GEOSERVER_USER = "admin"
    GEOSERVER_PASS = "geoserver"
    
    # 数据目录配置
    regions_config = [
        {
            "name": "Macau",
            "path": "D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau"
        },
        {
            "name": "HongKong",
            "path": "D:/GeoData/HongKong"
        },
        {
            "name": "Thailand",
            "path": "D:/GeoData/Thailand"
        },
        # 添加更多地区...
    ]
    
    # 创建发布器
    publisher = GeoServerBatchPublisher(GEOSERVER_URL, GEOSERVER_USER, GEOSERVER_PASS)
    
    # 批量处理所有地区
    all_stats = {"total": 0, "success": 0, "failed": 0}
    
    for region in regions_config:
        region_path = Path(region["path"])
        
        if not region_path.exists():
            print(f"⚠️  Directory not found: {region_path}")
            continue
        
        stats = publisher.scan_and_publish_directory(region_path, region["name"])
        
        # 累计统计
        all_stats["total"] += stats["total"]
        all_stats["success"] += stats["success"]
        all_stats["failed"] += stats["failed"]
    
    # 打印总结
    print(f"\n{'='*80}")
    print(f"📊 BATCH PUBLICATION SUMMARY")
    print(f"{'='*80}")
    print(f"Total TIF files processed: {all_stats['total']}")
    print(f"✅ Successfully published: {all_stats['success']}")
    print(f"❌ Failed: {all_stats['failed']}")
    print(f"Success rate: {all_stats['success']/all_stats['total']*100:.1f}%")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
```

### 1.3 使用方法

```bash
# 安装依赖
pip install requests

# 配置脚本中的参数
# 1. GEOSERVER_URL
# 2. regions_config（数据目录）

# 运行脚本
python scripts/batch-publish-geoserver.py
```

### 1.4 预期输出

```
================================================================================
🔍 Scanning directory: D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau
📍 Region: Macau
================================================================================

📊 Found 6 TIF files

[1/6] Processing: Hato_MacauPeninsula.tif
  Event: Hato
  Store: Hato_Hato_MacauPeninsula
  Layer: Hato_Hato_MacauPeninsula
  ✅ Store 'Hato_Hato_MacauPeninsula' created
    ✅ Layer 'Hato_Hato_MacauPeninsula' published
    ✅ Style 'flood_depth' applied

[2/6] Processing: Hato_Taipa.tif
...

================================================================================
📊 BATCH PUBLICATION SUMMARY
================================================================================
Total TIF files processed: 6
✅ Successfully published: 6
❌ Failed: 0
Success rate: 100.0%
================================================================================
```

---

## 🌈 方案2: 使用ImageMosaic插件（适合大量同类TIF）

### 2.1 适用场景
- 有数百个同类型的TIF文件
- 需要将它们作为一个统一的图层展示
- 例如：所有台风事件的洪涝深度

### 2.2 配置步骤

```bash
# 1. 准备数据目录
D:/GeoData/AllEvents/
├── event001.tif
├── event002.tif
├── event003.tif
...
└── event500.tif

# 2. 在GeoServer中创建ImageMosaic Store
# Web UI: Stores → Add new Store → ImageMosaic
# URL: file:///D:/GeoData/AllEvents/

# 3. 发布图层
# 一次性将所有TIF作为单个图层发布
```

### 2.3 优点
- 一个图层管理所有TIF
- 自动索引和优化
- 支持时间维度（如果TIF有时间属性）

### 2.4 缺点
- 无法单独控制每个事件的显示
- 配置复杂

---

## ☁️ 方案3: 使用云存储COG（Cloud Optimized GeoTIFF）

### 3.1 架构

```
前端直接读取COG，无需GeoServer
├── 转换TIF为COG格式
├── 上传到云存储（S3/Azure/阿里云OSS）
└── 前端使用GeoTIFF.js直接渲染
```

### 3.2 转换脚本

```bash
# 批量转换为COG
for file in *.tif; do
    gdal_translate -of COG \
        -co COMPRESS=DEFLATE \
        -co PREDICTOR=2 \
        -co TILED=YES \
        -co BLOCKXSIZE=512 \
        -co BLOCKYSIZE=512 \
        "$file" "${file%.tif}_COG.tif"
done
```

### 3.3 前端集成

```typescript
import GeoTIFF from 'geotiff';

// 直接从URL加载COG
const tiff = await GeoTIFF.fromUrl(
  'https://your-storage.com/events/Hato_MacauPeninsula_COG.tif'
);

// 渲染到Leaflet
const image = await tiff.getImage();
const data = await image.readRasters();
// 转换为Leaflet图层
```

### 3.4 优点
- 无需GeoServer
- 性能更好（按需加载）
- 易于扩展到数千个文件

### 3.4 缺点
- 需要云存储服务
- 前端实现复杂

---

## 🛠️ 方案4: GeoServer配置文件批量生成

### 4.1 原理
直接生成GeoServer的XML配置文件，跳过REST API

### 4.2 配置文件结构

```xml
<!-- workspace.xml -->
<workspace>
  <id>WorkspaceInfoImpl-123</id>
  <name>Macau</name>
</workspace>

<!-- coveragestore.xml -->
<coverageStore>
  <id>CoverageStoreInfoImpl-456</id>
  <name>Hato_MacauPeninsula</name>
  <type>GeoTIFF</type>
  <enabled>true</enabled>
  <workspace>
    <id>WorkspaceInfoImpl-123</id>
  </workspace>
  <url>file:///D:/GeoData/Macau/Hato_MacauPeninsula.tif</url>
</coverageStore>

<!-- coverage.xml -->
<coverage>
  <id>CoverageInfoImpl-789</id>
  <name>Hato_MacauPeninsula</name>
  <nativeName>Hato_MacauPeninsula</nativeName>
  <enabled>true</enabled>
  <store class="coverageStore">
    <id>CoverageStoreInfoImpl-456</id>
  </store>
</coverage>
```

### 4.3 批量生成脚本

```python
from pathlib import Path
import uuid

def generate_workspace_xml(workspace_name: str) -> str:
    workspace_id = str(uuid.uuid4())
    return f'''<workspace>
  <id>{workspace_id}</id>
  <name>{workspace_name}</name>
</workspace>'''

def generate_configs(base_path: Path, workspace: str, output_dir: Path):
    """批量生成GeoServer配置文件"""
    tif_files = list(base_path.rglob("*.tif"))
    
    for tif in tif_files:
        store_name = tif.stem
        store_id = str(uuid.uuid4())
        coverage_id = str(uuid.uuid4())
        
        # 生成coveragestore.xml
        store_xml = f'''<coverageStore>
  <id>{store_id}</id>
  <name>{store_name}</name>
  <type>GeoTIFF</type>
  <enabled>true</enabled>
  <workspace>
    <name>{workspace}</name>
  </workspace>
  <url>file:///{str(tif).replace(chr(92), '/')}</url>
</coverageStore>'''
        
        # 保存文件
        store_dir = output_dir / workspace / store_name
        store_dir.mkdir(parents=True, exist_ok=True)
        (store_dir / "coveragestore.xml").write_text(store_xml)
        
        print(f"✅ Generated config for {store_name}")

# 使用
generate_configs(
    Path("D:/GeoData/Macau"),
    "Macau",
    Path("C:/geoserver/data_dir/workspaces")
)
```

### 4.4 部署
```bash
# 1. 生成配置文件
python generate_geoserver_configs.py

# 2. 复制到GeoServer数据目录
# Windows: C:/Program Files/GeoServer/data_dir/workspaces/
# Linux: /var/lib/geoserver_data/workspaces/

# 3. 重启GeoServer
# 自动加载新配置
```

---

## 📊 推荐配置矩阵

| 事件数量 | 更新频率 | 推荐方案 |
|---------|---------|---------|
| < 50 | 低 | 手动配置或方案1 REST API |
| 50-200 | 中 | 方案1 REST API（推荐） |
| 200-500 | 高 | 方案1 REST API + 方案2 Mosaic |
| > 500 | 高 | 方案3 COG + 云存储 |

---

## 🎯 最佳实践建议

### 对于你的场景（多城市数百事件）

**推荐组合方案：**

1. **数据组织**
   ```
   D:/GeoData/
   ├── Region1/
   │   ├── Event1/
   │   └── Event2/
   ├── Region2/
   └── Region3/
   ```

2. **使用REST API批量发布**
   - 运行Python脚本自动创建所有图层
   - 按地区组织workspace
   - 统一命名规范

3. **前端动态加载**
   - 不要一次加载所有图层
   - 根据用户选择的事件动态显示
   - 使用图层分组管理

4. **性能优化**
   - 将TIF转换为COG格式
   - 生成金字塔（gdaladdo）
   - 配置GeoWebCache缓存

---

## 📝 下一步行动

1. **立即可做**：运行上面的Python脚本批量发布现有的6个Macau TIF文件
2. **规划阶段**：设计数据目录结构和命名规范
3. **长期优化**：考虑迁移到COG格式

需要我帮你创建完整的批量发布脚本吗？
