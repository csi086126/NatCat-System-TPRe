import { NextRequest, NextResponse } from 'next/server';
import { fromArrayBuffer } from 'geotiff';
import type { FloodHazardQueryResult, FloodLayerQueryResult } from '@/features/risk-map/types';
import {
  MACAU_DESIGN_SCENARIOS,
  type MacauFloodScenario,
  type MacauFloodScenarioFamily,
} from '@/features/risk-map/config/macauScenarios';
import {
  HK_DESIGN_SCENARIOS,
  HK_NON_TYPHOON_SCENARIOS,
  HK_TYPHOON_COMPOUND_SCENARIOS,
  type HongKongFloodScenario,
} from '@/features/risk-map/config/hongKongScenarios';

// 100m 邻域 WCS 单次取样在 Macau 4m 像素下生成 51×51 = 2601 像素 GeoTIFF,
// 11 个 RP × 2 个事件族 = 22 个并发 WCS 调用,即使全部并行,序列化延迟也常超过 10s。
// 平台默认 maxDuration 是 10s(hobby)/60s(pro),这里显式拉到 60s 并把每请求超时拉到 60s。
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface FloodLayerDefinition {
  returnPeriod: number | null;
  layer: string;
  scenarioFamily?: FloodLayerQueryResult['scenarioFamily'];
  stormSurgeReturnPeriod?: number | null;
  rainfallReturnPeriod?: number | null;
  sourcePixelSizeMeters?: number;
}

interface ScenarioSelection {
  family: MacauFloodScenarioFamily;
  stormSurgeReturnPeriod: number | null;
  rainfallReturnPeriod: number | null;
}

type MacauSeriesFamily = MacauFloodScenarioFamily;

const MACAU_ANNUAL_METRIC_LAYERS: Record<MacauSeriesFamily, {
  probability: string;
  annualized: string;
}> = {
  'non-typhoon-rainfall': {
    probability: 'natcat_platform:MO_Flood_NONTC_AnnualProbability_GT015m',
    annualized: 'natcat_platform:MO_Flood_NONTC_AnnualizedExcessDepth_GT015m',
  },
  'typhoon-compound': {
    probability: 'natcat_platform:MO_Flood_Compound_AnnualProbability_GT015m',
    annualized: 'natcat_platform:MO_Flood_Compound_AnnualizedExcessDepth_GT015m',
  },
};

// 香港预计算栅格(由 scripts/generate-hk-flood-hazard-products.mjs 生成并发布)。
// 数学与 Macau 一致:log-log 插值得到 annualFloodProbability,概率空间梯形积分得到 annualizedExcessDepth。
const HK_ANNUAL_METRIC_LAYERS: Record<MacauSeriesFamily, {
  probability: string;
  annualized: string;
}> = {
  'non-typhoon-rainfall': {
    probability: 'natcat_platform:HK_Flood_NONTC_AnnualProbability_GT015m',
    annualized: 'natcat_platform:HK_Flood_NONTC_AnnualizedExcessDepth_GT015m',
  },
  'typhoon-compound': {
    probability: 'natcat_platform:HK_Flood_Compound_AnnualProbability_GT015m',
    annualized: 'natcat_platform:HK_Flood_Compound_AnnualizedExcessDepth_GT015m',
  },
};

const ANNUAL_METRIC_LAYERS_BY_REGION: Record<'mo' | 'hk', Record<MacauSeriesFamily, {
  probability: string;
  annualized: string;
}>> = {
  mo: MACAU_ANNUAL_METRIC_LAYERS,
  hk: HK_ANNUAL_METRIC_LAYERS,
};

const INUNDATION_THRESHOLD_METERS = Number(process.env.FLOOD_INUNDATION_THRESHOLD_METERS || 0.15);
const SAMPLING_RADIUS_METERS = Number(process.env.FLOOD_SAMPLING_RADIUS_METERS || 100);
const SOURCE_PIXEL_SIZE_METERS = 4;
const QUERY_HALF_SPAN_DEGREES = 0.0001;
const REQUEST_TIMEOUT_MS = 60_000;

const HK_FLOOD_LAYERS: FloodLayerDefinition[] = HK_NON_TYPHOON_SCENARIOS.map(scenario => ({
  returnPeriod: scenario.returnPeriod,
  layer: scenario.layerName,
  scenarioFamily: scenario.family,
  rainfallReturnPeriod: scenario.returnPeriod,
  stormSurgeReturnPeriod: null,
  sourcePixelSizeMeters: 30,
}));

