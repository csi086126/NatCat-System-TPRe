# 多地区灾害事件管理实施方案

## 📊 当前需求分析

### 业务规模
- **地区**: 香港、澳门、大湾区、东南亚（10-20个地区）
- **事件数量**: 200-500+ 个灾害事件
- **灾害类型**: 台风、暴雨、洪涝（可扩展）
- **数据格式**: TIF（栅格）、Shapefile（矢量）、GeoJSON

### 事件特性
- **单地区事件**: 澳门暴雨（只影响澳门）
- **多地区事件**: 台风天鸽（影响澳门+香港+珠海）
- **全区域事件**: 超强台风（影响整个大湾区）

### 核心需求
✅ 高效筛选（地区、类型、时间、影响范围）  
✅ 快速加载（避免加载500个事件卡顿）  
✅ 统一管理（TIF/Shapefile/GeoJSON）  
✅ 跨地区关联（一个事件影响多个地区）

---

## 🎯 推荐方案：**文件索引 + 数据库混合架构**

### 为什么选择这个方案？
1. **快速启动**: 无需复杂数据库设计，2-3天可上线
2. **易于扩展**: 后期可无缝迁移到纯数据库架构
3. **团队协作**: 不同地区可独立管理JSON文件
4. **版本控制**: 事件数据可提交到Git，便于审计

---

## 📁 目录结构设计

```
public/data/
  ├── events-index.json              # 📌 主索引（所有事件基本信息）
  ├── regions-config.json            # 🌍 地区配置（边界、元数据）
  └── events/
      ├── macau/
      │   ├── typhoons/
      │   │   ├── 2017-hato.json
      │   │   ├── 2018-mangkhut.json
      │   │   └── 2023-ragasa.json
      │   └── rainstorms/
      │       ├── 2023-rs-001.json
      │       └── 2023-rs-002.json
      ├── hongkong/
      │   ├── typhoons/
      │   │   ├── 2017-hato.json      # 同一台风在不同地区
      │   │   └── 2018-mangkhut.json
      │   └── floods/
      ├── guangzhou/
      ├── thailand/
      └── vietnam/

/geodata/                             # GeoServer数据目录
  ├── Macau/
  │   ├── Typhoons/
  │   │   ├── 2017_Hato/
  │   │   │   ├── flood_peninsula.tif
  │   │   │   ├── flood_taipa.tif
  │   │   │   └── wind_speed.shp
  │   │   └── 2018_Mangkhut/
  │   └── Rainstorms/
  ├── HongKong/
  └── Thailand/
```

---

## 📄 数据文件结构

### 1. events-index.json（主索引）

**设计原则**: 
- 只包含必要的元数据（用于列表展示和筛选）
- 大小控制在100-200KB以内（500个事件约150KB）
- 支持快速客户端筛选和排序

