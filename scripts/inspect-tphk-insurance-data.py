"""
TPHK Insurance Data Structure Inspector
太平香港保险数据结构检查脚本
"""

import pandas as pd
import sys
import os
from pathlib import Path
import json

def analyze_sheet(df, sheet_name):
    """分析单个sheet的结构"""
    analysis = {
        "sheet_name": sheet_name,
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": [],
        "address_columns": [],
        "sample_data": []
    }

    # 地址关键词
    address_keywords = ['地址', '地區', '区域', '城市', '街道', '位置', '坐标',
                       '经度', '纬度', 'address', 'location', 'district',
                       'city', 'street', 'latitude', 'longitude', 'coord',
                       '區', '鄉', '鎮', '村', '路', '號', '巷', '弄', '樓']

    # 敏感信息关键词
    sensitive_keywords = ['姓名', '名称', '电话', '手机', 'phone', 'tel', 'name',
                         '身份证', 'id', '证件', '联系', 'contact', '邮箱', 'email']

    # 分析每列
    for col in df.columns:
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "non_null_count": int(df[col].notna().sum()),
            "null_count": int(df[col].isna().sum()),
            "null_percentage": float(df[col].isna().sum() / len(df) * 100),
            "is_address_related": False,
            "is_sensitive": False
        }

        # 检查是否是地址相关列
        col_str = str(col).lower()
        if any(keyword.lower() in col_str for keyword in address_keywords):
            col_info["is_address_related"] = True
            analysis["address_columns"].append(col)

        # 检查是否是敏感信息列
        if any(keyword.lower() in col_str for keyword in sensitive_keywords):
            col_info["is_sensitive"] = True

        analysis["columns"].append(col_info)

    # 获取示例数据（脱敏）
    sample_df = df.head(3).copy()
    for col in sample_df.columns:
        col_str = str(col).lower()
        if any(keyword.lower() in col_str for keyword in sensitive_keywords):
            sample_df[col] = sample_df[col].apply(
                lambda x: "[已脱敏]" if pd.notna(x) else x
            )

    analysis["sample_data"] = sample_df.to_dict('records')

    return analysis

def main():
    print("=" * 100)
    print("📊 TPHK Insurance Data Structure Inspector")
    print("   太平香港保险数据结构检查")
    print("=" * 100)

    base_path = Path(os.getenv("TPHK_DATA_DIR", "D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK"))

    # 查找所有Excel文件
    excel_files = list(base_path.glob("*.xlsx"))

    print(f"\n找到 {len(excel_files)} 个Excel文件:")
    for f in excel_files:
        print(f"  - {f.name}")

    # 筛选包含"巨災統計"的文件
    target_files = [f for f in excel_files if '巨災統計' in f.name]

    print(f"\n需要分析的文件 ({len(target_files)} 个):")
    for f in target_files:
        print(f"  - {f.name}")

    all_results = {}

    for filepath in target_files:
        print(f"\n{'='*100}")
        print(f"📁 分析文件: {filepath.name}")
        print(f"{'='*100}\n")

        if not filepath.exists():
            print(f"❌ 文件不存在: {filepath}")
            continue

        file_result = {
            "filename": filepath.name,
            "sheets": []
        }

        try:
            # 读取所有sheet名称
            xl_file = pd.ExcelFile(filepath)
            sheet_names = xl_file.sheet_names

            print(f"✅ 找到 {len(sheet_names)} 个sheets:")
            for i, sheet in enumerate(sheet_names, 1):
                print(f"   {i}. {sheet}")

            # 分析每个sheet
            for sheet_name in sheet_names:
                print(f"\n{'-'*100}")
                print(f"📋 Sheet: {sheet_name}")
                print(f"{'-'*100}")

                try:
                    # 读取sheet数据
                    df = pd.read_excel(filepath, sheet_name=sheet_name)

                    print(f"✅ 成功加载")
                    print(f"   数据行数: {len(df)}")
                    print(f"   列数: {len(df.columns)}")

                    # 分析sheet
                    sheet_analysis = analyze_sheet(df, sheet_name)
                    file_result["sheets"].append(sheet_analysis)

                    # 打印列信息
                    print(f"\n📋 列名 ({len(df.columns)} 列):")
                    for i, col_info in enumerate(sheet_analysis["columns"], 1):
                        tags = []
                        if col_info["is_address_related"]:
                            tags.append("🗺️ 地址相关")
                        if col_info["is_sensitive"]:
                            tags.append("🔒 敏感信息")

                        tag_str = " ".join(tags) if tags else ""
                        null_pct = col_info["null_percentage"]

                        print(f"   {i:2d}. {col_info['name']:<40s} {tag_str}")
                        if null_pct > 0:
                            print(f"       └─ 空值: {col_info['null_count']}/{len(df)} ({null_pct:.1f}%)")

                    # 显示地址相关列
                    if sheet_analysis["address_columns"]:
                        print(f"\n🗺️ 地址相关列 ({len(sheet_analysis['address_columns'])} 列):")
                        for col in sheet_analysis["address_columns"]:
                            non_null = df[col].notna().sum()
                            print(f"   - {col}")
                            print(f"     非空值: {non_null}/{len(df)} ({non_null/len(df)*100:.1f}%)")

                            # 显示一些示例值
                            sample_values = df[col].dropna().head(3).tolist()
                            if sample_values:
                                print(f"     示例值:")
                                for val in sample_values:
                                    val_str = str(val)[:60]  # 限制长度
                                    print(f"       • {val_str}")
                    else:
                        print("\n⚠️ 未发现明显的地址相关列")

                    # 显示示例数据
                    print(f"\n📊 示例数据 (前3行):")
                    print("-" * 100)
                    sample_df = pd.DataFrame(sheet_analysis["sample_data"])
                    if not sample_df.empty:
                        # 设置显示选项
                        pd.set_option('display.max_columns', None)
                        pd.set_option('display.max_colwidth', 30)
                        pd.set_option('display.width', None)
                        print(sample_df.to_string(index=True))
                    else:
                        print("   (空数据)")

                    # 数据类型摘要
                    print(f"\n📈 数据类型摘要:")
                    dtype_counts = df.dtypes.value_counts()
                    for dtype, count in dtype_counts.items():
                        print(f"   {dtype}: {count} 列")

                except Exception as e:
                    print(f"❌ 读取sheet '{sheet_name}' 时出错: {e}")
                    import traceback
                    traceback.print_exc()

            all_results[filepath.name] = file_result

        except Exception as e:
            print(f"❌ 读取文件时出错: {e}")
            import traceback
            traceback.print_exc()

    # 保存结果到JSON文件
    output_file = base_path / "tphk-data-analysis-result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)

    print("\n" + "=" * 100)
    print(f"✅ 分析完成！结果已保存到: {output_file}")
    print("=" * 100)

    # 打印摘要
    print("\n" + "=" * 100)
    print("📝 数据摘要")
    print("=" * 100)

    for filename, result in all_results.items():
        print(f"\n文件: {filename}")
        for sheet in result["sheets"]:
            print(f"  Sheet: {sheet['sheet_name']}")
            print(f"    - 数据行数: {sheet['row_count']}")
            print(f"    - 列数: {sheet['column_count']}")
            print(f"    - 地址相关列数: {len(sheet['address_columns'])}")
            if sheet['address_columns']:
                print(f"      地址列: {', '.join(sheet['address_columns'])}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ 严重错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
