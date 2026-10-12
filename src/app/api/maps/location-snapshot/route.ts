import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 90_000;
// ESRI World_Imagery 的 export 接口在 z<=13 (大区域) 单次可达 60-120s,
// 把整体 timeout 提到 90s 覆盖 99% 情况。BODY_TIMEOUT_MS 兜底 AbortSignal.timeout
// 在 body 流式阶段不一定 abort 的情况(headers 进来后, body 传输卡死就不再触发)。
const BODY_TIMEOUT_MS = 90_000;
const IMAGE_WIDTH = 1280;
const IMAGE_HEIGHT = 800;

type SnapshotType = 'satellite' | 'roadmap';

function validCoordinate(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function googleStaticMapUrl(latitude: number, longitude: number, apiKey: string, zoom: number): string {
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: '640x400',
    scale: '2',
    maptype: 'roadmap',
    markers: `color:red|${latitude},${longitude}`,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

function outOfChina(latitude: number, longitude: number): boolean {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(x: number, y: number): number {
  return -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y
    + 0.2 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    + (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
    + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
}

function transformLongitude(x: number, y: number): number {
  return 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y
    + 0.1 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    + (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
    + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
}

function wgs84ToGcj02(latitude: number, longitude: number): [number, number] {
  if (outOfChina(latitude, longitude)) return [latitude, longitude];

  const ellipsoidA = 6378245;
  const eccentricitySquared = 0.006693421622965943;
  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35);
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35);
  const latitudeRadians = latitude / 180 * Math.PI;
  const magic = 1 - eccentricitySquared * Math.sin(latitudeRadians) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  latitudeDelta = latitudeDelta * 180
    / ((ellipsoidA * (1 - eccentricitySquared)) / (magic * sqrtMagic) * Math.PI);
  longitudeDelta = longitudeDelta * 180
    / (ellipsoidA / sqrtMagic * Math.cos(latitudeRadians) * Math.PI);
  return [latitude + latitudeDelta, longitude + longitudeDelta];
}

function amapStaticMapUrl(latitude: number, longitude: number, apiKey: string, zoom: number): string {
  const [gcjLatitude, gcjLongitude] = wgs84ToGcj02(latitude, longitude);
  const location = `${gcjLongitude.toFixed(6)},${gcjLatitude.toFixed(6)}`;
  const params = new URLSearchParams({
    location,
    zoom: String(zoom),
    size: '1024*640',
    scale: '2',
    markers: `mid,0xE53935,A:${location}`,
    key: apiKey,
  });
  return `https://restapi.amap.com/v3/staticmap?${params}`;
}

function esriExportUrl(latitude: number, longitude: number, type: SnapshotType, zoom: number): string {
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
  const service = type === 'satellite' ? 'World_Imagery' : 'World_Street_Map';
  const params = new URLSearchParams({
    bbox,
    bboxSR: '4326',
    imageSR: '4326',
    size: `${IMAGE_WIDTH},${IMAGE_HEIGHT}`,
    format: 'jpg',
    transparent: 'false',
    f: 'image',
  });
  return `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/export?${params}`;
}

async function fetchImage(url: string): Promise<Response | null> {
  // 两阶段 timeout:
  //   1. fetch 阶段:AbortSignal.timeout(REQUEST_TIMEOUT_MS) 防止连接建立/headers 阶段卡死
  //   2. body 阶段:Promise.race 防止 headers 已 OK 但 body 流式阶段卡住(AbortSignal 在
  //      Node.js 里仅在 fetch 初始化时生效,body 传输中途卡住不会被它触发 abort)
  // 二者都是 90s,既给 ESRI 大区域 export 留够时间,也保证 body 卡死时能给客户端明确失败。
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.startsWith('image/')) return null;
  try {
    const buffer = await Promise.race([
      response.arrayBuffer(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Body read timed out after ${BODY_TIMEOUT_MS}ms`)), BODY_TIMEOUT_MS),
      ),
    ]);
    // 替换 response 的 body,让调用方 arrayBuffer() 不会再卡
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return null;
  }
}

function imageResponse(response: Response, provider: string, type: SnapshotType): Promise<NextResponse> {
  return response.arrayBuffer().then(buffer => new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      'X-Map-Provider': provider,
      'X-Map-Type': type,
    },
  }));
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get('lat'));
  const longitude = Number(request.nextUrl.searchParams.get('lng'));
  const requestedZoom = Number(request.nextUrl.searchParams.get('zoom') || 17);
  const requestedType = request.nextUrl.searchParams.get('type');
  const preferredProvider = request.nextUrl.searchParams.get('provider');
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 });
  }
  if (requestedType !== 'satellite' && requestedType !== 'roadmap') {
    return NextResponse.json({ error: 'Type must be satellite or roadmap' }, { status: 400 });
  }
  if (!Number.isInteger(requestedZoom) || requestedZoom < 12 || requestedZoom > 18) {
    return NextResponse.json({ error: 'Zoom must be an integer between 12 and 18' }, { status: 400 });
  }
  const type = requestedType as SnapshotType;

  if (type === 'roadmap') {
    const amapKey = process.env.AMAP_API_KEY || process.env.NEXT_PUBLIC_AMAP_API_KEY;
    if (preferredProvider === 'amap' && amapKey) {
      const amapResponse = await fetchImage(amapStaticMapUrl(latitude, longitude, amapKey, requestedZoom));
      if (amapResponse) return imageResponse(amapResponse, 'Amap (Gaode Maps)', type);
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      const googleResponse = await fetchImage(googleStaticMapUrl(latitude, longitude, googleKey, requestedZoom));
      if (googleResponse) return imageResponse(googleResponse, 'Google Maps', type);
    }

    if (amapKey) {
      const amapResponse = await fetchImage(amapStaticMapUrl(latitude, longitude, amapKey, requestedZoom));
      if (amapResponse) return imageResponse(amapResponse, 'Amap (Gaode Maps)', type);
    }
  }

  const esriResponse = await fetchImage(esriExportUrl(latitude, longitude, type, requestedZoom));
  if (esriResponse) {
    return imageResponse(
      esriResponse,
      type === 'satellite' ? 'Esri World Imagery' : 'Esri World Street Map (map-provider fallback)',
      type,
    );
  }

  return NextResponse.json({ error: 'Map snapshot service is unavailable' }, { status: 502 });
}
