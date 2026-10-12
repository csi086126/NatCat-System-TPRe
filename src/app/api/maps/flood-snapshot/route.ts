import { NextRequest, NextResponse } from 'next/server';
import { MACAU_DESIGN_RETURN_PERIOD_CODES } from '@/features/risk-map/config/macauScenarios';

export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 20_000;
const IMAGE_WIDTH = 1280;
const IMAGE_HEIGHT = 800;
const FLOOD_STYLE = 'flood-depth-blue-satellite';

type FloodFamily = 'non-typhoon' | 'compound';
type ReturnPeriod = number;

const VALID_RETURN_PERIODS = new Set<number>(
  MACAU_DESIGN_RETURN_PERIOD_CODES.map(code => Number.parseInt(code, 10)),
);

function validCoordinate(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function resolveRegion(latitude: number, longitude: number): 'hk' | 'mo' {
  // Macau 范围:lat 22.05-22.23, lng 113.48-113.65
  if (latitude >= 22.05 && latitude <= 22.23 && longitude >= 113.48 && longitude <= 113.65) return 'mo';
  // HK 范围:lat 22.14-22.58, lng 113.80-114.52
  return 'hk';
}

function floodLayer(family: FloodFamily, returnPeriod: ReturnPeriod, region: 'hk' | 'mo'): string {
  if (region === 'hk') {
    // HK 非台风降水:用 NONTC 系列(覆盖完整的 11 个 RP,包括 R2)。
    // 旧代码用 HK_Flood_Rain_HK_floodMaxDepth_R* 但该图层只有 R5/10/20/50/100/200/500/1000,
    // R2 / R25 / R250 都不存在,导致 PDF 早期 onset map 取不到底图。
    if (family === 'non-typhoon') {
      const returnPeriodCode = String(returnPeriod).padStart(3, '0');
      return `natcat_platform:HK_Flood_NONTC_R${returnPeriodCode}`;
    }
    // typhoon compound 在 flood-query 中按系列查询所有 RP(同 NONTC 系列),
    // 这里取最近 RP,缺图时由 fetchFloodSnapshot 走 fallback 返回 null。
    const compoundRps = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const nearest = compoundRps.reduce((prev, curr) =>
      Math.abs(curr - returnPeriod) < Math.abs(prev - returnPeriod) ? curr : prev,
    );
    return `natcat_platform:HK_Flood_Compound_R${String(nearest).padStart(3, '0')}`;
  }
  // Macau 图层(原逻辑)
  const prefix = family === 'non-typhoon' ? 'MO_Flood_NONTC_R' : 'MO_Flood_Compound_R';
  const returnPeriodCode = String(returnPeriod).padStart(3, '0');
  return `natcat_platform:${prefix}${returnPeriodCode}`;
}

// 与 flood-area-query / flood-query 保持一致:HAZARD_GEOSERVER_WMS_URL 优先,
// 没设就回落到 GEOSERVER_URL/wms。模块顶层 throw 会让所有 WMS 请求直接 500,
// 这里改成 GET 时再校验,避免一次 env 缺失导致整页功能挂掉。
const FLOOD_WMS_URL = process.env.HAZARD_GEOSERVER_WMS_URL
  || process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL
  || (process.env.GEOSERVER_URL ? `${process.env.GEOSERVER_URL.replace(/\/$/, '')}/wms` : null);

function floodWmsUrl(
  latitude: number,
  longitude: number,
  family: FloodFamily,
  returnPeriod: ReturnPeriod,
  zoom: number,
  region: 'hk' | 'mo',
): string {
  const logicalWidth = 1024;
  const logicalHeight = 640;
  const worldPixels = 256 * 2 ** zoom;
  const longitudeSpan = logicalWidth * 360 / worldPixels;
  const latitudeSpan = logicalHeight * 360 * Math.cos(latitude * Math.PI / 180) / worldPixels;
  const bbox = [
    longitude - longitudeSpan / 2,
    latitude - latitudeSpan / 2,
    longitude + longitudeSpan / 2,
    latitude + latitudeSpan / 2,
  ].join(',');
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: floodLayer(family, returnPeriod, region),
    styles: FLOOD_STYLE,
    srs: 'EPSG:4326',
    bbox,
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
    format: 'image/png',
    transparent: 'true',
  });
  return `${FLOOD_WMS_URL}?${params}`;
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get('lat'));
  const longitude = Number(request.nextUrl.searchParams.get('lng'));
  const family = request.nextUrl.searchParams.get('family');
  const returnPeriod = Number(request.nextUrl.searchParams.get('rp'));
  const zoom = Number(request.nextUrl.searchParams.get('zoom') || 17);

  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 });
  }
  if (family !== 'non-typhoon' && family !== 'compound') {
    return NextResponse.json({ error: 'Family must be non-typhoon or compound' }, { status: 400 });
  }
  if (!Number.isInteger(returnPeriod) || !VALID_RETURN_PERIODS.has(returnPeriod)) {
    return NextResponse.json({ error: 'Return period is not a supported Macau design scenario' }, { status: 400 });
  }
  if (!Number.isInteger(zoom) || zoom < 12 || zoom > 18) {
    return NextResponse.json({ error: 'Zoom must be an integer between 12 and 18' }, { status: 400 });
  }
  if (!FLOOD_WMS_URL) {
    return NextResponse.json({
      error: 'Flood map service is unavailable: GeoServer WMS URL is not configured (set HAZARD_GEOSERVER_WMS_URL or GEOSERVER_URL in .env)',
    }, { status: 502 });
  }

  const region = resolveRegion(latitude, longitude);
  try {
    const response = await fetch(floodWmsUrl(latitude, longitude, family, returnPeriod, zoom, region), {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Flood map service is unavailable' }, { status: 502 });
    }
    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'X-Map-Provider': `GeoServer ${floodLayer(family, returnPeriod, region)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Flood map service is unavailable' }, { status: 502 });
  }
}