# 多层级地理统计 - GeoServer集成方案

## 概述

将18区、PPU、SPU、TPU的GeoJSON边界数据上传到GeoServer，然后在Portfolio Map中叠加显示，实现交互式地理统计可视化。

---

## 方案对比

### 方案A：GeoServer + WMS/WFS（推荐）⭐

**优点**:
- ✅ 服务器端渲染，性能好
- ✅ 样式可在GeoServer中配置
- ✅ 支持大量数据
- ✅ 可以做服务器端过滤和查询
- ✅ 专业的GIS服务

**缺点**:
- ⚠️ 需要上传和配置GeoServer
- ⚠️ 增加服务器负担

**适用场景**: 生产环境，大规模数据

### 方案B：客户端GeoJSON（当前实现）

**优点**:
- ✅ 简单快速
- ✅ 不需要额外服务器
- ✅ 易于调试

**缺点**:
- ⚠️ 大文件加载慢（TPU 67MB）
- ⚠️ 客户端渲染压力大

**适用场景**: 开发测试，小规模数据

---

## 推荐实施方案

### Phase 1: 准备GeoJSON文件 ✅

已完成的文件:
```
D:\Nat Cat Platform\Data\Shapefile\
├── Hong_Kong_18_Districts.geojson           (3.9 MB)  ✅
├── Hong_Kong_18_Districts_Lines.geojson     (3.2 MB)  ✅
└── TPUSU_2021_converted.geojson            (67.2 MB) ✅
```

### Phase 2: 上传到GeoServer

#### 2.1 准备简化的TPU文件

**问题**: 原始TPU文件太大（67MB，4916个subunit）

**解决方案**: 创建简化版本

```javascript
// 方案1: 只保留TPU层级（292个）
// 合并同一TPU下的所有subunit

// 方案2: 简化几何图形
// 使用 mapshaper 简化坐标点
```

#### 2.2 上传文件到GeoServer

需要上传以下图层:

| 图层名称 | 文件 | 大小 | 要素数 | 优先级 |
|---------|------|------|--------|--------|
| `hk_districts_18` | Hong_Kong_18_Districts.geojson | 3.9 MB | 18 | 高 ⭐ |
| `hk_districts_18_lines` | Hong_Kong_18_Districts_Lines.geojson | 3.2 MB | 49 | 中 |
| `hk_tpu_292` | TPU_simplified.geojson | ~10 MB | 292 | 高 ⭐ |
| `hk_spu_52` | SPU_grouped.geojson | ~5 MB | 52 | 中 |
| `hk_ppu_9` | PPU_grouped.geojson | ~2 MB | 9 | 低 |

### Phase 3: 在Portfolio Map中集成

#### 3.1 添加图层控制

```typescript
// 地理统计图层选择器
const [geoLayer, setGeoLayer] = useState<'none' | 'districts18' | 'ppu' | 'spu' | 'tpu'>('none');
```

#### 3.2 添加GeoServer WMS图层

```typescript
import { WMSTileLayer } from 'react-leaflet';

<WMSTileLayer
  url="http://10.253.22.15:8080/geoserver/wms"
  layers="natcat:hk_districts_18"
  format="image/png"
  transparent={true}
  opacity={0.6}
/>
```

#### 3.3 交互式统计卡片

点击地图上的区域 → 显示该区域的统计数据

---

## 立即可实施的方案

### 选项1: 混合方案（推荐）⭐

```
18区 → 使用GeoServer WMS（快速、简单）
TPU → 按需加载客户端GeoJSON（详细分析时才加载）
```

**优点**: 平衡性能和功能

### 选项2: 纯客户端方案

```
所有图层 → 客户端GeoJSON
优化: 只在需要时加载大文件
```

**优点**: 不需要修改GeoServer

---

## 实施步骤

### 立即开始（不需要GeoServer）

**步骤1**: 创建简化的TPU GeoJSON
```bash
node create-simplified-tpu.js
```

**步骤2**: 在Portfolio Map中添加图层切换
```typescript
// 添加到现有的PortfolioMap.tsx
```

**步骤3**: 集成统计数据
```typescript
// 点击区域 → 加载统计 → 显示卡片
```

### 后续优化（需要GeoServer）

**步骤4**: 上传GeoJSON到GeoServer

**步骤5**: 切换为WMS图层

**步骤6**: 配置SLD样式（按统计数据着色）

---

## 你的问题回答

### Q1: 能在Districts里面用map view来显示吗？

**答**: 可以！有两种方式：

1. **在Map View中添加图层切换**（推荐）
   - 用户在地图上切换不同层级
   - 点击区域查看统计

2. **Districts标签显示地图+统计**
   - 左侧地图
   - 右侧统计卡片

### Q2: 直接将Districts的功能集成到Map View里面？

**答**: 是的！这是最佳方案：

```
Map View
├── 图层选择器: [无] [18区] [PPU] [SPU] [TPU]
├── 地图显示: Leaflet + 边界叠加
└── 点击交互: 显示该区域统计卡片
```

### Q3: 应该先把geojson文件放在geoserver里面吗？

**答**:
- **短期**: 不必须，可以先用客户端GeoJSON快速实现
- **长期**: 建议上传，特别是TPU大文件

---

## 推荐实施顺序

### Week 1: 客户端实现
1. ✅ 创建简化的TPU GeoJSON
2. ✅ 在Map View添加图层切换
3. ✅ 实现点击区域显示统计

### Week 2: GeoServer集成
4. ⬜ 上传18区到GeoServer
5. ⬜ 上传TPU到GeoServer
6. ⬜ 切换为WMS图层

### Week 3: 优化
7. ⬜ 配置SLD样式（热力图着色）
8. ⬜ 添加图例
9. ⬜ 性能优化

---

## 下一步行动

请选择：

**A. 快速实现（不需要GeoServer）**
- 我立即在Portfolio Map中添加图层切换功能
- 使用客户端GeoJSON
- 30分钟内完成

**B. 完整方案（需要GeoServer）**
- 先创建简化的GeoJSON文件
- 准备上传脚本
- 然后集成到Map View

**C. 混合方案**
- 18区用GeoServer（立即上传）
- TPU用客户端（按需加载）

你想选择哪个方案？
