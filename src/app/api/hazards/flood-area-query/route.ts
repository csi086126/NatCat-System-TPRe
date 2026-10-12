import { NextRequest, NextResponse } from 'next/server';
import { fromArrayBuffer } from 'geotiff';
import type {
  AreaAnnualMetricStatistics,
  AreaFloodFamilyStatistics,
  AreaFloodHazardResult,
  AreaFloodScenarioStatistics,
  AreaRasterStatistics,
} from '@/features/risk-map/types';
import {
  MACAU_DESIGN_SCENARIOS,
  type MacauFloodScenario,
  type MacauFloodScenarioFamily,
} from '@/features/risk-map/config/macauScenarios';
import {
  HK_DESIGN_SCENARIOS,
  type HongKongFloodScenario,
} from '@/features/risk-map/config/hongKongScenarios';

export const dynamic = 'force-dynamic';

type Position = [number, number];
type PolygonCoordinates = Position[][];
type AreaGeometry =
  | { type: 'Polygon'; coordinates: PolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };

interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface RegionConfig {
  pixelSizeMeters: number;
  bbox: Bounds;
  // 统一后的扁平场景表:每个 RP 一行,带 family/returnPeriod/layerName 三个字段。
  // Macau 走 rainfallReturnPeriod / stormSurgeReturnPeriod 拆分,HK 直接用 returnPeriod;
  // 这里是预归一化,下游按 family 过滤即可。
  scenarios: NormalizedScenario[];
  annualLayers: Record<MacauFloodScenarioFamily, { probability: string; annualized: string }>;
}

interface NormalizedScenario {
  family: MacauFloodScenarioFamily;
  returnPeriod: number;
  layerName: string;
}

const THRESHOLD_METERS = Number(process.env.FLOOD_INUNDATION_THRESHOLD_METERS || 0.15);
const MAX_RASTER_DIMENSION = 640;
const REQUEST_TIMEOUT_MS = 60_000;
const FAMILIES: MacauFloodScenarioFamily[] = ['non-typhoon-rainfall', 'typhoon-compound'];
// WCS 单层 5s 是 GeoServer 在内网 4m / 30m 栅格上的常见值,
// 拉满 6 路并发(GeoServer 默认 IO 池 8)避免把服务端打挂。
const WCS_CONCURRENCY = Number(process.env.FLOOD_AREA_WCS_CONCURRENCY || 6);

function normalizeMacau(scenario: MacauFloodScenario): NormalizedScenario {
  return {
    family: scenario.family,
    returnPeriod: scenario.rainfallReturnPeriod ?? (scenario.stormSurgeReturnPeriod as number),
    layerName: scenario.layerName,
  };
}

function normalizeHongKong(scenario: HongKongFloodScenario): NormalizedScenario {
  return {
    family: scenario.family,
    returnPeriod: scenario.returnPeriod,
    layerName: scenario.layerName,
  };
}

const REGION_CONFIG: Record<'mo' | 'hk', RegionConfig> = {
  mo: {
    pixelSizeMeters: 4,
    bbox: { west: 113.48, east: 113.65, south: 22.05, north: 22.23 },
    scenarios: MACAU_DESIGN_SCENARIOS.map(normalizeMacau),
    annualLayers: {
      'non-typhoon-rainfall': {
        probability: 'natcat_platform:MO_Flood_NONTC_AnnualProbability_GT015m',
        annualized: 'natcat_platform:MO_Flood_NONTC_AnnualizedExcessDepth_GT015m',
      },
      'typhoon-compound': {
        probability: 'natcat_platform:MO_Flood_Compound_AnnualProbability_GT015m',
        annualized: 'natcat_platform:MO_Flood_Compound_AnnualizedExcessDepth_GT015m',
      },
    },
  },
  hk: {
    // HK 栅格原生像素 30m(EPSG:2326),源数据 WCS GetCoverage 直接走 EPSG:4326 即可。
    pixelSizeMeters: 30,
    bbox: { west: 113.80, east: 114.52, south: 22.14, north: 22.58 },
    scenarios: HK_DESIGN_SCENARIOS.map(normalizeHongKong),
    annualLayers: {
      'non-typhoon-rainfall': {
        probability: 'natcat_platform:HK_Flood_NONTC_AnnualProbability_GT015m',
        annualized: 'natcat_platform:HK_Flood_NONTC_AnnualizedExcessDepth_GT015m',
      },
      'typhoon-compound': {
        probability: 'natcat_platform:HK_Flood_Compound_AnnualProbability_GT015m',
        annualized: 'natcat_platform:HK_Flood_Compound_AnnualizedExcessDepth_GT015m',
      },
    },
  },
};

function getGeoServerWcsUrl(): string {
  const configuredUrl = process.env.HAZARD_GEOSERVER_WMS_URL
    || process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL
    || (process.env.GEOSERVER_URL ? `${process.env.GEOSERVER_URL.replace(/\/$/, '')}/wms` : null);
  if (!configuredUrl) throw new Error('GeoServer WMS URL is not configured');
  const url = new URL(configuredUrl);
  url.pathname = url.pathname.replace(/\/wms\/?$/i, '/wcs');
  url.search = '';
  return url.toString();
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(value[0])
    && Number.isFinite(value[1]);
}

