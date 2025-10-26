# Cresta Zone Shapefile 快速使用指南

## 🎯 已完成的功能

✅ **Choropleth Map（分级着色地图）** - 按保额用颜色深浅显示区域风险
✅ **Shapefile 上传** - 支持 .zip 或 .shp 文件直接上传
✅ **智能区域匹配** - 自动将合约区域映射到 Cresta Zone
✅ **交互式地图** - 鼠标悬停高亮，点击查看详情
✅ **双模式切换** - Treaties（合约）/ Regional（区域）视图一键切换
✅ **动态图例** - 自动识别是否加载了 shapefile 并调整说明

## 🚀 如何使用

### 方式一：使用示例 GeoJSON 文件（快速测试）

1. **启动开发服务器**（如果还没运行）
   ```powershell
   npm run dev
   ```

2. **访问 Asset Management 页面**
   - 打开浏览器：http://localhost:3003/asset

3. **切换到 Regional 视图**
   - 点击左侧边栏的 "🌍 Regional" 按钮

4. **加载示例 shapefile**
   - 点击 "Cresta Zone Shapefile" 文件上传框
   - 选择文件：`public/data/sample-cresta-zones.geojson`
   - 等待加载完成（显示 "✓ 已加载 6 个区域"）

5. **查看效果**
   - 地图上会显示带颜色的区域多边形
   - 颜色深浅代表保额利用率
   - 鼠标悬停区域会高亮显示
   - 点击区域查看详细统计

### 方式二：使用真实 Cresta Zone Shapefile

#### 准备文件

1. **获取 Cresta Zone 数据**
   - 从 Cresta 官方或数据提供商获取 shapefile
   - 确保包含以下文件：
     - `cresta_zones.shp` (主文件)
     - `cresta_zones.shx` (索引)
     - `cresta_zones.dbf` (属性表)
     - `cresta_zones.prj` (投影，可选)

2. **打包成 .zip**
   ```powershell
   # 将所有文件压缩到一个 .zip 文件中
   Compress-Archive -Path cresta_zones.* -DestinationPath cresta_zones.zip
   ```

#### 上传和显示

1. **切换到 Regional 视图**
   - 点击 "🌍 Regional" 按钮

2. **上传 shapefile**
   - 点击文件上传框
   - 选择 `cresta_zones.zip` 文件
   - 系统会自动解析并加载

3. **验证加载**
   - 查看提示信息：应显示加载的区域数量
   - 地图上应显示彩色区域多边形

## 🎨 视觉效果说明

### 颜色编码（基于利用率）

| 颜色 | 利用率范围 | 风险等级 |
|------|------------|----------|
| 🟢 绿色 | < 70% | 安全 |
| 🟡 黄色 | 70-79% | 中等 |
| 🟠 橙色 | 80-89% | 高风险 |
| 🔴 红色 | ≥ 90% | 极高风险 |

### 透明度编码（基于利用率）

- **浅色半透明** = 低利用率（< 50%）
- **深色不透明** = 高利用率（≥ 90%）
- 透明度范围：30% - 80%

### 区域匹配逻辑

系统会自动匹配：
- `ZONE_NAME` 字段（如 "Hong Kong"）
- `COUNTRY` 字段（如 "China"）
- `REGION` 字段（如 "Hong Kong SAR"）

与合约的 `regions` 字段进行模糊匹配。

## 📊 交互功能

### 1. 鼠标悬停
- 区域边界加粗（2px → 3px）
- 填充透明度增加（50% → 70%）
- 边框变为蓝色

### 2. 点击查看详情
显示弹窗包含：
- 区域名称
- 合约数量
- 总保额
- 总限额
- 平均利用率
- 高风险警告（如果利用率 ≥ 85%）
- "View Treaties" 按钮（切换到合约视图并自动筛选）

### 3. 区域筛选
- 点击弹窗中的 "View X Treaties →" 按钮
- 自动切换回 Treaties 视图
- 自动应用区域筛选器
- 显示该区域的所有合约

## 🔧 自定义配置

### 修改区域匹配规则

如果你的合约区域名称与 Cresta Zone 不匹配，编辑 `src/lib/shapefileLoader.ts`：

