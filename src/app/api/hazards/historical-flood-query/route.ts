import { NextRequest, NextResponse } from 'next/server';
import { fromArrayBuffer } from 'geotiff';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type HistoricalFloodFamily = 'typhoon-compound' | 'rainfall';
type HistoricalFloodRegion = 'hk' | 'mo';

interface HistoricalLayer {
  layer: string;
  display: string;
  year: number | null;
  family: HistoricalFloodFamily;
}

interface HistoricalEventResult extends HistoricalLayer {
  depth: number | null;
  inundated: boolean;
  status: 'matched' | 'dry' | 'no-data' | 'error';
  error?: string;
}

type Position = [number, number];
type AreaGeometry =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const THRESHOLD_METERS = Number(process.env.FLOOD_INUNDATION_THRESHOLD_METERS || 0.15);
const SAMPLING_RADIUS_METERS = Number(process.env.FLOOD_SAMPLING_RADIUS_METERS || 100);
const SOURCE_PIXEL_SIZE_METERS = 4;
const REQUEST_TIMEOUT_MS = 60_000;
const QUERY_CONCURRENCY = 8;
const AREA_QUERY_CONCURRENCY = 4;
const MAX_AREA_RASTER_DIMENSION = 640;
const CATALOG_CACHE_MS = 5 * 60_000;

const catalogCache = new Map<HistoricalFloodRegion, { expiresAt: number; layers: HistoricalLayer[] }>();

// GeoServer workspace;所有历史图层发布在这里。与 GeoServer 安装目录 + republish 脚本保持一致。
const WORKSPACE = 'natcat_platform';

function getGeoServerWmsUrl(): string {
  const configuredUrl = process.env.HAZARD_GEOSERVER_WMS_URL
    || process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL
    || (process.env.GEOSERVER_URL ? `${process.env.GEOSERVER_URL.replace(/\/$/, '')}/wms` : null);
  if (!configuredUrl) throw new Error('GeoServer WMS URL is not configured');
  return configuredUrl;
}

function getGeoServerWcsUrl(wmsUrl: string): string {
  const url = new URL(wmsUrl);
  url.pathname = url.pathname.replace(/\/wms\/?$/i, '/wcs');
  url.search = '';
  return url.toString();
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length >= 2
    && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function isRing(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 4 && value.every(isPosition);
}

function parseGeometry(value: unknown): AreaGeometry | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { type?: unknown; coordinates?: unknown };
  if (candidate.type === 'Polygon' && Array.isArray(candidate.coordinates)
    && candidate.coordinates.length > 0 && candidate.coordinates.every(isRing)) {
    return { type: 'Polygon', coordinates: candidate.coordinates };
  }
  if (candidate.type === 'MultiPolygon' && Array.isArray(candidate.coordinates)
    && candidate.coordinates.length > 0
    && candidate.coordinates.every(polygon => Array.isArray(polygon)
      && polygon.length > 0 && polygon.every(isRing))) {
    return { type: 'MultiPolygon', coordinates: candidate.coordinates as Position[][][] };
  }
  return null;
}

