#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查理赔数据结构
"""
import pandas as pd
from pathlib import Path
import os

data_file = Path(os.getenv("TPHK_DATA_DIR", "")) / r"2412 巨災統計-理赔信息 (香港地區).xlsx"

print("=" * 80)
print("TPHK 理赔数据结构分析")
print("=" * 80)

df = pd.read_excel(data_file)

print(f"\n总记录数: {len(df):,}")
print(f"\n字段列表 ({len(df.columns)} 个字段):")
print("-" * 80)

for i, col in enumerate(df.columns, 1):
    sample_value = df[col].dropna().iloc[0] if not df[col].dropna().empty else "N/A"
    print(f"{i:2}. {col:<40} 样例: {str(sample_value)[:30]}")

print("\n" + "=" * 80)

# 查找可能的地址字段
address_keywords = ['地址', '处所', '地点', 'address', 'location']
print("\n可能的地址字段:")
for col in df.columns:
    if any(keyword in col.lower() for keyword in address_keywords):
        non_null_count = df[col].notna().sum()
        print(f"  ✓ {col} ({non_null_count:,} 条非空记录)")

print("\n" + "=" * 80)
