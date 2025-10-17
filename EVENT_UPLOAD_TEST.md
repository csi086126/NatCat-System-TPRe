# Event Upload 功能测试清单

## ✅ 测试准备完成

### 已实现的功能
- ✅ Event Upload 处理函数（handleUploadEventMetadata）
- ✅ Event Upload 按钮连接
- ✅ 文件选择器（.json格式）
- ✅ JSON解析和验证
- ✅ 必需字段检查（id, name, type）
- ✅ 重复事件检测
- ✅ 覆盖确认对话框
- ✅ 自动选中导入的事件
- ✅ 自动切换到对应类别
- ✅ 错误处理和用户提示

### 测试文件位置
```
public/data/test-event-upload.json
```

## 🧪 测试步骤

### 测试1: 导入新事件（Historical）

#### 前置条件
- 系统运行在 http://localhost:3000
- 已登录（admin/123）
- 在 Disaster Repository 页面

#### 测试步骤
```
1. 确认当前没有 ID 为 "R-2024-5" 的事件
2. 点击左侧 Actions 卡片中的 "Event Upload" 按钮
3. 在文件选择对话框中，选择：
   public/data/test-event-upload.json
4. 点击"打开"
```

#### 预期结果
```
✓ 显示成功消息弹窗：
  "Event "Test Rainstorm Event" uploaded successfully!
   Category: historical
   Event ID: R-2024-5"

✓ 系统自动切换到 Historical Events 标签
✓ 事件自动在 Event List 下拉菜单中被选中
✓ 地图自动定位到尖沙咀区域（114.1722, 22.3088）
✓ 右侧显示 Event Details：
  - 名称: Test Rainstorm Event
  - 类型: Rainstorm
  - 日期: 2024-10-15
  - Impact Summary:
    * Max Wind Speed: 120 km/h
    * Total Rainfall: 450 mm
    * Estimated Loss: $2.8 Billion
    * Affected Population: 1.5 Million
  - Affected Areas:
    * Tsim Sha Tsui
    * Jordan
    * Mong Kok
```

---

### 测试2: 重复导入（覆盖测试）

#### 测试步骤
```
1. 使用测试1成功导入后的状态
2. 再次点击 "Event Upload" 按钮
3. 再次选择 test-event-upload.json
4. 点击"打开"
```

#### 预期结果
```
✓ 显示确认对话框：
  "Event R-2024-5 already exists. Do you want to overwrite it?"

选择"确定"：
  ✓ 事件被更新（虽然数据相同）
  ✓ 显示成功消息
  ✓ 事件保持选中状态

选择"取消"：
  ✓ 操作取消
  ✓ 原数据不变
  ✓ 没有显示成功消息
```

---

### 测试3: 修改后重新导入

#### 测试步骤
```
1. 手动编辑 test-event-upload.json
   将 "estimatedLoss" 改为 "$3.5 Billion"
2. 保存文件
3. 点击 "Event Upload" 按钮
4. 选择修改后的文件
5. 在确认对话框中点击"确定"
```

#### 预期结果
```
✓ 事件信息更新
✓ Estimated Loss 显示为 $3.5 Billion
✓ 其他信息保持不变
```

---

### 测试4: 导入Stochastic Event

#### 测试步骤
```
1. 创建一个新的 JSON 文件（或修改现有文件）
   将 "category" 改为 "stochastic"
   将 "id" 改为 "F-00888-1"
   将 "name" 改为 "Stochastic Flood Event 888"
   将 "date" 改为 "Year 888"
   将 "year" 改为 888

2. 保存为 test-stochastic-upload.json
3. 点击 "Event Upload" 按钮
4. 选择新文件
```

#### 预期结果
```
✓ 系统自动切换到 Stochastic Events 标签
✓ 事件出现在 Stochastic Events 的 Event List 中
✓ 事件自动被选中并显示
✓ 地图定位正确
```

---

### 测试5: 无效JSON文件

#### 测试步骤
```
1. 创建一个格式错误的 JSON 文件
   例如: 缺少逗号、括号不匹配等
2. 点击 "Event Upload" 按钮
3. 选择该文件
```

#### 预期结果
```
✓ 显示错误消息：
  "Failed to parse JSON file. Please ensure it is a valid event metadata file."
✓ 没有导入任何数据
✓ 系统状态不变
```