```json
{
  "version": "2.0",
  "lastUpdated": "2025-11-18T12:00:00Z",
  "totalEvents": 245,
  
  "regions": [
    {
      "code": "Macau",
      "name": "Macau SAR",
      "nameZh": "澳门",
      "eventCount": 45,
      "bounds": [113.528, 22.109, 113.598, 22.217],
      "metadata": {
        "population": 683218,
        "area": 32.9,
        "currency": "MOP"
      }
    },
    {
      "code": "HongKong",
      "name": "Hong Kong SAR",
      "nameZh": "香港",
      "eventCount": 78,
      "bounds": [113.835, 22.153, 114.441, 22.561]
    },
    {
      "code": "Guangzhou",
      "name": "Guangzhou",
      "nameZh": "广州",
      "eventCount": 52,
      "bounds": [112.921, 22.517, 114.032, 23.937]
    }
  ],
  
  "hazardTypes": [
    {
      "code": "Typhoon",
      "name": "Typhoon",
      "nameZh": "台风",
      "icon": "🌀",
      "count": 120,
      "color": "#FF6B6B"
    },
    {
      "code": "Rainstorm",
      "name": "Rainstorm",
      "nameZh": "暴雨",
      "icon": "🌧️",
      "count": 85,
      "color": "#4ECDC4"
    },
    {
      "code": "Flood",
      "name": "Flood",
      "nameZh": "洪涝",
      "icon": "🌊",
      "count": 40,
      "color": "#45B7D1"
    }
  ],
  
  "events": [
    {
      "id": "TY2017-HATO",
      "code": "TY2017-HATO",
      "name": "Typhoon Hato",
      "nameZh": "台风天鸽",
      "hazardType": "Typhoon",
      "date": "2017-08-23",
      "year": 2017,
      
      "regions": ["Macau", "HongKong", "Zhuhai"],
      "primaryRegion": "Macau",
      
      "geometry": {
        "type": "Point",
        "coordinates": [113.5543, 22.1987]
      },
      
      "severity": "Severe",
      "estimatedLoss": 15000000000,
      "currency": "USD",
      "affectedPopulation": 3650000,
      
      "parameters": {
        "maxWindSpeed": 185,
        "windSpeedUnit": "km/h",
        "totalRainfall": 500,
        "rainfallUnit": "mm"
      },
      
      "dataLayers": {
        "count": 6,
        "formats": ["GeoTIFF", "Shapefile"]
      },
      
      "tags": ["major", "insured", "cat5", "cross-border"],
      
      "detailFile": "events/macau/typhoons/2017-hato.json"
    },
    {
      "id": "RS2023-MACAU-001",
      "code": "RS2023-MACAU-001",
      "name": "Macau Rainstorm Sept 2023",
      "nameZh": "澳门暴雨2023年9月",
      "hazardType": "Rainstorm",
      "date": "2023-09-01",
      "year": 2023,
      
      "regions": ["Macau"],
      "primaryRegion": "Macau",
      
      "geometry": {
        "type": "Point",
        "coordinates": [113.5439, 22.1987]
      },
      
      "severity": "Moderate",
      "estimatedLoss": 500000000,
      "currency": "USD",
      "affectedPopulation": 200000,
      
      "parameters": {
        "totalRainfall": 300,
        "rainfallUnit": "mm",
        "duration": 12,
        "durationUnit": "hours"
      },
      
      "dataLayers": {
        "count": 3,
        "formats": ["GeoTIFF"]
      },
      
      "tags": ["recent", "urban-flood"],
      
      "detailFile": "events/macau/rainstorms/2023-rs-001.json"
    }
  ]
}
```

### 2. 单个事件详细文件（events/macau/typhoons/2017-hato.json）

