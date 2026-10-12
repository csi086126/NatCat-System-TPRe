#!/usr/bin/env python3
"""
从 GADM GeoPackage 中提取特定国家的边界数据
需要安装: pip install geopandas

使用方法:
python extract-gadm-country.py --country "China" --level 1 --output china_provinces.geojson
"""

import argparse
import os
import geopandas as gpd
import json
from pathlib import Path

def extract_country_boundaries(gpkg_path, country_name, admin_level, output_path):
    """
    从 GADM GeoPackage 提取国家边界
    
    参数:
        gpkg_path: GeoPackage 文件路径
        country_name: 国家名称 (如 "China", "Japan", "United States")
        admin_level: 行政级别 (0=国家, 1=省/州, 2=市/县, 3=区/镇)
        output_path: 输出 GeoJSON 文件路径
    """
    
    print(f"📦 正在读取 GeoPackage: {gpkg_path}")
    print(f"🌍 国家: {country_name}")
    print(f"📊 行政级别: {admin_level}")
    
    try:
        # 读取指定的行政级别图层
        layer_name = f"ADM_ADM_{admin_level}"
        print(f"\n🔍 正在读取图层: {layer_name}")
        
        gdf = gpd.read_file(gpkg_path, layer=layer_name)
        
        print(f"✓ 总共读取 {len(gdf)} 个要素")
        
        # 查看可用的列名
        print(f"\n📋 可用字段: {list(gdf.columns)}")
        
        # 筛选指定国家
        # GADM 通常使用 COUNTRY 或 NAME_0 字段存储国家名
        country_field = None
        for field in ['COUNTRY', 'NAME_0', 'GID_0']:
            if field in gdf.columns:
                country_field = field
                break
        
        if not country_field:
            print("❌ 找不到国家字段！")
            return False
        
        print(f"\n🔍 使用字段筛选: {country_field}")
        country_gdf = gdf[gdf[country_field].str.contains(country_name, case=False, na=False)]
        
        if len(country_gdf) == 0:
            print(f"❌ 未找到匹配 '{country_name}' 的数据")
            print(f"\n💡 可用国家示例:")
            unique_countries = gdf[country_field].unique()[:20]
            for c in unique_countries:
                print(f"   - {c}")
            return False
        
        print(f"✓ 找到 {len(country_gdf)} 个边界区域")
        
        # 保存为 GeoJSON
        print(f"\n💾 正在保存到: {output_path}")
        country_gdf.to_file(output_path, driver='GeoJSON')
        
        # 显示文件大小
        file_size = Path(output_path).stat().st_size / 1024 / 1024
        print(f"✅ 成功导出！文件大小: {file_size:.2f} MB")
        
        # 显示属性信息
        print(f"\n📊 边界属性示例:")
        if len(country_gdf) > 0:
            first_feature = country_gdf.iloc[0]
            for col in country_gdf.columns[:10]:
                if col != 'geometry':
                    print(f"   {col}: {first_feature[col]}")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def list_layers(gpkg_path):
    """列出 GeoPackage 中的所有图层"""
    import fiona
    
    print(f"📦 查看 GeoPackage 图层: {gpkg_path}\n")
    
    try:
        layers = fiona.listlayers(gpkg_path)
        print(f"✓ 找到 {len(layers)} 个图层:\n")
        for i, layer in enumerate(layers, 1):
            gdf = gpd.read_file(gpkg_path, layer=layer)
            print(f"{i}. {layer} ({len(gdf)} 个要素)")
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='从 GADM GeoPackage 提取国家边界')
    parser.add_argument('--gpkg', default=os.getenv('GADM_DATA_DIR', r'D:\web-flood-insurance-model\Data\Shapefile') + r'\gadm_410.gpkg',
                       help='GeoPackage 文件路径')
    parser.add_argument('--country', type=str, help='国家名称 (如: China, Japan, Taiwan)')
    parser.add_argument('--level', type=int, default=1,
                       help='行政级别: 0=国家, 1=省/州, 2=市/县, 3=区/镇')
    parser.add_argument('--output', type=str, help='输出 GeoJSON 文件路径')
    parser.add_argument('--list-layers', action='store_true', help='列出所有图层')
    
    args = parser.parse_args()
    
    if args.list_layers:
        list_layers(args.gpkg)
    elif args.country and args.output:
        extract_country_boundaries(args.gpkg, args.country, args.level, args.output)
    else:
        parser.print_help()
        print("\n示例用法:")
        print("  python extract-gadm-country.py --list-layers")
        print("  python extract-gadm-country.py --country China --level 1 --output china_provinces.geojson")
        print("  python extract-gadm-country.py --country Japan --level 2 --output japan_cities.geojson")
