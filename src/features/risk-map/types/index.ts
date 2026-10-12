export interface HistoricalEvent {
  id: string;
  name: string;
  type: string;
  date: string;
  year: number;
  maxWindSpeed?: string;
  totalRainfall?: string;
  estimatedLoss?: string;
  affectedPopulation?: string;
  geometry?: {
    type: string;
    coordinates: [number, number] | number[];
  };
  related_layers?: string[];
  [key: string]: unknown;
}

export interface StochasticEvent {
  id: string;
  name: string;
  type: string;
  year: number;
  maxWindSpeed?: string;
  totalRainfall?: string;
  estimatedLoss?: string;
  affectedPopulation?: string;
  geometry?: {
    type: string;
    coordinates: [number, number] | number[];
  };
  [key: string]: unknown;
}

export interface AssetInfo {
  latitude: number;
  longitude: number;
  elevation: number | null;
  populationDensity: number | null;
  buildingDensity: string;
  distanceToCoast: number | null;
  landUse: string;
  worldcover: string;
  address?: string;
  geocodingSource?: string;
}

export interface WmsLayerConfig {
  name: string;
  layer: string;
}

export interface FloodLayerQueryResult {
  returnPeriod: number | null;
  layer: string;
  depth: number | null;
  inundated: boolean;
  status: 'matched' | 'dry' | 'no-data' | 'error';
  scenarioFamily?: 'return-period-series' | 'non-typhoon-rainfall' | 'typhoon-compound';
  stormSurgeReturnPeriod?: number | null;
  rainfallReturnPeriod?: number | null;
  samplingMethod?: 'point' | 'neighborhood-max';
  samplingRadiusMeters?: number;
  sampledPixelCount?: number;
  validPixelCount?: number;
  error?: string;
}

export interface FloodHazardQueryResult {
  latitude: number;
  longitude: number;
  region: string;
  thresholdMeters: number;
  samplingMethod: 'point' | 'neighborhood-max';
  samplingRadiusMeters: number;
  minimumInundationReturnPeriod: number | null;
  maximumDepth: number | null;
  classification: 'inundated' | 'not-inundated' | 'no-data';
  assessmentMode: 'return-period-series' | 'selected-scenario';
  selectedScenario?: {
    family: 'non-typhoon-rainfall' | 'typhoon-compound';
    label: string;
    stormSurgeReturnPeriod: number | null;
    rainfallReturnPeriod: number | null;
    layer: string;
  };
  annualMetrics?: {
    family: 'non-typhoon-rainfall' | 'typhoon-compound';
    annualFloodProbability: number | null;
    annualizedExcessDepth: number | null;
    conditionalMeanExcessDepth: number | null;
    conditionalMeanFloodDepth: number | null;
    probabilityLayer: string;
    annualizedLayer: string;
    samplingMethod: 'point' | 'neighborhood-max';
    samplingRadiusMeters: number;
  };
  results: FloodLayerQueryResult[];
  queriedAt: string;
  source: 'GeoServer';
}

export interface HistoricalFloodEventResult {
  layer: string;
  display: string;
  year: number | null;
  family: 'typhoon-compound' | 'rainfall';
  depth: number | null;
  inundated: boolean;
  status: 'matched' | 'dry' | 'no-data' | 'error';
  error?: string;
}

export interface HistoricalFloodQueryResult {
  available: boolean;
  scope?: 'point' | 'area';
  reason?: string;
  thresholdMeters: number;
  samplingMethod?: 'neighborhood-max';
  samplingRadiusMeters: number;
  totalEvents: number;
  queriedEvents: number;
  errorCount?: number;
  inundationCount: number;
  typhoonCount: number;
  rainfallCount: number;
  maximumHistoricalDepth?: number | null;
  events: HistoricalFloodEventResult[];
  queriedAt: string;
  source?: string;
  approximatePixelSizeMeters?: number;
  rasterWidth?: number;
  rasterHeight?: number;
}

export interface AreaRasterStatistics {
  validPixelCount: number;
  floodedPixelCount: number;
  floodedAreaFraction: number;
  meanDepth: number | null;
  meanWetDepth: number | null;
  p50Depth: number | null;
  p90Depth: number | null;
  p95Depth: number | null;
  maximumDepth: number | null;
}

export interface AreaFloodScenarioStatistics extends AreaRasterStatistics {
  returnPeriod: number;
  layer: string;
}

export interface AreaAnnualMetricStatistics {
  mean: number | null;
  p50: number | null;
  p90: number | null;
  maximum: number | null;
  validPixelCount: number;
}

export interface AreaFloodFamilyStatistics {
  family: 'non-typhoon-rainfall' | 'typhoon-compound';
  scenarios: AreaFloodScenarioStatistics[];
  anyAreaOnsetReturnPeriod: number | null;
  onePercentAreaOnsetReturnPeriod: number | null;
  tenPercentAreaOnsetReturnPeriod: number | null;
  annualProbability: AreaAnnualMetricStatistics;
  annualizedExcessDepth: AreaAnnualMetricStatistics;
}

export interface AreaFloodHazardResult {
  region: string;
  thresholdMeters: number;
  areaSquareKilometers: number;
  rasterWidth: number;
  rasterHeight: number;
  approximatePixelSizeMeters: number;
  families: AreaFloodFamilyStatistics[];
  queriedAt: string;
  source: 'GeoServer WCS zonal statistics';
  historicalFlood?: HistoricalFloodQueryResult;
}

export type AreaFloodGeometry =
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] };