const HK_FLOOD_COMPOUND_LAYERS: FloodLayerDefinition[] = HK_TYPHOON_COMPOUND_SCENARIOS.map(scenario => ({
  returnPeriod: scenario.returnPeriod,
  layer: scenario.layerName,
  scenarioFamily: scenario.family,
  rainfallReturnPeriod: null,
  stormSurgeReturnPeriod: scenario.returnPeriod,
  sourcePixelSizeMeters: 30,
}));

const COP_FLOOD_LAYERS: FloodLayerDefinition[] = [20, 50, 100, 200, 500].map(returnPeriod => ({
  returnPeriod,
  layer: `COP:Flood_Depth _Return_Period_${returnPeriod}yr`,
}));

function findMacauScenario(selection: ScenarioSelection): MacauFloodScenario | null {
  return MACAU_DESIGN_SCENARIOS.find(scenario =>
    scenario.family === selection.family
    && scenario.stormSurgeReturnPeriod === selection.stormSurgeReturnPeriod
    && scenario.rainfallReturnPeriod === selection.rainfallReturnPeriod
  ) || null;
}

function findHongKongScenario(selection: ScenarioSelection): HongKongFloodScenario | null {
  return HK_DESIGN_SCENARIOS.find(scenario =>
    scenario.family === selection.family
    && (selection.family === 'non-typhoon-rainfall'
      ? scenario.returnPeriod === selection.rainfallReturnPeriod
      : scenario.returnPeriod === selection.stormSurgeReturnPeriod)
  ) || null;
}

function getFloodLayers(
  region: string,
  scenarioSelection?: ScenarioSelection,
  seriesFamily: MacauSeriesFamily = 'non-typhoon-rainfall',
): FloodLayerDefinition[] {
  if (region === 'hk' && scenarioSelection) {
    const scenario = findHongKongScenario(scenarioSelection);
    if (!scenario) throw new Error('The selected Hong Kong flood scenario is not in the 22-layer Risk Map catalog');

    return [{
      returnPeriod: scenario.returnPeriod,
      layer: scenario.layerName,
      scenarioFamily: scenario.family,
      rainfallReturnPeriod: scenario.family === 'non-typhoon-rainfall'
        ? scenario.returnPeriod
        : null,
      stormSurgeReturnPeriod: scenario.family === 'typhoon-compound'
        ? scenario.returnPeriod
        : null,
    }];
  }
  if (region === 'hk') {
    return seriesFamily === 'typhoon-compound'
      ? HK_FLOOD_COMPOUND_LAYERS
      : HK_FLOOD_LAYERS;
  }
  if (region === 'mo' && scenarioSelection) {
    const scenario = findMacauScenario(scenarioSelection);
    if (!scenario) throw new Error('The selected Macau flood scenario is not in the 22-layer Risk Map catalog');

    return [{
      returnPeriod: scenario.family === 'non-typhoon-rainfall'
        ? scenario.rainfallReturnPeriod
        : scenario.stormSurgeReturnPeriod,
      layer: scenario.layerName,
      scenarioFamily: scenario.family,
      stormSurgeReturnPeriod: scenario.stormSurgeReturnPeriod,
      rainfallReturnPeriod: scenario.rainfallReturnPeriod,
    }];
  }
  if (region === 'mo') {
    return MACAU_DESIGN_SCENARIOS
      .filter(scenario => scenario.family === seriesFamily)
      .map(scenario => ({
        returnPeriod: scenario.family === 'non-typhoon-rainfall'
          ? scenario.rainfallReturnPeriod
          : scenario.stormSurgeReturnPeriod,
        layer: scenario.layerName,
        scenarioFamily: scenario.family,
        stormSurgeReturnPeriod: scenario.stormSurgeReturnPeriod,
        rainfallReturnPeriod: scenario.rainfallReturnPeriod,
      }));
  }
  if (region === 'worldwide') return COP_FLOOD_LAYERS;
  return [];
}

function getGeoServerWmsUrl(): string {
  const configuredUrl = process.env.HAZARD_GEOSERVER_WMS_URL
    || process.env.NEXT_PUBLIC_GEOSERVER_WMS_URL
    || (process.env.GEOSERVER_URL ? `${process.env.GEOSERVER_URL.replace(/\/$/, '')}/wms` : null);

  if (!configuredUrl) {
    throw new Error('GeoServer WMS URL is not configured');
  }

  return configuredUrl;
}

function getGeoServerWcsUrl(wmsUrl: string): string {
  const url = new URL(wmsUrl);
  url.pathname = url.pathname.replace(/\/wms\/?$/i, '/wcs');
  url.search = '';
  return url.toString();
}

