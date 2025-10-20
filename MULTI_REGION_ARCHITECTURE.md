# 多地区灾害风险评估平台架构设计

## 🌏 业务需求

**目标地区**：
- 🇭🇰 香港 & 🇲🇴 澳门（已有）
- 🇨🇳 粤港澳大湾区其他城市（广州、深圳、东莞、珠海、佛山、惠州、中山、江门、肇庆）
- 🌏 东南亚（新加坡、马来西亚、泰国、菲律宾、印尼等）

**团队模式**：
- 不同地区由不同团队开发维护
- 需要统一的接口标准
- 数据隔离 + 共享核心能力

---

## 🏗️ 架构设计方案

### 方案一：微服务 + 地区模块化（推荐）

```
┌─────────────────────────────────────────────────────────────┐
│              统一前端门户 (Portal)                            │
│          https://natcat-system.com                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (统一入口)                       │
│              /api/v1/{region}/{service}                      │
└─────────────────────────────────────────────────────────────┘
        ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 港澳模块      │  │ 大湾区模块    │  │ 东南亚模块    │
│ HK-MO        │  │ GBA          │  │ SEA          │
│              │  │              │  │              │
│ Team A       │  │ Team B       │  │ Team C       │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓                  ↓                  ↓
┌──────────────────────────────────────────────────┐
│          共享核心服务 (Core Services)              │
│  - 用户认证服务                                   │
│  - 数据存储服务                                   │
│  - 地图渲染引擎                                   │
│  - 风险计算引擎                                   │
│  - 报告生成服务                                   │
└──────────────────────────────────────────────────┘
```

---

## 📡 接口设计规范

### 1. RESTful API 标准

#### 基础 URL 结构
```
https://api.natcat-system.com/v1/{region}/{resource}
```

**地区代码 (region)**：
```typescript
type RegionCode = 
  | 'hk'       // 香港
  | 'mo'       // 澳门
  | 'gz'       // 广州
  | 'sz'       // 深圳
  | 'dg'       // 东莞
  | 'zh'       // 珠海
  | 'fs'       // 佛山
  | 'hz'       // 惠州
  | 'zs'       // 中山
  | 'jm'       // 江门
  | 'zq'       // 肇庆
  | 'sg'       // 新加坡
  | 'my'       // 马来西亚
  | 'th'       // 泰国
  | 'ph'       // 菲律宾
  | 'id';      // 印尼
```

#### 核心接口示例

```typescript
// ========== 1. 地区配置接口 ==========
GET /api/v1/regions
→ 返回所有支持的地区列表

GET /api/v1/regions/{regionCode}
→ 返回特定地区的配置信息

// ========== 2. 灾害数据接口 ==========
GET /api/v1/{region}/disasters
→ 获取该地区的灾害事件列表

GET /api/v1/{region}/disasters/{eventId}
→ 获取特定灾害事件详情

POST /api/v1/{region}/disasters
→ 创建新的灾害事件

// ========== 3. 风险评估接口 ==========
POST /api/v1/{region}/risk-assessment
→ 提交风险评估请求

GET /api/v1/{region}/risk-assessment/{assessmentId}
→ 获取评估结果

// ========== 4. 地图服务接口 ==========
GET /api/v1/{region}/map/layers
→ 获取该地区可用的地图图层

GET /api/v1/{region}/map/wms
→ 获取 WMS 服务端点

// ========== 5. 资产管理接口 ==========
GET /api/v1/{region}/assets
→ 获取该地区的资产列表

POST /api/v1/{region}/assets
→ 添加新资产
```

---

## 🗂️ 数据模型设计

### 地区配置表 (regions)

