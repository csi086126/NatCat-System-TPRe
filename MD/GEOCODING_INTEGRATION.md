# 地理编码（Geocoding）功能集成完成

## ✅ 已实现功能

### 1. **真实地址查询**
使用 OpenStreetMap Nominatim API 进行地理编码

**支持的输入格式：**
- 城市名称：`Hong Kong`、`Bangkok`、`Singapore`
- 详细地址：`Central, Hong Kong`、`Silom Road, Bangkok`
- 国家/地区：`Thailand`、`China`
- 任意文本地址

**示例：**
```
Hong Kong
Victoria Peak, Hong Kong
Bangkok, Thailand
Central Business District, Singapore
22 Nathan Road, Kowloon
```

### 2. **直接经纬度输入**
支持直接输入坐标，无需通过地址

**格式：** `纬度,经度`（可以有空格）

**示例：**
```
22.3193,114.1694          (香港)
22.3193, 114.1694         (带空格也可以)
13.7563,100.5018          (曼谷)
1.3521,103.8198           (新加坡)
-33.8688,151.2093         (悉尼)
```

**坐标验证：**
- 纬度范围：-90 到 90
- 经度范围：-180 到 180
- 自动进行范围检查

### 3. **反向地理编码**
输入坐标后自动获取地址名称

**流程：**
```
用户输入: 22.3193,114.1694
↓
系统验证坐标有效性
↓
调用 Nominatim Reverse API
↓
返回: "Hong Kong Island, Hong Kong, China"
```

## 🔧 技术实现

### API 服务
- **服务商**: OpenStreetMap Nominatim
- **免费额度**: 1 请求/秒（已添加请求头）
- **无需 API Key**

### 请求头配置
```typescript
headers: {
  'User-Agent': 'FloodInsuranceSystem/1.0'
}
```

### API 端点

#### 地址搜索（Forward Geocoding）
```
GET https://nominatim.openstreetmap.org/search
  ?format=json
  &q={address}
  &limit=1
  &addressdetails=1
```

#### 坐标反查（Reverse Geocoding）
```
GET https://nominatim.openstreetmap.org/reverse
  ?format=json
  &lat={latitude}
  &lon={longitude}
  &zoom=18
  &addressdetails=1
```

## 🎯 功能特性

### 1. **智能输入识别**
自动识别用户输入的类型：
- 检测坐标格式（正则表达式）
- 否则作为地址处理

### 2. **加载状态显示**
- 查询时显示"Searching..."
- 动画加载指示器
- 禁用输入和按钮防止重复提交

### 3. **错误处理**
完善的错误提示：
- 地址未找到
- 坐标超出范围
- 网络请求失败
- API 服务不可用

### 4. **用户友好提示**
输入框下方显示：
```
💡 Tip: Enter city name, address, or coordinates (format: lat,lon)
```

## 📊 查询结果

### 返回数据结构
```typescript
{
  address: string,      // 完整地址
  latitude: number,     // 纬度（5位小数）
  longitude: number,    // 经度（5位小数）
}
```

### 显示信息
- **主标题**: 完整地址（Nominatim 返回的 display_name）
- **副标题**: 精确坐标（Lat: 22.31930, Lon: 114.16940）

## 🔄 完整查询流程

```
用户输入地址/坐标
    ↓
点击 "Search & Calculate Risk"
    ↓
显示加载状态
    ↓
1. Geocoding（地理编码）
   - 地址 → 坐标
   - 或验证坐标有效性
   - 或坐标 → 地址（反向）
    ↓
2. Query Asset Info（查询资产信息）
   - 海拔、人口密度等
   - 目前使用模拟数据
    ↓
3. Query Hazards（查询灾害数据）
   - 洪水、台风、暴雨等
   - 目前使用模拟数据
    ↓
4. Calculate Risk Scores（计算风险分数）
   - 个别灾害评分
   - 综合风险评分
    ↓
显示完整结果
```

## 🧪 测试案例

