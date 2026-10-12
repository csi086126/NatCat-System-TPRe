const riskLegend = [
  { color: '#f0f8ff', label: '0.0 - 0.2' },
  { color: '#d6eaff', label: '0.2 - 0.4' },
  { color: '#bce0ff', label: '0.4 - 0.6' },
  { color: '#a2d5ff', label: '0.6 - 0.8' },
  { color: '#87cefa', label: '0.8 - 1.0' },
  { color: '#6FB9F4', label: '1.0 - 2.0' },
  { color: '#3484E5', label: '2.0 - 3.0' },
  { color: '#0D55B6', label: '3.0 - 4.0' },
  { color: '#07396A', label: '4.0 - 5.0' },
  { color: '#08519c', label: '> 5.0' },
];

const floodDepthLegend = [
  { color: '#9B2226', label: '> 3.0m' },
  { color: '#D62828', label: '2.0 - 3.0m' },
  { color: '#E55934', label: '1.5 - 2.0m' },
  { color: '#F9A03F', label: '1.0 - 1.5m' },
  { color: '#FDE74C', label: '0.5 - 1.0m' },
  { color: '#5BC0EB', label: '0.2 - 0.5m' },
];

const typhoonCategoryLegend = [
  { color: '#8B0000', label: 'Category 5 (≥ 137 kt / 252 km/h)' },
  { color: '#FF0000', label: 'Category 4 (113-136 kt / 209-251 km/h)' },
  { color: '#FF6600', label: 'Category 3 (96-112 kt / 178-208 km/h)' },
  { color: '#FFCC00', label: 'Category 2 (83-95 kt / 154-177 km/h)' },
  { color: '#FFFF00', label: 'Category 1 (64-82 kt / 119-153 km/h)' },
  { color: '#00CED1', label: 'Tropical Storm (34-63 kt / 63-118 km/h)' },
  { color: '#4169E1', label: 'Tropical Depression (< 34 kt / 63 km/h)' },
];

const floodLayerKeys = [
  'macauNonTyphoonScenario', 'macauTyphoonScenario', 'macauHistTC', 'macauHistRain',
  'hkDesignScenario', 'hkCompoundScenario', 'hkHistEvent', 'hkHistTC',
  'hkFloodRain5', 'hkFloodRain10', 'hkFloodRain20', 'hkFloodRain50',
  'hkFloodRain100', 'hkFloodRain200', 'hkFloodRain500', 'hkFloodRain1000',
  'hkFloodSurgeQ90', 'hkFloodSurgeQ95', 'hkFloodSurgeQ98', 'hkFloodSurgeQ99', 'hkFloodSurgeExpected',
  'hkFloodWave5', 'hkFloodWave10', 'hkFloodWave20', 'hkFloodWave50',
  'hkFloodWave100', 'hkFloodWave200', 'hkFloodWave500', 'hkFloodWave1000',
  'flood500yr', 'flood200yr', 'flood100yr', 'flood50yr', 'flood20yr',
];

interface MapLegendProps {
  visibleLayers: Record<string, boolean>;
  urbanElements?: Record<string, boolean>;
  currentRegion?: string;
}

const GEOSERVER_LULC_URL = 'http://10.253.22.15:8080/geoserver/wms';
const WMS_BFF_URL = '/api/geoserver/getfeatureinfo';

