import sys
import os
print("Python version:", sys.version)
print("Python executable:", sys.executable)

try:
    import pandas as pd
    print("pandas version:", pd.__version__)
    pandas_available = True
except ImportError as e:
    print("pandas NOT available:", e)
    pandas_available = False

try:
    import openpyxl
    print("openpyxl available")
except ImportError:
    print("openpyxl NOT available")

if pandas_available:
    from pathlib import Path
    base_path = Path(os.getenv("TPHK_DATA_DIR", "D:/Nat Cat Platform/Data/Insurance_data_Taiping/TPHK"))
    excel_files = list(base_path.glob("*.xlsx"))
    print(f"\nFound {len(excel_files)} Excel files:")
    for f in excel_files:
        print(f"  - {f.name}")