```json
{
  "id": "TY2017-HATO",
  "code": "TY2017-HATO",
  "name": "Typhoon Hato",
  "nameZh": "台风天鸽",
  "hazardType": "Typhoon",
  
  "temporalInfo": {
    "startDate": "2017-08-23T08:00:00+08:00",
    "endDate": "2017-08-24T06:00:00+08:00",
    "peakTime": "2017-08-23T14:00:00+08:00",
    "duration": 22,
    "durationUnit": "hours"
  },
  
  "spatialInfo": {
    "centerPoint": {
      "type": "Point",
      "coordinates": [113.5543, 22.1987]
    },
    "impactArea": {
      "type": "Polygon",
      "coordinates": [[
        [113.5, 22.1],
        [113.6, 22.1],
        [113.6, 22.3],
        [113.5, 22.3],
        [113.5, 22.1]
      ]]
    },
    "trackLine": {
      "type": "LineString",
      "coordinates": [
        [120.5, 18.2],
        [119.3, 19.5],
        [117.8, 20.8],
        [115.2, 21.9],
        [113.5, 22.2]
      ]
    }
  },
  
  "affectedRegions": [
    {
      "code": "Macau",
      "name": "Macau SAR",
      "nameZh": "澳门",
      "impactLevel": "Severe",
      "estimatedLoss": 10000000000,
      "currency": "USD",
      "affectedPopulation": 650000,
      "casualties": {
        "deaths": 10,
        "injuries": 244
      },
      "infrastructureDamage": {
        "buildingsDestroyed": 150,
        "buildingsDamaged": 3200,
        "roadsBlocked": 45,
        "powerOutages": 120000
      }
    },
    {
      "code": "HongKong",
      "name": "Hong Kong SAR",
      "nameZh": "香港",
      "impactLevel": "Moderate",
      "estimatedLoss": 3000000000,
      "currency": "USD",
      "affectedPopulation": 2500000,
      "casualties": {
        "deaths": 2,
        "injuries": 129
      }
    },
    {
      "code": "Zhuhai",
      "name": "Zhuhai",
      "nameZh": "珠海",
      "impactLevel": "Moderate",
      "estimatedLoss": 2000000000,
      "currency": "USD",
      "affectedPopulation": 500000
    }
  ],
  
  "hazardParameters": {
    "wind": {
      "maxSustainedSpeed": 185,
      "maxGustSpeed": 220,
      "unit": "km/h",
      "category": "Category 5 Equivalent"
    },
    "rainfall": {
      "total": 500,
      "maxHourly": 120,
      "unit": "mm"
    },
    "stormSurge": {
      "maxHeight": 3.5,
      "unit": "meters",
      "location": "Inner Harbour, Macau"
    },
    "pressure": {
      "minimum": 925,
      "unit": "hPa"
    }
  },
  
  "dataLayers": [
    {
      "id": "hato_macau_flood_peninsula",
      "name": "Macau Peninsula Flood Depth",
      "nameZh": "澳门半岛洪水深度",
      "region": "Macau",
      
      "layerType": "WMS",
      "dataFormat": "GeoTIFF",
      "workspace": "Macau",
      "layerName": "Hato_MacauPeninsula",
      
      "variable": "flood_depth",
      "variableNameZh": "洪水深度",
      "units": "meters",
      
      "serviceUrl": "http://localhost:8080/geoserver/Macau/wms",
      "legendUrl": "http://localhost:8080/geoserver/Macau/ows?service=WMS&request=GetLegendGraphic&layer=Hato_MacauPeninsula&format=image/png",
      
      "filePath": "D:/geodata/Macau/Typhoons/2017_Hato/flood_peninsula.tif",
      "fileSize": 4235678,
      "resolution": 10,
      "resolutionUnit": "meters",
      
      "bounds": [113.528, 22.180, 113.559, 22.217],
      "crs": "EPSG:4326",
      
      "statistics": {
        "min": 0,
        "max": 5.2,
        "mean": 0.8,
        "median": 0.3
      },
      
      "style": {
        "name": "flood_depth_ramp",
        "colorRamp": [
          {"value": 0, "color": "#FFFFFF", "label": "No Flood"},
          {"value": 0.5, "color": "#DEEBF7", "label": "0.5m"},
          {"value": 1.0, "color": "#9ECAE1", "label": "1.0m"},
          {"value": 2.0, "color": "#3182BD", "label": "2.0m"},
          {"value": 5.0, "color": "#08519C", "label": ">5.0m"}
        ]
      },
      
      "metadata": {
        "source": "MIKE FLOOD Simulation",
        "createdDate": "2023-10-15",
        "accuracy": "high"
      }
    },
    {
      "id": "hato_macau_flood_taipa",
      "name": "Taipa & Coloane Flood Depth",
      "nameZh": "氹仔及路环洪水深度",
      "region": "Macau",
      
      "layerType": "WMS",
      "dataFormat": "GeoTIFF",
      "workspace": "Macau",
      "layerName": "Hato_Taipa",
      
      "variable": "flood_depth",
      "units": "meters",
      
      "serviceUrl": "http://localhost:8080/geoserver/Macau/wms",
      "filePath": "D:/geodata/Macau/Typhoons/2017_Hato/flood_taipa.tif"
    },
    {
      "id": "hato_macau_wind_vector",
      "name": "Wind Speed Vector",
      "nameZh": "风速矢量",
      "region": "Macau",
      
      "layerType": "WFS",
      "dataFormat": "Shapefile",
      "workspace": "Macau",
      "layerName": "Hato_Wind_Vector",
      
      "variable": "wind_speed",
      "units": "km/h",
      
      "serviceUrl": "http://localhost:8080/geoserver/Macau/wfs",
      "filePath": "D:/geodata/Macau/Typhoons/2017_Hato/wind_speed.shp",
      
      "attributeFields": [
        {"name": "speed", "type": "double", "description": "Wind speed in km/h"},
        {"name": "direction", "type": "integer", "description": "Wind direction in degrees"},
        {"name": "timestamp", "type": "string", "description": "ISO 8601 timestamp"}
      ]
    }
  ],
  
  "relatedEvents": [
    {
      "id": "TY2018-MANGKHUT",
      "name": "Typhoon Mangkhut",
      "similarity": 0.85,
      "relationship": "similar-impact"
    },
    {
      "id": "TY2017-HATO-HK",
      "name": "Typhoon Hato (Hong Kong)",
      "similarity": 1.0,
      "relationship": "same-event-different-region"
    }
  ],
  
  "externalLinks": [
    {
      "type": "official-report",
      "title": "Macau Meteorological Bureau Report",
      "url": "https://example.com/reports/hato-2017"
    },
    {
      "type": "news-article",
      "title": "BBC News Coverage",
      "url": "https://bbc.com/news/world-asia-40872945"
    }
  ],
  
  "metadata": {
    "dataSource": "Macau Meteorological Bureau",
    "modelUsed": "MIKE FLOOD + WRF",
    "confidenceLevel": "Simulated-High",
    "createdAt": "2023-10-15T10:00:00Z",
    "updatedAt": "2024-03-20T15:30:00Z",
    "createdBy": "Team Macau",
    "dataQuality": "A",
    "reviewStatus": "Approved"
  }
}
```

