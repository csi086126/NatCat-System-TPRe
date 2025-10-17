# Event Upload 功能说明

## 📤 功能概述

Event Upload功能允许用户导入之前下载的JSON元数据文件，将灾害事件添加到系统中。这是Event Download的配套功能，完成了数据的双向流通。

## 🎯 使用方法

### 1. 准备JSON文件
```
确保你有一个有效的事件元数据JSON文件：
- 可以是之前通过Event Download下载的文件
- 也可以是手动创建的符合格式的JSON文件
```

### 2. 上传事件
```
在左侧Actions卡片中：
1. 点击 "Event Upload" 按钮
2. 在文件选择对话框中选择JSON文件
3. 系统自动解析并导入事件
4. 成功后会显示确认消息
```

### 3. 查看导入的事件
```
- 系统会自动切换到对应的事件类别（Historical或Stochastic）
- 自动选中刚导入的事件
- 地图自动定位到事件位置
- 右侧显示完整的事件详情
```

## 📄 支持的文件格式

### 概览

系统现在支持多种数据格式：

| 格式 | 扩展名 | 状态 | 说明 |
|------|--------|------|------|
| JSON | .json, .geojson | ✅ 完全支持 | 事件元数据 |
| TIFF | .tif, .tiff | ✅ 基础支持 | 栅格数据（洪水深度图、DEM等） |
| Binary | .bin, .dat | ✅ 基础支持 | 二进制数据（模型输出） |
| Shapefile | .shp | 🔄 部分支持 | 建议转换为GeoJSON |
| KML | .kml | 🔄 部分支持 | 建议转换为GeoJSON |

详细的多格式上传指南请查看：[MULTI_FORMAT_UPLOAD_GUIDE.md](./MULTI_FORMAT_UPLOAD_GUIDE.md)

---

## 📄 JSON格式详解

### 标准事件元数据格式
```json
{
  "id": "T-2023-1",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "impactArea": {
    "level1": "Hong Kong",
    "level2": "New Territories",
    "level3": "Tai Po"
  },
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "affectedAreas": ["Hong Kong", "Guangdong", "Macau"],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "category": "historical"
}
```

### 必需字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` ✅ | string | 事件唯一标识符 |
| `name` ✅ | string | 事件名称 |
| `type` ✅ | string | 事件类型 |

### 推荐字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `category` | string | 事件类别（historical/stochastic），默认historical |
| `date` | string | 事件日期 |
| `year` | number | 事件年份 |
| `impactArea` | object | 影响区域（3级） |
| `geometry` | object | 地理坐标 |
| `maxWindSpeed` | string | 最大风速 |
| `totalRainfall` | string | 总降雨量 |
| `estimatedLoss` | string | 估计损失 |
| `affectedPopulation` | string | 受影响人口 |
| `affectedAreas` | array | 受影响地区列表 |

## 🔄 导入流程

### 完整流程图
```
用户点击Upload按钮
    ↓
打开文件选择对话框
    ↓
用户选择JSON文件
    ↓
系统读取文件内容
    ↓
解析JSON数据
    ↓
验证必需字段
    ↓
检查是否重复
    ↓
[重复] → 询问是否覆盖
    ↓
[新事件] → 直接添加
    ↓
自动选中并显示
    ↓
显示成功消息
```

### 重复事件处理
```javascript
如果导入的事件ID已存在：
1. 系统弹出确认对话框
2. 用户选择：
   - "确定" → 覆盖现有事件
   - "取消" → 放弃导入
3. 确保数据一致性
```

## 💡 使用场景

### 1. 数据恢复
```
场景：误删除事件或需要恢复历史数据
操作：
1. 找到之前下载的JSON备份文件
2. 使用Event Upload重新导入
3. 数据立即恢复
```

### 2. 数据共享
```
场景：团队成员之间共享事件数据
操作：
1. 成员A：下载事件元数据
2. 通过邮件/云盘分享JSON文件
3. 成员B：使用Event Upload导入
4. 双方数据同步
```

