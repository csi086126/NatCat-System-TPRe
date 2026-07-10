"""
发布IBTracks台风路径数据到GeoServer
支持Shapefile格式（lines和points）

使用方法：
python scripts/publish-ibtracs.py
"""

import requests
import zipfile
from pathlib import Path
import shutil
import sys
import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

class IBTracksPublisher:
    """IBTracks数据发布工具"""
    
    def __init__(self,
                 geoserver_url: str = None,
                 username: str = None,
                 password: str = None):
        # 优先使用传入参数，否则从环境变量读取
        self.base_url = geoserver_url or os.getenv('GEOSERVER_URL', 'http://localhost:8080/geoserver')
        self.rest_url = f"{self.base_url}/rest"
        self.auth = (
            username or os.getenv('GEOSERVER_USER', 'chensi'),
            password or os.getenv('GEOSERVER_PASS', '')
        )
        self.headers_json = {"Content-Type": "application/json"}
        
        # 测试连接
        self._test_connection()
    
    def _test_connection(self):
        """测试GeoServer连接"""
        try:
            response = requests.get(
                f"{self.rest_url}/about/version", 
                auth=self.auth,
                timeout=5
            )
            if response.status_code == 200:
                print("Connected to GeoServer")
            else:
                print(f"GeoServer responded with status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"Cannot connect to GeoServer at {self.base_url}")
            print(f"Please make sure GeoServer is running")
            sys.exit(1)
    
    def create_workspace(self, workspace_name: str) -> bool:
        """创建全局数据工作空间"""
        url = f"{self.rest_url}/workspaces"
        data = {"workspace": {"name": workspace_name}}
        
        try:
            response = requests.post(url, auth=self.auth, json=data, headers=self.headers_json)
            if response.status_code == 201:
                print(f"Workspace '{workspace_name}' created")
                return True
            elif response.status_code == 409:
                print(f"Workspace '{workspace_name}' already exists")
                return True
            else:
                print(f"Failed to create workspace: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error creating workspace: {e}")
            return False
    
    def prepare_shapefile_zip(self, shp_dir: Path, base_name: str, output_dir: Path) -> Path:
        """打包Shapefile及其附属文件为ZIP"""
        zip_path = output_dir / f"{base_name}.zip"
        
        # 查找所有相关文件
        extensions = ['.shp', '.shx', '.dbf', '.prj', '.sbn', '.sbx', '.cpg', '.qix']
        
        print(f"  Packaging {base_name}...")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            files_added = 0
            for ext in extensions:
                file_path = shp_dir / f"{base_name}{ext}"
                if file_path.exists():
                    zipf.write(file_path, file_path.name)
                    files_added += 1
                    print(f"    Added: {file_path.name} ({file_path.stat().st_size / 1024 / 1024:.1f} MB)")
        
        print(f"  Created ZIP: {zip_path.name} ({zip_path.stat().st_size / 1024 / 1024:.1f} MB)")
        print(f"  Files included: {files_added}")
        return zip_path
    
    def publish_shapefile(self, workspace: str, store_name: str, zip_path: Path) -> bool:
        """通过ZIP上传发布Shapefile"""
        url = f"{self.rest_url}/workspaces/{workspace}/datastores/{store_name}/file.shp"
        
        print(f"  Uploading to GeoServer...")
        try:
            with open(zip_path, 'rb') as f:
                response = requests.put(
                    url,
                    data=f,
                    auth=self.auth,
                    headers={'Content-Type': 'application/zip'},
                    timeout=300  # 5分钟超时（大文件）
                )
            
            if response.status_code in [200, 201]:
                print(f"  Successfully published: {store_name}")
                return True
            else:
                print(f"  Failed to publish: {response.status_code}")
                print(f"  Response: {response.text[:500]}")
                return False
        except Exception as e:
            print(f"  Error publishing shapefile: {e}")
            return False
    
    def publish_ibtracs(self, 
                       data_dir: Path,
                       workspace: str = "Global",
                       temp_dir: Path = None):
        """发布IBTracks数据集"""
        
        print("\n" + "="*80)
        print("IBTracks Western Pacific Typhoon Tracks Publisher")
        print("="*80 + "\n")
        
        # 创建工作空间
        if not self.create_workspace(workspace):
            print("Failed to create workspace, aborting")
            return
        
        # 创建临时目录
        if temp_dir is None:
            temp_dir = Path("./temp_zip")
        temp_dir.mkdir(exist_ok=True)
        
        try:
            # IBTracks文件配置
            datasets = [
                {
                    "base_name": "IBTrACS.WP.list.v04r01.lines",
                    "store_name": "IBTrACS_WP_Lines",
                    "description": "Typhoon track lines (complete tracks)"
                },
                {
                    "base_name": "IBTrACS.WP.list.v04r01.points",
                    "store_name": "IBTrACS_WP_Points",
                    "description": "Typhoon track points (6-hourly observations)"
                }
            ]
            
            success_count = 0
            
            for dataset in datasets:
                print(f"\n--- Processing: {dataset['description']} ---")
                
                # 检查Shapefile目录是否存在
                shp_dir = data_dir / dataset["base_name"]
                if not shp_dir.exists() or not shp_dir.is_dir():
                    print(f"  Directory not found: {shp_dir}")
                    print(f"  Skipping...")
                    continue
                
                # 检查必需文件
                shp_file = shp_dir / f"{dataset['base_name']}.shp"
                if not shp_file.exists():
                    print(f"  .shp file not found: {shp_file}")
                    print(f"  Skipping...")
                    continue
                
                # 打包为ZIP
                zip_path = self.prepare_shapefile_zip(
                    shp_dir, 
                    dataset["base_name"], 
                    temp_dir
                )
                
                # 上传到GeoServer
                if self.publish_shapefile(workspace, dataset["store_name"], zip_path):
                    success_count += 1
                    print(f"  SUCCESS: {dataset['store_name']} published")
                else:
                    print(f"  FAILED: {dataset['store_name']} publication failed")
            
            # 总结
            print("\n" + "="*80)
            print(f"SUMMARY: {success_count} / {len(datasets)} datasets published successfully")
            print("="*80)
            
            if success_count > 0:
                print(f"\nYou can now access the layers:")
                print(f"  WMS: {self.base_url}/{workspace}/wms")
                print(f"  WFS: {self.base_url}/{workspace}/wfs")
                print(f"\nLayer names:")
                for dataset in datasets:
                    print(f"  - {workspace}:{dataset['store_name']}")
                print(f"\nGeoServer Web UI:")
                print(f"  {self.base_url}/web")
        
        finally:
            # 清理临时文件
            print(f"\nCleaning up temporary files...")
            try:
                shutil.rmtree(temp_dir)
                print(f"  Removed: {temp_dir}")
            except Exception as e:
                print(f"  Could not remove temp directory: {e}")


def main():
    """主函数"""
    
    # ========== 配置参数 ==========

    # GeoServer连接 (从环境变量读取，也可以在这里覆盖)
    GEOSERVER_URL = os.getenv('GEOSERVER_URL', 'http://localhost:8080/geoserver')
    GEOSERVER_USER = os.getenv('GEOSERVER_USER', 'chensi')
    GEOSERVER_PASS = os.getenv('GEOSERVER_PASS', '')  # 从 .env 读取
    
    # IBTracks数据目录
    IBTRACS_DATA_DIR = Path("D:/web-flood-insurance-model/Data/IBTracks")
    
    # GeoServer工作空间
    WORKSPACE = "Global"
    
    # ========== 开始发布 ==========
    
    try:
        publisher = IBTracksPublisher(GEOSERVER_URL, GEOSERVER_USER, GEOSERVER_PASS)
        publisher.publish_ibtracs(IBTRACS_DATA_DIR, WORKSPACE)
        
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