### 3. regions-config.json（地区配置）

```json
{
  "version": "1.0",
  "regions": [
    {
      "code": "Macau",
      "name": "Macau SAR",
      "nameZh": "澳门特别行政区",
      "nameLocal": "澳門",
      
      "geography": {
        "bounds": [113.528, 22.109, 113.598, 22.217],
        "centerPoint": [113.5439, 22.1987],
        "area": 32.9,
        "areaUnit": "km²",
        "coastlineLength": 41,
        "averageElevation": 23
      },
      
      "demographics": {
        "population": 683218,
        "populationYear": 2023,
        "populationDensity": 20759,
        "gdp": 27.5,
        "gdpUnit": "billion USD",
        "currency": "MOP"
      },
      
      "riskProfile": {
        "mainHazards": ["Typhoon", "StormSurge", "Rainstorm", "Flood"],
        "vulnerabilityLevel": "High",
        "exposureLevel": "Very High",
        "resilience": "Medium"
      },
      
      "dataConfig": {
        "geoserverWorkspace": "Macau",
        "dataDirectory": "D:/geodata/Macau",
        "eventsDirectory": "public/data/events/macau",
        "timezone": "Asia/Macau",
        "defaultCRS": "EPSG:4326"
      },
      
      "visualization": {
        "defaultZoom": 13,
        "mapCenter": [113.5439, 22.1987],
        "color": "#1E88E5",
        "icon": "🇲🇴"
      }
    },
    {
      "code": "HongKong",
      "name": "Hong Kong SAR",
      "nameZh": "香港特别行政区",
      "nameLocal": "香港",
      
      "geography": {
        "bounds": [113.835, 22.153, 114.441, 22.561],
        "centerPoint": [114.1694, 22.3193],
        "area": 1106.3,
        "areaUnit": "km²"
      },
      
      "demographics": {
        "population": 7413100,
        "populationYear": 2023,
        "gdp": 382.0,
        "gdpUnit": "billion USD",
        "currency": "HKD"
      },
      
      "dataConfig": {
        "geoserverWorkspace": "HongKong",
        "dataDirectory": "D:/geodata/HongKong",
        "eventsDirectory": "public/data/events/hongkong",
        "timezone": "Asia/Hong_Kong"
      },
      
      "visualization": {
        "defaultZoom": 11,
        "mapCenter": [114.1694, 22.3193],
        "color": "#D32F2F",
        "icon": "🇭🇰"
      }
    }
  ]
}
```

---

## 💻 前端实现代码

### 1. 事件数据加载 Hook

