# -*- coding: utf-8 -*-
"""
澳门 Shapefile 处理脚本
功能：
1. 将澳门边界 Polygon 转换为 Polyline
2. 确保坐标系为 WGS84 (EPSG:4326)
3. 上传到 GeoServer

作者：chensi
日期：2025-01-16
"""

import os
import glob
import geopandas as gpd
from shapely.geometry import LineString, MultiLineString
import requests
from requests.auth import HTTPBasicAuth
import zipfile
import tempfile
import shutil

# ============================================
# 配置区 - 请根据您的环境修改以下参数
# ============================================
GEOSERVER_URL = "http://10.253.22.15:8080/geoserver"  # GeoServer 地址
GEOSERVER_USER = "chensi"                            # GeoServer 用户名
GEOSERVER_PASSWORD = os.getenv("GEOSERVER_PASSWORD")  # 从本地环境变量读取
WORKSPACE = "macau"                                # 工作空间名称
DATASTORE = "macau_shapefiles"                      # 数据存储名称

# 源数据路径
_SHAPEFILE_BASE = os.getenv("SHAPEFILE_DIR", r"D:\Nat Cat Platform\Data\Shapefile")
SHAPEFILE_PATHS = {
    "macau_district_boundary": _SHAPEFILE_BASE + r"\澳门区划边界数据_WGS84坐标",
    "macau_statistical_area": _SHAPEFILE_BASE + r"\澳门统计区_WGS84坐标"
}

# 输出路径
OUTPUT_DIR = _SHAPEFILE_BASE + r"\processed"


# ============================================
# 功能函数
# ============================================

def find_shapefile(folder_path):
    """在文件夹中查找 .shp 文件"""
    shp_files = glob.glob(os.path.join(folder_path, "*.shp"))
    if not shp_files:
        raise FileNotFoundError(f"在 {folder_path} 中未找到 .shp 文件")
    return shp_files[0]


def polygon_to_polyline(gdf):
    """将 Polygon/MultiPolygon 转换为 LineString/MultiLineString"""
    def convert_geometry(geom):
        if geom is None:
            return None
        if geom.geom_type == 'Polygon':
            # 提取外环和内环作为线
            lines = [LineString(geom.exterior.coords)]
            for interior in geom.interiors:
                lines.append(LineString(interior.coords))
            if len(lines) == 1:
                return lines[0]
            return MultiLineString(lines)
        elif geom.geom_type == 'MultiPolygon':
            all_lines = []
            for polygon in geom.geoms:
                all_lines.append(LineString(polygon.exterior.coords))
                for interior in polygon.interiors:
                    all_lines.append(LineString(interior.coords))
            return MultiLineString(all_lines)
        else:
            return geom
    
    gdf_copy = gdf.copy()
    gdf_copy['geometry'] = gdf_copy['geometry'].apply(convert_geometry)
    return gdf_copy


def ensure_wgs84(gdf):
    """确保 GeoDataFrame 使用 WGS84 坐标系 (EPSG:4326)"""
    if gdf.crs is None:
        print("    警告: 原始数据没有坐标系，设置为 WGS84")
        gdf = gdf.set_crs("EPSG:4326")
    elif gdf.crs.to_epsg() != 4326:
        print(f"    转换坐标系: {gdf.crs} -> EPSG:4326")
        gdf = gdf.to_crs("EPSG:4326")
    else:
        print("    坐标系已是 WGS84 (EPSG:4326)")
    return gdf


