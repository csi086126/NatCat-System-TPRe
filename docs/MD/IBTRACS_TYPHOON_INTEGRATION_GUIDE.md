# IBTrACS 全球台风路径数据集成指南

## 📋 概述

本指南介绍如何在 Risk Map 页面中使用 IBTrACS (International Best Track Archive for Climate Stewardship) 全球台风路径数据。

---

## 🎯 功能特性

### 1. **双图层支持**
- **台风路径图层** (`IBTrACS.WP.list.v04r01.lines`)
  - 显示台风完整移动轨迹
  - 线性矢量数据
  - 便于观察台风路径走向

- **台风分析节点图层** (`IBTrACS.WP.list.v04r01.point`)
  - 显示台风各时刻的观测节点
  - 包含详细的强度和风圈数据
  - 可点击查看详细信息

### 2. **交互式数据查询**
点击地图上的台风节点可查看：

#### 核心参数
- **最大风速 (Max Wind Speed)**
  - 单位：knots (kt) 和 km/h
  - 数据源优先级：`usa_wind` > `max_wind` > `wmo_wind` > `wind`

- **最低气压 (Min Pressure)**
  - 单位：hPa (百帕)
  - 数据源优先级：`usa_pres` > `min_press` > `pressure` > `pres`

- **最大风速半径 (Radius of Maximum Wind)**
  - 单位：nautical miles (nm) 和 km
  - 数据源优先级：`usa_rmw` > `radmaxwind` > `rmax` > `radius_max_wind` > `rmw`

#### 风圈半径 (Wind Radii) - 四象限数据

**34-knot 风圈 (烈风区)**
- 风速：34 kt ≈ 63 km/h
- 定义：达到或超过 34 kt 的范围
- 显示：NE, SE, SW, NW 四个方向的半径
- 颜色：黄色

**50-knot 风圈 (狂风区)**
- 风速：50 kt ≈ 93 km/h
- 定义：达到或超过 50 kt 的范围
- 显示：NE, SE, SW, NW 四个方向的半径
- 颜色：橙色

**64-knot 风圈 (飓风区)**
- 风速：64 kt ≈ 119 km/h
- 定义：达到或超过 64 kt 的范围 (飓风强度)
- 显示：NE, SE, SW, NW 四个方向的半径
- 颜色：红色

#### 元数据
- **台风名称** (`name`, `stormname`, `tc_name`, `sid`)
- **观测时间** (`iso_time`, `datetime`, `time`, `date_time`)
- **海域标识** (`basin`) - 如 WP (西太平洋)

---

## 🚀 使用步骤

### 步骤 1: 开启图层

1. 在左侧面板找到 **"Global Typhoon Datasets (IBTrACS)"** 折叠面板
2. 点击展开面板
3. 勾选需要显示的图层：
   - ☑️ **Global Typhoon Tracks (IBTrACS Lines)** - 路径线
   - ☑️ **Global Typhoon Analysis Points (IBTrACS)** - 分析节点

### 步骤 2: 浏览台风路径

- 地图会自动显示 IBTrACS 数据库中的所有台风路径
- 可以缩放和平移地图查看不同区域的台风活动

### 步骤 3: 点击查询详细信息

1. **点击台风节点**
   - 在地图上点击任意台风节点（蓝色点）
   - 系统会显示加载动画："读取台风节点属性..."

2. **查看弹窗信息**
   - 弹窗会自动显示该节点的详细数据
   - 包含风速、气压、风圈等完整信息

3. **关闭弹窗**
   - 点击弹窗的 X 按钮
   - 或点击地图其他位置

### 步骤 4: 错误处理

如果点击位置没有台风节点：
- 系统会在地图顶部中央显示提示："附近没有IBTrACS台风节点，请靠近路径再试一次。"
- 点击"关闭"按钮可关闭提示

---

## 🔧 技术实现

### 数据查询流程

