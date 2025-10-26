# Cresta Zone Shapefile 集成指南

## 概述

本系统支持导入 Cresta Zone shapefile 来实现基于真实地理边界的风险区域可视化。相比圆圈标记，shapefile 提供更精确的地理表示和专业的保险行业标准。

## 功能特性

### 1. **Choropleth Map（分级着色地图）**
- ✅ 基于保额使用深浅不同的颜色填充区域
- ✅ 颜色越深 = 保额越高 / 利用率越高
- ✅ 支持透明度渐变（高风险区域更不透明）

### 2. **区域匹配系统**
- ✅ 自动将合约的 region 字段匹配到 Cresta Zone
- ✅ 支持模糊匹配（Hong Kong → HKG, Thailand → THA）
- ✅ 处理 MultiPolygon（复杂地理边界）

### 3. **交互功能**
- ✅ 点击区域查看详细统计
- ✅ 鼠标悬停高亮显示
- ✅ 显示区域名称标签

## 文件准备

### Cresta Zone Shapefile 要求

您需要准备以下文件（通常打包在 .zip 中）：

```
cresta_zones.zip
├── cresta_zones.shp      # 主文件（几何图形）
├── cresta_zones.shx      # 索引文件
├── cresta_zones.dbf      # 属性表（必须包含区域名称）
└── cresta_zones.prj      # 投影信息（可选）
```

### 属性表字段建议

您的 shapefile 属性表应包含以下字段：

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `ZONE_CODE` | String | Cresta Zone 代码 | `HKG-001` |
| `ZONE_NAME` | String | 区域名称 | `Hong Kong` |
| `COUNTRY` | String | 国家 | `China` |
| `REGION` | String | 区域 | `Hong Kong SAR` |

## 集成步骤

### 方式一：静态文件部署（推荐用于生产环境）

1. **放置 shapefile 到 public 目录**

```bash
# 将 shapefile 复制到 public/data 目录
mkdir -p public/data/cresta-zones
cp cresta_zones.zip public/data/cresta-zones/
```

2. **在代码中加载**

```typescript
import { loadShapefile } from '@/lib/shapefileLoader';

const geojson = await loadShapefile('/data/cresta-zones/cresta_zones.zip');
```

### 方式二：用户上传（灵活但需要处理安全性）

1. **添加文件上传按钮**

```tsx
<input 
  type="file" 
  accept=".zip,.shp" 
  onChange={handleShapefileUpload}
/>
```

2. **处理上传的文件**

```typescript
import { loadShapefileFromFile } from '@/lib/shapefileLoader';

const handleShapefileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    const geojson = await loadShapefileFromFile(file);
    setCrestaZones(geojson);
  } catch (error) {
    alert('Shapefile 加载失败: ' + error.message);
  }
};
```

## 代码集成示例

### 完整实现

```tsx
"use client"

import { useState, useEffect } from 'react';
import { loadShapefile, matchRegionToZone, getUtilizationColorHex } from '@/lib/shapefileLoader';

export default function AssetPage() {
  const [crestaZones, setCrestaZones] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'treaties' | 'regions'>('treaties');
  
  // 加载 Cresta Zone shapefile
  useEffect(() => {
    const loadZones = async () => {
      try {
        const geojson = await loadShapefile('/data/cresta-zones/cresta_zones.zip');
        setCrestaZones(geojson);
      } catch (error) {
        console.error('Failed to load Cresta Zones:', error);
      }
    };
    loadZones();
  }, []);
  
  // 为每个 zone 计算聚合数据
  const getZoneStyle = (feature: any) => {
    // 找到匹配的合约
    const matchedTreaties = treaties.filter(treaty => 
      matchRegionToZone(treaty.regions[0], [feature])
    );
    
    if (matchedTreaties.length === 0) {
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.3,
        color: '#9CA3AF',
        weight: 1
      };
    }
    
    // 计算总保额和利用率
    const totalExposure = matchedTreaties.reduce((sum, t) => sum + t.currentExposure, 0);
    const totalLimit = matchedTreaties.reduce((sum, t) => sum + t.treatyLimit, 0);
    const avgUtilization = (totalExposure / totalLimit) * 100;
    
    return {
      fillColor: getUtilizationColorHex(avgUtilization),
      fillOpacity: 0.3 + (avgUtilization / 100) * 0.5,
      color: '#FFFFFF',
      weight: 2
    };
  };
  
  return (
    <MapContainer>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* 显示 Cresta Zone 区域 */}
      {viewMode === 'regions' && crestaZones && (
        <GeoJSON 
          data={crestaZones}
          style={getZoneStyle}
          onEachFeature={(feature, layer) => {
            layer.on({
              mouseover: (e) => {
                e.target.setStyle({ weight: 3, fillOpacity: 0.7 });
              },
              mouseout: (e) => {
                e.target.setStyle({ weight: 2, fillOpacity: 0.5 });
              }
            });
            
            // 添加弹出窗口
            layer.bindPopup(`
              <h3>${feature.properties.ZONE_NAME}</h3>
              <p>Zone Code: ${feature.properties.ZONE_CODE}</p>
              <p>Total Exposure: $${totalExposure.toLocaleString()}</p>
            `);
          }}
        />
      )}
      
      {/* 原有的合约标记 */}
      {viewMode === 'treaties' && treaties.map(treaty => (
        <Marker key={treaty.id} position={treaty.coordinates} />
      ))}
    </MapContainer>
  );
}
```

