"""
GeoServer批量TIF发布脚本
使用REST API自动创建workspace、store和layer

使用方法：
1. 修改下面的配置参数
2. 运行: python scripts/batch-publish-geoserver.py
"""

import requests
import json
from pathlib import Path
from typing import List, Dict, Optional
import time
import sys
import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

class GeoServerBatchPublisher:
    """GeoServer批量发布工具类"""
    
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
        self.headers = {"Content-Type": "application/json"}
        
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
                version_info = response.json()
                print(f"[OK] Connected to GeoServer")
                print(f"     Version: {version_info.get('about', {}).get('resource', [{}])[0].get('Version', 'Unknown')}")
            else:
                print(f"[WARN] GeoServer responded with status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[ERROR] Cannot connect to GeoServer at {self.base_url}")
            print(f"        Please make sure GeoServer is running")
            sys.exit(1)
        except Exception as e:
            print(f"[WARN] Connection test failed: {e}")
    
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
                print(f"[OK] Workspace '{workspace_name}' created")
                return True
            elif response.status_code == 409:
                print(f"[INFO] Workspace '{workspace_name}' already exists")
                return True
            else:
                print(f"[ERROR] Failed to create workspace: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"[ERROR] Error creating workspace: {e}")
            return False
    
    def create_coveragestore(self, workspace: str, store_name: str, tif_path: str) -> bool:
        """创建GeoTIFF数据存储"""
        url = f"{self.rest_url}/workspaces/{workspace}/coveragestores"
        
        # 转换Windows路径为file:// URL
        file_url = f"file:///{str(tif_path).replace(chr(92), '/')}"
        
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
                print(f"  [OK] Store '{store_name}' created")
                return True
            elif response.status_code == 500 and "already exists" in response.text:
                print(f"  [INFO] Store '{store_name}' already exists")
                return True
            else:
                print(f"  [ERROR] Failed to create store: {response.status_code}")
                if response.status_code == 500:
                    print(f"     Error: {response.text[:200]}")
                return False
        except Exception as e:
            print(f"  [ERROR] Error creating store: {e}")
            return False
    
    def publish_coverage(self, workspace: str, store_name: str, layer_name: str) -> bool:
        """发布图层（使用configure=all自动配置）"""
        # 先尝试使用PUT方式自动配置
        url = f"{self.rest_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages?configure=all"
        
        data = {
            "coverage": {
                "name": layer_name,
                "title": layer_name.replace('_', ' '),
                "enabled": True
            }
        }
        
        try:
            # 尝试POST创建
            response = requests.post(url, auth=self.auth, json=data, headers=self.headers)
            if response.status_code == 201:
                print(f"    [OK] Layer '{layer_name}' published")
                return True
            elif response.status_code == 500 and "already exists" in response.text:
                print(f"    [INFO] Layer '{layer_name}' already exists")
                return True
            else:
                # 如果失败，检查图层是否已存在
                check_url = f"{self.rest_url}/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}.json"
                check_response = requests.get(check_url, auth=self.auth)
                if check_response.status_code == 200:
                    print(f"    [INFO] Layer '{layer_name}' already configured")
                    return True
                else:
                    print(f"    [ERROR] Failed to publish layer: {response.status_code}")
                    print(f"    Response: {response.text[:200]}")
                    return False
        except Exception as e:
            print(f"    [ERROR] Error publishing layer: {e}")
            return False
    
    def apply_style(self, workspace: str, layer_name: str, style_name: str = "raster") -> bool:
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
                print(f"    [OK] Style '{style_name}' applied")
                return True
            else:
                print(f"    [INFO] Using default style (style '{style_name}' may not exist)")
                return True  # 不算失败
        except Exception as e:
            print(f"    [INFO] Using default style: {e}")
            return True  # 不算失败
    
    def scan_and_publish_directory(self, base_path: Path, region: str, 
                                   pattern: str = "*.tif",
                                   dry_run: bool = False) -> Dict[str, int]:
        """
        扫描目录并批量发布所有TIF文件
        
        Args:
            base_path: 数据根目录
            region: 地区名称（作为workspace名）
            pattern: 文件匹配模式
            dry_run: 如果为True，只扫描不发布
        """
        stats = {"total": 0, "success": 0, "failed": 0, "skipped": 0}
        
        print(f"\n{'='*80}")
        print(f"Scanning directory: {base_path}")
        print(f"Region: {region}")
        print(f"Pattern: {pattern}")
        if dry_run:
            print(f"🧪 DRY RUN MODE - No changes will be made")
        print(f"{'='*80}\n")
        
        # 查找所有TIF文件
        if not base_path.exists():
            print(f"[ERROR] Directory does not exist: {base_path}")
            return stats
        
        tif_files = list(base_path.rglob(pattern))
        print(f"Found {len(tif_files)} TIF files\n")
        
        if len(tif_files) == 0:
            print(f"[WARNING] No TIF files found in {base_path}")
            return stats
        
        if dry_run:
            # 只列出文件，不发布
            for tif_file in tif_files:
                print(f"  {tif_file.name}")
            return stats
        
        # 创建workspace
        if not self.create_workspace(region):
            print(f"[ERROR] Failed to create workspace, aborting")
            return stats
        
        print()  # 空行
        
        # 发布每个TIF文件
        for idx, tif_file in enumerate(tif_files, 1):
            stats["total"] += 1
            
            # 生成store和layer名称
            # 如果TIF在子文件夹中，使用文件夹名作为前缀
            relative_path = tif_file.relative_to(base_path)
            if len(relative_path.parts) > 1:
                # 有子文件夹
                folder_name = relative_path.parts[0]
                file_name = tif_file.stem
                store_name = f"{folder_name}_{file_name}"
            else:
                # 直接在根目录
                store_name = tif_file.stem
            
            layer_name = store_name
            
            print(f"[{idx}/{len(tif_files)}] Processing: {tif_file.name}")
            print(f"  Relative path: {relative_path}")
            print(f"  Store name: {store_name}")
            print(f"  Layer name: {layer_name}")
            
            # 创建store
            if self.create_coveragestore(region, store_name, str(tif_file)):
                # 发布layer
                if self.publish_coverage(region, store_name, layer_name):
                    # 应用样式（可选）
                    self.apply_style(region, layer_name, "raster")
                    stats["success"] += 1
                else:
                    stats["failed"] += 1
            else:
                stats["failed"] += 1
            
            print()  # 空行分隔
            
            # 避免请求过快
            time.sleep(0.3)
        
        return stats


def main():
    """主函数 - 批量发布配置"""
    
    print("=" * 80)
    print("GeoServer Batch TIF Publisher")
    print("=" * 80)
    print()
    
    # ========== 配置参数 ==========

    # GeoServer连接配置 (从环境变量读取，也可以在这里覆盖)
    GEOSERVER_URL = os.getenv('GEOSERVER_URL', 'http://localhost:8080/geoserver')
    GEOSERVER_USER = os.getenv('GEOSERVER_USER', 'chensi')
    GEOSERVER_PASS = os.getenv('GEOSERVER_PASS', '')  # 从 .env 读取
    
    # 数据目录配置
    # 格式：{"name": "workspace名称", "path": "数据目录路径"}
    regions_config = [
        {
            "name": "Macau",
            "path": os.getenv("MACAU_DATA_DIR", "D:/web-flood-insurance-model/Data/Typhoon_FloodResult_Macau/WGS84")
        },
        # 添加更多地区...
        # {
        #     "name": "HongKong",
        #     "path": "D:/GeoData/HongKong"
        # },
        # {
        #     "name": "Thailand",
        #     "path": "D:/GeoData/Thailand"
        # },
    ]
    
    # 是否为试运行模式（只扫描不发布）
    DRY_RUN = False
    
    # ========== 开始批量处理 ==========
    
    try:
        # 创建发布器
        publisher = GeoServerBatchPublisher(GEOSERVER_URL, GEOSERVER_USER, GEOSERVER_PASS)
        
        # 批量处理所有地区
        all_stats = {"total": 0, "success": 0, "failed": 0, "skipped": 0}
        
        for region in regions_config:
            region_path = Path(region["path"])
            
            if not region_path.exists():
                print(f"⚠️  Directory not found: {region_path}")
                print(f"   Skipping region: {region['name']}\n")
                continue
            
            stats = publisher.scan_and_publish_directory(
                region_path, 
                region["name"],
                pattern="*.tif",
                dry_run=DRY_RUN
            )
            
            # 累计统计
            all_stats["total"] += stats["total"]
            all_stats["success"] += stats["success"]
            all_stats["failed"] += stats["failed"]
            all_stats["skipped"] += stats["skipped"]
        
        # 打印总结
        print(f"\n{'='*80}")
        print(f"BATCH PUBLICATION SUMMARY")
        print(f"{'='*80}")
        print(f"Total TIF files found:     {all_stats['total']}")
        print(f"[OK] Successfully published: {all_stats['success']}")
        print(f"[ERROR] Failed:                 {all_stats['failed']}")
        print(f"[SKIP] Skipped:                {all_stats['skipped']}")
        if all_stats['total'] > 0:
            success_rate = all_stats['success'] / all_stats['total'] * 100
            print(f"Success rate:           {success_rate:.1f}%")
        print(f"{'='*80}\n")
        
        if all_stats['success'] > 0:
            print(f"[OK] You can now view the layers in GeoServer:")
            print(f"   {GEOSERVER_URL}/web")
            print()
            print(f"WMS Service URL:")
            for region in regions_config:
                print(f"   {GEOSERVER_URL}/{region['name']}/wms")
        
    except KeyboardInterrupt:
        print("\n\n[WARNING] Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