```typescript
// 1. 用户点击地图
handleMapClick(event) {
  if (visibleLayers.globalTyphoonPoints || visibleLayers.globalTyphoonTracks) {
    queryIbtracsFeatureInfo(event.latlng);
  }
}

// 2. 发送 WMS GetFeatureInfo 请求
const params = {
  service: 'WMS',
  request: 'GetFeatureInfo',
  layers: 'Global:IBTrACS.WP.list.v04r01.point',
  query_layers: 'Global:IBTrACS.WP.list.v04r01.point',
  info_format: 'application/json',
  feature_count: 10,
  // ... 其他参数
};

// 3. 解析响应并显示弹窗
const feature = data?.features?.[0];
if (feature) {
  setTyphoonPopup({
    position: { lat, lng: lon },
    properties: feature.properties,
  });
}
```

### 属性字段映射

系统使用智能回退机制，按优先级查找属性：

```typescript
const getFirstAvailableAttribute = (props, keys) => {
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
      return props[key];
    }
  }
  return null;
};

// 示例：查找最大风速
const maxWind = getFirstAvailableAttribute(props,
  ['usa_wind', 'max_wind', 'wmo_wind', 'wind']
);
```

---

## 📊 数据展示说明

### Popup 布局结构

```
┌─────────────────────────────────────┐
│ 台风名称 (Name)                      │
│ 观测时间 (ISO Time)                  │
├─────────────────────────────────────┤
│ 最大风速 (kt)  │  最低气压 (hPa)     │
│   120 kt       │     950 hPa        │
│ ≈ 222 km/h     │                    │
├─────────────────────────────────────┤
│ 最大风速半径 (nm)                    │
│        30 nm                        │
│      ≈ 56 km                        │
├─────────────────────────────────────┤
│ 🌪️ 34 kt 风圈半径 (nm) - 烈风区      │
│  NE: 120 nm  │  SE: 100 nm         │
│  SW: 80 nm   │  NW: 90 nm          │
│  34 kt ≈ 63 km/h (烈风)             │
├─────────────────────────────────────┤
│ 🌀 50 kt 风圈半径 (nm) - 狂风区      │
│  NE: 60 nm   │  SE: 50 nm          │
│  SW: 40 nm   │  NW: 45 nm          │
│  50 kt ≈ 93 km/h (狂风)             │
├─────────────────────────────────────┤
│ 💨 64 kt 风圈半径 (nm) - 飓风区      │
│  NE: 30 nm   │  SE: 25 nm          │
│  SW: 20 nm   │  NW: 22 nm          │
│  64 kt ≈ 119 km/h (飓风)            │
├─────────────────────────────────────┤
│ 海域 Basin: WP                      │
├─────────────────────────────────────┤
│ 💡 数据来源: IBTrACS                │
└─────────────────────────────────────┘
```

### 风圈半径说明

- **四象限数据**：NE (东北), SE (东南), SW (西南), NW (西北)
- **不对称性**：台风的风场通常是不对称的，各方向的风圈半径会有差异
- **强度分级**：
  - 34 kt: 烈风 (Gale)
  - 50 kt: 狂风 (Storm)
  - 64 kt: 飓风/台风 (Hurricane/Typhoon)

---

## 🎨 UI/UX 特性

### 加载状态
- 位置：地图顶部中央
- 样式：白色背景，带旋转动画
- 文字："读取台风节点属性..."

### 错误提示
- 位置：地图顶部中央（加载指示器下方）
- 样式：琥珀色背景，带警告图标
- 可关闭：带"关闭"按钮
- 自动隐藏：关闭所有 IBTrACS 图层时自动清除

### Popup 样式
- 最小宽度：280px
- 分段显示：不同信息用分隔线分开
- 颜色编码：
  - 蓝色：风速信息
  - 紫色：气压信息
  - 青色：最大风速半径
  - 黄色：34 kt 风圈
  - 橙色：50 kt 风圈
  - 红色：64 kt 风圈

---

## 🌍 应用场景

### 1. **台风路径分析**
- 研究历史台风的移动轨迹
- 识别高频台风路径
- 分析台风登陆点分布

### 2. **强度评估**
- 查看台风在不同位置的强度变化
- 对比不同台风的最大强度
- 研究台风增强/减弱趋势

### 3. **风险评估**
- 评估特定区域的台风风险
- 分析风圈覆盖范围
- 确定受影响区域

### 4. **保险承保**
- 评估投保地点的台风暴露
- 计算不同强度台风的影响范围
- 为定价模型提供数据支持

### 5. **灾害响应**
- 在台风接近时查看历史类似路径
- 预估可能的影响范围
- 制定应急响应计划

