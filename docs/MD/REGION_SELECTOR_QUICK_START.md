# 🌍 地区选择功能 - 快速上手指南

## ✅ 已完成的功能

### 1. 导航栏地区选择器

**位置**：导航栏最左侧（Logo 右边）

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [China Taiping Logo]  │  [🌍 Region: 🇭🇰 香港 ▼]  │  Dashboard │ Urban │ ... │
└──────────────────────────────────────────────────────────────────────────────┘
                          ↑
                    在这里选择地区！
```

**功能特性**：
- ✅ 实时切换地区
- ✅ 显示地区图标和名称
- ✅ 自动保存选择（localStorage）
- ✅ 下次打开自动恢复
- ✅ 美观的下拉菜单

### 2. 全局地区上下文 (RegionContext)

**文件**：`src/contexts/RegionContext.tsx`

**提供的信息**：
```typescript
{
  currentRegion: 'hk',           // 当前地区代码
  regionConfig: {                // 完整配置
    code: 'hk',
    name: '香港',
    icon: '🇭🇰',
    coordinates: {
      center: [22.3193, 114.1694],
      bounds: { ... }
    },
    services: {
      geoserver: {
        url: 'http://...',
        workspace: 'HK'
      }
    },
    hazardTypes: [...]
  },
  availableRegions: [...],       // 所有可用地区
  switchRegion: (code) => {...}, // 切换地区函数
  isLoading: false               // 加载状态
}
```

### 3. API 接口

**已创建的 API**：
```
GET  /api/v1/regions              → 获取所有地区
GET  /api/v1/regions/hk           → 获取香港配置
GET  /api/v1/regions/sz           → 获取深圳配置
POST /api/v1/regions              → 创建新地区（管理员）
PUT  /api/v1/regions/hk           → 更新地区配置
DELETE /api/v1/regions/hk         → 删除地区配置
```

---

## 📱 UI 效果展示

### 地区选择器外观

**默认状态**：
```
┌────────────────────────┐
│ 🌍  🇭🇰 香港  ▼        │
└────────────────────────┘
```

**展开菜单**：
```
┌─────────────────────────────────────┐
│ ✓ 🇭🇰 香港 (Hong Kong)              │  ← 当前选中
│   🇲🇴 澳门 (Macau)        [开发中]  │
│   🏙️ 深圳 (Shenzhen)     [开发中]  │
│   🇸🇬 新加坡 (Singapore)  [开发中]  │
└─────────────────────────────────────┘
```

---

## 🎯 如何在您的页面中使用

### 方式 1：使用 Hook 获取地区信息

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';

export default function MyPage() {
  const { regionConfig, currentRegion } = useRegion();

  return (
    <div>
      <h1>{regionConfig?.icon} {regionConfig?.name}</h1>
      <p>当前地区代码：{currentRegion}</p>
      <p>GeoServer: {regionConfig?.services.geoserver.url}</p>
    </div>
  );
}
```

### 方式 2：监听地区切换事件

```tsx
useEffect(() => {
  const handleRegionChange = (event) => {
    const { regionCode, config } = event.detail;
    console.log('用户切换到:', config.name);
    // 重新加载数据
    loadData(regionCode);
  };

  window.addEventListener('regionChanged', handleRegionChange);
  return () => window.removeEventListener('regionChanged', handleRegionChange);
}, []);
```

### 方式 3：在 useEffect 中响应地区变化

```tsx
const { currentRegion } = useRegion();

useEffect(() => {
  console.log('地区已变化:', currentRegion);
  // 自动重新加载数据
  fetchData(currentRegion);
}, [currentRegion]);
```

---

## 🗺️ 在 Risk Map 中集成（示例）

