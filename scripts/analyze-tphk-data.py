import os
import pandas as pd
import json
import sys
from pathlib import Path

# 文件路径
policy_file = Path(os.getenv("TPHK_DATA_DIR", "")) / "2412 巨災統計-承保信息 (香港地區).xlsx"
claim_file = Path(os.getenv("TPHK_DATA_DIR", "")) / "2412 巨災統計-理赔信息 (香港地區).xlsx"

print("="*60)
print("TPHK 数据结构分析")
print("="*60)

# 1. 承保信息分析
print("\n📋 1. 承保信息 (Policy Data)")
print("-"*60)

xls_policy = pd.ExcelFile(policy_file)
print(f"包含 {len(xls_policy.sheet_names)} 个sheets:")
for i, sheet in enumerate(xls_policy.sheet_names, 1):
    print(f"  {i}. {sheet}")

# 读取第一个sheet
df_policy = pd.read_excel(policy_file, sheet_name=xls_policy.sheet_names[0])
print(f"\n使用Sheet: {xls_policy.sheet_names[0]}")
print(f"总记录数: {len(df_policy):,} 行")

print(f"\n字段列表 ({len(df_policy.columns)} 列):")
for col in df_policy.columns:
    print(f"  - {col}")

# 关键字段统计
print(f"\n📊 关键字段统计:")
print(f"\n公司保額 (Sum Insured):")
print(df_policy['公司保額'].describe())

print(f"\n分區 (District) 分布:")
print(df_policy['分區'].value_counts().head(10))

print(f"\n佔用性質 (Occupancy) 分布:")
print(df_policy['佔用性質'].value_counts().head(10))

# 2. 理赔信息分析
print("\n\n📋 2. 理赔信息 (Claim Data)")
print("-"*60)

df_claim = pd.read_excel(claim_file)
print(f"总记录数: {len(df_claim):,} 行")

print(f"\n字段列表 ({len(df_claim.columns)} 列):")
for col in df_claim.columns:
    print(f"  - {col}")

print(f"\n📊 关键字段统计:")
print(f"\n已决赔款HKD (Paid Claims):")
print(df_claim['已決賠款HKD'].describe())

print(f"\n分區 (District) 分布:")
print(df_claim['分區'].value_counts())

# 3. 数据完整性检查
print("\n\n📋 3. 数据质量检查")
print("-"*60)

print(f"\n承保数据:")
print(f"  - 有效保额记录: {(df_policy['公司保額'] > 0).sum():,} / {len(df_policy):,} ({(df_policy['公司保額'] > 0).sum()/len(df_policy)*100:.1f}%)")
print(f"  - 有地址记录: {df_policy['保險處所'].notna().sum():,} / {len(df_policy):,} ({df_policy['保險處所'].notna().sum()/len(df_policy)*100:.1f}%)")
print(f"  - 有分区记录: {df_policy['分區'].notna().sum():,} / {len(df_policy):,} ({df_policy['分區'].notna().sum()/len(df_policy)*100:.1f}%)")

print(f"\n理赔数据:")
print(f"  - 有赔款记录: {(df_claim['已決賠款HKD'] > 0).sum():,} / {len(df_claim):,} ({(df_claim['已決賠款HKD'] > 0).sum()/len(df_claim)*100:.1f}%)")
print(f"  - 有地址记录: {df_claim['出險地點'].notna().sum():,} / {len(df_claim):,} ({df_claim['出險地點'].notna().sum()/len(df_claim)*100:.1f}%)")

# 4. 推荐的数据利用方案
print("\n\n📋 4. 数据利用建议")
print("-"*60)

print("""
✅ Portfolio Management 可以利用的核心字段:

【承保数据 - Exposure Management】
1. 风险累积 (Accumulation):
   - 分區: 按香港18区聚合保额
   - 公司保額: TSI (Total Sum Insured)
   - 保險處所: 地址geocoding
   - 佔用性質: 按occupancy type分类

2. 业务分析 (Business Analytics):
   - 險種名稱: 按险种分类
   - 建築等級: 风险等级评估
   - 樓層數: 高层建筑识别
   - 建造年份: 老旧建筑风险

3. 承保容量 (Capacity Management):
   - 承保地區範圍名稱: 区域限额控制
   - 共保前總保險金額: Gross exposure
   - 承保份額: Net exposure计算

【理赔数据 - Loss Analysis】
1. 历史损失 (Historical Losses):
   - 已決賠款HKD: 实际赔付金额
   - 出險地點: 高损失区域识别
   - 巨災名稱: 按事件统计损失

2. 风险识别 (Risk Identification):
   - 水浸深度: 洪水风险评估
   - 出險原因描述: 灾因分析
   - 分區: 高风险区域

3. 赔付率 (Loss Ratio):
   - 结合承保保费和理赔金额计算loss ratio
""")

print("\n📊 推荐实施步骤:")
print("""
Step 1: 数据预处理
  - Geocode所有'保險處所'和'出險地點'地址
  - 清洗和标准化'分區'字段
  - 处理缺失的'公司保額'数据

Step 2: Zone Accumulation
  - 按'分區'聚合'公司保額'
  - 计算每个区的policy count、avg TSI
  - 可视化在地图上

Step 3: Limit Monitoring
  - 为每个'分區'设置capacity limit
  - 实时监控utilization
  - 设置预警阈值

Step 4: Loss History Integration
  - 将理赔数据overlay到承保数据上
  - 计算各区的historical loss ratio
  - 识别高风险区域
""")

print("\n" + "="*60)
print("分析完成！")
print("="*60)
