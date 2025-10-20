# 如何在各个模块中使用地区信息

## 📍 地区选择器已集成到导航栏

**位置**：导航栏最左侧（Logo 右边）
**功能**：选择地区后，所有页面自动使用该地区的配置

---

## 🎯 在各个页面中使用地区信息

### 1. Risk Map (风险地图)

**文件**：`src/app/riskmap/page.tsx`

**使用方式**：
```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useState } from 'react';

export default function RiskMapPage() {
  const { regionConfig, currentRegion } = useRegion();
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!regionConfig) return;

    // 使用地区配置初始化地图
    const mapInstance = L.map('map').setView(
      regionConfig.coordinates.center,  // 使用地区中心坐标
      12
    );

    // 添加 WMS 图层
    L.tileLayer.wms(regionConfig.services.geoserver.url, {
      layers: `${regionConfig.services.geoserver.workspace}:flood_100yr`,
      format: 'image/png',
      transparent: true
    }).addTo(mapInstance);

    setMap(mapInstance);
  }, [regionConfig]);

  // 监听地区切换事件
  useEffect(() => {
    const handleRegionChange = (event) => {
      const { config } = event.detail;
      console.log('地区已切换到:', config.name);
      
      // 重新加载地图数据
      if (map) {
        map.setView(config.coordinates.center, 12);
      }
    };

    window.addEventListener('regionChanged', handleRegionChange);
    return () => window.removeEventListener('regionChanged', handleRegionChange);
  }, [map]);

  if (!regionConfig) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h1>{regionConfig.name} - 风险地图</h1>
      <div id="map" style={{ height: '600px' }}></div>
      
      {/* 显示该地区可用的灾害类型 */}
      <div className="hazard-types">
        {regionConfig.hazardTypes
          .filter(h => h.enabled)
          .map(hazard => (
            <button key={hazard.type}>
              {hazard.type} (权重: {hazard.weight})
            </button>
          ))}
      </div>
    </div>
  );
}
```

---

### 2. Disaster Repository (灾害数据库)

**文件**：`src/app/disasterinfo/page.tsx`

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useState } from 'react';