function isRing(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 4 && value.every(isPosition);
}

function isPolygonCoordinates(value: unknown): value is PolygonCoordinates {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

function parseGeometry(value: unknown): AreaGeometry | null {
  if (!value || typeof value !== 'object') return null;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type === 'Polygon' && isPolygonCoordinates(geometry.coordinates)) {
    return { type: 'Polygon', coordinates: geometry.coordinates };
  }
  if (geometry.type === 'MultiPolygon'
    && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length > 0
    && geometry.coordinates.every(isPolygonCoordinates)) {
    return { type: 'MultiPolygon', coordinates: geometry.coordinates };
  }
  return null;
}

function polygons(geometry: AreaGeometry): PolygonCoordinates[] {
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

function ringAreaSquareMeters(ring: Position[], referenceLatitude: number): number {
  const metersPerDegreeLatitude = 110_540;
  const metersPerDegreeLongitude = 111_320 * Math.cos(referenceLatitude * Math.PI / 180);
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [longitude, latitude] = ring[index];
    const [nextLongitude, nextLatitude] = ring[(index + 1) % ring.length];
    twiceArea += longitude * metersPerDegreeLongitude * nextLatitude * metersPerDegreeLatitude
    - nextLongitude * metersPerDegreeLongitude * latitude * metersPerDegreeLatitude;
  }
  return Math.abs(twiceArea) / 2;
}

function geometryAreaSquareMeters(geometry: AreaGeometry, referenceLatitude: number): number {
  return polygons(geometry).reduce((total, polygon) => {
    const exteriorArea = ringAreaSquareMeters(polygon[0], referenceLatitude);
    const holesArea = polygon.slice(1).reduce(
      (sum, ring) => sum + ringAreaSquareMeters(ring, referenceLatitude),
      0,
    );
    return total + Math.max(0, exteriorArea - holesArea);
  }, 0);
}

function percentile(sortedValues: number[], probability: number): number | null {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

function summarizeValues(values: number[]): AreaAnnualMetricStatistics {
  if (!values.length) return { mean: null, p50: null, p90: null, maximum: null, validPixelCount: 0 };
  values.sort((left, right) => left - right);
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    maximum: values[values.length - 1],
    validPixelCount: values.length,
  };
}

