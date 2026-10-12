export const HK_NON_TYPHOON_RETURN_PERIODS = [
  2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000,
] as const;

export type HongKongFloodScenarioFamily =
  | 'non-typhoon-rainfall'
  | 'typhoon-compound';

export interface HongKongFloodScenario {
  region: 'HK';
  family: HongKongFloodScenarioFamily;
  returnPeriod: number;
  sourceName: string;
  layerName: string;
  label: string;
}

const WORKSPACE = process.env.NEXT_PUBLIC_HK_FLOOD_GEOSERVER_WORKSPACE || 'natcat_platform';

function toLayerName(sourceName: string): string {
  return `${WORKSPACE}:${sourceName}`;
}

function code(returnPeriod: number): string {
  return String(returnPeriod).padStart(3, '0');
}

export const HK_NON_TYPHOON_SCENARIOS: HongKongFloodScenario[] =
  HK_NON_TYPHOON_RETURN_PERIODS.map(returnPeriod => {
    const sourceName = `HK_Flood_NONTC_R${code(returnPeriod)}`;
    return {
      region: 'HK',
      family: 'non-typhoon-rainfall',
      returnPeriod,
      sourceName,
      layerName: toLayerName(sourceName),
      label: `Non-typhoon rainfall flood · R${returnPeriod}-yr`,
    };
  });

export const HK_TYPHOON_COMPOUND_SCENARIOS: HongKongFloodScenario[] =
  HK_NON_TYPHOON_RETURN_PERIODS.map(returnPeriod => {
    const sourceName = `HK_Flood_Compound_R${code(returnPeriod)}`;
    return {
      region: 'HK',
      family: 'typhoon-compound',
      returnPeriod,
      sourceName,
      layerName: toLayerName(sourceName),
      label: `Typhoon compound flood · R${returnPeriod}-yr`,
    };
  });

export const HK_DESIGN_SCENARIOS: HongKongFloodScenario[] = [
  ...HK_NON_TYPHOON_SCENARIOS,
  ...HK_TYPHOON_COMPOUND_SCENARIOS,
];

export const HK_DESIGN_SCENARIO_FALLBACK_LAYERS = HK_DESIGN_SCENARIOS.map(
  scenario => scenario.layerName,
);

export function parseHongKongScenario(layerName: string): HongKongFloodScenario | null {
  const localName = layerName.split(':').pop() || layerName;
  return HK_DESIGN_SCENARIOS.find(scenario => scenario.sourceName === localName) || null;
}

export function formatHongKongScenarioName(layerName: string): string {
  return parseHongKongScenario(layerName)?.label || layerName.split(':').pop() || layerName;
}