export default function DisasterInfoPage() {
  const { currentRegion, regionConfig } = useRegion();
  const [disasters, setDisasters] = useState([]);

  useEffect(() => {
    // 根据地区加载灾害数据
    fetch(`/api/v1/${currentRegion}/disasters`)
      .then(res => res.json())
      .then(data => setDisasters(data));
  }, [currentRegion]);

  return (
    <div>
      <h1>{regionConfig?.icon} {regionConfig?.name} - 灾害数据</h1>
      <p>当前地区支持的灾害类型：</p>
      <ul>
        {regionConfig?.hazardTypes.map(h => (
          h.enabled && <li key={h.type}>{h.type}</li>
        ))}
      </ul>
      
      {/* 灾害列表 */}
      <div>
        {disasters.map(disaster => (
          <div key={disaster.id}>{disaster.name}</div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. Asset Management (资产管理)

**文件**：`src/app/asset/page.tsx`

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useState } from 'react';

export default function AssetPage() {
  const { currentRegion, regionConfig } = useRegion();
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    // 加载该地区的资产数据
    fetch(`/api/v1/${currentRegion}/assets`)
      .then(res => res.json())
      .then(data => setAssets(data));
  }, [currentRegion]);

  // 添加资产时使用地区边界验证
  const handleAddAsset = async (asset) => {
    const { coordinates } = asset;
    const { bounds } = regionConfig.coordinates;
    
    // 验证坐标是否在地区范围内
    if (
      coordinates[0] < bounds.south || coordinates[0] > bounds.north ||
      coordinates[1] < bounds.west || coordinates[1] > bounds.east
    ) {
      alert(`资产位置超出${regionConfig.name}范围！`);
      return;
    }

    // 提交到该地区的 API
    await fetch(`/api/v1/${currentRegion}/assets`, {
      method: 'POST',
      body: JSON.stringify(asset)
    });
  };

  return (
    <div>
      <h1>{regionConfig?.name} - 资产管理</h1>
      <p>地区范围：{JSON.stringify(regionConfig?.coordinates.bounds)}</p>
      {/* 资产列表 */}
    </div>
  );
}
```

---

### 4. Geospatial Data Hub (地理空间数据中心)

**文件**：`src/app/cityinfo/page.tsx`

```tsx
'use client';

import { useRegion } from '@/contexts/RegionContext';

export default function CityInfoPage() {
  const { regionConfig } = useRegion();

  return (
    <div>
      <h1>{regionConfig?.icon} {regionConfig?.name} - 城市信息</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3>基本信息</h3>
          <p>英文名：{regionConfig?.nameEn}</p>
          <p>中文名：{regionConfig?.nameCn}</p>
          <p>中心坐标：{regionConfig?.coordinates.center.join(', ')}</p>
        </div>
        
        <div>
          <h3>服务配置</h3>
          <p>GeoServer: {regionConfig?.services.geoserver.url}</p>
          <p>工作空间: {regionConfig?.services.geoserver.workspace}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔄 地区切换的自动响应

### 方法 1：使用 useEffect 监听 currentRegion

```tsx
const { currentRegion } = useRegion();

useEffect(() => {
  console.log('地区已切换到:', currentRegion);
  // 重新加载数据
  loadData(currentRegion);
}, [currentRegion]);
```

### 方法 2：监听自定义事件

```tsx
useEffect(() => {
  const handleRegionChange = (event) => {
    const { regionCode, config } = event.detail;
    console.log('地区切换:', regionCode, config);
    // 执行切换逻辑
  };

  window.addEventListener('regionChanged', handleRegionChange);
  return () => window.removeEventListener('regionChanged', handleRegionChange);
}, []);
```

---

## 🗺️ 地图图层自动切换示例

```tsx
import { useRegion } from '@/contexts/RegionContext';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

export function MapComponent() {
  const { regionConfig, currentRegion } = useRegion();
  const mapRef = useRef(null);
  const wmsLayersRef = useRef([]);

  useEffect(() => {
    if (!regionConfig || !mapRef.current) return;

    // 移除旧图层
    wmsLayersRef.current.forEach(layer => {
      mapRef.current.removeLayer(layer);
    });
    wmsLayersRef.current = [];

    // 更新地图视角
    mapRef.current.setView(
      regionConfig.coordinates.center,
      12,
      { animate: true, duration: 1 }
    );

    // 添加该地区的 WMS 图层
    regionConfig.hazardTypes.forEach(hazard => {
      if (!hazard.enabled) return;

      hazard.layers.forEach(layerName => {
        const wmsLayer = L.tileLayer.wms(
          regionConfig.services.geoserver.url,
          {
            layers: `${regionConfig.services.geoserver.workspace}:${layerName}`,
            format: 'image/png',
            transparent: true,
            attribution: `${regionConfig.name} - ${hazard.type}`
          }
        );
        
        wmsLayer.addTo(mapRef.current);
        wmsLayersRef.current.push(wmsLayer);
      });
    });

    console.log(`✅ 已加载 ${regionConfig.name} 的 ${wmsLayersRef.current.length} 个图层`);
  }, [regionConfig, currentRegion]);

  return <div id="map" ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}
```

---

## 📡 API 调用示例

### 统一的 API 调用函数

```tsx
// src/lib/api/region-api.ts
import { useRegion } from '@/contexts/RegionContext';

export function useRegionAPI() {
  const { currentRegion } = useRegion();

  const fetchDisasters = async () => {
    const response = await fetch(`/api/v1/${currentRegion}/disasters`);
    return response.json();
  };

  const fetchAssets = async () => {
    const response = await fetch(`/api/v1/${currentRegion}/assets`);
    return response.json();
  };

  const fetchRiskAssessment = async (data: any) => {
    const response = await fetch(`/api/v1/${currentRegion}/risk-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  };

  return {
    fetchDisasters,
    fetchAssets,
    fetchRiskAssessment
  };
}
```

### 使用方式

```tsx
import { useRegionAPI } from '@/lib/api/region-api';

export function MyComponent() {
  const { fetchDisasters } = useRegionAPI();
  
  useEffect(() => {
    fetchDisasters().then(data => {
      console.log('灾害数据:', data);
    });
  }, []);
}
```

---

## ✅ 实现效果

1. **导航栏最左侧**显示地区选择器 `[🇭🇰 香港 ▼]`
2. **选择地区后**，所有页面自动：
   - 切换到该地区的坐标中心
   - 加载该地区的 GeoServer 图层
   - 显示该地区的灾害类型
   - 调用该地区的 API 接口
3. **地区配置自动保存**到 localStorage
4. **下次打开自动恢复**用户上次选择的地区

---

## 🎨 UI 效果预览

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]  │  [🇭🇰 香港 ▼]  │  Dashboard  │  Urban  │  Disaster  │ ... │
└─────────────────────────────────────────────────────────────────────┘
            ↑
         这里！最左侧
```

点击后下拉菜单：
```
┌────────────────────────────┐
│ ✓ 🇭🇰 香港 (Hong Kong)     │
│   🇲🇴 澳门 (Macau) [开发中] │
│   🏙️ 深圳 (Shenzhen) [开发中]│
│   🇸🇬 新加坡 (Singapore) [开发中]│
└────────────────────────────┘
```

---

## 🚀 下一步

现在您可以：

1. **在 Risk Map 中集成地区信息**
   - 使用 `regionConfig.coordinates.center` 设置地图中心
   - 使用 `regionConfig.services.geoserver.url` 加载 WMS 图层

2. **在 Disaster Repository 中过滤地区数据**
   - 只显示当前地区的灾害事件
   - 根据 `regionConfig.hazardTypes` 显示可用灾害类型

3. **在 Asset Management 中验证资产位置**
   - 使用 `regionConfig.coordinates.bounds` 验证坐标范围

需要我帮您在某个具体页面中集成地区功能吗？😊
