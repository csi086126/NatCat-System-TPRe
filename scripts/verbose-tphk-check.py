import sys
import os
from pathlib import Path

print("Starting TPHK data inspection...")
print(f"Python: {sys.version}")
print(f"Executable: {sys.executable}")
print(f"CWD: {os.getcwd()}")
print()

base_path = Path("D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK")
print(f"Base path: {base_path}")
print(f"Exists: {base_path.exists()}")
print()

if base_path.exists():
    files = list(base_path.glob("*.xlsx"))
    print(f"Excel files found: {len(files)}")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")
    print()

print("Attempting to import pandas...")
try:
    import pandas as pd
    print(f"Success! pandas version: {pd.__version__}")
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

print()
print("="*80)
print()

# Try to read files
try:
    file1_path = base_path / "2412 巨災統計-承保信息 (香港地區).xlsx"
    print(f"Reading: {file1_path.name}")

    if not file1_path.exists():
        print(f"ERROR: File not found at {file1_path}")
    else:
        xl = pd.ExcelFile(file1_path)
        sheets = xl.sheet_names
        print(f"Sheets: {sheets}")

        for sheet_name in sheets:
            print(f"\nSheet: {sheet_name}")
            df = pd.read_excel(file1_path, sheet_name=sheet_name)
            print(f"  Rows: {len(df)}")
            print(f"  Columns: {len(df.columns)}")
            print(f"  Column names: {list(df.columns)}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print()
print("="*80)
print()

try:
    file2_path = base_path / "2412 巨災統計-理赔信息 (香港地區).xlsx"
    print(f"Reading: {file2_path.name}")

    if not file2_path.exists():
        print(f"ERROR: File not found at {file2_path}")
    else:
        xl = pd.ExcelFile(file2_path)
        sheets = xl.sheet_names
        print(f"Sheets: {sheets}")

        for sheet_name in sheets:
            print(f"\nSheet: {sheet_name}")
            df = pd.read_excel(file2_path, sheet_name=sheet_name)
            print(f"  Rows: {len(df)}")
            print(f"  Columns: {len(df.columns)}")
            print(f"  Column names: {list(df.columns)}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print()
print("Inspection complete!")
