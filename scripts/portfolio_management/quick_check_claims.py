import pandas as pd

# 读取理赔数据
df = pd.read_excel(r"D:\Nat Cat Platform\Data\Insurance_data_Taiping\TPHK\2412 巨災統計-理赔信息 (香港地區).xlsx")

print(f"总记录数: {len(df)}")
print(f"\n字段列表:")
for i, col in enumerate(df.columns, 1):
    print(f"{i}. {col}")

# 查找地址字段
print(f"\n查找地址相关字段:")
for col in df.columns:
    if any(k in col for k in ['地址', '处所', '地点', 'address', 'Address']):
        print(f"  → {col}: {df[col].notna().sum()} 条非空")
