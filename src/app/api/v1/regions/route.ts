import { NextRequest, NextResponse } from 'next/server';

// 地区配置数据（实际项目中应该从数据库读取）
const REGIONS = {
  hk: {
    code: 'hk',
    name: '香港',
    nameEn: 'Hong Kong',
    nameCn: '香港',
    icon: '🇭🇰',
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
    icon: '🇲🇴',
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
  sz: {
    code: 'sz',
    name: '深圳',
    nameEn: 'Shenzhen',
    nameCn: '深圳',
    icon: '🏙️',
    coordinates: {
      center: [22.5431, 114.0579],
      bounds: {
        north: 22.8500,
        south: 22.4500,
        east: 114.6200,
        west: 113.7500
      }
    },
    services: {
      geoserver: {
        url: 'http://143.89.22.7:8090/geoserver/wms',
        workspace: 'SZ'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr'],
        weight: 0.30
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
  sg: {
    code: 'sg',
    name: '新加坡',
    nameEn: 'Singapore',
    nameCn: '新加坡',
    icon: '🇸🇬',
    coordinates: {
      center: [1.3521, 103.8198],
      bounds: {
        north: 1.4700,
        south: 1.1500,
        east: 104.0900,
        west: 103.6000
      }
    },
    services: {
      geoserver: {
        url: 'http://geoserver-sg.example.com/geoserver/wms',
        workspace: 'SG'
      }
    },
    hazardTypes: [
      {
        type: 'flood',
        enabled: true,
        layers: ['flood_100yr'],
        weight: 0.40
      }
    ],
    status: 'development'
  }
};

/**
 * GET /api/v1/regions
 * 获取所有可用地区列表
 */
export async function GET(request: NextRequest) {
  try {
    const regions = Object.values(REGIONS);
    
    return NextResponse.json({
      success: true,
      data: regions,
      meta: {
        total: regions.length,
        active: regions.filter(r => r.status === 'active').length,
        development: regions.filter(r => r.status === 'development').length
      }
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/regions
 * 创建新地区配置（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    const requiredFields = ['code', 'name', 'nameEn', 'coordinates', 'services'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // 检查地区代码是否已存在
    if (REGIONS[body.code]) {
      return NextResponse.json(
        { success: false, error: `Region code ${body.code} already exists` },
        { status: 409 }
      );
    }

    // 这里应该保存到数据库
    // await db.regions.create(body);

    return NextResponse.json({
      success: true,
      message: 'Region created successfully',
      data: body
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating region:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create region' },
      { status: 500 }
    );
  }
}