function polygons(geometry: AreaGeometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function geometryBounds(geometry: AreaGeometry): Bounds {
  const positions = polygons(geometry).flat(2);
  return {
    west: Math.min(...positions.map(position => position[0])),
    south: Math.min(...positions.map(position => position[1])),
    east: Math.max(...positions.map(position => position[0])),
    north: Math.max(...positions.map(position => position[1])),
  };
}

function pointInRing(longitude: number, latitude: number, ring: Position[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = (y > latitude) !== (previousY > latitude)
      && longitude < ((previousX - x) * (latitude - y)) / (previousY - y) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(longitude: number, latitude: number, geometry: AreaGeometry): boolean {
  return polygons(geometry).some(polygon =>
    pointInRing(longitude, latitude, polygon[0])
    && polygon.slice(1).every(hole => !pointInRing(longitude, latitude, hole))
  );
}

function areaRasterSize(bounds: Bounds): { width: number; height: number; pixelSizeMeters: number } {
  const centerLatitude = (bounds.north + bounds.south) / 2;
  const widthMeters = (bounds.east - bounds.west) * 111_320 * Math.cos(centerLatitude * Math.PI / 180);
  const heightMeters = (bounds.north - bounds.south) * 110_540;
  const scale = Math.max(1, widthMeters / MAX_AREA_RASTER_DIMENSION / SOURCE_PIXEL_SIZE_METERS,
    heightMeters / MAX_AREA_RASTER_DIMENSION / SOURCE_PIXEL_SIZE_METERS);
  const pixelSizeMeters = SOURCE_PIXEL_SIZE_METERS * scale;
  return {
    width: Math.max(2, Math.ceil(widthMeters / pixelSizeMeters)),
    height: Math.max(2, Math.ceil(heightMeters / pixelSizeMeters)),
    pixelSizeMeters,
  };
}

function describeLayer(layer: string, region: HistoricalFloodRegion): HistoricalLayer {
  const localName = layer.split(':').pop() || layer;
  // GetCapabilities 默认返回 unqualified name("HK_Flood_HistRain_xxx"),
  // 前端用这个值传给 WMS GetMap 时,GeoServer 通常会容忍 unqualified,
  // 但显式补全 workspace prefix 更稳,避免多 workspace 部署后命名冲突。
  const qualified = layer.includes(':') ? layer : `${WORKSPACE}:${localName}`;
  if (region === 'hk') {
    // 形如 HistRain_<时间戳> 或 HistTC_<时间戳>。
    // 时间戳 = YYYYMMDDHH_YYYYMMDDHH_H##(紧凑格式,8 位日期 + 2 位小时)。
    const event = localName.match(
      /Hist(?:Rain|TC)_(\d{4})(\d{2})(\d{2})H(\d{2})_(\d{4})(\d{2})(\d{2})H(\d{2})_H(\d+)$/,
    );
    if (!event) throw new Error(`Unrecognized Hong Kong historical flood layer: ${layer}`);
    const isTc = localName.includes('HistTC_');
    return {
      layer: qualified,
      display: `${event[1]}-${event[2]}-${event[3]} H${event[4]} to ${event[5]}-${event[6]}-${event[7]} H${event[8]} (${event[9]} h)`,
      year: Number(event[1]),
      family: isTc ? 'typhoon-compound' : 'rainfall',
    };
  }
  const rainDate = localName.match(/HistRain_(\d{4})(\d{2})(\d{2})$/);
  if (rainDate) {
    return {
      layer: qualified,
      display: `Rain ${rainDate[1]}-${rainDate[2]}-${rainDate[3]}`,
      year: Number(rainDate[1]),
      family: 'rainfall',
    };
  }
  const numberedTc = localName.match(/HistTC_(\d{4})_(\d+)$/);
  if (numberedTc) {
    return {
      layer: qualified,
      display: `TC ${numberedTc[1]}-${numberedTc[2]}`,
      year: Number(numberedTc[1]),
      family: 'typhoon-compound',
    };
  }
  const namedTc = localName.match(/HistTC_(.+)$/)?.[1] || localName;
  const namedYears: Record<string, number> = { Hato: 2017, Mangkhut: 2018, Ragasa: 2023 };
  return {
    layer: qualified,
    display: `TC ${namedTc}`,
    year: namedYears[namedTc] ?? null,
    family: 'typhoon-compound',
  };
}

async function getHistoricalLayers(
  wmsUrl: string,
  region: HistoricalFloodRegion,
): Promise<HistoricalLayer[]> {
  const cached = catalogCache.get(region);
  if (cached && cached.expiresAt > Date.now()) return cached.layers;
  const params = new URLSearchParams({ SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetCapabilities' });
  const response = await fetch(`${wmsUrl}?${params}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GeoServer capabilities returned HTTP ${response.status}`);
  const xml = await response.text();
  const layerPattern = region === 'hk'
    ? /<Name>\s*([^<]*HK_Flood_Hist(?:Rain|TC)_[^<]+)\s*<\/Name>/g
    : /<Name>\s*([^<]*MO_Flood_Hist(?:TC|Rain)_[^<]+)\s*<\/Name>/g;
  const names = Array.from(xml.matchAll(layerPattern))
    .map(match => match[1].trim())
    .filter((layer, index, layers) => layers.indexOf(layer) === index)
    .sort();
  if (!names.length) throw new Error(`No ${region === 'hk' ? 'Hong Kong' : 'Macau'} historical flood-depth layers were found in GeoServer`);
  const layers = names.map(layer => describeLayer(layer, region));
  catalogCache.set(region, { expiresAt: Date.now() + CATALOG_CACHE_MS, layers });
  return layers;
}

function requestedRegion(value: unknown): HistoricalFloodRegion | null {
  return value === 'hk' || value === 'mo' ? value : null;
}

function regionForPoint(latitude: number, longitude: number): HistoricalFloodRegion | null {
  if (latitude >= 22.05 && latitude <= 22.23 && longitude >= 113.48 && longitude <= 113.65) return 'mo';
  if (latitude >= 22.14 && latitude <= 22.58 && longitude >= 113.80 && longitude <= 114.52) return 'hk';
  return null;
}

function regionForBounds(bounds: Bounds): HistoricalFloodRegion | null {
  const intersectsMacau = bounds.east >= 113.48 && bounds.west <= 113.65
    && bounds.north >= 22.05 && bounds.south <= 22.23;
  if (intersectsMacau) return 'mo';
  const intersectsHongKong = bounds.east >= 113.80 && bounds.west <= 114.52
    && bounds.north >= 22.14 && bounds.south <= 22.58;
  return intersectsHongKong ? 'hk' : null;
}

export async function GET(request: NextRequest) {
  try {
    const region = requestedRegion(request.nextUrl.searchParams.get('region'));
    if (!region) return NextResponse.json({ error: 'Region must be hk or mo' }, { status: 400 });
    const layers = await getHistoricalLayers(getGeoServerWmsUrl(), region);
    return NextResponse.json({ region, totalEvents: layers.length, events: layers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Historical flood catalog failed' },
      { status: 500 },
    );
  }
}

async function queryLayer(
  wcsUrl: string,
  latitude: number,
  longitude: number,
  definition: HistoricalLayer,
): Promise<HistoricalEventResult> {
  try {
    const latitudeRadius = SAMPLING_RADIUS_METERS / 110_540;
    const longitudeRadius = SAMPLING_RADIUS_METERS
      / (111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
    const sourcePixelSizeMeters = definition.layer.includes('HK_Flood_HistRain_')
      || definition.layer.includes('HK_Flood_HistTC_') ? 30 : SOURCE_PIXEL_SIZE_METERS;
    const sampleSize = Math.max(3, Math.ceil((SAMPLING_RADIUS_METERS * 2) / sourcePixelSizeMeters) + 1);
    const params = new URLSearchParams({
      SERVICE: 'WCS',
      VERSION: '1.0.0',
      REQUEST: 'GetCoverage',
      COVERAGE: definition.layer,
      CRS: 'EPSG:4326',
      BBOX: [
        longitude - longitudeRadius,
        latitude - latitudeRadius,
        longitude + longitudeRadius,
        latitude + latitudeRadius,
      ].join(','),
      WIDTH: String(sampleSize),
      HEIGHT: String(sampleSize),
      FORMAT: 'GeoTIFF',
    });
    const response = await fetch(`${wcsUrl}?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`GeoServer WCS returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('tiff')) throw new Error(`Unexpected WCS response: ${contentType}`);

    const tiff = await fromArrayBuffer(await response.arrayBuffer());
    const image = await tiff.getImage();
    const raster = await image.readRasters({ interleave: true });
    const width = image.getWidth();
    const height = image.getHeight();
    const noData = image.getGDALNoData();
    let maximumDepth: number | null = null;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const normalizedX = width === 1 ? 0 : (x / (width - 1)) * 2 - 1;
        const normalizedY = height === 1 ? 0 : (y / (height - 1)) * 2 - 1;
        if (normalizedX * normalizedX + normalizedY * normalizedY > 1) continue;
        const rawValue = Number(raster[y * width + x]);
        if (!Number.isFinite(rawValue) || rawValue <= -9990 || rawValue >= 10000) continue;
        if (noData !== null && Math.abs(rawValue - noData) < 1e-6) continue;
        maximumDepth = Math.max(maximumDepth ?? 0, Math.max(0, rawValue));
      }
    }
    const inundated = maximumDepth !== null && maximumDepth > THRESHOLD_METERS;
    return {
      ...definition,
      depth: maximumDepth,
      inundated,
      status: maximumDepth === null ? 'no-data' : inundated ? 'matched' : 'dry',
    };
  } catch (error) {
    return {
      ...definition,
      depth: null,
      inundated: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function queryAreaLayer(
  wcsUrl: string,
  geometry: AreaGeometry,
  bounds: Bounds,
  width: number,
  height: number,
  definition: HistoricalLayer,
): Promise<HistoricalEventResult> {
  try {
    const params = new URLSearchParams({
      SERVICE: 'WCS', VERSION: '1.0.0', REQUEST: 'GetCoverage', COVERAGE: definition.layer,
      CRS: 'EPSG:4326', BBOX: [bounds.west, bounds.south, bounds.east, bounds.north].join(','),
      WIDTH: String(width), HEIGHT: String(height), FORMAT: 'GeoTIFF',
    });
    const response = await fetch(`${wcsUrl}?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GeoServer WCS returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('tiff')) throw new Error(`Unexpected WCS response: ${contentType}`);
    const tiff = await fromArrayBuffer(await response.arrayBuffer());
    const image = await tiff.getImage();
    const raster = await image.readRasters({ interleave: true });
    const rasterWidth = image.getWidth();
    const rasterHeight = image.getHeight();
    const noData = image.getGDALNoData();
    let maximumDepth: number | null = null;
    for (let y = 0; y < rasterHeight; y += 1) {
      const latitude = bounds.north - ((y + 0.5) / rasterHeight) * (bounds.north - bounds.south);
      for (let x = 0; x < rasterWidth; x += 1) {
        const longitude = bounds.west + ((x + 0.5) / rasterWidth) * (bounds.east - bounds.west);
        if (!pointInGeometry(longitude, latitude, geometry)) continue;
        const rawValue = Number(raster[y * rasterWidth + x]);
        if (!Number.isFinite(rawValue) || rawValue <= -9990 || rawValue >= 10000) continue;
        if (noData !== null && Math.abs(rawValue - noData) < 1e-6) continue;
        maximumDepth = Math.max(maximumDepth ?? 0, Math.max(0, rawValue));
      }
    }
    const inundated = maximumDepth !== null && maximumDepth > THRESHOLD_METERS;
    return { ...definition, depth: maximumDepth, inundated,
      status: maximumDepth === null ? 'no-data' : inundated ? 'matched' : 'dry' };
  } catch (error) {
    return { ...definition, depth: null, inundated: false, status: 'error',
      error: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const geometry = parseGeometry(body.geometry);
    if (body.geometry && !geometry) {
      return NextResponse.json({ error: 'A valid Polygon or MultiPolygon is required' }, { status: 400 });
    }
    if (geometry) {
      const bounds = geometryBounds(geometry);
      const detectedRegion = regionForBounds(bounds);
      const region = requestedRegion(body.region) || detectedRegion;
      if (!region || region !== detectedRegion) {
        return NextResponse.json({ available: false,
          reason: 'The selected area is outside the requested historical flood catalog region',
          thresholdMeters: THRESHOLD_METERS, samplingRadiusMeters: 0, totalEvents: 0,
          queriedEvents: 0, inundationCount: 0, typhoonCount: 0, rainfallCount: 0,
          events: [], queriedAt: new Date().toISOString(), scope: 'area' });
      }
      const wmsUrl = getGeoServerWmsUrl();
      const layers = await getHistoricalLayers(wmsUrl, region);
      const rasterSize = areaRasterSize(bounds);
      const results: HistoricalEventResult[] = [];
      for (let index = 0; index < layers.length; index += AREA_QUERY_CONCURRENCY) {
        results.push(...await Promise.all(layers.slice(index, index + AREA_QUERY_CONCURRENCY)
          .map(layer => queryAreaLayer(getGeoServerWcsUrl(wmsUrl), geometry, bounds,
            rasterSize.width, rasterSize.height, layer))));
      }
      const events = results.filter(result => result.inundated).sort((left, right) =>
        (left.year ?? 0) - (right.year ?? 0) || left.display.localeCompare(right.display));
      const errorCount = results.filter(result => result.status === 'error').length;
      return NextResponse.json({ available: true, scope: 'area', thresholdMeters: THRESHOLD_METERS,
        samplingRadiusMeters: 0, approximatePixelSizeMeters: rasterSize.pixelSizeMeters,
        rasterWidth: rasterSize.width, rasterHeight: rasterSize.height, totalEvents: layers.length,
        queriedEvents: results.length - errorCount, errorCount, inundationCount: events.length,
        typhoonCount: events.filter(event => event.family === 'typhoon-compound').length,
        rainfallCount: events.filter(event => event.family === 'rainfall').length,
        maximumHistoricalDepth: events.length ? Math.max(...events.map(event => event.depth || 0)) : null,
        events, queriedAt: new Date().toISOString(),
        source: 'GeoServer historical simulated flood-depth catalog' });
    }
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }
    const detectedRegion = regionForPoint(latitude, longitude);
    const region = requestedRegion(body.region) || detectedRegion;
    if (!region || region !== detectedRegion) {
      return NextResponse.json({
        available: false,
        reason: 'The location is outside the requested historical flood catalog region',
        thresholdMeters: THRESHOLD_METERS,
        samplingRadiusMeters: SAMPLING_RADIUS_METERS,
        totalEvents: 0,
        queriedEvents: 0,
        inundationCount: 0,
        typhoonCount: 0,
        rainfallCount: 0,
        events: [],
        queriedAt: new Date().toISOString(),
      });
    }

    const wmsUrl = getGeoServerWmsUrl();
    const layers = await getHistoricalLayers(wmsUrl, region);
    const results: HistoricalEventResult[] = [];
    for (let index = 0; index < layers.length; index += QUERY_CONCURRENCY) {
      results.push(...await Promise.all(
        layers.slice(index, index + QUERY_CONCURRENCY)
          .map(layer => queryLayer(getGeoServerWcsUrl(wmsUrl), latitude, longitude, layer)),
      ));
    }
    const events = results.filter(result => result.inundated).sort((left, right) =>
      (left.year ?? 0) - (right.year ?? 0) || left.display.localeCompare(right.display)
    );
    const errorCount = results.filter(result => result.status === 'error').length;
    return NextResponse.json({
      available: true,
      thresholdMeters: THRESHOLD_METERS,
      samplingMethod: 'neighborhood-max',
      samplingRadiusMeters: SAMPLING_RADIUS_METERS,
      totalEvents: layers.length,
      queriedEvents: results.length - errorCount,
      errorCount,
      inundationCount: events.length,
      typhoonCount: events.filter(event => event.family === 'typhoon-compound').length,
      rainfallCount: events.filter(event => event.family === 'rainfall').length,
      maximumHistoricalDepth: events.length ? Math.max(...events.map(event => event.depth || 0)) : null,
      events,
      queriedAt: new Date().toISOString(),
      source: 'GeoServer historical simulated flood-depth catalog',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Historical flood query failed' },
      { status: 500 },
    );
  }
}
