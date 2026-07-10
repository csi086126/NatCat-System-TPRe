import pandas as pd
from pathlib import Path

base_path = Path("D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK")

# File 1
file1 = "2412 巨災統計-承保信息 (香港地區).xlsx"
filepath1 = base_path / file1

print("File 1:", file1)
if filepath1.exists():
    xl = pd.ExcelFile(filepath1)
    print(f"Sheets: {xl.sheet_names}")
    for sheet in xl.sheet_names:
        df = pd.read_excel(filepath1, sheet_name=sheet, nrows=0)
        print(f"  {sheet}: {list(df.columns)}")
else:
    print("NOT FOUND")

print("\n" + "="*80 + "\n")

# File 2
file2 = "2412 巨災統計-理赔信息 (香港地區).xlsx"
filepath2 = base_path / file2

print("File 2:", file2)
if filepath2.exists():
    xl = pd.ExcelFile(filepath2)
    print(f"Sheets: {xl.sheet_names}")
    for sheet in xl.sheet_names:
        df = pd.read_excel(filepath2, sheet_name=sheet, nrows=0)
        print(f"  {sheet}: {list(df.columns)}")
else:
    print("NOT FOUND")