### 3. 批量导入（手动）
```
场景：从外部系统导入多个事件
操作：
1. 按照格式创建多个JSON文件
2. 逐个使用Event Upload导入
3. 或者创建包含数组的JSON批量导入（未来功能）
```

### 4. 数据迁移
```
场景：从旧系统迁移到新系统
操作：
1. 从旧系统导出JSON格式数据
2. 调整为标准格式
3. 使用Event Upload导入新系统
```

### 5. 数据更新
```
场景：更新现有事件的信息
操作：
1. 下载现有事件的JSON
2. 修改相关字段（如损失金额更新）
3. 重新上传，选择覆盖
4. 数据更新完成
```

## ⚠️ 注意事项

### 文件格式要求
- ✅ 必须是`.json`扩展名的文件
- ✅ 文件内容必须是有效的JSON格式
- ✅ UTF-8编码
- ❌ 不支持其他格式（CSV、Excel等）

### 数据验证
```javascript
系统会验证以下内容：
1. JSON格式是否正确
2. 是否包含必需字段（id, name, type）
3. 数据类型是否匹配

不会验证：
- 数据的真实性
- 坐标的准确性
- 数值的合理性
```

### 覆盖规则
```
相同ID的事件视为重复：
- 会显示确认对话框
- 用户可选择是否覆盖
- 覆盖后原数据不可恢复（除非有备份）
```

### 安全建议
```
1. 只导入来自可信来源的JSON文件
2. 导入前先备份现有数据
3. 导入后检查数据完整性
4. 定期导出备份所有事件
```

## 🔍 常见问题

### Q: 上传后为什么看不到事件？
A: 检查以下几点：
1. 确认事件类别是否切换正确
2. 检查筛选条件是否过滤了该事件
3. 查看浏览器控制台是否有错误信息

### Q: 提示"Invalid event file"怎么办？
A: 
```json
确保JSON文件包含这3个必需字段：
{
  "id": "必需",
  "name": "必需",
  "type": "必需"
}
```

### Q: 可以同时上传多个事件吗？
A: 目前每次只能上传一个事件。批量上传功能计划在未来版本中实现。

### Q: 上传的事件会保存到服务器吗？
A: 目前事件只保存在浏览器内存中，刷新页面后会消失。未来将实现持久化存储。

### Q: 支持CSV格式导入吗？
A: 目前只支持JSON格式。CSV导入功能计划在未来版本中添加。

### Q: 如何批量导入多个事件？
A: 临时方案：
```json
可以手动创建包含多个事件的数组：
[
  { "id": "T-2023-1", ... },
  { "id": "T-2023-2", ... },
  { "id": "T-2023-3", ... }
]
然后使用脚本逐个导入（需要编程知识）
```

### Q: 导入失败会影响现有数据吗？
A: 不会。如果导入失败，现有数据保持不变。

## 🛠️ 技术实现

### 核心代码
```javascript
const handleUploadEventMetadata = () => {
  // 1. 创建文件选择器
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  // 2. 文件选择处理
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 3. 读取文件
    const reader = new FileReader();
    reader.onload = (event) => {
      const jsonText = event.target.result;
      const uploadedEvent = JSON.parse(jsonText);

      // 4. 验证必需字段
      if (!uploadedEvent.id || !uploadedEvent.name || !uploadedEvent.type) {
        alert('Invalid event file');
        return;
      }

      // 5. 检查重复
      const isDuplicate = checkDuplicate(uploadedEvent.id);
      if (isDuplicate) {
        if (!confirm('Overwrite existing event?')) return;
      }

      // 6. 添加或更新事件
      addOrUpdateEvent(uploadedEvent);

      // 7. 自动选中
      setSelectedEvent(uploadedEvent);
    };

    reader.readAsText(file);
  };

  // 触发文件选择
  input.click();
};
```

### 错误处理
```javascript
try {
  // 解析JSON
  const event = JSON.parse(jsonText);
  
  // 验证
  if (!event.id) throw new Error('Missing id');
  
  // 导入
  importEvent(event);
  
} catch (error) {
  if (error instanceof SyntaxError) {
    alert('Invalid JSON format');
  } else {
    alert('Failed to import event');
  }
}
```

## 📊 数据流示意图

