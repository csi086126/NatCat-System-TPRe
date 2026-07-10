# Event Download 功能说明

## 📥 功能概述

Event Download功能可以将选中的灾害事件的完整元数据下载为JSON文件，方便数据备份、分析和共享。

## 🎯 使用方法

### 1. 选择事件
```
1. 在左侧筛选栏设置筛选条件
2. 在Event List下拉菜单中选择事件
3. 确认右侧显示Event Details
```

### 2. 下载元数据
```
在左侧Actions卡片中：
点击 "Event Download" 按钮
→ 系统自动生成JSON文件
→ 浏览器下载到本地
```

### 3. 按钮状态
- **未选中事件**: 按钮灰色禁用状态
- **已选中事件**: 按钮可点击，蓝色高亮

## 📄 下载的JSON文件内容

### 文件命名规则
```
Event_Metadata_{EventID}_{Date}.json

示例：
Event_Metadata_T-2023-1_2023-09-16.json
Event_Metadata_R-01234-2_Year 1234.json
```

### JSON数据结构

#### Historical Event 示例
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
  "affectedAreas": [
    "Hong Kong",
    "Guangdong",
    "Macau"
  ],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "category": "historical",
  "exportDate": "2025-10-16T07:30:25.123Z"
}
```

#### Stochastic Event 示例
```json
{
  "id": "T-00156-1",
  "name": "Stochastic Typhoon Event 156",
  "type": "Typhoon",
  "date": "Year 156",
  "year": 156,
  "impactArea": {
    "level1": "Hong Kong",
    "level2": "Hong Kong Island",
    "level3": "Central and Western"
  },
  "maxWindSpeed": "265 km/h",
  "totalRainfall": "320 mm",
  "estimatedLoss": "$5.2 Billion",
  "affectedPopulation": "2.8 Million",
  "affectedAreas": [
    "Central",
    "Admiralty",
    "Sheung Wan"
  ],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1577, 22.2855]
  },
  "category": "stochastic",
  "exportDate": "2025-10-16T07:30:25.123Z"
}
```

## 📊 元数据字段说明

### 基本信息
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 事件唯一标识符 |
| `name` | string | 事件名称 |
| `type` | string | 事件类型（Typhoon, Rainstorm, Flood等） |
| `date` | string | 事件日期 |
| `year` | number | 事件年份 |

### 影响区域
| 字段 | 类型 | 说明 |
|------|------|------|
| `impactArea.level1` | string | 一级区域（Region） |
| `impactArea.level2` | string | 二级区域（Area） |
| `impactArea.level3` | string | 三级区域（District） |

### 影响指标
| 字段 | 类型 | 说明 |
|------|------|------|
| `maxWindSpeed` | string | 最大风速 |
| `totalRainfall` | string | 总降雨量 |
| `estimatedLoss` | string | 估计损失 |
| `affectedPopulation` | string | 受影响人口 |

### 地理信息
| 字段 | 类型 | 说明 |
|------|------|------|
| `geometry.type` | string | 几何类型（通常为Point） |
| `geometry.coordinates` | array | 坐标 [经度, 纬度] |

### 其他字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `affectedAreas` | array | 受影响地区列表 |
| `category` | string | 事件类别（historical/stochastic） |
| `exportDate` | string | 导出时间（ISO 8601格式） |

## 🔧 使用场景

### 1. 数据备份
- 保存重要事件的完整信息
- 建立本地事件数据库
- 防止数据丢失

### 2. 数据分析
- 导入到Excel/Python/R进行分析
- 批量处理多个事件数据
- 统计分析和可视化

### 3. 数据共享
- 与团队成员共享事件信息
- 提交给保险公司或监管机构
- 用于研究报告和论文

### 4. 系统集成
- 导入到其他灾害管理系统
- 与GIS软件集成
- API接口数据交换

## 💡 高级用法

### 批量导出（未来功能）
```javascript
// 可以扩展为批量导出所有筛选的事件
const exportAllFilteredEvents = () => {
  const events = activeEventCategory === 'historical' 
    ? filteredHistoricalEvents 
    : filteredStochasticEvents;
  
  const allMetadata = events.map(event => ({
    // ... 事件元数据
  }));
  
  // 下载为单个JSON文件
  downloadJSON(allMetadata, 'all_events.json');
};
```

### Python数据分析示例
```python
import json
import pandas as pd

# 读取下载的JSON文件
with open('Event_Metadata_T-2023-1_2023-09-16.json', 'r') as f:
    event_data = json.load(f)

# 转换为DataFrame
df = pd.DataFrame([event_data])

# 分析
print(f"事件名称: {event_data['name']}")
print(f"估计损失: {event_data['estimatedLoss']}")
print(f"受影响区域: {', '.join(event_data['affectedAreas'])}")
```

### Excel导入
```
1. 打开Excel
2. 数据 → 获取数据 → 从文件 → 从JSON
3. 选择下载的JSON文件
4. Power Query编辑器中展开嵌套字段
5. 加载到工作表
```

## 🚀 功能特点

### 1. 完整性
- ✅ 包含所有事件属性
- ✅ 保留原始数据结构
- ✅ 添加导出元信息

### 2. 标准化
- ✅ 标准JSON格式
- ✅ UTF-8编码
- ✅ 格式化输出（便于阅读）

### 3. 易用性
- ✅ 一键下载
- ✅ 自动命名
- ✅ 按钮状态提示
- ✅ 错误处理

### 4. 兼容性
- ✅ 支持所有现代浏览器
- ✅ 可被各种编程语言读取
- ✅ 符合GeoJSON部分规范

## 🔍 常见问题

### Q: 为什么按钮是灰色的？
A: 需要先选择一个事件，按钮才会激活。

### Q: 文件下载到哪里？
A: 下载到浏览器默认下载文件夹，通常是`下载`或`Downloads`文件夹。

### Q: 可以批量下载吗？
A: 目前只支持单个事件下载。批量下载功能计划在未来版本中添加。

### Q: JSON文件可以重新导入吗？
A: 目前导出功能已实现，导入功能（Event Upload）将在后续版本中实现。

### Q: 如何在Python中使用？
A: 
```python
import json
with open('event_file.json', 'r', encoding='utf-8') as f:
    event = json.load(f)
    print(event['name'])
```

### Q: 文件大小有多大？
A: 通常每个事件的JSON文件在1-5KB之间，非常小。

## 📝 未来改进计划

- [ ] 批量导出所有筛选事件
- [ ] 支持CSV格式导出
- [ ] 支持Excel格式导出
- [ ] 添加数据验证功能
- [ ] 支持自定义导出字段
- [ ] 添加导出历史记录
- [ ] 支持云端保存

## 🛠️ 技术实现

### 核心代码
```javascript
const handleDownloadEventMetadata = () => {
  // 1. 检查是否选中事件
  if (!selectedEvent) {
    alert('Please select an event first.');
    return;
  }

  // 2. 创建元数据对象
  const metadata = {
    ...selectedEvent,
    category: activeEventCategory,
    exportDate: new Date().toISOString()
  };

  // 3. 转换为JSON字符串
  const jsonString = JSON.stringify(metadata, null, 2);

  // 4. 创建Blob对象
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 5. 创建下载链接并触发下载
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Event_Metadata_${selectedEvent.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

### 浏览器兼容性
- Chrome: ✅ 完全支持
- Firefox: ✅ 完全支持
- Edge: ✅ 完全支持
- Safari: ✅ 完全支持

## 📞 技术支持

如需帮助，请提供：
1. 浏览器类型和版本
2. 选中的事件ID
3. 错误信息截图
4. 控制台日志
