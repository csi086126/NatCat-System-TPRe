import pandas as pd
from pathlib import Path
import glob

base_path = "D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK"

# 查找Excel文件
excel_pattern = str(Path(base_path) / "*.xlsx")
excel_files = glob.glob(excel_pattern)

print("="*100)
print("TPHK Insurance Data Quick Inspection")
print("="*100)

print(f"\nFound {len(excel_files)} Excel files in {base_path}")
for f in excel_files:
    print(f"  - {Path(f).name}")

# 筛选包含巨災統計的文件
target_files = [f for f in excel_files if '巨災統計' in Path(f).name]

print(f"\nAnalyzing {len(target_files)} files...")

for filepath in target_files:
    filename = Path(filepath).name
    print("\n" + "="*100)
    print(f"File: {filename}")
    print("="*100)

    try:
        # 先读取sheet名称
        xl_file = pd.ExcelFile(filepath)
        sheets = xl_file.sheet_names

        print(f"\nSheets ({len(sheets)} total):")
        for i, sheet in enumerate(sheets, 1):
            print(f"  {i}. {sheet}")

        # 读取每个sheet
        for sheet_name in sheets:
            print(f"\n{'-'*100}")
            print(f"Sheet: {sheet_name}")
            print(f"{'-'*100}")

            try:
                # 读取前5行
                df = pd.read_excel(filepath, sheet_name=sheet_name, nrows=5)

                total_rows_df = pd.read_excel(filepath, sheet_name=sheet_name)
                total_rows = len(total_rows_df)

                print(f"\nTotal rows: {total_rows}")
                print(f"Total columns: {len(df.columns)}")

                print(f"\nColumns ({len(df.columns)} total):")
                address_keywords = ['地址', '地區', '區', '路', '號', 'address', 'location', 'district']

                for i, col in enumerate(df.columns, 1):
                    is_address = any(kw in str(col) for kw in address_keywords)
                    marker = " [ADDRESS RELATED]" if is_address else ""
                    print(f"  {i}. {col}{marker}")

                print(f"\nFirst 3 rows:")
                print(df.head(3).to_string())

            except Exception as e:
                print(f"Error reading sheet '{sheet_name}': {e}")

    except Exception as e:
        print(f"Error reading file '{filename}': {e}")

print("\n" + "="*100)
print("Inspection complete!")
print("="*100)
