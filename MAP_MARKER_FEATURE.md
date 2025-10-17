# 地图标记（Map Marker）功能说明

## ✅ 已实现功能

### 1. **查询位置自动标记**
当用户查询地址或坐标后，地图上会自动显示一个标记指示该位置。

### 2. **自定义标记样式**
使用自定义的紫色渐变图钉样式：
- 外圈：紫色渐变 (#8b5cf6 → #6366f1)
- 白色边框
- 白色中心圆点
- 阴影效果增强可见性
- 水滴形状（底部尖角朝下）

### 3. **地图自动定位**
查询成功后：
- 地图自动移动到查询位置
- 缩放级别调整到 13（适合查看周边环境）
- 平滑动画过渡（1秒动画时长）

### 4. **交互式弹出窗口（Popup）**
点击标记后显示详细信息：
- 完整地址
- 精确坐标（Lat/Lon，5位小数）
- 整体风险等级（Overall Risk）
- 风险评分（Score: x/10）
- 风险等级颜色编码：
  - 🟢 Low - 绿色
  - 🟡 Medium - 黄色
  - 🟠 High - 橙色
  - 🔴 Extreme - 红色

## 🎨 标记设计

### 自定义图标特点
```
┌─────────────────┐
│   ◯ ← 紫色渐变   │
│  / \             │
│ /   \            │
│/     \           │
│   ▼   ← 尖角     │
└─────────────────┘
```

**颜色方案：**
- 主色：紫色渐变（与查询按钮配色一致）
- 边框：白色（3px）
- 中心点：白色圆点
- 阴影：0 4px 8px rgba(0,0,0,0.3)

**尺寸：**
- 图标大小：32x32 像素
- 锚点位置：底部中心（16, 32）
- 弹出窗口锚点：标记顶部（0, -32）

## 🔄 工作流程

### 完整查询流程
```
用户输入地址/坐标
    ↓
点击 "Search & Calculate Risk"
    ↓
显示加载状态
    ↓
1. Geocoding（地理编码）
   - 获取 latitude, longitude
    ↓
2. 设置标记位置
   - setMarkerPosition([lat, lon])
    ↓
3. 移动地图视图
   - map.setView([lat, lon], 13, { animate: true })
    ↓
4. 查询资产信息 & 灾害数据
    ↓
5. 计算风险评分
    ↓
6. 在地图上显示标记
   - 渲染 Marker 组件
   - 附带 Popup 信息
    ↓
用户可点击标记查看详情
```

## 💡 使用方法

### 查看标记
1. 在搜索框输入地址或坐标
2. 点击"Search & Calculate Risk"
3. 等待查询完成
4. **标记自动出现**在地图上
5. **地图自动移动**到标记位置

### 查看详细信息
1. 点击地图上的紫色标记
2. 弹出窗口显示：
   - 地址
   - 坐标
   - 风险等级
   - 风险评分

### 多次查询
- 每次新查询会清除旧标记
- 只显示最新查询的位置
- 查询失败时自动清除标记

## 🧪 测试案例

### 测试 1：城市查询
```
输入: Hong Kong
预期结果:
  ✓ 地图移动到香港
  ✓ 显示紫色标记
  ✓ 点击标记显示"Hong Kong"
  ✓ 显示风险评分
```

### 测试 2：坐标查询
```
输入: 22.3193,114.1694
预期结果:
  ✓ 地图移动到该坐标
  ✓ 显示紫色标记
  ✓ 点击标记显示反向地理编码的地址
  ✓ 显示风险信息
```

### 测试 3：查询失败
```
输入: 999,999 (无效坐标)
预期结果:
  ✓ 显示错误提示
  ✓ 不显示标记
  ✓ 地图保持原位置
```

### 测试 4：多次查询
```
第一次: Hong Kong → 标记出现在香港
第二次: Bangkok → 标记移动到曼谷（香港标记消失）
预期结果:
  ✓ 只显示一个标记（最新位置）
  ✓ 地图跟随移动
```

## 🎯 功能特性

### 1. **单标记模式**
- 任何时候只显示一个标记（最新查询）
- 避免地图上标记过多造成混乱
- 符合单点风险查询的使用场景

### 2. **状态同步**
标记状态与查询结果完全同步：
- `markerPosition` 状态存储标记位置
- 查询成功 → 显示标记
- 查询失败 → 清除标记
- 新查询 → 更新标记位置

### 3. **平滑动画**
地图移动使用动画效果：
```typescript
map.setView(position, 13, { 
  animate: true,    // 启用动画
  duration: 1       // 动画时长1秒
})
```

### 4. **响应式信息**
Popup 内容动态显示：
- 地址（来自 geocoding 结果）
- 坐标（格式化为5位小数）
- 风险等级（颜色编码）
- 风险评分（仅在计算完成后显示）

## 📊 数据流

### 状态管理
```typescript
// 标记位置状态
const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);

// 查询成功时设置
setMarkerPosition([latitude, longitude]);

// 查询失败时清除
setMarkerPosition(null);

// 在 JSX 中条件渲染
{markerPosition && (
  <Marker position={markerPosition} icon={customIcon}>
    <Popup>...</Popup>
  </Marker>
)}
```

### 地图引用
```typescript
const mapRef = useRef(null);

// 在查询成功后访问地图实例
if (mapRef.current) {
  const map = mapRef.current as any;
  map.setView(position, 13, { animate: true, duration: 1 });
}
```

## 🔧 技术实现

### 组件导入
```typescript
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
```

### 自定义图标创建
```typescript
const createCustomIcon = () => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  return L.divIcon({
    className: 'custom-marker',
    html: `<div>...</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};
