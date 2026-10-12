"""
测试Excel文件读取 - 简化版本
"""
import sys
print("Python version:", sys.version)
print("Current working directory:", sys.path)

try:
    import os
    from pathlib import Path
    import pandas as pd
    print("✓ pandas imported successfully")
    print(f"  pandas version: {pd.__version__}")
except ImportError as e:
    print(f"✗ Failed to import pandas: {e}")
    sys.exit(1)

try:
    import openpyxl
    print("✓ openpyxl imported successfully")
    print(f"  openpyxl version: {openpyxl.__version__}")
except ImportError as e:
    print(f"✗ Failed to import openpyxl: {e}")
    sys.exit(1)

from pathlib import Path

# File paths
policies_file = Path(r"D:\web-flood-insurance-model\Data\Insurance_data\承保信息.xlsx")
claims_file = Path(r"D:\web-flood-insurance-model\Data\Insurance_data\理賠信息(巨災).xlsx")

print(f"\nChecking files:")
print(f"  Policies file exists: {policies_file.exists()}")
print(f"  Claims file exists: {claims_file.exists()}")

if not policies_file.exists():
    print(f"\n✗ Policies file not found at: {policies_file}")
    sys.exit(1)

if not claims_file.exists():
    print(f"\n✗ Claims file not found at: {claims_file}")
    sys.exit(1)

# Try reading policies
print(f"\n{'='*80}")
print("Reading 承保信息.xlsx...")
print('='*80)
try:
    df_policies = pd.read_excel(policies_file, nrows=2)
    print(f"✓ Successfully read {len(df_policies)} rows")
    print(f"✓ Total columns: {len(df_policies.columns)}")
    print(f"\nColumn names ({len(df_policies.columns)} total):")
    for i, col in enumerate(df_policies.columns, 1):
        print(f"  {i:2d}. {col}")
except Exception as e:
    print(f"✗ Error reading policies file: {e}")
    import traceback
    traceback.print_exc()

# Try reading claims
print(f"\n{'='*80}")
print("Reading 理賠信息(巨災).xlsx...")
print('='*80)
try:
    df_claims = pd.read_excel(claims_file, nrows=2)
    print(f"✓ Successfully read {len(df_claims)} rows")
    print(f"✓ Total columns: {len(df_claims.columns)}")
    print(f"\nColumn names ({len(df_claims.columns)} total):")
    for i, col in enumerate(df_claims.columns, 1):
        print(f"  {i:2d}. {col}")
except Exception as e:
    print(f"✗ Error reading claims file: {e}")
    import traceback
    traceback.print_exc()

print(f"\n{'='*80}")
print("✓ Test complete")
print('='*80)