async function queryNeighborhoodMaximum(
  wmsUrl: string,
  latitude: number,
  longitude: number,
  definition: FloodLayerDefinition,
): Promise<FloodLayerQueryResult> {
  const latitudeRadius = SAMPLING_RADIUS_METERS / 110_540;
  const longitudeRadius = SAMPLING_RADIUS_METERS
    / (111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
  const sourcePixelSizeMeters = definition.sourcePixelSizeMeters || SOURCE_PIXEL_SIZE_METERS;
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
  const response = await fetch(`${getGeoServerWcsUrl(wmsUrl)}?${params.toString()}`, {
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
  let sampledPixelCount = 0;
  let validPixelCount = 0;
  let maximumDepth: number | null = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalizedX = width === 1 ? 0 : (x / (width - 1)) * 2 - 1;
      const normalizedY = height === 1 ? 0 : (y / (height - 1)) * 2 - 1;
      if (normalizedX * normalizedX + normalizedY * normalizedY > 1) continue;
      sampledPixelCount += 1;
      const rawValue = Number(raster[y * width + x]);
      if (!Number.isFinite(rawValue) || rawValue <= -9990 || rawValue >= 10000) continue;
      if (noData !== null && Math.abs(rawValue - noData) < 1e-6) continue;
      validPixelCount += 1;
      maximumDepth = Math.max(maximumDepth ?? 0, Math.max(0, rawValue));
    }
  }

  const inundated = maximumDepth !== null && maximumDepth > INUNDATION_THRESHOLD_METERS;
  return {
    ...definition,
    depth: maximumDepth,
    inundated,
    status: maximumDepth === null ? 'no-data' : inundated ? 'matched' : 'dry',
    samplingMethod: 'neighborhood-max',
    samplingRadiusMeters: SAMPLING_RADIUS_METERS,
    sampledPixelCount,
    validPixelCount,
  };
}

function extractRasterValue(properties: Record<string, unknown>): number | null {
  const preferredKeys = ['GRAY_INDEX', 'grid_value', 'value', 'VALUE', 'depth', 'DEPTH', 'Band1'];
  const candidates = [
    ...preferredKeys.map(key => properties[key]),
    ...Object.values(properties),
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(value) && value > -9990 && value < 10000) {
      return Math.max(0, value);
    }
  }

  return null;
}