def create_shapefile_zip(gdf, output_name, output_dir):
    """将 GeoDataFrame 保存为 Shapefile 并打包为 ZIP"""
    # 创建临时目录
    temp_dir = tempfile.mkdtemp()
    shp_path = os.path.join(temp_dir, f"{output_name}.shp")
    
    # 保存 Shapefile
    gdf.to_file(shp_path, encoding='utf-8')
    
    # 创建 ZIP 文件
    zip_path = os.path.join(output_dir, f"{output_name}.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for ext in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
            file_path = os.path.join(temp_dir, f"{output_name}{ext}")
            if os.path.exists(file_path):
                zipf.write(file_path, f"{output_name}{ext}")
    
    # 清理临时目录
    shutil.rmtree(temp_dir)
    
    print(f"    已创建 ZIP: {zip_path}")
    return zip_path


def create_workspace(geoserver_url, workspace, auth):
    """创建 GeoServer 工作空间（如果不存在）"""
    url = f"{geoserver_url}/rest/workspaces/{workspace}"
    response = requests.get(url, auth=auth)
    
    if response.status_code == 404:
        # 工作空间不存在，创建它
        create_url = f"{geoserver_url}/rest/workspaces"
        data = f"<workspace><name>{workspace}</name></workspace>"
        headers = {"Content-Type": "application/xml"}
        response = requests.post(create_url, data=data, headers=headers, auth=auth)
        if response.status_code == 201:
            print(f"  ✓ 工作空间 '{workspace}' 创建成功")
        else:
            print(f"  ✗ 创建工作空间失败: {response.status_code} - {response.text}")
            return False
    else:
        print(f"  ✓ 工作空间 '{workspace}' 已存在")
    return True


def upload_shapefile_to_geoserver(zip_path, layer_name, geoserver_url, workspace, auth):
    """上传 Shapefile ZIP 到 GeoServer"""
    url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{layer_name}/file.shp"
    
    headers = {"Content-Type": "application/zip"}
    
    with open(zip_path, 'rb') as f:
        response = requests.put(url, data=f, headers=headers, auth=auth)
    
    if response.status_code in [200, 201]:
        print(f"    ✓ 图层 '{layer_name}' 上传成功")
        return True
    else:
        print(f"    ✗ 上传失败: {response.status_code} - {response.text}")
        return False


# ============================================
# 主程序
# ============================================

def main():
    print("=" * 60)
    print("澳门 Shapefile 处理脚本")
    print("=" * 60)
    
    # 创建输出目录
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n输出目录: {OUTPUT_DIR}")
    
    # GeoServer 认证
    auth = HTTPBasicAuth(GEOSERVER_USER, GEOSERVER_PASSWORD)
    
    # 创建工作空间
    print(f"\n[1] 检查/创建 GeoServer 工作空间...")
    if not create_workspace(GEOSERVER_URL, WORKSPACE, auth):
        print("无法创建工作空间，脚本终止")
        return
    
    # 处理每个 Shapefile
    all_layers = []
    
    print(f"\n[2] 处理 Shapefile 文件...")
    for layer_name, folder_path in SHAPEFILE_PATHS.items():
        print(f"\n  处理: {layer_name}")
        print(f"  路径: {folder_path}")
        
        try:
            # 查找 Shapefile
            shp_file = find_shapefile(folder_path)
            print(f"  找到文件: {os.path.basename(shp_file)}")
            
            # 读取 Shapefile
            gdf = gpd.read_file(shp_file)
            print(f"  要素数量: {len(gdf)}")
            print(f"  几何类型: {gdf.geom_type.unique()}")
            
            # 确保 WGS84 坐标系
            gdf = ensure_wgs84(gdf)
            
            # 保存原始 Polygon
            print(f"\n  [2a] 保存原始 Polygon...")
            polygon_name = f"{layer_name}_polygon"
            polygon_zip = create_shapefile_zip(gdf, polygon_name, OUTPUT_DIR)
            all_layers.append((polygon_zip, polygon_name))
            
            # 转换为 Polyline
            print(f"\n  [2b] 转换为 Polyline...")
            gdf_polyline = polygon_to_polyline(gdf)
            print(f"  转换后几何类型: {gdf_polyline.geom_type.unique()}")
            
            # 保存 Polyline
            polyline_name = f"{layer_name}_polyline"
            polyline_zip = create_shapefile_zip(gdf_polyline, polyline_name, OUTPUT_DIR)
            all_layers.append((polyline_zip, polyline_name))
            
        except Exception as e:
            print(f"  ✗ 处理失败: {str(e)}")
            continue
    
    # 上传到 GeoServer
    print(f"\n[3] 上传到 GeoServer...")
    print(f"  服务器: {GEOSERVER_URL}")
    print(f"  工作空间: {WORKSPACE}")
    
    success_count = 0
    for zip_path, layer_name in all_layers:
        print(f"\n  上传图层: {layer_name}")
        if upload_shapefile_to_geoserver(zip_path, layer_name, GEOSERVER_URL, WORKSPACE, auth):
            success_count += 1
    
    # 完成
    print("\n" + "=" * 60)
    print(f"处理完成!")
    print(f"  - 总图层数: {len(all_layers)}")
    print(f"  - 上传成功: {success_count}")
    print(f"  - 上传失败: {len(all_layers) - success_count}")
    print("=" * 60)
    
    # 打印 GeoServer 预览链接
    if success_count > 0:
        print(f"\n您可以在以下地址预览图层:")
        print(f"  {GEOSERVER_URL}/web/wicket/bookmarkable/org.geoserver.web.demo.MapPreviewPage")


if __name__ == "__main__":
    main()