---

## 📝 IBTrACS 数据说明

### 数据来源
- **机构**: NOAA National Centers for Environmental Information
- **网站**: [https://www.ncei.noaa.gov/products/international-best-track-archive](https://www.ncei.noaa.gov/products/international-best-track-archive)
- **覆盖范围**: 全球热带气旋数据 (1842年至今)
- **更新频率**: 实时更新

### 数据质量
- **多源融合**: 整合全球各气象中心的观测数据
- **质量控制**: 经过严格的质量检查和验证
- **标准化**: 统一的数据格式和命名规范

### WP 海域 (西太平洋)
- **范围**: 东经 100° 以东，赤道以北
- **影响区域**: 中国、日本、菲律宾、韩国、越南等
- **台风频率**: 全球最活跃的热带气旋海域

---

## 🔍 故障排查

### 问题 1: 点击地图没有反应

**可能原因**:
- 图层未开启
- 点击位置没有台风节点
- GeoServer 连接问题

**解决方案**:
1. 确认至少勾选了一个 IBTrACS 图层
2. 尝试点击更靠近路径的位置
3. 检查浏览器控制台查看错误信息
4. 确认 GeoServer 服务正常运行

### 问题 2: 弹窗显示不完整

**可能原因**:
- 该节点部分数据缺失
- 属性字段名称不匹配

**解决方案**:
- 这是正常现象，并非所有节点都有完整的风圈数据
- 系统会自动隐藏缺失的数据项

### 问题 3: 地图上看不到路径

**可能原因**:
- 缩放级别不合适
- GeoServer 图层配置问题
- 数据范围超出当前视图

**解决方案**:
1. 缩小地图查看全球视图
2. 切换到西太平洋区域 (中国、日本附近)
3. 检查 GeoServer 中图层的边界框设置

---

## 🎓 最佳实践

### 1. **性能优化**
- 仅在需要时开启图层
- 不要同时开启过多图层
- 适当的缩放级别查看数据

### 2. **数据理解**
- 了解不同风圈的含义
- 注意单位换算 (kt → km/h, nm → km)
- 理解四象限风圈的不对称性

### 3. **分析方法**
- 结合路径线和节点一起查看
- 关注台风的强度变化趋势
- 对比不同台风的特征

---

## 📚 参考资料

### IBTrACS 文档
- [IBTrACS 用户指南](https://www.ncei.noaa.gov/sites/default/files/2021-07/IBTrACS_version4_Technical_Details.pdf)
- [数据格式说明](https://www.ncei.noaa.gov/products/international-best-track-archive)

### 风圈数据标准
- **34-kt**: Tropical Storm (热带风暴强度)
- **50-kt**: Severe Tropical Storm (强热带风暴)
- **64-kt**: Typhoon/Hurricane (台风/飓风强度)

### 单位换算
- **1 knot (kt)** = 1.852 km/h = 0.514 m/s
- **1 nautical mile (nm)** = 1.852 km = 1.151 miles

---

## ✅ 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 添加 IBTrACS 路径图层和节点图层
- ✅ 实现交互式点击查询功能
- ✅ 支持多级风圈半径显示 (34/50/64 kt)
- ✅ 添加智能属性字段映射
- ✅ 优化 UI/UX 交互体验
- ✅ 添加加载状态和错误处理
- ✅ 单位自动换算 (kt→km/h, nm→km)

---

## 💡 技巧与提示

1. **快速定位台风**
   - 先开启路径图层，识别感兴趣的台风
   - 再开启节点图层，点击查看详细信息

2. **风圈可视化**
   - 34 kt 风圈最大，代表整个台风的影响范围
   - 64 kt 风圈最小，代表台风核心区域
   - NE 方向通常风圈最大（台风移动方向）

3. **强度判断**
   - 最大风速 < 34 kt: 热带低压
   - 34-63 kt: 热带风暴
   - 64-85 kt: 台风
   - >85 kt: 强台风/超强台风

4. **数据下载**
   - 如需批量下载 IBTrACS 数据，访问 NOAA 官网
   - 支持 CSV、NetCDF 等多种格式

---

**开发者**: Claude Code Assistant
**文档版本**: 1.0.0
**最后更新**: 2025-01-XX
