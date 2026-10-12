"""
按行政层级分割香港TPUSU 2021数据
将完整的TPUSU shapefile分割为4个层级：
1. PPU (Primary Planning Unit) - 主要规划区
2. SPU (Secondary Planning Unit) - 次要规划区
3. TPU (Tertiary Planning Unit) - 第三级规划区
4. Subunit - 分区单元

使用方法:
python split-tpusu-by-hierarchy.py
"""

import geopandas as gpd
import os
from pathlib import Path
from shapely.ops import unary_union
import sys

def analyze_shapefile(input_path):
    """分析shapefile的结构和属性"""
    print(f"正在读取: {input_path}")
    gdf = gpd.read_file(input_path)

    print(f"\n数据基本信息:")
    print(f"  总记录数: {len(gdf)}")
    print(f"  坐标系统: {gdf.crs}")
    print(f"\n字段列表:")
    for col in gdf.columns:
        print(f"  - {col}: {gdf[col].dtype}")

    print(f"\n前5条记录:")
    print(gdf.head())

    return gdf

def split_by_hierarchy(input_path, output_dir):
    """按行政层级分割shapefile"""

    # 读取数据
    print("="*80)
    print("香港TPUSU 2021 层级分割工具")
    print("="*80)
    print()

    gdf = gpd.read_file(input_path)
    print(f"✓ 读取完成: {len(gdf)} 条记录")
    print(f"✓ 坐标系统: {gdf.crs}")
    print()

    # 创建输出目录
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    print(f"✓ 输出目录: {output_path}")
    print()

    # 定义层级规则
    hierarchy_levels = []

    # 检查可能的字段名
    possible_ppu_fields = ['PPU', 'PPU_CODE', 'PPU_NAME', 'PPU_ENG', 'PPU_CHI']
    possible_spu_fields = ['SPU', 'SPU_CODE', 'SPU_NAME', 'SPU_ENG', 'SPU_CHI']
    possible_tpu_fields = ['TPU', 'TPU_CODE', 'TPU_NAME', 'TPU_ENG', 'TPU_CHI']

    # 查找实际存在的字段
    columns = [col.upper() for col in gdf.columns]

    print("正在分析数据结构...")
    print(f"可用字段: {list(gdf.columns)}")
    print()

    # 1. PPU层级
    if any(field in columns for field in [f.upper() for f in possible_ppu_fields]):
        ppu_field = next((col for col in gdf.columns if col.upper() in [f.upper() for f in possible_ppu_fields]), None)
        if ppu_field:
            hierarchy_levels.append({
                'name': 'PPU',
                'field': ppu_field,
                'output': output_path / 'HongKong_PPU.shp',
                'description': '主要规划区 (Primary Planning Unit)'
            })

    # 2. SPU层级
    if any(field in columns for field in [f.upper() for f in possible_spu_fields]):
        spu_field = next((col for col in gdf.columns if col.upper() in [f.upper() for f in possible_spu_fields]), None)
        if spu_field:
            hierarchy_levels.append({
                'name': 'SPU',
                'field': spu_field,
                'output': output_path / 'HongKong_SPU.shp',
                'description': '次要规划区 (Secondary Planning Unit)'
            })

    # 3. TPU层级
    if any(field in columns for field in [f.upper() for f in possible_tpu_fields]):
        tpu_field = next((col for col in gdf.columns if col.upper() in [f.upper() for f in possible_tpu_fields]), None)
        if tpu_field:
            hierarchy_levels.append({
                'name': 'TPU',
                'field': tpu_field,
                'output': output_path / 'HongKong_TPU.shp',
                'description': '第三级规划区 (Tertiary Planning Unit)'
            })

    # 4. Subunit层级
    hierarchy_levels.append({
        'name': 'Subunit',
        'field': None,
        'output': output_path / 'HongKong_Subunit.shp',
        'description': '分区单元 (最细粒度)'
    })

    if not hierarchy_levels:
        print("❌ 错误: 无法识别行政层级字段")
        print("请检查shapefile的字段结构")
        return

    # 按层级分割和保存
    results = []

    for level in hierarchy_levels:
        print(f"--- 处理 {level['name']} 层级 ---")
        print(f"描述: {level['description']}")

        if level['field']:
            # 聚合到指定层级 - 使用 unary_union 完全移除内部边界
            print(f"聚合字段: {level['field']}")
            print(f"  正在合并几何并移除内部边界...")

            # 获取唯一值
            unique_values = gdf[level['field']].unique()

            merged_data = []
            for i, value in enumerate(unique_values):
                if (i + 1) % 10 == 0:
                    print(f"    处理中... {i+1}/{len(unique_values)}")

                # 获取该组的所有几何
                group_geoms = gdf[gdf[level['field']] == value].geometry.tolist()

                # 使用 unary_union 完全合并 - 这会真正移除内部边界
                merged_geom = unary_union(group_geoms)

                # buffer(0) 确保几何有效性
                merged_geom = merged_geom.buffer(0)

                # 统计信息
                count = len(group_geoms)
                area = merged_geom.area

                merged_data.append({
                    level['field']: value,
                    'geometry': merged_geom,
                    'AREA': area,
                    'COUNT': count
                })

            # 创建新的 GeoDataFrame
            output_gdf = gpd.GeoDataFrame(merged_data, crs=gdf.crs)

            print(f"  原始记录: {len(gdf)}")
            print(f"  合并后: {len(output_gdf)} 个{level['name']}")
            print(f"  ✓ 内部边界已完全移除")
        else:
            # Subunit - 保留全部
            output_gdf = gdf.copy()
            print(f"  保留全部记录: {len(output_gdf)}")

        # 保存为shapefile
        output_gdf.to_file(level['output'], encoding='utf-8')

        # 记录结果
        file_size = level['output'].stat().st_size / 1024 / 1024
        results.append({
            'level': level['name'],
            'file': level['output'].name,
            'records': len(output_gdf),
            'size_mb': file_size
        })

        print(f"  ✓ 已保存: {level['output'].name}")
        print(f"  文件大小: {file_size:.2f} MB")
        print()

    # 打印总结
    print("="*80)
    print("分割完成汇总")
    print("="*80)
    print()
    print(f"{'层级':<12} {'文件名':<25} {'记录数':>10} {'文件大小':>12}")
    print("-"*80)
    for result in results:
        print(f"{result['level']:<12} {result['file']:<25} {result['records']:>10} {result['size_mb']:>10.2f} MB")
    print("-"*80)
    print()
    print(f"所有文件已保存到: {output_path}")
    print()

    # 生成文档
    generate_documentation(output_path, results, gdf.crs)