```
┌─────────────────┐
│  JSON文件       │
│  (本地磁盘)     │
└────────┬────────┘
         │
         │ 文件选择器
         ↓
┌─────────────────┐
│  FileReader     │
│  (浏览器API)    │
└────────┬────────┘
         │
         │ readAsText
         ↓
┌─────────────────┐
│  JSON.parse     │
│  (解析)         │
└────────┬────────┘
         │
         │ 验证
         ↓
┌─────────────────┐
│  State更新      │
│  (React State)  │
└────────┬────────┘
         │
         │ 自动选中
         ↓
┌─────────────────┐
│  UI更新         │
│  (地图+详情)    │
└─────────────────┘
```

## 🚀 未来改进计划

- [ ] 批量上传（支持数组格式）
- [ ] 支持CSV格式导入
- [ ] 支持Excel格式导入
- [ ] 数据验证增强（坐标范围、数值合理性）
- [ ] 导入预览功能
- [ ] 数据映射工具（字段名映射）
- [ ] 导入历史记录
- [ ] 撤销/重做功能
- [ ] 拖拽上传
- [ ] 云端存储集成
- [ ] API接口导入

## 📝 最佳实践

### 1. 数据备份策略
```
推荐备份方案：
- 每次修改前先导出当前数据
- 定期（每周）导出所有事件
- 重要事件单独备份
- 云端+本地双重备份
```

### 2. 文件命名规范
```
推荐命名格式：
Event_Backup_{Date}.json          - 单个事件备份
All_Events_Backup_{Date}.json     - 全部事件备份
Event_Update_{ID}_{Date}.json     - 更新版本
```

### 3. 数据验证检查清单
```
导入前检查：
☑ JSON格式正确
☑ 包含必需字段
☑ ID格式符合规范（Peril-Year-No.）
☑ 坐标在合理范围内
☑ 日期格式正确
☑ 类别字段正确（historical/stochastic）
```

### 4. 团队协作建议
```
多人使用时：
1. 约定统一的数据格式
2. 使用版本号标记修改
3. 重要修改前通知团队
4. 保留修改记录（exportDate字段）
```

## 🔗 相关功能

- **Event Download**: 导出事件元数据为JSON
- **Export Event Details**: 导出PDF报告
- **Event List**: 查看和选择事件
- **Filtering System**: 筛选事件

## 📞 技术支持

遇到问题时，请提供：
1. JSON文件内容（敏感信息可脱敏）
2. 浏览器控制台错误信息
3. 操作步骤描述
4. 预期结果和实际结果

---

## 🎓 示例教程

### 示例1: 导入单个事件
```bash
# 1. 准备JSON文件
{
  "id": "T-2024-5",
  "name": "New Typhoon Event",
  "type": "Typhoon",
  "date": "2024-08-20",
  "year": 2024,
  "impactArea": {
    "level1": "Hong Kong",
    "level2": "Kowloon",
    "level3": "Yau Tsim Mong"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [114.1722, 22.3088]
  },
  "category": "historical"
}

# 2. 点击Event Upload
# 3. 选择文件
# 4. 确认导入
# 5. 查看地图上的新标记
```

### 示例2: 更新现有事件
```bash
# 1. 下载现有事件
Event_Metadata_T-2023-1_2023-09-16.json

# 2. 修改JSON（如更新损失金额）
{
  ...
  "estimatedLoss": "$7.5 Billion"  # 从$6.27B更新
  ...
}

# 3. 重新上传
# 4. 选择"确定"覆盖
# 5. 数据更新完成
```

### 示例3: 从Excel创建JSON
```python
# Python脚本示例
import pandas as pd
import json

# 读取Excel
df = pd.read_excel('events.xlsx')

# 转换为JSON
for index, row in df.iterrows():
    event = {
        "id": row['ID'],
        "name": row['Name'],
        "type": row['Type'],
        "date": row['Date'].strftime('%Y-%m-%d'),
        "year": row['Year'],
        "category": "historical"
    }
    
    with open(f"event_{row['ID']}.json", 'w') as f:
        json.dump(event, f, indent=2)
```