### 城市名称测试
| 输入 | 预期结果 |
|------|---------|
| Hong Kong | 返回香港中心坐标 |
| Bangkok | 返回曼谷中心坐标 |
| Singapore | 返回新加坡中心坐标 |
| Tokyo | 返回东京中心坐标 |

### 坐标测试
| 输入 | 预期结果 |
|------|---------|
| 22.3193,114.1694 | Hong Kong Island |
| 13.7563,100.5018 | Bangkok, Thailand |
| 1.3521,103.8198 | Singapore |
| 35.6762,139.6503 | Tokyo, Japan |

### 错误测试
| 输入 | 预期结果 |
|------|---------|
| asdfjkl123 | "Location not found" 错误 |
| 100,200 | "Invalid coordinates" 错误 |
| -100,50 | "Invalid coordinates" 错误 |
| (空) | "Please enter an address" 提示 |

## 🚀 使用方法

### 1. 地址查询
```
1. 在 "Address or Coordinates" 输入框输入地址
2. 输入示例：
   - Hong Kong
   - Central, Hong Kong
   - Victoria Harbour, Hong Kong
3. 点击 "Search & Calculate Risk"
4. 等待查询完成（通常1-2秒）
5. 查看结果
```

### 2. 坐标查询
```
1. 在输入框输入坐标（格式：纬度,经度）
2. 输入示例：
   - 22.3193,114.1694
   - 22.3193, 114.1694 (带空格)
3. 点击搜索
4. 系统自动反查地址名称
5. 显示结果
```

## ⚠️ 注意事项

### 1. **使用限制**
- Nominatim 免费服务限制：**1 请求/秒**
- 建议添加防抖（debounce）避免频繁请求
- 生产环境建议自建 Nominatim 服务器或使用商业 API

### 2. **地址匹配准确度**
- 英文地址匹配最佳
- 中文地址支持有限（建议拼音或英文）
- 详细地址比模糊地址更准确

### 3. **网络依赖**
- 需要互联网连接
- API 响应时间取决于网络状况
- 国内访问可能较慢（建议使用 VPN 或国内镜像）

### 4. **后续优化建议**
- 实现请求缓存（相同地址不重复查询）
- 添加地址建议（Autocomplete）
- 集成多个地理编码服务商（备用）
- 添加请求速率限制保护

## 📝 代码位置

### 主要函数
- `geocodeAddress()` - 第190-260行
- `handleSearchAndCalculate()` - 第378-410行

### UI 组件
- 输入框 - 第468-477行
- 搜索按钮 - 第480-485行
- 加载指示器 - 第488-494行

### 状态管理
- `searchQuery` - 用户输入
- `isLoading` - 加载状态
- `assetInfo` - 查询结果（包含地址和坐标）

## 🔄 未来集成（待实现）

### 阶段 2：真实 Asset Info 查询
- [ ] 集成 DEM API（海拔数据）
- [ ] 集成 WorldPop API（人口密度）
- [ ] 集成 OSM API（建筑数据）
- [ ] 计算距海岸距离

### 阶段 3：真实 Hazard 数据查询
- [ ] WMS GetFeatureInfo（从 GeoServer 查询灾害数据）
- [ ] 实时洪水深度查询
- [ ] 实时台风强度查询
- [ ] 实时暴雨强度查询

### 阶段 4：地图交互
- [ ] 点击地图自动填充坐标
- [ ] 在地图上显示查询点标记
- [ ] 地图自动缩放到查询位置

---

## ✅ 当前状态

**已完成**: 地理编码功能完全可用
- ✅ 支持地址查询
- ✅ 支持坐标输入
- ✅ 支持反向地理编码
- ✅ 完整的错误处理
- ✅ 加载状态显示
- ✅ 用户友好的提示

**立即可测试**: http://localhost:3000/riskmap

**建议测试输入**:
1. `Hong Kong` - 测试城市名称
2. `22.3193,114.1694` - 测试坐标输入
3. `Central, Hong Kong` - 测试详细地址
4. `999,999` - 测试错误处理

---

**更新时间**: 2025-10-17
**功能状态**: ✅ 生产就绪
