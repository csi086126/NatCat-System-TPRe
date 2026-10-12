export type RiskMapRegionCode = 'worldwide' | 'hk' | 'mo' | 'gba' | 'th' | 'vn' | 'my';
export type RegionalDataStatus = 'connected' | 'partial' | 'pending';

export interface RiskMapRegionalCapabilities {
  code: RiskMapRegionCode;
  name: string;
  dataStatus: RegionalDataStatus;
  workflows: {
    locationQuery: boolean;
    areaAssessment: boolean;
    portfolioAnalysis: boolean;
    reports: boolean;
    designLayers: boolean;
    historicalEvents: boolean;
  };
  data: {
    pointFlood: boolean;
    areaFlood: boolean;
    designFloodLayers: boolean;
    historicalFlood: boolean;
  };
}

const COMMON_WORKFLOWS = {
  locationQuery: true,
  areaAssessment: true,
  portfolioAnalysis: true,
  reports: true,
  designLayers: true,
  historicalEvents: true,
} as const;

export const RISK_MAP_REGIONAL_CAPABILITIES: Record<RiskMapRegionCode, RiskMapRegionalCapabilities> = {
  worldwide: {
    code: 'worldwide',
    name: 'Worldwide',
    dataStatus: 'partial',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: true, areaFlood: false, designFloodLayers: true, historicalFlood: false },
  },
  hk: {
    code: 'hk',
    name: 'Hong Kong',
    dataStatus: 'connected',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: true, areaFlood: true, designFloodLayers: true, historicalFlood: true },
  },
  mo: {
    code: 'mo',
    name: 'Macau',
    dataStatus: 'connected',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: true, areaFlood: true, designFloodLayers: true, historicalFlood: true },
  },
  gba: {
    code: 'gba',
    name: 'Greater Bay Area',
    dataStatus: 'pending',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: false, areaFlood: false, designFloodLayers: false, historicalFlood: false },
  },
  th: {
    code: 'th',
    name: 'Thailand',
    dataStatus: 'pending',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: false, areaFlood: false, designFloodLayers: false, historicalFlood: false },
  },
  vn: {
    code: 'vn',
    name: 'Vietnam',
    dataStatus: 'pending',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: false, areaFlood: false, designFloodLayers: false, historicalFlood: false },
  },
  my: {
    code: 'my',
    name: 'Malaysia',
    dataStatus: 'pending',
    workflows: COMMON_WORKFLOWS,
    data: { pointFlood: false, areaFlood: false, designFloodLayers: false, historicalFlood: false },
  },
};

export function getRiskMapRegionalCapabilities(region: string): RiskMapRegionalCapabilities {
  return RISK_MAP_REGIONAL_CAPABILITIES[region as RiskMapRegionCode]
    || RISK_MAP_REGIONAL_CAPABILITIES.worldwide;
}