def generate_documentation(output_path, results, crs):
    """生成说明文档"""
    doc_path = output_path / 'README.md'

    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write("# 香港TPUSU 2021 分层级数据\n\n")
        f.write("## 数据说明\n\n")
        f.write("本数据集将香港2021人口普查规划单元按行政层级分割为4个文件:\n\n")

        for result in results:
            f.write(f"### {result['level']}\n")
            f.write(f"- 文件: `{result['file']}`\n")
            f.write(f"- 记录数: {result['records']}\n")
            f.write(f"- 文件大小: {result['size_mb']:.2f} MB\n")
            f.write("\n")

        f.write("## 坐标系统\n\n")
        f.write(f"```\n{crs}\n```\n\n")

        f.write("## 层级关系\n\n")
        f.write("```\n")
        f.write("PPU (Primary Planning Unit)\n")
        f.write("  └─ SPU (Secondary Planning Unit)\n")
        f.write("      └─ TPU (Tertiary Planning Unit)\n")
        f.write("          └─ Subunit (最细粒度分区)\n")
        f.write("```\n\n")

        f.write("## 几何处理\n\n")
        f.write("- 使用 `shapely.ops.unary_union` 完全合并同组几何\n")
        f.write("- 内部边界已完全移除\n")
        f.write("- 使用 `buffer(0)` 确保几何有效性\n\n")

    print(f"✓ 已生成文档: {doc_path.name}")

def main():
    """主函数"""

    # 配置路径
    _SHAPEFILE_BASE = os.getenv("SHAPEFILE_DIR", r"D:\Nat Cat Platform\Data\Shapefile")
    INPUT_PATH = Path(_SHAPEFILE_BASE + r"\BoundariesofTertiaryPlanningUnitsSubunitsfor2021PopulationCensus_SHP\TPUSU_2021\TPUSU_2021.shp")
    OUTPUT_DIR = Path(_SHAPEFILE_BASE + r"\HongKong_Administrative_Levels")

    # 检查输入文件
    if not INPUT_PATH.exists():
        print(f"❌ 错误: 找不到输入文件")
        print(f"   路径: {INPUT_PATH}")
        sys.exit(1)

    # 先分析数据结构
    print("\n第一步: 分析数据结构\n")
    gdf = analyze_shapefile(INPUT_PATH)

    print("\n" + "="*80)
    print("\n正在继续分割数据...")
    print()

    # 执行分割
    try:
        split_by_hierarchy(INPUT_PATH, OUTPUT_DIR)
        print("✨ 全部完成!")

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