### 自动切换地图中心和图层

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RiskMapPage() {
  const { regionConfig, currentRegion } = useRegion();
  const mapRef = useRef(null);
  const wmsLayersRef = useRef([]);

  useEffect(() => {
    if (!regionConfig) return;

    // 初始化地图
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView(
        regionConfig.coordinates.center,
        12
      );
      
      // 添加底图
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    }

    // 更新地图视角
    mapRef.current.setView(
      regionConfig.coordinates.center,
      12,
      { animate: true }
    );

    // 移除旧的 WMS 图层
    wmsLayersRef.current.forEach(layer => mapRef.current.removeLayer(layer));
    wmsLayersRef.current = [];

    // 添加该地区的 WMS 图层
    regionConfig.hazardTypes.forEach(hazard => {
      if (!hazard.enabled) return;

      hazard.layers.forEach(layerName => {
        const wmsLayer = L.tileLayer.wms(
          regionConfig.services.geoserver.url,
          {
            layers: `${regionConfig.services.geoserver.workspace}:${layerName}`,
            format: 'image/png',
            transparent: true
          }
        );
        wmsLayer.addTo(mapRef.current);
        wmsLayersRef.current.push(wmsLayer);
      });
    });

    console.log(`✅ 已加载 ${regionConfig.name} 的 ${wmsLayersRef.current.length} 个图层`);
  }, [regionConfig, currentRegion]);

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-white shadow">
        <h1 className="text-2xl font-bold">
          {regionConfig?.icon} {regionConfig?.name} - 风险地图
        </h1>
      </div>
      <div id="map" className="flex-1"></div>
    </div>
  );
}
```

---

## 🏢 在 Asset Management 中集成（示例）

### 验证资产是否在地区范围内

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useState } from 'react';

export default function AssetPage() {
  const { regionConfig, currentRegion } = useRegion();
  const [assets, setAssets] = useState([]);

  const handleAddAsset = (asset) => {
    const { latitude, longitude } = asset;
    const { bounds } = regionConfig.coordinates;

    // 验证坐标是否在地区范围内
    if (
      latitude < bounds.south || latitude > bounds.north ||
      longitude < bounds.west || longitude > bounds.east
    ) {
      alert(`❌ 资产位置超出${regionConfig.name}范围！`);
      return false;
    }

    // 保存资产到该地区的数据库
    fetch(`/api/v1/${currentRegion}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset)
    });

    return true;
  };

  return (
    <div>
      <h1>{regionConfig?.icon} {regionConfig?.name} - 资产管理</h1>
      <p>地区范围：
        N:{regionConfig?.coordinates.bounds.north}, 
        S:{regionConfig?.coordinates.bounds.south}, 
        E:{regionConfig?.coordinates.bounds.east}, 
        W:{regionConfig?.coordinates.bounds.west}
      </p>
      {/* 资产列表和表单 */}
    </div>
  );
}
```

---

## 🌪️ 在 Disaster Repository 中集成（示例）

### 根据地区显示灾害类型

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useState } from 'react';

export default function DisasterPage() {
  const { regionConfig, currentRegion } = useRegion();
  const [disasters, setDisasters] = useState([]);

  useEffect(() => {
    // 加载该地区的灾害数据
    fetch(`/api/v1/${currentRegion}/disasters`)
      .then(res => res.json())
      .then(data => setDisasters(data.data || []));
  }, [currentRegion]);

  return (
    <div>
      <h1>{regionConfig?.icon} {regionConfig?.name} - 灾害数据库</h1>
      
      {/* 显示该地区支持的灾害类型 */}
      <div className="mb-4">
        <h3>支持的灾害类型：</h3>
        <div className="flex gap-2">
          {regionConfig?.hazardTypes
            .filter(h => h.enabled)
            .map(hazard => (
              <div key={hazard.type} className="px-4 py-2 bg-blue-100 rounded">
                {hazard.type} (权重: {hazard.weight * 100}%)
              </div>
            ))}
        </div>
      </div>

      {/* 灾害列表 */}
      <div>
        {disasters.length === 0 ? (
          <p>暂无灾害数据</p>
        ) : (
          disasters.map(disaster => (
            <div key={disaster.id}>{disaster.name}</div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 📊 可用的地区配置数据

### 香港 (hk) - 已上线 ✅
```json
{
  "code": "hk",
  "name": "香港",
  "icon": "🇭🇰",
  "center": [22.3193, 114.1694],
  "geoserver": "http://143.89.22.7:8090/geoserver/wms",
  "workspace": "HK",
  "hazards": ["flood", "typhoon", "rainstorm", "landslide"]
}
```

### 澳门 (mo) - 开发中 🚧
```json
{
  "code": "mo",
  "name": "澳门",
  "icon": "🇲🇴",
  "center": [22.1987, 113.5439],
  "hazards": ["flood", "typhoon"]
}
```

### 深圳 (sz) - 开发中 🚧
```json
{
  "code": "sz",
  "name": "深圳",
  "icon": "🏙️",
  "center": [22.5431, 114.0579],
  "hazards": ["flood", "rainstorm"]
}
```

### 新加坡 (sg) - 开发中 🚧
```json
{
  "code": "sg",
  "name": "新加坡",
  "icon": "🇸🇬",
  "center": [1.3521, 103.8198],
  "hazards": ["flood"]
}
```

---

## 🔄 地区切换的数据流

```
用户点击地区选择器
    ↓
调用 switchRegion('sz')
    ↓
更新 RegionContext 状态
    ↓
触发 'regionChanged' 事件
    ↓
所有页面的 useEffect 自动执行
    ↓
1. Risk Map：切换地图中心和图层
2. Disaster：重新加载灾害数据
3. Asset：更新地区边界验证
4. 其他页面：自动响应
```

---

## ✨ 现在您可以做什么

### 1. 在任何页面获取当前地区信息
```tsx
const { regionConfig } = useRegion();
console.log(regionConfig.name); // "香港"
```

### 2. 根据地区加载不同的数据
```tsx
fetch(`/api/v1/${currentRegion}/disasters`)
```

### 3. 根据地区显示不同的地图图层
```tsx
L.tileLayer.wms(regionConfig.services.geoserver.url, {
  layers: `${regionConfig.services.geoserver.workspace}:flood_100yr`
})
```

### 4. 验证数据是否属于当前地区
```tsx
if (lat < bounds.south || lat > bounds.north) {
  alert('超出地区范围！');
}
```

---

## 🚀 下一步建议

### 立即可做：
1. ✅ 在 Risk Map 页面中集成地区信息
2. ✅ 在 Disaster Repository 中根据地区过滤数据
3. ✅ 在 Asset Management 中验证资产位置

### 短期计划：
1. 🔄 创建地区管理页面（添加/编辑地区）
2. 🔄 实现地区权限控制（不同团队只能访问自己的地区）
3. 🔄 添加地区统计数据（资产数量、灾害数量）

### 中期计划：
1. 🔄 支持地区数据导入/导出
2. 🔄 地区数据备份和恢复
3. 🔄 多地区数据对比分析

---

## 📞 需要帮助？

如果您需要：
- 在某个具体页面中集成地区功能
- 创建新的地区配置
- 实现地区相关的 API
- 添加新的地区特定功能

随时告诉我！😊