```typescript
interface RegionConfig {
  // 基础信息
  code: string;                    // 地区代码 'hk', 'sz', 'sg'
  name: string;                    // 地区名称 '香港', '深圳', 'Singapore'
  nameEn: string;                  // 英文名称
  nameCn: string;                  // 中文名称
  
  // 地理信息
  coordinates: {
    center: [number, number];      // 中心坐标 [lat, lon]
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  
  // 服务配置
  services: {
    geoserver: {
      url: string;                 // GeoServer WMS 地址
      workspace: string;           // 工作空间名称
    };
    database: {
      host: string;
      database: string;
    };
  };
  
  // 灾害类型配置
  hazardTypes: Array<{
    type: 'flood' | 'typhoon' | 'earthquake' | 'tsunami' | 'landslide';
    enabled: boolean;
    layers: string[];              // 可用图层列表
    weights: number;               // 风险权重
  }>;
  
  // 团队信息
  team: {
    id: string;
    name: string;
    contact: string;
    apiKey: string;                // 团队 API 密钥
  };
  
  // 状态
  status: 'active' | 'development' | 'maintenance';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 示例数据

```json
{
  "code": "hk",
  "name": "香港",
  "nameEn": "Hong Kong",
  "nameCn": "香港",
  "coordinates": {
    "center": [22.3193, 114.1694],
    "bounds": {
      "north": 22.5600,
      "south": 22.1500,
      "east": 114.4400,
      "west": 113.8300
    }
  },
  "services": {
    "geoserver": {
      "url": "https://geoserver-hk.natcat-system.com/geoserver/wms",
      "workspace": "HK"
    },
    "database": {
      "host": "db-hk.natcat-system.com",
      "database": "natcat_hk"
    }
  },
  "hazardTypes": [
    {
      "type": "flood",
      "enabled": true,
      "layers": ["flood_20yr", "flood_50yr", "flood_100yr", "flood_200yr", "flood_500yr"],
      "weights": 0.30
    },
    {
      "type": "typhoon",
      "enabled": true,
      "layers": ["typhoon_tracks", "typhoon_wind", "typhoon_surge"],
      "weights": 0.25
    },
    {
      "type": "landslide",
      "enabled": true,
      "layers": ["landslide_low", "landslide_medium", "landslide_high"],
      "weights": 0.10
    }
  ],
  "team": {
    "id": "team-hk-001",
    "name": "Hong Kong Development Team",
    "contact": "hk-team@natcat-system.com",
    "apiKey": "hk_live_xxxxxxxxxxxxx"
  },
  "status": "active",
  "version": "1.2.0",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2025-10-20T00:00:00Z"
}
```

---

## 🔐 权限和认证设计

### 团队 API Key 机制

```typescript
// 每个团队有自己的 API Key
const teamApiKey = 'team_region_live_xxxxxxxxxxxx';

// 请求头中携带
headers: {
  'Authorization': `Bearer ${teamApiKey}`,
  'X-Region': 'hk'  // 指定地区
}

// 权限控制
interface TeamPermissions {
  region: string;              // 只能访问自己负责的地区
  canRead: boolean;            // 读取权限
  canWrite: boolean;           // 写入权限
  canDelete: boolean;          // 删除权限
  rateLimit: number;           // API 调用频率限制
}
```

### 跨地区数据访问

```typescript
// 场景：新加坡团队想参考香港的灾害数据
GET /api/v1/hk/disasters?token=sg_team_token&readonly=true

// 响应：
{
  "success": true,
  "data": [...],  // 脱敏后的数据
  "meta": {
    "region": "hk",
    "accessType": "readonly",
    "requestedBy": "sg-team"
  }
}
```

---

## 📦 前端模块化设计

### 动态路由配置

```typescript
// 路由结构
/regions/{regionCode}/riskmap
/regions/{regionCode}/asset
/regions/{regionCode}/disasters

// 示例
/regions/hk/riskmap      // 香港风险地图
/regions/sz/riskmap      // 深圳风险地图
/regions/sg/riskmap      // 新加坡风险地图
```

### 地区选择器组件

```typescript
// src/components/RegionSelector.tsx
import { useState, useEffect } from 'react';

interface Region {
  code: string;
  name: string;
  icon: string;
}