```typescript
const REGION_MAPPING: Record<string, string> = {
  'HK': 'Hong Kong',
  '香港': 'Hong Kong',
  '澳门': 'Macau',
  '泰国': 'Thailand',
  // 添加你的映射规则
};
```

### 调整颜色方案

在 `src/app/asset/page.tsx` 中修改 `getZoneStyle()` 函数：

```typescript
return {
  fillColor: regionAgg.color,  // 修改颜色逻辑
  fillOpacity: 0.3 + (regionAgg.utilization / 100) * 0.4,  // 调整透明度
  color: '#FFFFFF',  // 边框颜色
  weight: 2  // 边框宽度
};
```

### 优化性能

如果 shapefile 太大导致卡顿：

1. **简化几何图形**
   ```bash
   npm install -g mapshaper
   mapshaper cresta_zones.shp -simplify 10% -o cresta_zones_simplified.shp
   ```

2. **转换为 GeoJSON**（更快）
   ```bash
   ogr2ogr -f GeoJSON cresta_zones.geojson cresta_zones.shp
   ```

3. **减少精度**
   ```bash
   mapshaper cresta_zones.shp -simplify dp 20% -o precision=0.001 cresta_zones_optimized.shp
   ```

## ⚠️ 常见问题

### Q: 上传后地图没有显示区域

**可能原因：**
1. shapefile 缺少必要文件（.shx 或 .dbf）
2. 投影坐标系不是 WGS84 (EPSG:4326)
3. 属性表字段名不匹配

**解决方案：**
- 检查 .zip 包含所有必要文件
- 使用 QGIS 或 ogr2ogr 转换投影：
  ```bash
  ogr2ogr -t_srs EPSG:4326 output.shp input.shp
  ```
- 打开浏览器控制台查看错误信息

### Q: 区域颜色都是灰色

**原因：** 区域名称没有匹配到任何合约

**解决方案：**
1. 检查 shapefile 的 `ZONE_NAME` 字段值
2. 检查合约的 `regions` 字段值
3. 在 `shapefileLoader.ts` 中添加映射规则
4. 打开浏览器控制台查看匹配日志

### Q: 加载很慢或浏览器卡顿

**原因：** Shapefile 文件太大（几何图形过于复杂）

**解决方案：**
- 使用 mapshaper 简化几何图形（保留 10-20% 的点）
- 转换为 GeoJSON 格式
- 考虑按区域分割大型 shapefile

### Q: 点击区域后没有切换到合约视图

**原因：** 区域名称与筛选器不匹配

**解决方案：**
- 确保 `regionAgg.region` 的值与合约的 `treaty.regions` 值完全一致
- 检查 `matchRegionToZone()` 函数的匹配逻辑

## 📈 下一步增强

可选的进一步优化：

1. **自动加载 shapefile**
   ```typescript
   useEffect(() => {
     loadShapefile('/data/cresta-zones/cresta_zones.zip')
       .then(setCrestaZones);
   }, []);
   ```

2. **多个 shapefile 切换**
   - Cresta Zone
   - 行政边界
   - 自定义风险区域

3. **时间序列动画**
   - 按月/季度显示保额变化
   - 热力图动画效果

4. **导出功能**
   - 导出区域聚合数据到 Excel
   - 生成 PDF 风险报告

5. **高级筛选**
   - 按 Cresta Zone 代码筛选
   - 多区域对比视图

## 📚 参考资源

- **Cresta Zone 官网**: https://www.cresta.org/
- **shpjs 文档**: https://github.com/calvinmetcalf/shapefile-js
- **Leaflet GeoJSON**: https://leafletjs.com/reference.html#geojson
- **Mapshaper 在线工具**: https://mapshaper.org/
- **QGIS**: https://qgis.org/ (处理 shapefile)

## 💡 提示

- 使用 Ctrl+F12 打开浏览器开发者工具查看调试信息
- 查看控制台的 "Loaded Cresta Zones: X zones" 消息确认加载成功
- 如果遇到问题，先用提供的 `sample-cresta-zones.geojson` 测试
- 建议在真实 Cresta Zone 数据上线前，用简化的测试数据验证逻辑
