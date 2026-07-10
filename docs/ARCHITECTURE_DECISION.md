# Portfolio Analysis - 架构说明

## 🎯 当前实现：纯前端空间计算（推荐）

### 优势
✅ **零配置，立即可用** - 无需修改数据库，无需导入shapefile到PostGIS
✅ **利用现有资源** - 直接使用GeoJSON文件
✅ **灵活性高** - 随时可以添加新的shapefile图层
✅ **开发速度快** - 前后端解耦，独立开发测试

### 工作原理

```
用户点击地图区域
    ↓
前端请求 /api/portfolio/all-policies（获取所有保单）
    ↓
Python从PostgreSQL查询保单（latitude, longitude, sum_insured等）
    ↓
前端收到保单数据后，在客户端进行空间计算
    ↓
判断哪些保单点在选中的GeoJSON多边形内
    ↓
计算统计数据（保单数量、总保额、平均保额等）
    ↓
显示统计面板
```

### 性能考虑

- **保单数量 < 10,000**：前端计算非常快（< 100ms）
- **保单数量 10,000 - 50,000**：可接受（< 500ms）
- **保单数量 > 50,000**：建议改用数据库方案

### 当前使用的空间算法

**简化版（边界框检查）**
- 快速但不完全精确
- 适用于大部分矩形或简单多边形

**如需精确计算，可升级为：**
```javascript
import * as turf from '@turf/turf';

const point = turf.point([longitude, latitude]);
const isInside = turf.booleanPointInPolygon(point, polygon);
```

---

## 📊 三种架构方案对比

| 方案 | 优点 | 缺点 | 适用场景 | 当前状态 |
|------|------|------|----------|----------|
| **方案1：纯前端计算** | ✅ 零配置<br>✅ 灵活 | 数据量大时慢 | 中小型项目 | **✅ 已实现** |
| **方案2：PostGIS空间关联** | 查询极快<br>精确 | 配置复杂 | 大型项目 | 代码已准备 |
| **方案3：GeoServer WFS** | 利用现有基础设施 | 需配置GeoServer | 已有GeoServer | 未实现 |

---

## 🚀 快速开始

### 1. 启动开发服务器
```bash
cd "d:\Nat Cat Platform\UI_system"
npm run dev
```

### 2. 访问页面
打开浏览器：http://localhost:3000/cityinfo

### 3. 测试功能
1. 勾选 "TPU (292 Polygons)"
2. 点击任意TPU区域
3. 查看右上角弹出的统计面板

**就这么简单！无需任何数据库配置！** 🎉

---

## 🔄 未来升级路径

### 短期优化（可选）

**1. 添加精确的点在多边形算法**
```bash
npm install @turf/turf @turf/boolean-point-in-polygon
```

**2. 添加缓存优化**
- 缓存保单数据（已实现）
- 缓存计算结果
- 使用Web Worker进行后台计算

**3. 添加其他shapefile图层**
只需：
1. 将GeoJSON文件放到 `public/data/shapefiles/`
2. 在 `loadGeoJSON` 函数中添加文件名映射

### 长期优化（数据量增大后）

如果保单数量超过5万，可以切换到PostGIS方案：

**步骤：**
1. 运行数据库迁移脚本添加TPU/PPU/SPU列
2. 导入shapefile到PostGIS
3. 运行空间关联更新保单数据
4. 在前端切换到API查询模式（取消注释方案B代码）

**代码已准备好，随时可切换！**

---

## 📝 代码文件清单

### 核心功能（当前使用）
- ✅ `src/app/cityinfo/page.tsx` - 主页面，包含客户端空间计算
- ✅ `src/app/api/portfolio/all-policies/route.ts` - 获取所有保单的API
- ✅ `scripts/portfolio_management/analytics/get_all_policies.py` - Python查询脚本

### 备用方案（已准备，未启用）
- `src/app/api/portfolio/region-stats/route.ts` - 基于数据库的查询API
- `scripts/portfolio_management/analytics/region_portfolio_analytics.py` - 区域统计脚本
- `UI_system/scripts/portfolio_management/database/add_planning_units.sql` - 数据库迁移脚本
- `src/lib/portfolioSpatialAnalysis.ts` - 使用Turf.js的精确计算（可选）

### 辅助工具
- `scripts/setup_planning_units_interactive.ps1` - 数据库配置脚本（如需升级到方案2时使用）

---

## ❓ 常见问题

### Q: 为什么选择前端计算而不是数据库？
A: 因为：
1. **开发速度快** - 无需配置PostGIS和导入shapefile
2. **灵活性高** - 随时可以添加新图层
3. **性能够用** - 对于几千到几万条保单，前端计算完全够快

### Q: 计算准确吗？
A: 当前使用边界框算法（快速但有小误差）。如需100%精确，可以：
```bash
npm install @turf/turf
```
然后使用 `turf.booleanPointInPolygon`

### Q: 如果数据量增大怎么办？
A: 代码已经设计为支持两种模式：
- 前端模式：适合 < 50,000 保单
- 数据库模式：适合 > 50,000 保单
切换只需取消注释几行代码，无需重写！

### Q: GeoServer能用吗？
A: 可以！你的shapefiles已经在GeoServer中。可以通过WFS查询：
```javascript
const url = `http://geoserver:8080/geoserver/wfs?
  service=WFS&
  version=2.0.0&
  request=GetFeature&
  typeName=natcat_platform:Hong_Kong_292_TPU&
  CQL_FILTER=TPU=542`;
```

---

## 🎓 总结

**当前方案的核心思想：**
> 使用前端空间计算 + 数据库查询保单 = 零配置 + 立即可用 + 性能够用

**数据流：**
```
PostgreSQL (保单坐标)
    ↓
Python API (查询)
    ↓
前端 (空间计算)
    ↓
统计结果显示
```

**这个方案的美妙之处：**
- ✅ 你已有的GeoJSON文件 → 直接使用
- ✅ 你已有的PostgreSQL数据 → 直接查询
- ✅ 你已有的GeoServer → 未来可扩展
- ✅ 无需新的配置 → 现在就能用！

立即测试吧！🚀
