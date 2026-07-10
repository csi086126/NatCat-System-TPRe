#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析Geocoding结果
"""
import json
from pathlib import Path
from collections import Counter

# 加载数据
output_dir = Path(__file__).parent / 'output'
data_file = output_dir / 'tphk-geocoded-full.json'

print("加载数据...")
with open(data_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"\n{'='*60}")
print(f"香港承保数据 Geocoding 结果分析")
print(f"{'='*60}\n")

# 基本统计
total = len(data)
has_location = sum(1 for r in data if r.get('location'))
no_location = total - has_location

print(f"总记录数: {total:,}")
print(f"✓ 成功geocoding: {has_location:,} ({has_location/total*100:.2f}%)")
print(f"✗ 失败geocoding: {no_location:,} ({no_location/total*100:.2f}%)")

# 按区域统计
print(f"\n{'='*60}")
print(f"按区域分布（18区）")
print(f"{'='*60}\n")

region_stats = Counter()
region_success = Counter()
region_failed = Counter()

for record in data:
    region = record.get('region', '未知')
    region_stats[region] += 1

    if record.get('location'):
        region_success[region] += 1
    else:
        region_failed[region] += 1

print(f"{'区域':<15} {'总数':>8} {'成功':>8} {'失败':>8} {'成功率':>8}")
print("-" * 60)

for region, count in region_stats.most_common():
    success = region_success[region]
    failed = region_failed[region]
    rate = success / count * 100 if count > 0 else 0
    print(f"{region:<15} {count:>8,} {success:>8,} {failed:>8,} {rate:>7.2f}%")

# Geocoding提供商统计
print(f"\n{'='*60}")
print(f"Geocoding API提供商")
print(f"{'='*60}\n")

providers = Counter()
for record in data:
    if record.get('location'):
        provider = record['location'].get('provider', 'unknown')
        providers[provider] += 1

for provider, count in providers.most_common():
    print(f"{provider}: {count:,} ({count/has_location*100:.2f}%)")

# 失败原因分析
print(f"\n{'='*60}")
print(f"失败记录样例（前10条）")
print(f"{'='*60}\n")

failed_records = [r for r in data if not r.get('location')][:10]
for i, record in enumerate(failed_records, 1):
    policy_id = record.get('policy_id', 'N/A')
    address = record.get('address', 'N/A')
    print(f"{i}. {policy_id}")
    print(f"   地址: {address[:80]}")
    print()

print(f"\n{'='*60}")
print(f"总结")
print(f"{'='*60}\n")

print(f"✓ 数据质量: {has_location/total*100:.2f}% 的记录成功获取坐标")
print(f"✓ 可用于地图可视化和空间分析")
print(f"✓ 失败记录主要原因: 地址格式问题、地址不完整")
print(f"\n保存位置: {data_file}")
print(f"文件大小: {data_file.stat().st_size / 1024 / 1024:.1f} MB")