```

### Marker 渲染
```tsx
<Marker 
  position={markerPosition}       // [lat, lon]
  icon={createCustomIcon()}       // 自定义图标
>
  <Popup>                          // 点击后显示
    <div className="text-sm">
      {/* Popup 内容 */}
    </div>
  </Popup>
</Marker>
```

## 🎨 样式优化

### Popup 样式
- 字体大小：text-sm（14px）
- 地址：粗体、深灰色
- 坐标：小字、灰色
- 分隔线：border-t border-gray-300
- 风险等级：动态颜色（red/orange/yellow/green）

### 标记样式
- 使用 HTML/CSS 创建自定义形状
- 避免图片依赖
- 响应式设计
- 高对比度（在卫星图上清晰可见）

## ⚙️ 配置选项

### 可调整参数

#### 缩放级别
```typescript
// 当前: zoom=13（街区级别）
map.setView(position, 13, { animate: true });

// 其他选项:
// zoom=11 - 城市级别（默认）
// zoom=15 - 街道级别
// zoom=17 - 建筑级别
```

#### 动画时长
```typescript
// 当前: duration=1（1秒）
map.setView(position, 13, { animate: true, duration: 1 });

// 其他选项:
// duration: 0.5 - 快速
// duration: 2 - 缓慢
```

#### 图标尺寸
```typescript
// 当前: 32x32 像素
iconSize: [32, 32]

// 可调整为更大或更小
// iconSize: [40, 40] - 更显眼
// iconSize: [24, 24] - 更精致
```

## 🚀 后续优化（可选）

### 1. **多标记模式**
允许保留历史查询标记：
- 添加"保留标记"选项
- 不同颜色区分新旧标记
- 标记列表管理

### 2. **拖动标记**
允许用户拖动标记重新查询：
```typescript
<Marker 
  draggable={true}
  eventHandlers={{
    dragend: (e) => {
      const newPos = e.target.getLatLng();
      handleSearchAndCalculate(`${newPos.lat},${newPos.lng}`);
    }
  }}
>
```

### 3. **聚类标记**
多点查询时使用标记聚类：
- 使用 `react-leaflet-markercluster`
- 自动聚合密集标记
- 点击展开查看详情

### 4. **标记动画**
添加标记出现动画：
- Bounce 效果
- Fade in
- Scale up

### 5. **自定义图标库**
根据风险等级使用不同图标：
- Low: 绿色标记
- Medium: 黄色标记
- High: 橙色标记
- Extreme: 红色标记

## 📝 代码位置

### 主要代码
- **自定义图标**: 第127-158行
- **标记状态**: 第160行
- **设置标记**: 第396-398行
- **移动地图**: 第400-405行
- **清除标记**: 第421行
- **Marker 组件**: 第887-918行

### 相关组件
- MapContainer: 第864行
- TileLayer: 第869行
- WMSTileLayer: 第874-886行
- Marker: 第889行
- Popup: 第890行

## ✅ 当前状态

**已完成**: 地图标记功能完全可用
- ✅ 自定义紫色标记图标
- ✅ 查询后自动显示标记
- ✅ 地图自动定位和缩放
- ✅ 交互式 Popup 信息窗口
- ✅ 风险等级颜色编码
- ✅ 查询失败自动清除标记
- ✅ 平滑动画过渡

**立即可测试**: http://localhost:3000/riskmap

**测试步骤**:
1. 输入地址或坐标
2. 点击搜索
3. 观察地图自动移动
4. 查看标记出现
5. 点击标记查看详细信息

---

**更新时间**: 2025-10-17
**功能状态**: ✅ 生产就绪
