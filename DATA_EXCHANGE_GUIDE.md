# 事件数据导入导出完整指南

## 🔄 功能概览

灾害事件数据管理系统提供完整的数据交换功能，支持两种导出格式和一种导入格式：

| 功能 | 格式 | 用途 | 按钮位置 |
|------|------|------|----------|
| **Event Download** | JSON | 数据备份、分析、系统集成 | Actions卡片 |
| **Export Event Details** | PDF | 报告、演示、打印存档 | Event Details卡片 |
| **Event Upload** | JSON | 数据恢复、导入、共享 | Actions卡片 |

---

## 📤 导出功能详解

### 1. Event Download (JSON元数据)

#### 特点
- ✅ **完整性**: 包含所有事件属性
- ✅ **机器可读**: 标准JSON格式
- ✅ **可编辑**: 可直接修改数据
- ✅ **小文件**: 1-5KB

#### 使用场景
```
✓ 数据分析（Python/R/Excel）
✓ 数据备份和归档
✓ 系统集成和API对接
✓ 批量数据处理
✓ 数据库导入
```

#### 文件示例
```json
{
  "id": "T-2023-1",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "category": "historical",
  "exportDate": "2025-10-16T08:00:00.000Z"
}
```

### 2. Export Event Details (PDF报告)

#### 特点
- ✅ **可视化**: 包含地图截图
- ✅ **专业**: A4格式，适合打印
- ✅ **完整**: 事件详情+影响数据
- ✅ **不可编辑**: 保持数据完整性

#### 使用场景
```
✓ 会议报告和演示
✓ 监管机构提交
✓ 保险理赔文档
✓ 研究论文附件
✓ 长期存档
```

#### PDF内容
```
┌─────────────────────────────────┐
│  Event Details Report           │
│─────────────────────────────────│
│  事件信息:                      │
│  - 名称、类型、日期             │
│─────────────────────────────────│
│  [地图截图]                     │
│  卫星影像 + 事件标记            │
│─────────────────────────────────│
│  Impact Summary:                │
│  - 风速、降雨量                 │
│  - 损失金额、受影响人口         │
│─────────────────────────────────│
│  Affected Areas:                │
│  - 香港、广东、澳门             │
└─────────────────────────────────┘
```

---

## 📥 导入功能详解

### Event Upload (JSON导入)

#### 特点
- ✅ **快速**: 一键导入
- ✅ **智能**: 自动识别类别
- ✅ **安全**: 重复检测和确认
- ✅ **便捷**: 自动选中并显示

#### 使用场景
```
✓ 数据恢复（从备份导入）
✓ 团队数据共享
✓ 外部系统数据迁移
✓ 事件信息更新
✓ 批量导入（逐个上传）
```

#### 导入流程
```
选择JSON文件
    ↓
系统读取并解析
    ↓
验证必需字段
    ↓
检查是否重复
    ↓
[重复] → 询问是否覆盖
    ↓
[新事件] → 直接添加
    ↓
自动选中并显示在地图
    ↓
显示成功消息
```

---

## 🔄 完整工作流程

### 场景1: 数据备份与恢复

#### 备份流程
```bash
1. 选择要备份的事件
2. 点击 Event Download
3. 保存JSON文件到安全位置
   → 文件名: Event_Metadata_T-2023-1_2023-09-16.json
4. 定期重复（建议每周备份）
```

#### 恢复流程
```bash
1. 找到备份的JSON文件
2. 点击 Event Upload
3. 选择JSON文件
4. 确认导入
5. 数据恢复完成
```

### 场景2: 团队协作

#### 成员A（数据提供者）
```bash
1. 筛选并选择事件
2. 点击 Event Download
3. 通过邮件/云盘发送JSON文件
```

#### 成员B（数据接收者）
```bash
1. 下载收到的JSON文件
2. 点击 Event Upload
3. 选择文件导入
4. 查看和分析事件
```

### 场景3: 报告生成

#### 内部分析（JSON）
```bash
1. 下载事件元数据
2. 导入Python/R进行分析
3. 生成图表和统计结果
```

#### 外部提交（PDF）
```bash
1. 选择要报告的事件
2. 点击 Export Event Details
3. 获得专业PDF报告
4. 提交给相关部门
```

### 场景4: 数据更新

```bash
1. 下载现有事件（Event Download）
2. 修改JSON文件中的数据
   例如: 更新损失金额
   {
     "estimatedLoss": "$7.5 Billion"  // 从$6.27B更新
   }
3. 重新上传（Event Upload）
4. 选择覆盖现有事件
5. 数据更新完成
```

---

## 📊 功能对比表

| 特性 | Event Download | Export Details | Event Upload |
|------|---------------|----------------|--------------|
| **格式** | JSON | PDF | JSON |
| **方向** | 导出 | 导出 | 导入 |
| **文件大小** | 1-5KB | 200KB-1MB | 1-5KB |
| **包含地图** | ❌ | ✅ | ❌ |
| **可编辑** | ✅ | ❌ | ✅ |
| **机器可读** | ✅ | ❌ | ✅ |
| **适合打印** | ❌ | ✅ | ❌ |
| **批量处理** | 未来支持 | ❌ | 未来支持 |
| **数据完整性** | 100% | 视觉化 | 100% |

---

## 🎯 使用建议

### 日常工作
```
每日: 无需特别操作
每周: 备份重要事件（Event Download）
每月: 生成月度PDF报告汇总
年度: 全量备份所有事件
```

### 项目协作
```
项目启动: 导入基础事件数据
进行中: 使用JSON格式交换数据
项目结束: 生成PDF报告归档
```