export function MapLegend({ visibleLayers, urbanElements = {}, currentRegion }: MapLegendProps) {
  const showsFlood = floodLayerKeys.some(layer => visibleLayers[layer]);
  const showsIbtracs = visibleLayers.globalTyphoonTracks || visibleLayers.globalTyphoonPoints;
  const showsRainstorm = ['rainstorm500yr', 'rainstorm200yr', 'rainstorm100yr', 'rainstorm50yr', 'rainstorm20yr']
    .some(layer => visibleLayers[layer]);
  const showsTyphoon = ['typhoonTD', 'typhoonTS', 'typhoonSTS', 'typhoonTY', 'typhoonSTY', 'typhoonSuperTY']
    .some(layer => visibleLayers[layer]);

  // 决定 legend URL 来源:MO pipe 走直连 GeoServer(已开 crossOrigin 跨域图);
  // HK drainage 走同源 BFF 防 GeoServer 缺 ACAO 头时某些浏览器拒渲染。
  const LEGEND_BASE = WMS_BFF_URL;

  // Macau pipe network (urbanElements state) — consistent legend graphics
  const pipeLegends: Array<{ label: string; imageUrl: string }> = [];
  const pipeLegendOpts = 'width=28&height=16&legend_options=forceLabels:on;fontSize:11;fontAntiAliasing:true;dpi:120';
  if (urbanElements.moInPipeLink) {
    pipeLegends.push({
      label: 'Pipe Links (Network Type × Diameter)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:MO_pipe_link_WGS84&${pipeLegendOpts}`,
    });
  }
  if (urbanElements.moInPipeManhole) {
    pipeLegends.push({
      label: 'Manholes (by Diameter Size)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:MO_pipe_manhole_WGS84&${pipeLegendOpts}`,
    });
  }
  if (urbanElements.moInPipeOutlet) {
    pipeLegends.push({
      label: 'Outlets (by Diameter Size)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:MO_pipe_outlet_WGS84&${pipeLegendOpts}`,
    });
  }
  // Hong Kong drainage network (SWMM-derived shapefiles, 与澳门管网不同数据源)
  if (urbanElements.hkDrainageConduits) {
    pipeLegends.push({
      label: 'HK Drainage Conduits (按管长分级)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:conduits&${pipeLegendOpts}`,
    });
  }
  if (urbanElements.hkDrainageJunctions) {
    pipeLegends.push({
      label: 'HK Drainage Junctions (按 invert elevation)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:junctions&${pipeLegendOpts}`,
    });
  }
  if (urbanElements.hkDrainageOutfalls) {
    pipeLegends.push({
      label: 'HK Drainage Outfalls (排放口)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:outfalls&${pipeLegendOpts}`,
    });
  }
  if (urbanElements.hkStorageTanks) {
    pipeLegends.push({
      label: 'HK Storage Tanks (蓄水池)',
      imageUrl: `${LEGEND_BASE}?service=WMS&version=1.1.0&request=GetLegendGraphic&format=image/png&layer=natcat_platform:storage_tanks&${pipeLegendOpts}`,
    });
  }
  const showsPipe = pipeLegends.length > 0;

  // 判断是哪种 pipe 显示,决定 title
  const showsMoPipe = pipeLegends.some(l => l.label.startsWith('Pipe') || l.label.startsWith('Manholes') || l.label.startsWith('Outlets'));
  const showsHkPipe = pipeLegends.some(l => l.label.startsWith('HK'));

  const title = showsPipe
    ? showsMoPipe && showsHkPipe
      ? 'Pipe Network (Macau + Hong Kong)'
      : showsHkPipe
        ? 'HK Drainage Network (SWMM)'
        : 'Macau Pipe Network'
    : showsFlood
      ? 'Flood Depth (m)'
      : showsIbtracs
        ? 'Typhoon Category (Saffir-Simpson Scale)'
        : showsRainstorm
          ? 'Rainstorm Intensity (mm/hr)'
          : showsTyphoon
            ? 'Typhoon Intensity'
            : 'Risk Level';

  return (
    <div className="absolute bottom-6 right-6 z-[1000] bg-white p-3 rounded-lg shadow-lg border border-gray-300 max-w-xs">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="flex flex-col space-y-2">
        {showsPipe ? (
          pipeLegends.map((entry) => (
            <div key={entry.label} className="flex flex-col space-y-1">
              <span className="text-[11px] font-semibold text-gray-700">{entry.label}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.imageUrl}
                alt={`${entry.label} legend`}
                className="border border-gray-200 rounded bg-white"
                style={{
                  width: '100%',
                  height: 'auto',
                  imageRendering: 'crisp-edges',
                  display: 'block',
                }}
              />
            </div>
          ))
        ) : (
          (showsFlood ? floodDepthLegend : showsIbtracs ? typhoonCategoryLegend : riskLegend).map(({ color, label }) => (
            <div key={label} className="flex items-center space-x-2">
              <div
                className="w-5 h-4 border border-gray-300 rounded flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs leading-tight">{label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
