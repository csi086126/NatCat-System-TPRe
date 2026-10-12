export const MACAU_DESIGN_RETURN_PERIOD_CODES = [
  '002', '005', '010', '020', '025', '050', '100', '200', '250', '500', '1000',
] as const;

export type MacauDesignReturnPeriodCode = typeof MACAU_DESIGN_RETURN_PERIOD_CODES[number];
export type MacauFloodScenarioFamily =
  | 'non-typhoon-rainfall'
  | 'typhoon-compound';

export interface MacauFloodScenario {
  region: 'MO';
  family: MacauFloodScenarioFamily;
  sourceName: string;
  layerName: string;
  stormSurgeReturnPeriod: number | null;
  rainfallReturnPeriod: number | null;
  rainfallContext: 'non-typhoon-monsoon' | 'typhoon-associated' | null;
  label: string;
}

const WORKSPACE = process.env.NEXT_PUBLIC_MACAU_DESIGN_GEOSERVER_WORKSPACE || 'natcat_platform';

function toReturnPeriod(code: string): number {
  return Number.parseInt(code, 10);
}

function toLayerName(publishedScenarioName: string): string {
  return `${WORKSPACE}:${publishedScenarioName}`;
}

export const MACAU_DESIGN_SCENARIOS: MacauFloodScenario[] = [
  ...MACAU_DESIGN_RETURN_PERIOD_CODES.map(rainfallCode => {
    const rainfallReturnPeriod = toReturnPeriod(rainfallCode);
    const sourceName = `MO_Flood_NONTC_R${rainfallCode}`;
    return {
      region: 'MO' as const,
      family: 'non-typhoon-rainfall' as const,
      sourceName,
      layerName: toLayerName(sourceName),
      stormSurgeReturnPeriod: null,
      rainfallReturnPeriod,
      rainfallContext: 'non-typhoon-monsoon' as const,
      label: `Non-typhoon rainfall flood · R${rainfallReturnPeriod}-yr`,
    };
  }),
  ...MACAU_DESIGN_RETURN_PERIOD_CODES.map(returnPeriodCode => {
    const returnPeriod = toReturnPeriod(returnPeriodCode);
    const sourceName = `MO_Flood_Compound_R${returnPeriodCode}`;
    return {
      region: 'MO' as const,
      family: 'typhoon-compound' as const,
      sourceName,
      layerName: toLayerName(sourceName),
      stormSurgeReturnPeriod: returnPeriod,
      rainfallReturnPeriod: null,
      rainfallContext: null,
      label: `Typhoon compound flood · R${returnPeriod}-yr`,
    };
  }),
];

export const MACAU_DESIGN_SCENARIO_FALLBACK_LAYERS = MACAU_DESIGN_SCENARIOS.map(
  scenario => scenario.layerName,
);

export function parseMacauScenario(layerName: string): MacauFloodScenario | null {
  const localName = layerName.split(':').pop() || layerName;
  const sourceName = localName.match(/MO_Flood_(?:NONTC|Compound)_R\d+/)?.[0];
  if (sourceName) {
    return MACAU_DESIGN_SCENARIOS.find(scenario => scenario.sourceName === sourceName) || null;
  }

  const compoundMatch = localName.match(/MO_Flood_Compound_R(\d+)/);
  if (compoundMatch) {
    return MACAU_DESIGN_SCENARIOS.find(scenario =>
      scenario.family === 'typhoon-compound'
      && scenario.stormSurgeReturnPeriod === Number(compoundMatch[1])
    ) || null;
  }

  const rainfallMatch = localName.match(/MO_Flood_NONTC_R(\d+)/);
  if (rainfallMatch) {
    return MACAU_DESIGN_SCENARIOS.find(scenario =>
      scenario.family === 'non-typhoon-rainfall'
      && scenario.rainfallReturnPeriod === Number(rainfallMatch[1])
    ) || null;
  }

  return null;
}

export function formatMacauScenarioName(layerName: string): string {
  return parseMacauScenario(layerName)?.label || layerName.split(':').pop() || layerName;
}