import { NextRequest, NextResponse } from 'next/server';

// 地区配置数据（与 regions/route.ts 共享）
const REGIONS = {
  hk: {
    code: 'hk',
    name: '香港',
    nameEn: 'Hong Kong',
    nameCn: '香港',
    icon: '🇭🇰',
    coordinates: {
      center: [22.3193, 114.1694],
      bounds: { north: 22.5600, south: 22.1500, east: 114.4400, west: 113.8300 }
    },
    services: {
      geoserver: { url: 'http://143.89.22.7:8090/geoserver/wms', workspace: 'HK' }
    },
    hazardTypes: [
      { type: 'flood', enabled: true, layers: ['flood_20yr', 'flood_50yr', 'flood_100yr', 'flood_200yr', 'flood_500yr'], weight: 0.30 },
      { type: 'typhoon', enabled: true, layers: ['typhoon_tracks', 'typhoon_wind'], weight: 0.25 },
      { type: 'rainstorm', enabled: true, layers: ['rainstorm_100yr', 'rainstorm_200yr'], weight: 0.20 },
      { type: 'landslide', enabled: true, layers: ['landslide_low', 'landslide_medium', 'landslide_high'], weight: 0.15 }
    ],
    status: 'active'
  },
  mo: {
    code: 'mo',
    name: '澳门',
    nameEn: 'Macau',
    coordinates: { center: [22.1987, 113.5439], bounds: { north: 22.2200, south: 22.1100, east: 113.5900, west: 113.5200 } },
    services: { geoserver: { url: 'http://143.89.22.7:8090/geoserver/wms', workspace: 'MO' } },
    hazardTypes: [
      { type: 'flood', enabled: true, layers: ['flood_100yr', 'flood_200yr'], weight: 0.35 },
      { type: 'typhoon', enabled: true, layers: ['typhoon_tracks'], weight: 0.30 }
    ],
    status: 'development'
  },
  sz: {
    code: 'sz',
    name: '深圳',
    nameEn: 'Shenzhen',
    coordinates: { center: [22.5431, 114.0579], bounds: { north: 22.8500, south: 22.4500, east: 114.6200, west: 113.7500 } },
    services: { geoserver: { url: 'http://143.89.22.7:8090/geoserver/wms', workspace: 'SZ' } },
    hazardTypes: [
      { type: 'flood', enabled: true, layers: ['flood_100yr'], weight: 0.30 },
      { type: 'rainstorm', enabled: true, layers: ['rainstorm_100yr'], weight: 0.25 }
    ],
    status: 'development'
  },
  sg: {
    code: 'sg',
    name: '新加坡',
    nameEn: 'Singapore',
    coordinates: { center: [1.3521, 103.8198], bounds: { north: 1.4700, south: 1.1500, east: 104.0900, west: 103.6000 } },
    services: { geoserver: { url: 'http://geoserver-sg.example.com/geoserver/wms', workspace: 'SG' } },
    hazardTypes: [
      { type: 'flood', enabled: true, layers: ['flood_100yr'], weight: 0.40 }
    ],
    status: 'development'
  }
};

/**
 * GET /api/v1/regions/[regionCode]
 * 获取特定地区的配置信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { regionCode: string } }
) {
  try {
    const { regionCode } = params;

    // 查找地区配置
    const region = REGIONS[regionCode];

    if (!region) {
      return NextResponse.json(
        {
          success: false,
          error: `Region '${regionCode}' not found`,
          availableRegions: Object.keys(REGIONS)
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: region
    });
  } catch (error) {
    console.error('Error fetching region:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch region' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/regions/[regionCode]
 * 更新地区配置（管理员功能）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { regionCode: string } }
) {
  try {
    const { regionCode } = params;
    const body = await request.json();

    if (!REGIONS[regionCode]) {
      return NextResponse.json(
        { success: false, error: `Region '${regionCode}' not found` },
        { status: 404 }
      );
    }

    // 这里应该更新数据库
    // await db.regions.update(regionCode, body);

    return NextResponse.json({
      success: true,
      message: 'Region updated successfully',
      data: { ...REGIONS[regionCode], ...body }
    });
  } catch (error) {
    console.error('Error updating region:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update region' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/regions/[regionCode]
 * 删除地区配置（管理员功能）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { regionCode: string } }
) {
  try {
    const { regionCode } = params;

    if (!REGIONS[regionCode]) {
      return NextResponse.json(
        { success: false, error: `Region '${regionCode}' not found` },
        { status: 404 }
      );
    }

    // 这里应该从数据库删除
    // await db.regions.delete(regionCode);

    return NextResponse.json({
      success: true,
      message: 'Region deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting region:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete region' },
      { status: 500 }
    );
  }
}