export function RegionSelector() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [currentRegion, setCurrentRegion] = useState('hk');
  
  useEffect(() => {
    // 从 API 获取可用地区列表
    fetch('/api/v1/regions')
      .then(res => res.json())
      .then(data => setRegions(data));
  }, []);
  
  return (
    <Select value={currentRegion} onValueChange={setCurrentRegion}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {regions.map(region => (
          <SelectItem key={region.code} value={region.code}>
            {region.icon} {region.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 地区上下文 (Context)

```typescript
// src/contexts/RegionContext.tsx
import { createContext, useContext, useState } from 'react';

interface RegionContextType {
  currentRegion: string;
  regionConfig: RegionConfig | null;
  switchRegion: (code: string) => void;
}

const RegionContext = createContext<RegionContextType | null>(null);

export function RegionProvider({ children }) {
  const [currentRegion, setCurrentRegion] = useState('hk');
  const [regionConfig, setRegionConfig] = useState(null);
  
  const switchRegion = async (code: string) => {
    const config = await fetch(`/api/v1/regions/${code}`).then(r => r.json());
    setRegionConfig(config);
    setCurrentRegion(code);
  };
  
  return (
    <RegionContext.Provider value={{ currentRegion, regionConfig, switchRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export const useRegion = () => useContext(RegionContext);
```

### 使用示例

```typescript
// src/app/regions/[regionCode]/riskmap/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RegionRiskMapPage() {
  const params = useParams();
  const regionCode = params.regionCode as string;
  const [regionConfig, setRegionConfig] = useState(null);
  
  useEffect(() => {
    // 加载地区配置
    fetch(`/api/v1/regions/${regionCode}`)
      .then(res => res.json())
      .then(config => {
        setRegionConfig(config);
        // 使用该地区的 GeoServer 地址
        // 使用该地区的灾害类型配置
        // 使用该地区的中心坐标
      });
  }, [regionCode]);
  
  if (!regionConfig) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{regionConfig.name} Risk Map</h1>
      {/* 使用 regionConfig 配置地图 */}
    </div>
  );
}
```

---

## 🔌 插件化架构

### 地区插件接口

```typescript
// src/types/RegionPlugin.ts
export interface RegionPlugin {
  // 基础信息
  metadata: {
    code: string;
    name: string;
    version: string;
    author: string;
  };
  
  // 初始化
  initialize(): Promise<void>;
  
  // 获取灾害类型
  getHazardTypes(): HazardType[];
  
  // 获取 WMS 图层配置
  getWMSLayers(): WMSLayerConfig[];
  
  // 自定义风险计算
  calculateRisk?(data: any): RiskScore;
  
  // 自定义 UI 组件
  customComponents?: {
    RiskMapOverlay?: React.ComponentType;
    DisasterCard?: React.ComponentType;
  };
}
```

### 插件加载器

```typescript
// src/lib/RegionPluginLoader.ts
class RegionPluginLoader {
  private plugins: Map<string, RegionPlugin> = new Map();
  
  async loadPlugin(regionCode: string): Promise<RegionPlugin> {
    // 动态导入地区插件
    const plugin = await import(`@/plugins/${regionCode}/index`);
    await plugin.initialize();
    this.plugins.set(regionCode, plugin);
    return plugin;
  }
  
  getPlugin(regionCode: string): RegionPlugin | null {
    return this.plugins.get(regionCode) || null;
  }
}
```

### 插件目录结构

```
src/
  plugins/
    hk/                  # 香港插件（Team A 维护）
      index.ts
      hazards.ts
      wms-config.ts
      components/
        CustomRiskCard.tsx
    sz/                  # 深圳插件（Team B 维护）
      index.ts
      hazards.ts
      wms-config.ts
    sg/                  # 新加坡插件（Team C 维护）
      index.ts
      hazards.ts
      wms-config.ts
```

---

## 🗄️ 数据库设计

### 多租户数据隔离

#### 方案 A：数据库分离（推荐）
```
每个地区独立数据库：
- natcat_hk (香港)
- natcat_sz (深圳)
- natcat_sg (新加坡)

优点：
✅ 完全数据隔离
✅ 性能独立
✅ 便于备份和迁移
✅ 符合数据主权要求（如新加坡要求数据存储在本地）
```

#### 方案 B：Schema 分离
```
单个数据库，多个 Schema：
- natcat.hk_disasters
- natcat.sz_disasters
- natcat.sg_disasters

优点：
✅ 管理简单
✅ 跨地区查询方便
✅ 节省资源
```

### 共享数据表

```sql
-- 用户表（全局共享）
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  regions JSON,  -- 用户可访问的地区 ['hk', 'sz']
  role VARCHAR(50),
  created_at TIMESTAMP
);

-- 地区配置表（全局共享）
CREATE TABLE regions (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255),
  config JSON,  -- 详细配置
  status VARCHAR(50),
  team_id VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 灾害事件表（地区独立）
CREATE TABLE disasters_{region_code} (
  id UUID PRIMARY KEY,
  region_code VARCHAR(10),
  event_type VARCHAR(50),
  event_date DATE,
  coordinates GEOMETRY(Point, 4326),
  metadata JSON,
  created_at TIMESTAMP
);
```

---

## 🌐 GeoServer 多地区部署

### 方案：每个地区独立 GeoServer 实例

```yaml
# 香港 GeoServer
https://geoserver-hk.natcat-system.com/geoserver/wms
Workspace: HK
Layers:
  - HK:flood_100yr
  - HK:typhoon_tracks
  - HK:landslide_high

# 深圳 GeoServer
https://geoserver-sz.natcat-system.com/geoserver/wms
Workspace: SZ
Layers:
  - SZ:flood_100yr
  - SZ:rainstorm_100yr
  
# 新加坡 GeoServer
https://geoserver-sg.natcat-system.com/geoserver/wms
Workspace: SG
Layers:
  - SG:flood_100yr
  - SG:earthquake_risk
```

### 统一 WMS 代理

```typescript
// API Route: /api/v1/{region}/wms
export async function GET(request: Request, { params }) {
  const { region } = params;
  
  // 从地区配置获取 GeoServer 地址
  const regionConfig = await getRegionConfig(region);
  const geoserverUrl = regionConfig.services.geoserver.url;
  
  // 转发请求到对应的 GeoServer
  const response = await fetch(`${geoserverUrl}?${request.url.split('?')[1]}`);
  return response;
}
```

---

## 📊 监控和管理

### 地区服务健康监控

```typescript
// 监控每个地区的服务状态
interface RegionHealth {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  services: {
    api: boolean;
    geoserver: boolean;
    database: boolean;
  };
  lastCheck: Date;
  responseTime: number;  // ms
}

// API: GET /api/v1/health/regions
{
  "regions": [
    {
      "region": "hk",
      "status": "healthy",
      "services": {
        "api": true,
        "geoserver": true,
        "database": true
      },
      "responseTime": 45
    },
    {
      "region": "sg",
      "status": "degraded",
      "services": {
        "api": true,
        "geoserver": false,  // ❌ GeoServer 故障
        "database": true
      },
      "responseTime": 1200
    }
  ]
}
```

---

## 🚀 实施路线图

### Phase 1: 基础架构搭建（2-3周）
```
✅ 设计地区配置数据模型
✅ 实现 RegionConfig API
✅ 创建数据库表结构
✅ 搭建 API Gateway
✅ 实现权限认证系统
```

### Phase 2: 香港模块重构（1-2周）
```
✅ 将现有香港代码改造为插件模式
✅ 提取共享核心服务
✅ 测试地区切换功能
```

### Phase 3: 大湾区扩展（Team B, 4-6周）
```
🔄 深圳模块开发
🔄 广州模块开发
🔄 其他城市逐步接入
```

### Phase 4: 东南亚扩展（Team C, 并行进行）
```
🔄 新加坡模块开发
🔄 马来西亚模块开发
🔄 其他国家逐步接入
```

---

## 📝 团队协作规范

### Git 仓库结构

```
natcat-system/
├── core/                    # 核心服务（统一维护）
│   ├── api-gateway/
│   ├── auth-service/
│   └── shared-components/
├── plugins/
│   ├── hk/                  # 香港插件（Team A）
│   ├── mo/                  # 澳门插件（Team A）
│   ├── sz/                  # 深圳插件（Team B）
│   ├── gz/                  # 广州插件（Team B）
│   └── sg/                  # 新加坡插件（Team C）
└── portal/                  # 统一前端（共同维护）
```

### API 文档规范

使用 OpenAPI (Swagger) 定义接口：

```yaml
# swagger.yaml
openapi: 3.0.0
info:
  title: NatCat System API
  version: 1.0.0

paths:
  /api/v1/{region}/disasters:
    get:
      summary: 获取地区灾害列表
      parameters:
        - name: region
          in: path
          required: true
          schema:
            type: string
            enum: [hk, mo, sz, gz, sg, my, th]
      responses:
        200:
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DisasterList'
```

### 版本控制

```
地区插件版本：独立版本号
- hk: v1.2.0
- sz: v1.0.3
- sg: v0.9.1

核心服务版本：统一版本号
- core: v2.1.0

API 版本：/api/v1, /api/v2
```

---

## 🎯 关键决策点

### 1. 数据主权
- 新加坡、马来西亚等国家可能要求数据存储在本地
- 建议：每个国家/地区独立数据库 + 服务器

### 2. 灾害类型差异
- 香港：台风、洪水、山泥倾泻
- 新加坡：洪水、地震（少）
- 印尼：地震、海啸、火山
- 建议：使用灵活的 hazardTypes 配置

### 3. 地图数据源
- 每个地区可能有自己的官方数据源
- 建议：支持多种 WMS/WFS 协议

### 4. 多语言支持
- 前端：i18n 国际化
- 数据：多语言字段 (nameEn, nameCn, nameLocal)

---

## 💡 最佳实践

1. **先标准化，再个性化**
   - 定义核心接口标准
   - 允许地区插件扩展

2. **渐进式迁移**
   - 不要一次性重构所有代码
   - 先将香港改造为插件模式
   - 再逐步添加新地区

3. **自动化测试**
   - 核心 API 必须有集成测试
   - 每个地区插件有独立测试

4. **文档先行**
   - 接口设计先写文档
   - 团队 review 后再开发

---

需要我帮您：
1. 创建 RegionConfig API 的具体实现？
2. 重构现有香港代码为插件模式？
3. 创建地区选择器组件？
4. 设计数据库表结构？

告诉我您想先从哪里开始！😊