### 数据分析
```
1. 下载所需事件的JSON文件
2. 使用Python/R进行分析
3. 生成可视化图表
4. 如需报告，导出PDF版本
```

### 系统维护
```
定期备份: 每周全量导出
版本控制: 使用Git管理JSON文件
灾难恢复: 从备份批量导入
数据迁移: JSON格式无缝迁移
```

---

## 💡 高级技巧

### 1. 批量备份脚本（未来功能预览）

```javascript
// 导出所有历史事件
const exportAllHistoricalEvents = () => {
  const allEvents = historicalEvents.map(event => ({
    ...event,
    category: 'historical',
    exportDate: new Date().toISOString()
  }));
  
  const jsonString = JSON.stringify(allEvents, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `All_Historical_Events_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### 2. Python批量导入脚本

```python
import json
import os
from pathlib import Path

def batch_import_events(folder_path):
    """批量导入文件夹中的所有JSON事件文件"""
    events = []
    
    for file_path in Path(folder_path).glob('*.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            event = json.load(f)
            events.append(event)
            print(f"Loaded: {event['name']}")
    
    print(f"\nTotal events loaded: {len(events)}")
    return events

# 使用示例
events = batch_import_events('./event_backups/')
```

### 3. Excel数据转换

```python
import pandas as pd
import json

# 从Excel创建JSON
df = pd.read_excel('events.xlsx')

for _, row in df.iterrows():
    event = {
        "id": row['ID'],
        "name": row['Name'],
        "type": row['Type'],
        "date": row['Date'].strftime('%Y-%m-%d'),
        "year": int(row['Year']),
        "impactArea": {
            "level1": row['Region'],
            "level2": row['Area'],
            "level3": row['District']
        },
        "maxWindSpeed": row['Wind Speed'],
        "totalRainfall": row['Rainfall'],
        "estimatedLoss": row['Loss'],
        "affectedPopulation": row['Population'],
        "geometry": {
            "type": "Point",
            "coordinates": [float(row['Longitude']), float(row['Latitude'])]
        },
        "category": row['Category']
    }
    
    with open(f"event_{row['ID']}.json", 'w', encoding='utf-8') as f:
        json.dump(event, f, indent=2, ensure_ascii=False)
```

### 4. 数据验证脚本

```python
def validate_event_json(file_path):
    """验证事件JSON文件的完整性"""
    required_fields = ['id', 'name', 'type']
    
    with open(file_path, 'r', encoding='utf-8') as f:
        event = json.load(f)
    
    # 检查必需字段
    for field in required_fields:
        if field not in event:
            return False, f"Missing required field: {field}"
    
    # 检查ID格式
    if not event['id'].count('-') == 2:
        return False, "Invalid ID format (should be Peril-Year-No.)"
    
    # 检查坐标
    if 'geometry' in event:
        coords = event['geometry']['coordinates']
        if not (-180 <= coords[0] <= 180 and -90 <= coords[1] <= 90):
            return False, "Invalid coordinates"
    
    return True, "Valid"

# 使用示例
is_valid, message = validate_event_json('event_T-2023-1.json')
print(f"Validation: {message}")
```

---

## 🔒 安全与隐私

### 数据安全建议
```
✓ 只导入可信来源的JSON文件
✓ 重要操作前先备份
✓ 定期检查数据完整性
✓ 敏感数据脱敏处理
✓ 使用加密云存储备份
```

### 文件管理建议
```
✓ 使用描述性文件名
✓ 按日期组织文件夹
✓ 保留版本历史
✓ 定期清理旧备份
✓ 云端+本地双重备份
```

---

## 📞 常见问题汇总

### Q: 导出的JSON和PDF有什么区别？
A: 
- **JSON**: 原始数据，可编辑，用于分析和系统集成
- **PDF**: 可视化报告，包含地图，用于演示和存档

### Q: 可以批量导入/导出吗？
A: 目前单个操作，批量功能计划在未来版本实现。

### Q: 数据会保存到服务器吗？
A: 目前仅浏览器内存，刷新后消失。持久化存储将在未来实现。

### Q: 支持其他格式吗（CSV、Excel）？
A: 计划支持，目前可以通过脚本转换。

### Q: 如何确保数据不丢失？
A: 
1. 定期使用Event Download备份
2. 云端存储备份文件
3. 使用版本控制系统（Git）

---

## 🚀 未来功能规划

### 短期（1-3个月）
- [ ] 批量导出所有事件
- [ ] 批量导入（数组格式）
- [ ] CSV格式支持
- [ ] 导入预览功能

### 中期（3-6个月）
- [ ] Excel格式支持
- [ ] 数据验证增强
- [ ] 云端存储集成
- [ ] 版本历史追踪

### 长期（6-12个月）
- [ ] API接口导入导出
- [ ] 自动备份定时任务
- [ ] 数据同步功能
- [ ] 协作编辑支持

---

## 📚 相关文档

- [EVENT_DOWNLOAD_GUIDE.md](./EVENT_DOWNLOAD_GUIDE.md) - JSON元数据下载详细说明
- [EVENT_UPLOAD_GUIDE.md](./EVENT_UPLOAD_GUIDE.md) - JSON文件导入详细说明
- [EVENT_EXPORT_GUIDE.md](./EVENT_EXPORT_GUIDE.md) - PDF报告导出详细说明
- [DISASTER_FILTERING_GUIDE.md](./DISASTER_FILTERING_GUIDE.md) - 事件筛选系统说明
- [AREA_STRUCTURE_GUIDE.md](./AREA_STRUCTURE_GUIDE.md) - 区域结构说明

---

**版本**: 1.0  
**更新日期**: 2025-10-16  
**作者**: GitHub Copilot  
**系统**: Flood Catastrophe Insurance System