```typescript
// src/hooks/useEvents.ts
import { useState, useEffect, useMemo } from 'react'
import eventsIndex from '@/../public/data/events-index.json'
import type { EventIndex, EventSummary, EventFilters } from '@/types/events'

export function useEvents() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EventFilters>({
    regions: [],
    hazardTypes: [],
    dateRange: [null, null],
    lossRange: [0, 50000000000],
    tags: [],
    searchText: ''
  })

  useEffect(() => {
    // 加载主索引
    setEvents(eventsIndex.events as EventSummary[])
    setLoading(false)
  }, [])

  // 客户端筛选
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 地区筛选
      if (filters.regions.length > 0) {
        const hasMatchingRegion = event.regions.some(r => 
          filters.regions.includes(r)
        )
        if (!hasMatchingRegion) return false
      }

      // 灾害类型筛选
      if (filters.hazardTypes.length > 0) {
        if (!filters.hazardTypes.includes(event.hazardType)) {
          return false
        }
      }

      // 时间范围筛选
      if (filters.dateRange[0] || filters.dateRange[1]) {
        const eventDate = new Date(event.date)
        if (filters.dateRange[0] && eventDate < filters.dateRange[0]) {
          return false
        }
        if (filters.dateRange[1] && eventDate > filters.dateRange[1]) {
          return false
        }
      }

      // 经济损失范围筛选
      if (event.estimatedLoss < filters.lossRange[0] || 
          event.estimatedLoss > filters.lossRange[1]) {
        return false
      }

      // 标签筛选
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          event.tags?.includes(tag)
        )
        if (!hasMatchingTag) return false
      }

      // 文本搜索
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase()
        const matchesSearch = 
          event.name.toLowerCase().includes(searchLower) ||
          event.nameZh?.toLowerCase().includes(searchLower) ||
          event.code.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      return true
    })
  }, [events, filters])

  // 加载单个事件详情
  const loadEventDetail = async (event: EventSummary) => {
    const response = await fetch(`/data/${event.detailFile}`)
    return await response.json()
  }

  return {
    events: filteredEvents,
    allEvents: events,
    loading,
    filters,
    setFilters,
    loadEventDetail,
    stats: {
      total: events.length,
      filtered: filteredEvents.length,
      regions: eventsIndex.regions,
      hazardTypes: eventsIndex.hazardTypes
    }
  }
}
```

### 2. 高级筛选面板组件

```typescript
// src/components/EventFilterPanel.tsx
'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Calendar } from 'lucide-react'
import type { EventFilters } from '@/types/events'
import eventsIndex from '@/../public/data/events-index.json'

interface EventFilterPanelProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  resultCount: number
  totalCount: number
}

export function EventFilterPanel({
  filters,
  onFiltersChange,
  resultCount,
  totalCount
}: EventFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const updateFilter = <K extends keyof EventFilters>(
    key: K,
    value: EventFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      regions: [],
      hazardTypes: [],
      dateRange: [null, null],
      lossRange: [0, 50000000000],
      tags: [],
      searchText: ''
    })
  }

  return (
    <div className="w-80 bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Event Filters</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-blue-100"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          Showing {resultCount} of {totalCount} events
        </p>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 1. Region Filter */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <span className="mr-2">📍</span>
              Region
            </h3>
            <div className="space-y-2">
              {eventsIndex.regions.map(region => (
                <label
                  key={region.code}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <Checkbox
                    checked={filters.regions.includes(region.code)}
                    onCheckedChange={(checked) => {
                      updateFilter(
                        'regions',
                        checked
                          ? [...filters.regions, region.code]
                          : filters.regions.filter(r => r !== region.code)
                      )
                    }}
                  />
                  <span className="text-sm flex-1">
                    {region.nameZh} {region.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {region.eventCount}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Hazard Type Filter */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <span className="mr-2">🌪️</span>
              Hazard Type
            </h3>
            <div className="space-y-2">
              {eventsIndex.hazardTypes.map(hazard => (
                <label
                  key={hazard.code}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <Checkbox
                    checked={filters.hazardTypes.includes(hazard.code)}
                    onCheckedChange={(checked) => {
                      updateFilter(
                        'hazardTypes',
                        checked
                          ? [...filters.hazardTypes, hazard.code]
                          : filters.hazardTypes.filter(h => h !== hazard.code)
                      )
                    }}
                  />
                  <span className="text-xl mr-1">{hazard.icon}</span>
                  <span className="text-sm flex-1">
                    {hazard.nameZh} {hazard.name}
                  </span>
                  <span
                    className="text-xs px-2 py-1 rounded text-white"
                    style={{ backgroundColor: hazard.color }}
                  >
                    {hazard.count}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Date Range Filter */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">From</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2 text-sm"
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null
                    updateFilter('dateRange', [date, filters.dateRange[1]])
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">To</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2 text-sm"
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null
                    updateFilter('dateRange', [filters.dateRange[0], date])
                  }}
                />
              </div>
            </div>
          </div>

          {/* 4. Economic Loss Range */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <span className="mr-2">💰</span>
              Estimated Loss (USD)
            </h3>
            <Slider
              min={0}
              max={50000000000}
              step={1000000000}
              value={filters.lossRange}
              onValueChange={(value) => {
                updateFilter('lossRange', value as [number, number])
              }}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>${(filters.lossRange[0] / 1e9).toFixed(1)}B</span>
              <span>${(filters.lossRange[1] / 1e9).toFixed(1)}B</span>
            </div>
          </div>

          {/* 5. Tags */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <span className="mr-2">🏷️</span>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {['major', 'insured', 'cat5', 'cross-border', 'recent', 'historical'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    updateFilter(
                      'tags',
                      filters.tags.includes(tag)
                        ? filters.tags.filter(t => t !== tag)
                        : [...filters.tags, tag]
                    )
                  }}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Search */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-gray-700">
              <span className="mr-2">🔍</span>
              Search
            </h3>
            <input
              type="text"
              placeholder="Search by name or code..."
              className="w-full border rounded px-3 py-2 text-sm"
              value={filters.searchText}
              onChange={(e) => updateFilter('searchText', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 border-t bg-gray-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={clearAllFilters}
        >
          Reset All
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            // Save filter preset or apply to URL
            console.log('Filters applied:', filters)
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
```

