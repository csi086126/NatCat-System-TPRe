"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 地区配置接口
export interface RegionConfig {
  code: string;
  name: string;
  nameEn: string;
  nameCn: string;
  icon: string;
  coordinates: {
    center: [number, number];
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  services: {
    geoserver: {
      url: string;
      workspace: string;
    };
  };
  hazardTypes: Array<{
    type: 'flood' | 'typhoon' | 'earthquake' | 'tsunami' | 'landslide' | 'rainstorm';
    enabled: boolean;
    layers: string[];
    weight: number;
  }>;
  status: 'active' | 'development' | 'maintenance';
}

// 预定义的地区配置（后续可以从 API 加载）
const REGIONS: Record<string, RegionConfig> = {
  worldwide: {
    code: 'worldwide',
    name: 'Worldwide',
    nameEn: 'Worldwide',
    nameCn: '全球',
    icon: 'WW',
    coordinates: {
      center: [22.3193, 114.1694],
      bounds: {
        north: 85,
        south: -85,
        east: 180,
        west: -180
      }
    },
    services: {
      geoserver: {
        url: 'http://143.89.22.7:8090/geoserver/wms',
        workspace: 'GLOBAL'
      }
    },
    hazardTypes: [],
    status: 'active'
  },
  hk: {
    code: 'hk',
    name: '香港',
    nameEn: 'Hong Kong',
    nameCn: '香港',
    icon: 'HK',
    coordinates: {
      center: [22.3193, 114.1694],
      bounds: {
        north: 22.5600,
        south: 22.1500,
        east: 114.4400,
        west: 113.8300
      }
    },
    services: {
      geoserver: {
        url: 'http://143.89.22.7:8090/geoserver/wms',
        workspace: 'HK'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_20yr', 'flood_50yr', 'flood_100yr', 'flood_200yr', 'flood_500yr'],
        weight: 0.30
      },
      {
        type: 'typhoon',
        enabled: true,
        layers: ['typhoon_tracks', 'typhoon_wind'],
        weight: 0.25
      },
      {
        type: 'rainstorm',
        enabled: true,
        layers: ['rainstorm_100yr', 'rainstorm_200yr'],
        weight: 0.20
      },
      {
        type: 'landslide',
        enabled: true,
        layers: ['landslide_low', 'landslide_medium', 'landslide_high'],
        weight: 0.15
      }
    ],
    status: 'active'
  },
  mo: {
    code: 'mo',
    name: '澳门',
    nameEn: 'Macau',
    nameCn: '澳门',
    icon: 'MO',
    coordinates: {
      center: [22.1987, 113.5439],
      bounds: {
        north: 22.2200,
        south: 22.1100,
        east: 113.5900,
        west: 113.5200
      }
    },
    services: {
      geoserver: {
        url: 'http://143.89.22.7:8090/geoserver/wms',
        workspace: 'MO'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr', 'flood_200yr'],
        weight: 0.35
      },
      {
        type: 'typhoon',
        enabled: true,
        layers: ['typhoon_tracks'],
        weight: 0.30
      }
    ],
    status: 'development'
  },
  gba: {
    code: 'gba',
    name: '粤港澳大湾区',
    nameEn: 'Greater Bay Area',
    nameCn: '粤港澳大湾区',
    icon: 'GBA',
    coordinates: {
      center: [22.5500, 113.9500],
      bounds: {
        north: 23.5000,
        south: 21.6000,
        east: 114.8000,
        west: 112.5000
      }
    },
    services: {
      geoserver: {
        url: 'http://143.89.22.7:8090/geoserver/wms',
        workspace: 'GBA'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr', 'flood_200yr'],
        weight: 0.30
      },
      {
        type: 'typhoon',
        enabled: true,
        layers: ['typhoon_tracks'],
        weight: 0.25
      },
      {
        type: 'rainstorm',
        enabled: true,
        layers: ['rainstorm_100yr'],
        weight: 0.25
      }
    ],
    status: 'development'
  },
  th: {
    code: 'th',
    name: '泰国',
    nameEn: 'Thailand',
    nameCn: '泰国',
    icon: 'TH',
    coordinates: {
      center: [13.7563, 100.5018],
      bounds: {
        north: 20.4648,
        south: 5.6130,
        east: 105.6390,
        west: 97.3438
      }
    },
    services: {
      geoserver: {
        url: 'http://geoserver-th.example.com/geoserver/wms',
        workspace: 'TH'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr'],
        weight: 0.40
      },
      {
        type: 'typhoon',
        enabled: true,
        layers: ['typhoon_tracks'],
        weight: 0.30
      }
    ],
    status: 'development'
  },
  vn: {
    code: 'vn',
    name: '越南',
    nameEn: 'Vietnam',
    nameCn: '越南',
    icon: 'VN',
    coordinates: {
      center: [14.0583, 108.2772],
      bounds: {
        north: 23.3927,
        south: 8.1790,
        east: 109.4647,
        west: 102.1440
      }
    },
    services: {
      geoserver: {
        url: 'http://geoserver-vn.example.com/geoserver/wms',
        workspace: 'VN'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr'],
        weight: 0.35
      },
      {
        type: 'typhoon',
        enabled: true,
        layers: ['typhoon_tracks'],
        weight: 0.35
      }
    ],
    status: 'development'
  },
  my: {
    code: 'my',
    name: '马来西亚',
    nameEn: 'Malaysia',
    nameCn: '马来西亚',
    icon: 'MY',
    coordinates: {
      center: [4.2105, 101.9758],
      bounds: {
        north: 7.3634,
        south: 0.8538,
        east: 119.2671,
        west: 99.6433
      }
    },
    services: {
      geoserver: {
        url: 'http://geoserver-my.example.com/geoserver/wms',
        workspace: 'MY'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr'],
        weight: 0.45
      }
    ],
    status: 'development'
  }
};

interface RegionContextType {
  currentRegion: string;
  regionConfig: RegionConfig | null;
  availableRegions: RegionConfig[];
  switchRegion: (regionCode: string) => void;
  isLoading: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

interface RegionProviderProps {
  children: ReactNode;
}

export function RegionProvider({ children }: RegionProviderProps) {
  const [currentRegion, setCurrentRegion] = useState<string>(''); // 默认为空，显示 placeholder
  const [regionConfig, setRegionConfig] = useState<RegionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 获取所有可用地区（只显示 active 和 development 状态的）
  const availableRegions = Object.values(REGIONS).filter(
    region => region.status === 'active' || region.status === 'development'
  );

  // 从 localStorage 加载用户上次选择的地区
  useEffect(() => {
    const savedRegion = localStorage.getItem('selectedRegion');
    if (savedRegion && REGIONS[savedRegion]) {
      setCurrentRegion(savedRegion);
      setRegionConfig(REGIONS[savedRegion]);
    }
  }, []);

  // 切换地区
  const switchRegion = async (regionCode: string) => {
    if (!REGIONS[regionCode]) {
      console.error(`Region ${regionCode} not found`);
      return;
    }

    setIsLoading(true);
    
    try {
      // 这里可以添加 API 调用来获取最新的地区配置
      // const config = await fetch(`/api/v1/regions/${regionCode}`).then(r => r.json());
      
      // 暂时使用预定义配置
      const config = REGIONS[regionCode];
      
      setCurrentRegion(regionCode);
      setRegionConfig(config);
      
      // 保存到 localStorage
      localStorage.setItem('selectedRegion', regionCode);
      
      // 触发自定义事件，通知其他组件地区已切换
      window.dispatchEvent(new CustomEvent('regionChanged', { 
        detail: { regionCode, config } 
      }));
      
      console.log(`✅ Switched to region: ${config.name} (${regionCode})`);
    } catch (error) {
      console.error('Failed to switch region:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RegionContext.Provider
      value={{
        currentRegion,
        regionConfig,
        availableRegions,
        switchRegion,
        isLoading
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

// Hook 方便使用
export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

// 导出预定义地区配置供其他地方使用
export { REGIONS };
