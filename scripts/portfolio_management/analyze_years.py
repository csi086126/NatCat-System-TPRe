"""
分析已geocoded的TPHK数据的年份分布
"""
import json
from collections import Counter
from datetime import datetime
import sys
import io

# Set UTF-8 encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load the geocoded data
print("Loading geocoded data...")
with open('output/tphk-geocoded-full.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total records: {len(data):,}')
print()

# Geocoding success rate
success_count = sum(1 for r in data if r.get('location') and r['location'].get('lat'))
print(f'Geocoding success: {success_count:,}/{len(data):,} ({success_count/len(data)*100:.1f}%)')
print()

# Extract policy years
policy_years = []
event_years = []
policy_year_month = []

for record in data:
    # Policy start date
    policy_start = record.get('保單起期') or record.get('policy_start')
    if policy_start:
        try:
            dt = datetime.strptime(str(policy_start)[:10], '%Y-%m-%d')
            policy_years.append(dt.year)
            policy_year_month.append(f"{dt.year}-{dt.month:02d}")
        except:
            pass

    # Event date (loss start date)
    loss_start = record.get('LOSSSTARTDATE')
    if loss_start:
        try:
            dt = datetime.strptime(str(loss_start)[:10], '%Y-%m-%d')
            event_years.append(dt.year)
        except:
            pass

# Policy year distribution
print("=" * 60)
print("保單起期年份分布 (Policy Start Year Distribution)")
print("=" * 60)
year_counts = Counter(policy_years)
for year in sorted(year_counts.keys()):
    count = year_counts[year]
    pct = count / len(policy_years) * 100
    bar = '█' * int(pct / 2)
    print(f"{year}: {count:>7,} ({pct:>5.1f}%) {bar}")

print()
print(f"Total policies with dates: {len(policy_years):,}")
print()

# Event year distribution
print("=" * 60)
print("巨灾事件年份分布 (Event Year Distribution)")
print("=" * 60)
event_counts = Counter(event_years)
for year in sorted(event_counts.keys()):
    count = event_counts[year]
    pct = count / len(event_years) * 100
    bar = '█' * int(pct / 2)
    print(f"{year}: {count:>7,} ({pct:>5.1f}%) {bar}")

print()

# Check for complete 2023-2024 data
print("=" * 60)
print("2023-2024年度数据完整性检查")
print("=" * 60)

# Policy data
policies_2023 = year_counts.get(2023, 0)
policies_2024 = year_counts.get(2024, 0)

print(f"2023年保单: {policies_2023:,} 条")
print(f"2024年保单: {policies_2024:,} 条")
print()

# Check month coverage for 2023-2024
months_2023 = [m for m in policy_year_month if m.startswith('2023')]
months_2024 = [m for m in policy_year_month if m.startswith('2024')]

unique_months_2023 = sorted(set(months_2023))
unique_months_2024 = sorted(set(months_2024))

print("2023年月份覆盖:")
print(', '.join(unique_months_2023))
print()

print("2024年月份覆盖:")
print(', '.join(unique_months_2024))
print()

# Events
events_2023 = event_counts.get(2023, 0)
events_2024 = event_counts.get(2024, 0)

print(f"2023年巨灾事件记录: {events_2023:,} 条")
print(f"2024年巨灾事件记录: {events_2024:,} 条")
print()

# Sample some 2024 policies
print("=" * 60)
print("2024年样本数据")
print("=" * 60)
sample_2024 = [r for r in data if r.get('保單起期', '').startswith('2024')][:5]
for i, record in enumerate(sample_2024, 1):
    print(f"\n样本 {i}:")
    print(f"  保单号: {record.get('保單號', 'N/A')}")
    print(f"  保单起期: {record.get('保單起期', 'N/A')}")
    print(f"  保单止期: {record.get('保單止期', 'N/A')}")
    print(f"  地址: {record.get('保險處所', 'N/A')[:50]}...")
    print(f"  区域: {record.get('分區', 'N/A')}")
    print(f"  保额: HKD {record.get('公司保額', 0):,.2f}")
    if record.get('location'):
        print(f"  坐标: ({record['location']['lat']}, {record['location']['lng']})")
    else:
        print(f"  坐标: 未geocoded")

print()
print("=" * 60)
print("结论")
print("=" * 60)

if policies_2023 > 0 and policies_2024 > 0:
    print("✓ 数据包含2023和2024年的保单")
    print(f"✓ 已geocoded成功率: {success_count/len(data)*100:.1f}%")
    print()
    print("可以基于现有数据开发后续功能:")
    print("  1. 区域风险聚合统计")
    print("  2. 保额空间分布热力图")
    print("  3. 18区/3大区暴露度分析")
    print("  4. 时间序列趋势分析")
else:
    print("⚠ 数据可能不完整，建议检查数据源")