### 3. 类型定义

```typescript
// src/types/events.ts

export interface EventSummary {
  id: string
  code: string
  name: string
  nameZh: string
  hazardType: string
  date: string
  year: number
  regions: string[]
  primaryRegion: string
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Catastrophic'
  estimatedLoss: number
  currency: string
  affectedPopulation: number
  parameters: Record<string, any>
  dataLayers: {
    count: number
    formats: string[]
  }
  tags: string[]
  detailFile: string
}

export interface EventDetail extends EventSummary {
  temporalInfo: {
    startDate: string
    endDate: string
    peakTime?: string
    duration: number
    durationUnit: string
  }
  spatialInfo: {
    centerPoint: GeoJSON.Point
    impactArea: GeoJSON.Polygon
    trackLine?: GeoJSON.LineString
  }
  affectedRegions: AffectedRegion[]
  hazardParameters: Record<string, any>
  dataLayers: DataLayer[]
  relatedEvents: RelatedEvent[]
  externalLinks: ExternalLink[]
  metadata: EventMetadata
}

export interface AffectedRegion {
  code: string
  name: string
  nameZh: string
  impactLevel: string
  estimatedLoss: number
  currency: string
  affectedPopulation: number
  casualties?: {
    deaths: number
    injuries: number
  }
  infrastructureDamage?: Record<string, number>
}

export interface DataLayer {
  id: string
  name: string
  nameZh: string
  region: string
  layerType: 'WMS' | 'WFS' | 'WMTS'
  dataFormat: 'GeoTIFF' | 'Shapefile' | 'GeoJSON'
  workspace: string
  layerName: string
  variable: string
  variableNameZh?: string
  units: string
  serviceUrl: string
  legendUrl?: string
  filePath: string
  fileSize?: number
  resolution?: number
  resolutionUnit?: string
  bounds?: [number, number, number, number]
  crs?: string
  statistics?: {
    min: number
    max: number
    mean: number
    median: number
  }
  style?: {
    name: string
    colorRamp: Array<{
      value: number
      color: string
      label: string
    }>
  }
  attributeFields?: Array<{
    name: string
    type: string
    description: string
  }>
  metadata?: Record<string, any>
}

export interface EventFilters {
  regions: string[]
  hazardTypes: string[]
  dateRange: [Date | null, Date | null]
  lossRange: [number, number]
  tags: string[]
  searchText: string
}

export interface RegionConfig {
  code: string
  name: string
  nameZh: string
  nameLocal?: string
  geography: {
    bounds: [number, number, number, number]
    centerPoint: [number, number]
    area: number
    areaUnit: string
  }
  demographics: {
    population: number
    populationYear: number
    gdp: number
    gdpUnit: string
    currency: string
  }
  dataConfig: {
    geoserverWorkspace: string
    dataDirectory: string
    eventsDirectory: string
    timezone: string
    defaultCRS: string
  }
  visualization: {
    defaultZoom: number
    mapCenter: [number, number]
    color: string
    icon: string
  }
}
```

---

## 🚀 实施步骤

### 第1步：创建数据结构（1天）

```bash
# 1. 创建目录结构
mkdir -p public/data/events/{macau,hongkong,guangzhou,thailand}/{typhoons,rainstorms,floods}

# 2. 创建主索引文件
# 参考上面的 events-index.json 模板

# 3. 创建地区配置
# 参考上面的 regions-config.json 模板

# 4. 迁移现有3个Macau事件
# 从 macau-typhoon-events.json 转换为新格式
```

