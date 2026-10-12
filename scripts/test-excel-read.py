"""
Quick test to verify pandas and openpyxl can read the Excel files
"""
import os
import pandas as pd
import json
from pathlib import Path

# Test file paths
insurance_dir = os.getenv("INSURANCE_DATA_DIR", "D:/web-flood-insurance-model/Data/Insurance_data")
policies_file = Path(insurance_dir) / "承保信息.xlsx"
claims_file = Path(insurance_dir) / "理賠信息(巨災).xlsx"

result = {
    "policies_file_exists": policies_file.exists(),
    "claims_file_exists": claims_file.exists(),
    "policies_columns": [],
    "claims_columns": [],
    "policies_sample": [],
    "claims_sample": [],
    "error": None
}

try:
    if policies_file.exists():
        df_policies = pd.read_excel(policies_file, nrows=3)
        result["policies_columns"] = list(df_policies.columns)
        result["policies_sample"] = df_policies.to_dict('records')
        result["policies_row_count"] = len(df_policies)
    
    if claims_file.exists():
        df_claims = pd.read_excel(claims_file, nrows=3)
        result["claims_columns"] = list(df_claims.columns)
        result["claims_sample"] = df_claims.to_dict('records')
        result["claims_row_count"] = len(df_claims)
        
except Exception as e:
    result["error"] = str(e)

# Write to JSON file so we can read it
output_file = Path("scripts/insurance-data-inspection-result.json")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2, default=str)

print(f"Results saved to: {output_file}")
print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
