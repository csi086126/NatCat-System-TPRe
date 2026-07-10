# 澳门保险数据 - 手动检查指南

由于终端输出问题，请按以下步骤手动检查Excel文件结构：

## 步骤1: 打开Excel文件查看列名

### 文件1: 承保信息.xlsx
**位置:** `D:\web-flood-insurance-model\Data\Insurance_data\承保信息.xlsx`

**请在Excel中打开，并记录前10列的列名：**

常见的承保信息列名可能包括：
- `保单号` / `PolicyNo` / `Policy_Number` / `保險單號`
- `地址` / `Address` / `风险地址` / `風險地址` / `Location`  
- `保额` / `InsuredAmount` / `Sum_Insured` / `保險金額`
- `保费` / `Premium` / `保險費`
- `险种` / `CoverageType` / `險種`
- `承保日期` / `PolicyDate` / `Start_Date`
- `被保险人` / `Insured_Name` / `被保險人`
- `行政区` / `District` / `區域`
- `建筑类型` / `BuildingType` / `建築類型`
- `楼层` / `Floor` / `樓層`

### 文件2: 理賠信息(巨災).xlsx
**位置:** `D:\web-flood-insurance-model\Data\Insurance_data\理賠信息(巨災).xlsx`

**请在Excel中打开，并记录前10列的列名：**

常见的理赔信息列名可能包括：
- `理赔号` / `ClaimNo` / `Claim_Number` / `理賠編號`
- `保单号` / `PolicyNo` / `Policy_Number` / `保險單號` (用于关联承保信息)
- `事件名称` / `EventName` / `Typhoon_Name` / `Event` / `事件`
- `赔付金额` / `ClaimAmount` / `Paid_Amount` / `賠付金額`
- `损失金额` / `LossAmount` / `Loss` / `損失金額`
- `理赔日期` / `ClaimDate` / `Payment_Date` / `理賠日期`
- `损失类型` / `LossType` / `損失類型`
- `受损程度` / `Damage_Level` / `受損程度`
- `地址` / `Address` / `Location` / `地址`

---

## 步骤2: 修改解析脚本

找到实际的列名后，修改 `scripts/parse-macau-insurance-data.py` 文件：

### 修改位置1: 第75-85行（承保信息列名映射）

```python
# 当前代码（需要根据实际列名修改）：
policy_id = policy.get('保单号') or policy.get('PolicyNo') or f"POL-{idx}"
address = policy.get('地址') or policy.get('Address') or policy.get('风险地址')

# 修改示例（如果实际列名是"保險單號"和"風險地址"）：
policy_id = policy.get('保險單號') or policy.get('保单号') or f"POL-{idx}"
address = policy.get('風險地址') or policy.get('地址') or policy.get('Address')
```

### 修改位置2: 第90-95行（理赔信息列名映射）

```python
# 当前代码（需要根据实际列名修改）：
related_claims = claims_df[claims_df['保单号'] == policy_id]
total_claim_amount = related_claims['赔付金额'].sum()

# 修改示例（如果实际列名是"保險單號"和"賠付金額"）：
related_claims = claims_df[claims_df['保險單號'] == policy_id]
total_claim_amount = related_claims['賠付金額'].sum()
```

---

## 步骤3: 常见列名对照表

| 中文（简体） | 中文（繁体） | 英文 | 可能的变体 |
|------------|------------|------|-----------|
| 保单号 | 保險單號 | PolicyNo | Policy_Number, PolicyID, 保單編號 |
| 地址 | 地址 | Address | Location, Risk_Address, 风险地址, 風險地址 |
| 保额 | 保險金額 | InsuredAmount | Sum_Insured, Coverage_Amount, 保險額 |
| 赔付金额 | 賠付金額 | ClaimAmount | Paid_Amount, Payment, 理賠金額 |
| 事件名称 | 事件名稱 | EventName | Typhoon_Name, Event, Disaster_Name |

---

## 步骤4: 快速检查方法

### 方法A: 在Excel中直接查看
1. 打开Excel文件
2. 查看第一行（通常是列名）
3. 将列名复制到记事本
4. 对照上面的常见列名找到匹配项

### 方法B: 使用Excel的"数据透视表"功能
1. 打开Excel → 数据 → 数据透视表
2. 可以看到所有字段列表

### 方法C: 另存为CSV后用文本编辑器查看
1. Excel → 文件 → 另存为 → CSV格式
2. 用VS Code打开CSV文件
3. 第一行就是列名

---

## 步骤5: 示例修改模板

找到列名后，填写以下信息：

```
【承保信息.xlsx 列名】
保单号列: _______________________
地址列: _______________________  
保额列: _______________________
其他重要列: _______________________

【理賠信息(巨災).xlsx 列名】
理赔号列: _______________________
保单号列: _______________________
赔付金额列: _______________________
事件名称列: _______________________
其他重要列: _______________________
```

然后我可以帮你更新脚本。

---

## 临时解决方案：跳过保险数据解析

如果现在无法确定列名，可以先完成TIF图层和事件数据的集成，保险数据部分可以稍后补充。

### 快速启动（不包含保险数据）：

1. **直接更新前端代码**，仅显示TIF洪涝图层和事件基本信息
2. **跳过 `parse-macau-insurance-data.py` 的运行**
3. **手动创建一个简化的事件汇总JSON**（不包含详细保单数据）

示例简化JSON：
```json
{
  "Hato": {
    "totalClaims": "待补充",
    "totalClaimAmount": "约 $1.65 Billion",
    "note": "保险数据待解析"
  }
}
```

---

## 需要的下一步行动

1. **手动打开两个Excel文件，记录实际的列名**
2. **将列名告诉我，我来更新脚本**
3. **或者选择先跳过保险数据，完成TIF图层集成**

请告诉我你想采取哪种方式？