### 第2步：实现前端组件（2-3天）

```bash
# 1. 创建类型定义
src/types/events.ts

# 2. 创建数据加载 Hook
src/hooks/useEvents.ts

# 3. 创建筛选面板组件
src/components/EventFilterPanel.tsx

# 4. 创建事件列表组件（虚拟滚动）
src/components/EventList.tsx

# 5. 集成到 riskmap 页面
src/app/riskmap/page.tsx
```

### 第3步：升级批量发布脚本（1-2天）

```bash
# 1. 创建多格式发布脚本
scripts/batch-publish-multi-format.py

# 2. 创建事件元数据生成脚本
scripts/generate-event-metadata.py

# 3. 测试发布流程
python scripts/batch-publish-multi-format.py
```

### 第4步：测试与优化（2-3天）

```bash
# 1. 添加20-30个测试事件
# 2. 测试筛选性能
# 3. 测试地图加载性能
# 4. 优化UI/UX
# 5. 编写文档
```

---

## 📊 性能优化策略

### 1. 索引文件优化
- events-index.json 只包含必要字段
- 单个事件详情按需加载（点击时加载）
- 使用gzip压缩（Next.js自动支持）

### 2. 前端渲染优化
- 使用虚拟滚动（`@tanstack/react-virtual`）
- 地图只渲染可见区域事件（bbox查询）
- WMS图层延迟加载（点击展开时才加载）

### 3. GeoServer优化
- 启用Tile Caching（GeoWebCache）
- 使用COG格式（Cloud Optimized GeoTIFF）
- 配置合理的瓦片大小和缓存策略

### 4. 数据加载策略
```typescript
// 分页加载策略
const EVENTS_PER_PAGE = 20

// 地图可见范围加载
const visibleEvents = events.filter(event => {
  const [lng, lat] = event.geometry.coordinates
  return (
    lng >= mapBounds.west && lng <= mapBounds.east &&
    lat >= mapBounds.south && lat <= mapBounds.north
  )
})

// 图层按需加载
const loadLayer = async (layerId: string) => {
  if (!loadedLayers.has(layerId)) {
    // 只在需要时创建WMSTileLayer
    setLoadedLayers(prev => new Set([...prev, layerId]))
  }
}
```

---

## 🔄 后续扩展路径

### 扩展到数据库架构（当事件 > 100个时）

```bash
# 1. 设置PostgreSQL + PostGIS
docker run --name natcat-db \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgis/postgis

# 2. 创建数据库表（使用前面设计的SQL）

# 3. 创建数据迁移脚本
scripts/migrate-json-to-database.py

# 4. 实现API端点
src/app/api/events/route.ts

# 5. 前端切换到API模式
```

### API 模式下的加载优化

```typescript
// src/hooks/useEvents.ts (API版本)
export function useEvents() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadEvents = async (filters: EventFilters, page: number) => {
    setLoading(true)
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      regions: filters.regions.join(','),
      hazardTypes: filters.hazardTypes.join(','),
      // ... 其他筛选参数
    })

    const response = await fetch(`/api/events?${queryParams}`)
    const data = await response.json()
    
    setEvents(prev => page === 1 ? data.data : [...prev, ...data.data])
    setHasMore(data.pagination.page < data.pagination.totalPages)
    setLoading(false)
  }

  return { events, loading, loadEvents, hasMore }
}
```

---

## 💡 关键决策建议

### 立即行动方案（本周完成）

**✅ 推荐**: 文件索引架构

**理由**:
1. 无需搭建数据库，快速上线
2. 支持50-100个事件无压力
3. 易于团队协作（JSON文件可提交Git）
4. 后期可平滑迁移到数据库

**实施**:
1. 今天：创建目录结构和模板文件
2. 明天：实现前端筛选组件
3. 后天：测试和优化

### 中期规划（1-2个月）

**当事件数量 > 100** 时，迁移到数据库架构

---

需要我立即帮你：
1. ✅ 创建 `events-index.json` 和 `regions-config.json` 模板？
2. ✅ 实现 `EventFilterPanel` 和 `useEvents` Hook 代码？
3. ✅ 升级批量发布脚本支持多格式？
4. ✅ 迁移现有3个Macau事件到新结构？

选择一个，我立即开始！🚀