async function queryLayer(
  wmsUrl: string,
  latitude: number,
  longitude: number,
  definition: FloodLayerDefinition,
): Promise<FloodLayerQueryResult> {
  try {
    return await queryNeighborhoodMaximum(wmsUrl, latitude, longitude, definition);
  } catch (error) {
    console.warn(`WCS neighborhood query failed for ${definition.layer}; using point fallback`, error);
  }

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: definition.layer,
    QUERY_LAYERS: definition.layer,
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: [
      longitude - QUERY_HALF_SPAN_DEGREES,
      latitude - QUERY_HALF_SPAN_DEGREES,
      longitude + QUERY_HALF_SPAN_DEGREES,
      latitude + QUERY_HALF_SPAN_DEGREES,
    ].join(','),
    WIDTH: '101',
    HEIGHT: '101',
    X: '50',
    Y: '50',
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: '1',
  });

  try {
    const response = await fetch(`${wmsUrl}?${params.toString()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`GeoServer returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      const message = (await response.text()).slice(0, 200);
      throw new Error(`Unexpected GeoServer response: ${message}`);
    }

    const data = await response.json();
    const properties = data?.features?.[0]?.properties as Record<string, unknown> | undefined;
    const depth = properties ? extractRasterValue(properties) : null;

    if (depth === null) {
      return {
        ...definition,
        depth: null,
        inundated: false,
        status: 'no-data',
        samplingMethod: 'point',
        samplingRadiusMeters: 0,
      };
    }

    const inundated = depth > INUNDATION_THRESHOLD_METERS;
    return {
      ...definition,
      depth,
      inundated,
      status: inundated ? 'matched' : 'dry',
      samplingMethod: 'point',
      samplingRadiusMeters: 0,
    };
  } catch (error) {
    return {
      ...definition,
      depth: null,
      inundated: false,
      status: 'error',
      samplingMethod: 'point',
      samplingRadiusMeters: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const requestedRegion = typeof body.region === 'string' ? body.region : 'worldwide';
    const scenarioSelection = body.scenario as ScenarioSelection | undefined;
    const requestedSeriesFamily = body.seriesFamily || 'non-typhoon-rainfall';
    if (requestedSeriesFamily !== 'non-typhoon-rainfall' && requestedSeriesFamily !== 'typhoon-compound') {
      return NextResponse.json({ error: 'Unsupported flood scenario family' }, { status: 400 });
    }
    const seriesFamily = requestedSeriesFamily as MacauSeriesFamily;

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }

    const region = requestedRegion;

    const wmsUrl = getGeoServerWmsUrl();
    const definitions = getFloodLayers(region, scenarioSelection, seriesFamily);
    if (!definitions.length) {
      return NextResponse.json({
        error: `Flood hazard layers have not been connected for region ${region}`,
        available: false,
        region,
        status: 'pending-layers',
      }, { status: 409 });
    }
    const results: FloodLayerQueryResult[] = [];
    const concurrency = region === 'mo' && seriesFamily === 'typhoon-compound'
      ? 8
      : Math.max(1, definitions.length);
    for (let index = 0; index < definitions.length; index += concurrency) {
      const batch = definitions.slice(index, index + concurrency);
      results.push(...await Promise.all(
        batch.map(definition => queryLayer(wmsUrl, latitude, longitude, definition)),
      ));
    }
    const validResults = results.filter(result => result.depth !== null);
    const inundatedResults = validResults.filter(result => result.inundated);
    const minimumInundationReturnPeriod = inundatedResults.length
      && inundatedResults.every(result => result.returnPeriod !== null)
      ? Math.min(...inundatedResults.map(result => result.returnPeriod as number))
      : null;
    const maximumDepth = validResults.length
      ? Math.max(...validResults.map(result => result.depth as number))
      : null;
    const classification = validResults.length === 0
      ? 'no-data'
      : inundatedResults.length > 0
        ? 'inundated'
        : 'not-inundated';

    const metricFamily = scenarioSelection?.family || seriesFamily;
    // 年指标:Macau / HK 都走各自的预计算栅格(由 generate-macau-flood-hazard-products.mjs
    // / generate-hk-flood-hazard-products.mjs 生成)。其他地区没有这类图层。
    const annualMetricLayers = (region === 'mo' || region === 'hk')
      ? ANNUAL_METRIC_LAYERS_BY_REGION[region as 'mo' | 'hk']
      : null;
    const annualMetrics = annualMetricLayers
      ? await Promise.all([
        queryLayer(wmsUrl, latitude, longitude, {
          returnPeriod: null,
          layer: annualMetricLayers[metricFamily].probability,
          scenarioFamily: metricFamily,
        }),
        queryLayer(wmsUrl, latitude, longitude, {
          returnPeriod: null,
          layer: annualMetricLayers[metricFamily].annualized,
          scenarioFamily: metricFamily,
        }),
      ])
      : null;
    const annualFloodProbability = annualMetrics?.[0].depth ?? null;
    const annualizedExcessDepth = annualMetrics?.[1].depth ?? null;
    const conditionalMeanExcessDepth = annualFloodProbability !== null
      && annualFloodProbability > 0
      && annualizedExcessDepth !== null
      ? annualizedExcessDepth / annualFloodProbability
      : null;

    const payload: FloodHazardQueryResult = {
      latitude,
      longitude,
      region,
      thresholdMeters: INUNDATION_THRESHOLD_METERS,
      samplingMethod: results.every(result => result.samplingMethod === 'neighborhood-max')
        ? 'neighborhood-max'
        : 'point',
      samplingRadiusMeters: results.every(result => result.samplingMethod === 'neighborhood-max')
        ? SAMPLING_RADIUS_METERS
        : 0,
      minimumInundationReturnPeriod,
      maximumDepth,
      classification,
      assessmentMode: scenarioSelection ? 'selected-scenario' : 'return-period-series',
      selectedScenario: scenarioSelection ? {
        family: scenarioSelection.family,
        label: region === 'mo'
          ? findMacauScenario(scenarioSelection)?.label || 'Selected Macau design scenario'
          : findHongKongScenario(scenarioSelection)?.label || 'Selected Hong Kong design scenario',
        stormSurgeReturnPeriod: scenarioSelection.stormSurgeReturnPeriod,
        rainfallReturnPeriod: scenarioSelection.rainfallReturnPeriod,
        layer: definitions[0].layer,
      } : undefined,
      annualMetrics: annualMetrics ? {
        family: metricFamily,
        annualFloodProbability,
        annualizedExcessDepth,
        conditionalMeanExcessDepth,
        conditionalMeanFloodDepth: conditionalMeanExcessDepth === null
          ? null
          : INUNDATION_THRESHOLD_METERS + conditionalMeanExcessDepth,
        probabilityLayer: annualMetrics[0].layer,
        annualizedLayer: annualMetrics[1].layer,
        samplingMethod: annualMetrics.every(result => result.samplingMethod === 'neighborhood-max')
          ? 'neighborhood-max'
          : 'point',
        samplingRadiusMeters: annualMetrics.every(result => result.samplingMethod === 'neighborhood-max')
          ? SAMPLING_RADIUS_METERS
          : 0,
      } : undefined,
      results,
      queriedAt: new Date().toISOString(),
      source: 'GeoServer',
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Flood query failed' },
      { status: 500 },
    );
  }
}