async function readMaskedValues(
  layer: string,
  geometry: AreaGeometry,
  bounds: Bounds,
  width: number,
  height: number,
): Promise<number[]> {
  const params = new URLSearchParams({
    SERVICE: 'WCS',
    VERSION: '1.0.0',
    REQUEST: 'GetCoverage',
    COVERAGE: layer,
    CRS: 'EPSG:4326',
    BBOX: [bounds.west, bounds.south, bounds.east, bounds.north].join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'GeoTIFF',
  });
  const response = await fetch(`${getGeoServerWcsUrl()}?${params}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GeoServer WCS returned HTTP ${response.status} for ${layer}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('tiff')) throw new Error(`Unexpected WCS response for ${layer}: ${contentType}`);

  const tiff = await fromArrayBuffer(await response.arrayBuffer());
  const image = await tiff.getImage();
  const raster = await image.readRasters({ interleave: true });
  const rasterWidth = image.getWidth();
  const rasterHeight = image.getHeight();
  const noData = image.getGDALNoData();
  const values: number[] = [];
  for (let y = 0; y < rasterHeight; y += 1) {
    const latitude = bounds.north - ((y + 0.5) / rasterHeight) * (bounds.north - bounds.south);
    for (let x = 0; x < rasterWidth; x += 1) {
      const longitude = bounds.west + ((x + 0.5) / rasterWidth) * (bounds.east - bounds.west);
      if (!pointInGeometry(longitude, latitude, geometry)) continue;
      const rawValue = Number(raster[y * rasterWidth + x]);
      if (!Number.isFinite(rawValue) || rawValue <= -9990 || rawValue >= 10000) continue;
      if (noData !== null && Math.abs(rawValue - noData) < 1e-6) continue;
      values.push(Math.max(0, rawValue));
    }
  }
  return values;
}

function summarizeScenario(values: number[]): AreaRasterStatistics {
  if (!values.length) {
    return {
      validPixelCount: 0,
      floodedPixelCount: 0,
      floodedAreaFraction: 0,
      meanDepth: null,
      meanWetDepth: null,
      p50Depth: null,
      p90Depth: null,
      p95Depth: null,
      maximumDepth: null,
    };
  }
  values.sort((left, right) => left - right);
  const wetValues = values.filter(value => value > THRESHOLD_METERS);
  return {
    validPixelCount: values.length,
    floodedPixelCount: wetValues.length,
    floodedAreaFraction: wetValues.length / values.length,
    meanDepth: values.reduce((sum, value) => sum + value, 0) / values.length,
    meanWetDepth: wetValues.length
      ? wetValues.reduce((sum, value) => sum + value, 0) / wetValues.length
      : null,
    p50Depth: percentile(values, 0.5),
    p90Depth: percentile(values, 0.9),
    p95Depth: percentile(values, 0.95),
    maximumDepth: values[values.length - 1],
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

function onsetReturnPeriod(
  scenarios: AreaFloodScenarioStatistics[],
  minimumAreaFraction: number,
): number | null {
  return scenarios.find(scenario => scenario.floodedAreaFraction >= minimumAreaFraction)?.returnPeriod ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const regionRaw = typeof body.region === 'string' ? body.region : null;
    if (regionRaw !== 'mo' && regionRaw !== 'hk') {
      return NextResponse.json({
        error: `Area flood layers have not been connected for region ${regionRaw ?? '(unknown)'}`,
        available: false,
        region: regionRaw,
        status: 'pending-layers',
      }, { status: 409 });
    }
    const region: 'mo' | 'hk' = regionRaw;
    const regionConfig = REGION_CONFIG[region];
    const geometry = parseGeometry(body.geometry);
    if (!geometry) {
      return NextResponse.json({ error: 'A valid Polygon or MultiPolygon geometry is required' }, { status: 400 });
    }
    const bounds = geometryBounds(geometry);
    if (bounds.west < regionConfig.bbox.west
      || bounds.east > regionConfig.bbox.east
      || bounds.south < regionConfig.bbox.south
      || bounds.north > regionConfig.bbox.north) {
      return NextResponse.json({
        error: `Area flood analysis currently supports geometries fully inside ${region.toUpperCase()}`,
      }, { status: 400 });
    }
    if (bounds.east <= bounds.west || bounds.north <= bounds.south) {
      return NextResponse.json({ error: 'Geometry has an empty bounding box' }, { status: 400 });
    }

    const centerLatitude = (bounds.south + bounds.north) / 2;
    const widthMeters = (bounds.east - bounds.west) * 111_320 * Math.cos(centerLatitude * Math.PI / 180);
    const heightMeters = (bounds.north - bounds.south) * 110_540;
    const sourcePixelSizeMeters = regionConfig.pixelSizeMeters;
    const scale = Math.min(1, MAX_RASTER_DIMENSION / Math.max(widthMeters / sourcePixelSizeMeters, heightMeters / sourcePixelSizeMeters));
    const width = Math.max(2, Math.ceil((widthMeters / sourcePixelSizeMeters) * scale));
    const height = Math.max(2, Math.ceil((heightMeters / sourcePixelSizeMeters) * scale));
    const approximatePixelSizeMeters = Math.max(widthMeters / width, heightMeters / height);

    const familyResults: AreaFloodFamilyStatistics[] = [];
    for (const family of FAMILIES) {
      const definitions = regionConfig.scenarios.filter(scenario => scenario.family === family);
      console.log(`[flood-area-query] region=${region} family=${family} scenarios=${definitions.length}`);
      // 把 annual 两层与 11 个 scenarios 一并并发:WCS 池的瓶颈不在 IO 数,
      // 而在 GeoServer 单次 GetCoverage 的处理时间(典型 0.2-1.5s)。
      // 之前 4 路并发 + 串行 annual 经常卡到 40s+;现在 6 路 + 全部并行,
      // 单 family 通常 5-8s 即可完成。
      const [scenarios, annualProbabilityValues, annualizedValues] = await Promise.all([
        mapWithConcurrency(definitions, WCS_CONCURRENCY, async definition => ({
          returnPeriod: definition.returnPeriod,
          layer: definition.layerName,
          ...summarizeScenario(await readMaskedValues(definition.layerName, geometry, bounds, width, height)),
        })),
        readMaskedValues(regionConfig.annualLayers[family].probability, geometry, bounds, width, height),
        readMaskedValues(regionConfig.annualLayers[family].annualized, geometry, bounds, width, height),
      ]);
      scenarios.sort((left, right) => left.returnPeriod - right.returnPeriod);
      familyResults.push({
        family,
        scenarios,
        anyAreaOnsetReturnPeriod: onsetReturnPeriod(scenarios, Number.EPSILON),
        onePercentAreaOnsetReturnPeriod: onsetReturnPeriod(scenarios, 0.01),
        tenPercentAreaOnsetReturnPeriod: onsetReturnPeriod(scenarios, 0.1),
        annualProbability: summarizeValues(annualProbabilityValues),
        annualizedExcessDepth: summarizeValues(annualizedValues),
      });
    }

    const result: AreaFloodHazardResult = {
      region,
      thresholdMeters: THRESHOLD_METERS,
      areaSquareKilometers: geometryAreaSquareMeters(geometry, centerLatitude) / 1_000_000,
      rasterWidth: width,
      rasterHeight: height,
      approximatePixelSizeMeters,
      families: familyResults,
      queriedAt: new Date().toISOString(),
      source: 'GeoServer WCS zonal statistics',
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Area flood query failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Area flood query failed',
    }, { status: 500 });
  }
}