## 区域映射配置

### 如果你的合约区域名称与 Cresta Zone 不完全匹配

在 `src/lib/shapefileLoader.ts` 中添加映射规则：

```typescript
const REGION_MAPPING: Record<string, string> = {
  // 你的合约区域名 -> Cresta Zone 名称
  'Hong Kong': 'HKG',
  'Macau': 'MAC',
  'GBA': 'GBA',
  'Thailand': 'THA',
  'Singapore': 'SGP',
  'ASEAN': 'ASEAN'
};

export function normalizeRegionName(regionName: string): string {
  return REGION_MAPPING[regionName] || regionName;
}
```

## 性能优化建议

### 1. Shapefile 简化

如果 shapefile 文件太大（>5MB），建议简化：

```bash
# 使用 mapshaper 简化几何图形（保留 10% 的点）
npm install -g mapshaper
mapshaper cresta_zones.shp -simplify 10% -o format=shapefile cresta_zones_simplified.shp
```

### 2. 转换为 GeoJSON

可以预先转换为 GeoJSON 格式（更快）：

```bash
ogr2ogr -f GeoJSON cresta_zones.geojson cresta_zones.shp
```

然后直接导入：

```typescript
import crestaZones from '@/public/data/cresta_zones.geojson';

// 直接使用，无需异步加载
<GeoJSON data={crestaZones} />
```

## 视觉效果增强

### 添加渐变色图例

```tsx
<div className="legend">
  <h4>保额分布</h4>
  <div className="gradient-bar" style={{
    background: 'linear-gradient(to right, #10B981, #FACC15, #F97316, #DC2626)'
  }} />
  <div className="labels">
    <span>低</span>
    <span>中</span>
    <span>高</span>
    <span>极高</span>
  </div>
</div>
```

### 添加区域标签

```typescript
import L from 'leaflet';
import { getPolygonCentroid } from '@/lib/shapefileLoader';

// 在区域中心显示标签
const centroid = getPolygonCentroid(feature.geometry.coordinates);
if (centroid) {
  L.marker(centroid, {
    icon: L.divIcon({
      className: 'zone-label',
      html: `<div class="text-xs font-bold">${feature.properties.ZONE_NAME}</div>`
    })
  }).addTo(map);
}
```

## 常见问题

### Q: Shapefile 加载失败
**A:** 确保 .shp, .shx, .dbf 文件都在同一个 .zip 压缩包中。

### Q: 区域没有匹配上
**A:** 检查 shapefile 属性表的字段名，修改 `matchRegionToZone()` 函数中的匹配逻辑。

### Q: 地图显示空白
**A:** 检查投影坐标系统，Cresta Zone 应使用 WGS84 (EPSG:4326)。

### Q: 颜色显示不正确
**A:** 检查 `getZoneStyle()` 函数中的利用率计算逻辑。

## 下一步

1. ✅ 准备 Cresta Zone shapefile
2. ✅ 修改 `page.tsx` 集成 GeoJSON 渲染
3. ✅ 测试区域匹配逻辑
4. ✅ 调整颜色方案和透明度
5. ✅ 添加交互功能（hover, click）
6. ✅ 优化性能（简化几何图形）

## 参考资源

- [Cresta Zone 官方网站](https://www.cresta.org/)
- [Leaflet GeoJSON 文档](https://leafletjs.com/reference.html#geojson)
- [shpjs GitHub](https://github.com/calvinmetcalf/shapefile-js)
- [Mapshaper 简化工具](https://mapshaper.org/)