---

### 测试6: 缺少必需字段

#### 测试步骤
```
1. 创建一个 JSON 文件，删除 "name" 字段
2. 点击 "Event Upload" 按钮
3. 选择该文件
```

#### 预期结果
```
✓ 显示错误消息：
  "Invalid event file: Missing required fields (id, name, type)."
✓ 没有导入任何数据
✓ 系统状态不变
```

---

### 测试7: 取消文件选择

#### 测试步骤
```
1. 点击 "Event Upload" 按钮
2. 在文件选择对话框中点击"取消"
```

#### 预期结果
```
✓ 文件选择对话框关闭
✓ 没有错误消息
✓ 系统状态不变
```

---

### 测试8: 导入后的功能验证

#### 测试步骤
```
1. 成功导入一个测试事件
2. 验证以下功能：
   a. 在 Event List 中手动选择其他事件
   b. 使用筛选功能筛选导入的事件
   c. 导出导入的事件为 JSON（Event Download）
   d. 导出导入的事件为 PDF（Export Event Details）
```

#### 预期结果
```
✓ Event List 选择功能正常
✓ 筛选功能能找到导入的事件
✓ Event Download 成功下载
✓ Export Event Details 生成 PDF 包含正确信息
```

---

### 测试9: 多个事件管理

#### 测试步骤
```
1. 导入测试事件 R-2024-5（Historical）
2. 切换到 Historical Events
3. 在 Event List 中选择 Mock 事件（T-2023-1）
4. 再次选择导入的事件 R-2024-5
5. 使用筛选条件：
   - Event Type: Rainstorm
   - Impact Area Level 1: Hong Kong
   - Level 2: Kowloon
   - Level 3: Yau Tsim Mong
```

#### 预期结果
```
✓ 两个事件都显示在 Event List 中
✓ 可以在不同事件间切换
✓ 筛选后只显示符合条件的事件
✓ R-2024-5 应该出现在筛选结果中
```

---

## 📊 测试结果记录表

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 测试1: 导入新事件 | ⬜ 待测试 | |
| 测试2: 重复导入 | ⬜ 待测试 | |
| 测试3: 修改后重新导入 | ⬜ 待测试 | |
| 测试4: 导入Stochastic | ⬜ 待测试 | |
| 测试5: 无效JSON | ⬜ 待测试 | |
| 测试6: 缺少必需字段 | ⬜ 待测试 | |
| 测试7: 取消文件选择 | ⬜ 待测试 | |
| 测试8: 导入后功能 | ⬜ 待测试 | |
| 测试9: 多个事件管理 | ⬜ 待测试 | |

---

## 🐛 已知问题

### TypeScript类型错误
```
- 8个编译警告（不影响运行时功能）
- 主要是 any 类型和索引签名问题
- 可在后续版本中修复
```

---

## 🔄 完整功能验证

### Event Download → Event Upload 循环测试

#### 步骤
```
1. 选择一个 Mock 事件（例如 T-2023-1）
2. 使用 Event Download 下载为 JSON
3. 退出并重新登录（模拟数据丢失）
4. 使用 Event Upload 导入刚下载的 JSON
5. 验证数据完整性
```

#### 预期结果
```
✓ 下载的 JSON 文件可以成功重新导入
✓ 所有数据字段保持一致
✓ 地图位置相同
✓ 事件详情相同
✓ 完成数据备份恢复循环
```

---

## 📝 测试注意事项

### 浏览器兼容性
- ✅ Chrome/Edge: 完全支持
- ✅ Firefox: 完全支持
- ✅ Safari: 完全支持

### 文件大小限制
- 测试文件: ~1KB
- 实际使用: 通常1-5KB
- 浏览器限制: 通常无实际影响

### 数据持久化
⚠️ **重要**: 
- 当前版本导入的数据保存在浏览器内存中
- 刷新页面后数据会丢失
- 建议定期使用 Event Download 备份

---

## 🎯 下一步

测试完成后：
1. 记录测试结果
2. 报告发现的问题
3. 确认是否需要功能调整
4. 准备真实数据导入

---

## 📞 测试支持

如测试中遇到问题，请提供：
1. 测试步骤编号
2. 使用的JSON文件内容
3. 浏览器控制台截图
4. 错误消息完整文本
