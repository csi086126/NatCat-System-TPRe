import { jsPDF } from 'jspdf';
import { fromArrayBuffer } from 'geotiff';
import type {
  AreaFloodGeometry,
  AreaFloodHazardResult,
  AssetInfo,
  FloodHazardQueryResult,
  FloodLayerQueryResult,
  HistoricalFloodQueryResult,
} from '../types';
import type { TerrainProfilePayload } from '@/hooks/useReportDownload';

// ========== 公开类型 ==========

export interface MapSnapshot {
  dataUrl: string;
  format: 'JPEG' | 'PNG';
  provider?: string;
  // optional:由前端 Leaflet DOM 截屏提供,PDF addImage 用比例保持需要
  width?: number;
  height?: number;
}

export interface CapturedFloodMapPanel {
  dataUrl: string;
  format: 'PNG';
  width: number;
  height: number;
}

export interface FloodRiskPdfInput {
  asset: AssetInfo;
  flood: {
    thresholdMeters: number;
    samplingMethod: 'point' | 'neighborhood-max';
    samplingRadiusMeters: number;
    assessmentMode: 'return-period-series' | 'selected-scenario';
    classification: string;
    driverAssessments?: FloodHazardQueryResult[];
    layerResults?: FloodLayerQueryResult[];
    selectedScenario?: FloodHazardQueryResult['selectedScenario'];
    historicalFlood?: HistoricalFloodQueryResult;
  };
  // 用户在地图上画的 terrain profile(可选)。
  // distance 从 0 开始(正值 = 离端点的米数),elevation 单位米。
  profile?: TerrainProfilePayload;
  /**
   * 6 张水深图的 Leaflet 实时截图(Risk Query 前端截图)。
   * key: 'ntOnset' | 'tcOnset' | 'ntR200' | 'tcR200' | 'ntR1000' | 'tcR1000'
   * 传入则 Page 3 优先使用,跳过底图 tile 拼接 + WMS 合成,避免坐标系不一致导致的偏移。
   * 缺失则降级到原 fetchFloodSnapshot + composeMapSnapshots 合成路径(后端 BFF 仍使用)。
   */
  capturedFloodMaps?: Record<string, CapturedFloodMapPanel>;
  /**
   * Page 2.5a (Drainage only) 截图。
   * 由前端 riskmap 从 Leaflet DOM 用 html2canvas 截屏获得(MO drainage 走 LULC
   * GeoServer 直连,BFF 无法代理 → 只能从 Leaflet 截屏)。
   * null/缺失 → Page 2.5a 显示 no-data 占位。
   */
  drainageSnapshot?: MapSnapshot | null;
  /**
   * Page 2.5b (Road only) 截图。
   * 同样从 Leaflet DOM 截屏(road centerline + 14 个 HK Transportation 子类 / MO centerline)。
   * null/缺失 → Page 2.5b 显示 no-data 占位。
   */
  roadSnapshot?: MapSnapshot | null;
}

// ========== 常量 / 颜色 / 样式 ==========

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BLUE: [number, number, number] = [37, 99, 235];
const VIOLET: [number, number, number] = [124, 58, 237];
const TEAL: [number, number, number] = [15, 118, 110];
const TEAL_LIGHT: [number, number, number] = [153, 246, 228];
const SLATE: [number, number, number] = [51, 65, 85];
const LIGHT_SLATE: [number, number, number] = [241, 245, 249];
const FLOOD_DEPTH_LEGEND: Array<{ color: [number, number, number]; label: string }> = [
  { color: [155, 34, 38], label: '> 3.0 m' },
  { color: [214, 40, 40], label: '2.0 - 3.0 m' },
  { color: [229, 89, 52], label: '1.5 - 2.0 m' },
  { color: [249, 160, 63], label: '1.0 - 1.5 m' },
  { color: [253, 231, 76], label: '0.5 - 1.0 m' },
  { color: [91, 192, 235], label: '0.2 - 0.5 m' },
];

// ========== 小工具 ==========

function printableText(value: unknown): string {
  const text = String(value ?? 'Not available');
  return /^[\x20-\x7E]*$/.test(text)
    ? text
    : 'Non-Latin address (use the coordinates below as the authoritative location)';
}

const DEM_LAYER_NAME_HK = 'natcat_platform:HK_DEM_5m';
const DEM_LAYER_NAME_MO = 'natcat_platform:MO_DEM_TIF_clipped';

// Drainage & Road 图层名(供 Page 2.5 截图用)。
// 这些 layer 名必须与前端 Leaflet WMSTileLayer 完全一致(MapLegend.tsx / riskmap/page.tsx)。
// SLD style 留空 → GeoServer 用默认 line/point style(避免用户仓库里的 SLD 名跟 GeoServer 不匹配)。
// MO drainage 走直连 GEOSERVER_LULC_URL(同源 BFF 在 cross-origin 跨网段时不可用);
// HK drainage + road 走同源 BFF(LULC server 上没有 HK layer)。
const DRAINAGE_ROAD_LAYERS: Record<'hk' | 'mo', {
  pipes: string;
  pipeNodes: string[];
  roads: string;
  useDirectGeoserver: boolean;
}> = {
  hk: {
    pipes: 'natcat_platform:conduits',
    pipeNodes: ['natcat_platform:junctions', 'natcat_platform:outfalls', 'natcat_platform:storage_tanks'],
    roads: 'natcat_platform:CENTERLINE',
    useDirectGeoserver: false,  // 走 BFF
  },
  mo: {
    pipes: 'natcat_platform:MO_pipe_link_WGS84',
    pipeNodes: ['natcat_platform:MO_pipe_manhole_WGS84', 'natcat_platform:MO_pipe_outlet_WGS84'],
    roads: '',  // MO urbanElements 里没有 road centerline layer,留空
    useDirectGeoserver: true,   // 走直连 GEOSERVER_LULC_URL
  },
};

// MO 直连 GeoServer URL(与 riskmap/page.tsx 的 GEOSERVER_LULC_URL 保持一致)。
// HK drainage / road 走同源 BFF(与 fetchDemSnapshot 等保持一致)。
const GEOSERVER_LULC_DIRECT_URL = 'http://10.253.22.15:8080/geoserver/wms';

// HK Transportation 14 个子类(与 riskmap/page.tsx hkRoad* WMSTileLayer 完全对齐)。
// Page 2.5b road-only 截图需要把这 14 个 layer 一起拼进 WMS GetMap layers 参数。
// MO 没有 road centerline,留空数组。
const HK_ROAD_SUBLAYERS: string[] = [
  'natcat_platform:CENTERLINE',
  'natcat_platform:INTERSECTION',
  'natcat_platform:SPEED_LIMIT',
  'natcat_platform:TURN',
  'natcat_platform:PEDESTRIAN_ZONE',
  'natcat_platform:ROUNDABOUT',
  'natcat_platform:BUS_ONLY_LANE',
  'natcat_platform:PROHIBITION',
  'natcat_platform:VEHICLE_RESTRICTION',
  'natcat_platform:PERMIT',
  'natcat_platform:ONSTREETPARK',
  'natcat_platform:NSR',
  'natcat_platform:RUN_IN_OUT',
  'natcat_platform:TRAFFIC_FEATURES',
];
const MO_ROAD_SUBLAYERS: string[] = [];  // MO urbanElements 里只有 moInCenterline,但 LULC server 上没对应 layer,留空走 no-data 占位

// ========== Page 2.5a / 2.5b 图例定义 ==========
//
// legend entry 结构:
//   { kind: 'line' | 'point' | 'header' | 'note',
//     color?: [r, g, b],     // line/point 颜色
//     label: string,         // 显示文字
//     dash?: [on, off],      // line 虚线样式(可选)
//   }
// - 'header' 是分节小标题(加粗,稍大字体)
// - 'note' 是说明文字(灰色斜体,字体更小)
//
// 颜色对照:
const C_CONDUIT_HK: [number, number, number] = [0, 153, 153];        // 青绿色(HK conduits)
const C_JUNCTION: [number, number, number] = [255, 102, 0];          // 橙色(检查井)
const C_OUTFALL: [number, number, number] = [255, 0, 0];             // 红色(排放口)
const C_TANK: [number, number, number] = [128, 0, 128];              // 紫色(storage tank)
const C_CENTERLINE: [number, number, number] = [0, 0, 0];            // 黑色(HK centerline 主线)
const C_PIPE_MO: [number, number, number] = [56, 142, 198];           // 蓝色(MO pipe link)
const C_MANHOLE_MO: [number, number, number] = [56, 142, 198];       // 蓝色(MO manhole)
const C_OUTLET_MO: [number, number, number] = [56, 142, 198];        // 蓝色(MO outlet)
const C_CENTERLINE_MO: [number, number, number] = [200, 80, 80];     // 红色(MO centerline)

const HK_DRAINAGE_LEGEND: Array<{ kind: 'line' | 'point' | 'header' | 'note'; color?: [number, number, number]; label: string; dash?: [number, number] }> = [
  { kind: 'header', label: 'HK · Drainage Network (SWMM)' },
  { kind: 'line', color: C_CONDUIT_HK, label: 'Conduits (SWMM conduits / 排水管)' },
  { kind: 'point', color: C_JUNCTION, label: 'Junctions (manholes, 119,572)' },
  { kind: 'point', color: C_OUTFALL, label: 'Outfalls (discharge points, 869)' },
  { kind: 'point', color: C_TANK, label: 'Storage tanks' },
  { kind: 'note', label: 'Source: HK_Drainage_Conduits / Junctions / Outfalls shapefile' },
];

const MO_DRAINAGE_LEGEND: Array<{ kind: 'line' | 'point' | 'header' | 'note'; color?: [number, number, number]; label: string; dash?: [number, number] }> = [
  { kind: 'header', label: 'MO · Pipe Network (LULC GeoServer)' },
  { kind: 'line', color: C_PIPE_MO, label: 'Pipe links (MO_pipe_link_WGS84)' },
  { kind: 'point', color: C_MANHOLE_MO, label: 'Manholes (MO_pipe_manhole_WGS84)' },
  { kind: 'point', color: C_OUTLET_MO, label: 'Outlets (MO_pipe_outlet_WGS84)' },
  { kind: 'note', label: 'Source: Macau LULC GeoServer (direct, BFF unavailable for cross-origin tile)' },
];

const HK_ROAD_LEGEND: Array<{ kind: 'line' | 'point' | 'header' | 'note'; color?: [number, number, number]; label: string; dash?: [number, number] }> = [
  { kind: 'header', label: 'HK · Road Network (Transportation)' },
  { kind: 'line', color: C_CENTERLINE, label: 'Centerline (主干道路中心线)' },
  { kind: 'line', color: [255, 165, 0], label: 'Intersection (路口)', dash: [2, 1] },
  { kind: 'line', color: [255, 0, 255], label: 'Speed Limit (限速)' },
  { kind: 'line', color: [0, 200, 0], label: 'Turn Restriction (转向限制)', dash: [1, 1] },
  { kind: 'line', color: [128, 0, 255], label: 'Pedestrian Zone (行人区)', dash: [3, 1] },
  { kind: 'line', color: [0, 128, 255], label: 'Roundabout (环岛)' },
  { kind: 'line', color: [255, 80, 80], label: 'Bus-Only Lane (公交专用)' },
  { kind: 'line', color: [80, 80, 80], label: 'Prohibition / Vehicle Restriction', dash: [2, 2] },
  { kind: 'line', color: [180, 80, 0], label: 'Permit Parking' },
  { kind: 'line', color: [255, 200, 0], label: 'On-Street Parking' },
  { kind: 'line', color: [100, 100, 200], label: 'NSR (Noise / Special Restriction)' },
  { kind: 'line', color: [200, 100, 100], label: 'Run-In / Run-Out (出入口)' },
  { kind: 'point', color: [255, 0, 0], label: 'Traffic Features (交通设施点)' },
  { kind: 'note', label: 'Source: natcat_platform:CENTERLINE + 13 Transportation sublayers' },
];

const MO_ROAD_LEGEND: Array<{ kind: 'line' | 'point' | 'header' | 'note'; color?: [number, number, number]; label: string; dash?: [number, number] }> = [
  { kind: 'header', label: 'MO · Road Network (LULC)' },
  { kind: 'line', color: C_CENTERLINE_MO, label: 'Centerlines (MO_LU_Centerline)' },
  { kind: 'note', label: 'Source: Macau LULC GeoServer — MO_LU_Centerline shapefile' },
];

// 渲染 map legend(列在主图正下方,横向铺满 drW)。
// 每个 entry 占 4mm 一行(line / point 用 8x2 mm 色块 + 文字)。
function drawMapLegendBox(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  entries: Array<{ kind: 'line' | 'point' | 'header' | 'note'; color?: [number, number, number]; label: string; dash?: [number, number] }>,
): void {
  const LINE_H = 4;
  let cur = y;
  entries.forEach((e) => {
    if (e.kind === 'header') {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...SLATE);
      pdf.text(e.label, x, cur);
      cur += LINE_H;
      return;
    }
    if (e.kind === 'note') {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      pdf.setTextColor(120, 130, 145);
      pdf.text(e.label, x, cur, { maxWidth: w });
      cur += LINE_H;
      return;
    }
    // line / point:画色块 + label
    const swatchY = cur - 1.2;
    if (e.kind === 'line') {
      // 线段样本:8mm 长,1mm 粗
      pdf.setDrawColor(...(e.color || [0, 0, 0]));
      pdf.setLineWidth(0.5);
      const dash: [number, number] | undefined = e.dash;
      if (dash) {
        // jsPDF 1.x: setLineDashPattern([on, off], phase)
        (pdf as unknown as { setLineDashPattern: (p: number[], phase: number) => void })
          .setLineDashPattern(dash, 0);
      } else if ((pdf as unknown as { setLineDashPattern?: unknown }).setLineDashPattern) {
        (pdf as unknown as { setLineDashPattern: (p: number[], phase: number) => void })
          .setLineDashPattern([], 0);
      }
      pdf.line(x, swatchY, x + 8, swatchY);
    } else {
      // point:小圆点
      pdf.setFillColor(...(e.color || [0, 0, 0]));
      pdf.circle(x + 1.2, swatchY - 0.2, 0.9, 'F');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...SLATE);
    pdf.text(e.label, x + 10, cur, { maxWidth: w - 10 });
    cur += LINE_H;
  });
}

function value(value: number | null | undefined, digits = 3, suffix = ''): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? 'No data'
    : `${value.toFixed(digits)}${suffix}`;
}

// jsPDF GState 在类型里只声明为属性而非构造签名,
// 直接 `new pdf.GState(...)` 会触发 TS7009。这里 cast 一层。
function createGState(pdf: jsPDF, opacity: number) {
  return new (pdf.GState as unknown as new (opts: { opacity: number }) => { opacity: number })({ opacity });
}

function familyName(family: 'non-typhoon-rainfall' | 'typhoon-compound'): string {
  return family === 'non-typhoon-rainfall' ? 'Non-typhoon rainfall' : 'Typhoon compound';
}

function orderedResults(assessment: FloodHazardQueryResult): FloodLayerQueryResult[] {
  const order = [2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const indexed = new Map<number, FloodLayerQueryResult>();
  assessment.results.forEach(r => {
    if (r.returnPeriod !== null && r.returnPeriod !== undefined) {
      indexed.set(r.returnPeriod, r);
    }
  });
  return order
    .filter(rp => indexed.has(rp))
    .map(rp => indexed.get(rp)!) as FloodLayerQueryResult[];
}

// ========== 地图快照(WMS tile 转 dataURL) ==========

// 直接 fetch image URL(同源 BFF 或 CDN tile,只要返回 binary 即可)。
// provider 只是给 PDF metadata 用,实际 URL 由 caller 决定。
//
// CORS 注意事项:fetch 是 simple GET, response.body 读不到(CORS block)会 reject,
// 所以 GeoServer 这种"无 ACAO"的 WMS 必须走同源 BFF 转发。
//
// 加 timeout 防止 BFF / GeoServer 慢响应时整个 PDF 生成卡住;同时校验 content-type,
// 避免 WMS exception XML(GeoServer 出错时返回 application/vnd.ogc.se_xml)
// 被当成图片加载,后续 canvas drawImage 抛 SecurityError。
const FETCH_TIMEOUT_MS = 30_000;
async function fetchImageAsDataUrl(url: string, provider: string): Promise<MapSnapshot> {
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${provider}`);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Non-image response (${contentType}) for ${provider}`);
  }
  const format: 'JPEG' | 'PNG' = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { dataUrl, format, provider };
}

// 计算 bbox:以 (lat, lng) 为中心,zoom 决定 worldPixels。
function buildWmsBbox(latitude: number, longitude: number, zoom: number, width = 1024, height = 640) {
  const worldPixels = 256 * 2 ** zoom;
  const longitudeSpan = width * 360 / worldPixels;
  const latitudeSpan = height * 360 * Math.cos(latitude * Math.PI / 180) / worldPixels;
  return [
    longitude - longitudeSpan / 2,
    latitude - latitudeSpan / 2,
    longitude + longitudeSpan / 2,
    latitude + latitudeSpan / 2,
  ].join(',');
}

// 给定 layer name,直接构造 GeoServer WMS GetMap URL。
// 浏览器不能直接 fetch GeoServer(无 Access-Control-Allow-Origin),
// 所以走同源 BFF `/api/geoserver/getfeatureinfo`,BFF 服务端 fetch GeoServer(无 CORS),
// 把 binary image 透传回前端。searchParams 完全透传,BFF 不需要 special-case WMS vs WFS。
function buildWmsGetMapUrl(
  layer: string,
  bbox: string,
  width: number,
  height: number,
  style?: string,
): string {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: layer,
    srs: 'EPSG:4326',
    bbox,
    width: String(width),
    height: String(height),
    format: 'image/png',
    transparent: 'true',
  });
  if (style) params.set('styles', style);
  // 同源 BFF —— GeoServer response 直接透传,无 CORS。
  return `/api/geoserver/getfeatureinfo?${params.toString()}`;
}

// 通用 XYZ tile 拼接 helper:3×3 tile → 768×768 PNG,中心画红点 marker。
// 所有底图(satellite / street / amap / esri-gray)统一走这里,避免代码重复。
//
// 设计:3×3 对称布局,行 dy∈[-1,0,1],列 dx∈[-1,0,1]。
// 查询点位于中心 tile (cx, cy) 的中心 → canvas 像素 (3*tileSize/2, 3*tileSize/2)
// = canvas 正中心。这与前端 Leaflet flyTo(查询点, zoom) 的 viewport 行为完全一致。
// 这样 WMS bbox 只要也用查询点为中心、768×768 输出,两层在 canvas 正中心重合,
// 不会有任何坐标系偏差。
async function composeTileSnapshot(
  lat: number,
  lng: number,
  tileBase: string,
  zoom: number,
  provider: string,
): Promise<MapSnapshot> {
  const tileSize = 256;
  // 3×3 tile 拼图 = 768×768,1:1 正方形,canvas 正中心 = 查询点
  const cols = 3;
  const rows = 3;
  const canvasWidth = cols * tileSize;
  const canvasHeight = rows * tileSize;

  const cx = lngToTileX(lng, zoom);
  const cy = latToTileY(lat, zoom);

  // 计算 3×3 tile 范围:列 dx=-1,0,1;行 dy=-1,0,1(对称布局)
  const tiles: Array<{ x: number; y: number; dx: number; dy: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({ x: cx + dx, y: cy + dy, dx, dy });
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 白底(防 transparent tile 透出)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 并行抓 tile,任意一张失败 → 抛错(由 caller 走 fallback)
  await Promise.all(tiles.map(async (t) => {
    const url = `${tileBase}/${zoom}/${t.y}/${t.x}`;
    // Esri / AMap / Esri Gray 都返回 Access-Control-Allow-Origin: *,
    // 加 crossOrigin='anonymous' 后 canvas 不会 tainted,toDataURL 不会抛 SecurityError。
    const img = await loadImage(url, 'anonymous');
    const px = (t.dx + 1) * tileSize;
    const py = (t.dy + 1) * tileSize;
    ctx.drawImage(img, px, py, tileSize, tileSize);
  }));

  // 中心红点 marker + 白边(查询点位于 canvas 正中心)
  // 3×3 对称布局,中心 tile 左上角是 (tileSize, tileSize),
  // 中心点是 (3*tileSize/2, 3*tileSize/2) = (384, 384)
  const mx = 3 * tileSize / 2;
  const my = 3 * tileSize / 2;
  ctx.beginPath();
  ctx.arc(mx, my, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    format: 'PNG',
    provider,
  };
}

// 公开 API — Esri 卫星 / 道路底图快照(向后兼容)
export async function fetchMapSnapshot(
  lat: number,
  lng: number,
  type: 'satellite' | 'roadmap',
  zoom = 16,
  provider: 'esri' | 'amap' = 'esri',
): Promise<MapSnapshot> {
  let tileBase: string;
  if (provider === 'amap') {
    const sub = (Math.abs(Math.round(lng * 100)) % 4) + 1;
    tileBase = `https://webrd0${sub}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8`;
  } else if (type === 'satellite') {
    tileBase = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
  } else {
    tileBase = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile';
  }
  return composeTileSnapshot(lat, lng, tileBase, zoom, provider);
}

// OpenStreetMap 标准栅格底图。Page 1 Location Overview 第二张图使用。
//
// 历史:此位置原本抓 AMap 矢量瓦片 (https://webrd0N.is.autonavi.com/...style=7),
//      但 AMap 海外节点对中国大陆出口 IP 经常拒绝服务或返回 HTML 错误页
//      (用户 PDF 截图里这个 panel 就是 "Map snapshot unavailable")。
// 现状:改用 OpenStreetMap 标准 tile,免墙、CORS OK (Access-Control-Allow-Origin: *)、
//      全球可用。代价:标签是英文(OSM 没有可用的中文矢量瓦片服务),香港/澳门街道名
//      实际以英文为主,影响有限。
//
// URL:https://tile.openstreetmap.org/{z}/{x}/{y}.png (注意 path 是 z/x/y 不是 z/y/x)
// 坐标:OSM 用 WGS-84,直接用经纬度算 tile 索引(不需要 wgs84ToGcj02 转换)。
// 布局:同原来 AMap 一样 3×2 tile 拼接(768×512),中心点固定在 (256, 256)
//     即 canvas 几何中心,跟 satellite 图(WMS 以查询点为中心)叠加后无偏移。
// 函数名沿用 fetchAmapSnapshot 以保持对外 API 不变,内部实现已切到 OSM。
export async function fetchAmapSnapshot(
  lat: number,
  lng: number,
  zoom = 17,
): Promise<MapSnapshot> {
  const tileSize = 256;
  const cols = 3;
  const rows = 2;
  const canvasWidth = cols * tileSize;
  const canvasHeight = rows * tileSize;

  // OSM 用 WGS-84,直接用原值算 tile 索引(不需要 wgs84ToGcj02 转换)。
  const cx = lngToTileX(lng, zoom);
  const cy = latToTileY(lat, zoom);
  const tiles: Array<{ x: number; y: number; dx: number; dy: number }> = [];
  for (let dy = -1; dy <= 0; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      tiles.push({ x: cx + dx, y: cy + dy, dx, dy });
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 白底防 transparent tile 透出
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // OSM tile path-style:{z}/{x}/{y}.png — fetch 走匿名模式(OSM 返回 ACAO:*).
  const tileBase = 'https://tile.openstreetmap.org';

  await Promise.all(tiles.map(async (t) => {
    const url = `${tileBase}/${zoom}/${t.x}/${t.y}.png`;
    const img = await loadImage(url, 'anonymous');
    const px = (t.dx + 1) * tileSize;
    const py = (t.dy + 1) * tileSize;
    ctx.drawImage(img, px, py, tileSize, tileSize);
  }));

  // 中心红点 marker(与 satellite 图几何中心对齐)
  ctx.beginPath();
  ctx.arc(tileSize, tileSize, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tileSize, tileSize, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    format: 'PNG',
    provider: 'openstreetmap',
  };
}

// ========== WGS-84 ↔ GCJ-02(火星坐标)转换 ==========
//
// 中国大陆使用的坐标系是 GCJ-02,国外 GPS(WGS-84)直接叠加到 AMap/GoogleMaps 国境内的
// 底图上会有 50-500 m 的偏移。AMap tile 服务用 GCJ-02,所以传入 WGS-84 必须转换。
// 转换公式来自"火星坐标转换"开源实现(已被广泛验证)。
// 出中国(outOfChina)则原样返回。
function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function _transformLat(x: number, y: number): number {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y
    + 0.2 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    + (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
    + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
  return r;
}
function _transformLng(x: number, y: number): number {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y
    + 0.1 * Math.sqrt(Math.abs(x))
    + (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    + (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
    + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
  return r;
}
function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng];
  const a = 6378245;
  const ee = 0.006693421622965943;
  let dLat = _transformLat(lng - 105, lat - 35);
  let dLng = _transformLng(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI;
  const magic = 1 - ee * Math.sin(radLat) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = dLng * 180 / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [lat + dLat, lng + dLng];
}

// Esri Canvas/World_Light_Gray_Base 底图。Page 3 的 6 张水深图共用。
export async function fetchEsriGraySnapshot(
  lat: number,
  lng: number,
  zoom = 16,
): Promise<MapSnapshot> {
  const tileBase = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile';
  return composeTileSnapshot(lat, lng, tileBase, zoom, 'esri-light-gray');
}

// DEM WMS GetMap 截图。HK 用 'dem' style,MO 用 'dem_macau' style。
// bbox = center ±0.005° (≈ ±500m), size 1024×768, EPSG:4326, transparent。
// 复用 buildWmsGetMapUrl + fetchImageAsDataUrl 现有工具,不再走 canvas 拼接
// (WMS 已经返回单张 PNG,不需要再画 marker — addMapPanel 自己会画)。
export async function fetchDemSnapshot(
  lat: number,
  lng: number,
  region: 'hk' | 'mo',
): Promise<MapSnapshot> {
  const layer = region === 'mo' ? DEM_LAYER_NAME_MO : DEM_LAYER_NAME_HK;
  const style = region === 'mo' ? 'dem_macau' : 'dem';
  // ±0.003° ≈ ±300 m @ HK/MO 纬度(聚焦查询点 ±300m 范围,避开边缘水域)
  const eps = 0.003;
  const bbox = `${lng - eps},${lat - eps},${lng + eps},${lat + eps}`;
  // image 1:1,匹配 ±0.003° 方形 bbox 的实际地理比例 (~1.08:1)。
  // 原 1024×768(1.333:1)→ PDF 180×70(2.57:1),image 内部横向被拉宽 1.33 倍 +
  // PDF 又拉宽 1.93 倍,总变形 ~2.57 倍。改成 1:1 后 addImage 无变形。
  const url = buildWmsGetMapUrl(layer, bbox, 1024, 1024, style);
  return fetchImageAsDataUrl(url, `dem-${region}`);
}

// Drainage + Road 复合 WMS GetMap(供 Page 2.5 使用)。
// - bbox 同 DEM(±300m,±0.003°),保持视觉一致
// - layers 逗号分隔多个(pipes + pipeNodes + roads),一次 GetMap 拿整张叠加图
// - styles 留空(GeoServer 默认 style,与前端 Leaflet 视觉一致)
// - HK 走同源 BFF;MO 走直连 GEOSERVER_LULC_URL(MO drainage 在 LULC server 上)
// - 返回 null 表示该区域/数据不可用,调用方走 no-data 占位
export async function fetchDrainageRoadSnapshot(
  lat: number,
  lng: number,
  region: 'hk' | 'mo',
): Promise<MapSnapshot | null> {
  const cfg = DRAINAGE_ROAD_LAYERS[region];
  if (!cfg.pipes) return null;  // 该 region 没有可用的 drainage 数据
  const eps = 0.003;  // 同 DEM ±300m
  const bbox = `${lng - eps},${lat - eps},${lng + eps},${lat + eps}`;
  // layer 顺序:pipes, pipeNodes..., roads(roads 可能为空,跳过)
  const layerList = [cfg.pipes, ...cfg.pipeNodes];
  if (cfg.roads) layerList.push(cfg.roads);
  const layers = layerList.join(',');
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers,
    srs: 'EPSG:4326',
    bbox,
    width: '1024',
    height: '1024',
    format: 'image/png',
    transparent: 'true',
  });
  // 不带 styles 参数 → GeoServer 用 layer 自带 default style
  const baseUrl = cfg.useDirectGeoserver ? GEOSERVER_LULC_DIRECT_URL : '/api/geoserver/getfeatureinfo';
  const url = `${baseUrl}?${params.toString()}`;
  try {
    return await fetchImageAsDataUrl(url, `drainage-road-${region}`);
  } catch (e) {
    console.warn(`[floodRiskPdf] drainage/road snapshot failed for ${region}:`, e);
    return null;
  }
}

// Drainage-only 抓图(Page 2.5a 专用,作为 Leaflet DOM 截屏失败时的 frontend fallback)。
// 走 WMS GetMap 一次性拉 pipes + pipeNodes,MO drainage 走 LULC 直连、HK 走 BFF。
// 不依赖 Leaflet 是否渲染、用户是否勾选 layer — 只要 GeoServer 服务可达就能出图。
// 返回 null → PDF 显示 no-data 占位(原行为不变)。
export async function fetchDrainageOnlySnapshot(
  lat: number,
  lng: number,
  region: 'hk' | 'mo',
): Promise<MapSnapshot | null> {
  const cfg = DRAINAGE_ROAD_LAYERS[region];
  if (!cfg.pipes) return null;
  const eps = 0.003;  // 同 §fetchDrainageRoadSnapshot,±0.003° ≈ ±300m
  const bbox = `${lng - eps},${lat - eps},${lng + eps},${lat + eps}`;
  const layers = [cfg.pipes, ...cfg.pipeNodes].join(',');
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers,
    srs: 'EPSG:4326',
    bbox,
    width: '1024',
    height: '1024',
    format: 'image/png',
    transparent: 'true',
  });
  const baseUrl = cfg.useDirectGeoserver ? GEOSERVER_LULC_DIRECT_URL : '/api/geoserver/getfeatureinfo';
  const url = `${baseUrl}?${params.toString()}`;
  try {
    return await fetchImageAsDataUrl(url, `drainage-only-${region}`);
  } catch (e) {
    console.warn(`[floodRiskPdf] drainage-only snapshot failed for ${region}:`, e);
    return null;
  }
}

// Road-only 抓图(Page 2.5b 专用)。HK 把 14 个 Transportation 子类 layer 都拼进去;
// MO 没有 road layer,直接返回 null 走 no-data 占位。
// 同样不依赖 Leaflet DOM / 用户勾选 — frontend 直接 canvas 重新画。
export async function fetchRoadOnlySnapshot(
  lat: number,
  lng: number,
  region: 'hk' | 'mo',
): Promise<MapSnapshot | null> {
  const sublayers = region === 'hk' ? HK_ROAD_SUBLAYERS : MO_ROAD_SUBLAYERS;
  if (sublayers.length === 0) return null;  // MO:no road layer,占位
  const cfg = DRAINAGE_ROAD_LAYERS[region];
  const eps = 0.003;
  const bbox = `${lng - eps},${lat - eps},${lng + eps},${lat + eps}`;
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: sublayers.join(','),
    srs: 'EPSG:4326',
    bbox,
    width: '1024',
    height: '1024',
    format: 'image/png',
    transparent: 'true',
  });
  const baseUrl = cfg.useDirectGeoserver ? GEOSERVER_LULC_DIRECT_URL : '/api/geoserver/getfeatureinfo';
  const url = `${baseUrl}?${params.toString()}`;
  try {
    return await fetchImageAsDataUrl(url, `road-only-${region}`);
  } catch (e) {
    console.warn(`[floodRiskPdf] road-only snapshot failed for ${region}:`, e);
    return null;
  }
}

// tile helpers (Web Mercator XYZ)
function lngToTileX(lng: number, zoom: number): number {
  return Math.floor((lng + 180) / 360 * 2 ** zoom);
}
function latToTileY(lat: number, zoom: number): number {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom);
}

const FLOOD_STYLE = 'flood-depth-blue-satellite';

function floodLayerName(
  family: 'non-typhoon' | 'compound',
  returnPeriod: number,
  region: 'hk' | 'mo',
): string {
  const rp = String(returnPeriod).padStart(3, '0');
  if (region === 'hk') {
    const prefix = family === 'non-typhoon' ? 'HK_Flood_NONTC_R' : 'HK_Flood_Compound_R';
    return `natcat_platform:${prefix}${rp}`;
  }
  const prefix = family === 'non-typhoon' ? 'MO_Flood_NONTC_R' : 'MO_Flood_Compound_R';
  return `natcat_platform:${prefix}${rp}`;
}

function resolveRegion(latitude: number, longitude: number): 'hk' | 'mo' {
  if (latitude >= 22.05 && latitude <= 22.23 && longitude >= 113.48 && longitude <= 113.65) return 'mo';
  return 'hk';
}

export async function fetchFloodSnapshot(
  lat: number,
  lng: number,
  family: 'non-typhoon' | 'compound',
  returnPeriod: number,
  zoom = 16,
): Promise<MapSnapshot> {
  const region = resolveRegion(lat, lng);
  // 跟 base tile 同比例 1:1 (768×768),保证 compose 不变形。
  // composeTileSnapshot 用 3×3 对称布局,查询点位于 canvas (384, 384) = canvas 正中心。
  // WMS bbox 以查询点为中心、768×768 → WMS 图里查询点也在正中心 (384, 384)。
  // 两层查询点位置一致,无任何坐标系偏差。
  const bbox = buildWmsBbox(lat, lng, zoom, 768, 768);
  const url = buildWmsGetMapUrl(floodLayerName(family, returnPeriod, region), bbox, 768, 512, FLOOD_STYLE);
  try {
    return await fetchImageAsDataUrl(url, `geoserver-${family}-R${returnPeriod}`);
  } catch {
    // 失败返回 null-like snapshot — caller 应处理
    throw new Error(`Flood snapshot unavailable for ${family} R${returnPeriod}`);
  }
}

// 把 overlay 叠到 base 上。base/overlay 都是 dataURL PNG。
export async function composeMapSnapshots(
  base: MapSnapshot | null,
  overlay: MapSnapshot | null,
): Promise<MapSnapshot | null> {
  if (!base) return null;
  if (!overlay) return base;

  try {
    const baseImg = await loadImage(base.dataUrl);
    const overlayImg = await loadImage(overlay.dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return base;
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    const dataUrl = canvas.toDataURL('image/png');
    return { dataUrl, format: 'PNG', provider: `${base.provider}+${overlay.provider}` };
  } catch (e) {
    // 合成失败(某层 tile 加载失败 / canvas 不可用等)兜底返回 base,
    // 不让一个坏图层把整份 PDF 拖崩。
    console.warn('composeMapSnapshots failed; falling back to base:', e);
    return base;
  }
}

function loadImage(dataUrl: string, crossOrigin?: 'anonymous' | 'use-credentials'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // 加载 cross-origin image (Esri / AMap tile) 时必须设 crossOrigin='anonymous',
    // 否则浏览器以 no-cors 模式加载,canvas 会被 tainted,toDataURL 抛 SecurityError。
    // server 必须返回 Access-Control-Allow-Origin: *,否则 onerror。
    // data: URL 不需要设(且设了某些浏览器反而会 fail)。
    if (crossOrigin && !dataUrl.startsWith('data:')) {
      image.crossOrigin = crossOrigin;
    }
    image.onload = () => resolve(image);
    // onerror 默认传 ProgressEvent 是无属性对象,会让上游 console.error 看到 `{}`。
    // 包成 Error,保留 80 字符 dataUrl 前缀方便定位是哪张图崩了。
    image.onerror = () => reject(new Error(`loadImage failed: ${dataUrl.slice(0, 80)}`));
    image.src = dataUrl;
  });
}

// ========== DEM 采样(WCS 1.0.0 + geotiff) ==========

// GeoServer WCS GetCoverage 读 DEM 单像素 elevation。
//
// 历史踩坑:
//   1) WMS GetFeatureInfo 在 GeoServer 2.22 抛 "Null charset name" — 绕开,用 WCS
//   2) WCS 1.0.0 在这个 GeoServer 上 DescribeCoverage / GetCoverage 都返回 XML exception
//      (Unexpected error during xml encoding, source coverage parameter is mandatory)。
//      实际可用的是 **WCS 2.0.1**,语法不同:
//        - 用 `coverageId` 而不是 `coverage`
//        - 用 `subset=Axis,crs_uri(lo,hi)` 而不是 `bbox`
//        - format=image/tiff(GeoServer 不支持 format=GeoTIFF,但 image/tiff 会返回 GeoTIFF)
//   3) HK_DEM_5m native CRS 是 EPSG:2326(HK 1980 Grid),axis 是 E/N;
//
//      MO_DEM_TIF_clipped native CRS 是 EPSG:4326,axis 是 Long/Lat。
//      subset 必须用 native CRS + 对��� axis label(GeoServer 不接受非 native subset)。
//      proj4 转换 WGS-84 → HK 1980 Grid。
//   4) 直接 fetch GeoServer 没 ACAO → 走同源 BFF `/api/geoserver/wcs`。
import proj4 from 'proj4';

const HK_1980_GRID = '+proj=tmerc +lat_0=22.3121333333333 +lon_0=114.178555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.961,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs';
const WGS84 = 'EPSG:4326';
// 注册到 proj4(proj4 默认只注册了 WGS84 + Web Mercator)
proj4.defs('EPSG:2326', HK_1980_GRID);

async function sampleDemAt(
  latitude: number,
  longitude: number,
  region: 'hk' | 'mo',
): Promise<number | null> {
  const coverageId = region === 'mo'
    ? 'natcat_platform:MO_DEM_TIF_clipped'
    : 'natcat_platform:HK_DEM_5m';
  // bbox 半径 ≈ 22 m,确保覆盖 1 个 DEM 像素(HK/MO 都是 5 m 分辨率)
  const eps = 0.0002;
  const minLng = longitude - eps;
  const maxLng = longitude + eps;
  const minLat = latitude - eps;
  const maxLat = latitude + eps;

  let params: URLSearchParams;
  if (region === 'mo') {
    // MO_DEM native 是 EPSG:4326,axis Long/Lat
    const crsUri = 'http://www.opengis.net/def/crs/EPSG/0/4326';
    params = new URLSearchParams();
    params.set('service', 'WCS');
    params.set('version', '2.0.1');
    params.set('request', 'GetCoverage');
    params.set('coverageId', coverageId);
    params.append('subset', `Long,${crsUri}(${minLng},${maxLng})`);
    params.append('subset', `Lat,${crsUri}(${minLat},${maxLat})`);
    params.set('format', 'image/tiff');
  } else {
    // HK_DEM native 是 EPSG:2326(HK 1980 Grid),axis E/N
    const [eMin, nMin] = proj4(WGS84, 'EPSG:2326', [minLng, minLat]);
    const [eMax, nMax] = proj4(WGS84, 'EPSG:2326', [maxLng, maxLat]);
    const crsUri = 'http://www.opengis.net/def/crs/EPSG/0/2326';
    params = new URLSearchParams();
    params.set('service', 'WCS');
    params.set('version', '2.0.1');
    params.set('request', 'GetCoverage');
    params.set('coverageId', coverageId);
    params.append('subset', `E,${crsUri}(${eMin},${eMax})`);
    params.append('subset', `N,${crsUri}(${nMin},${nMax})`);
    params.set('format', 'image/tiff');
  }

  try {
    const r = await fetch(`/api/geoserver/wcs?${params.toString()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    if (ab.byteLength < 100) return null; // XML exception 不可能这么长
    const tiff = await fromArrayBuffer(ab);
    const image = await tiff.getImage();
    const raster = await image.readRasters();
    const band = raster[0] as ArrayLike<number> | undefined;
    const v = band?.[0];
    if (v === undefined || v === null) return null;
    const num = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(num)) return null;
    const noData = image.getGDALNoData();
    if (noData !== null && noData !== undefined && num === Number(noData)) return null;
    return num;
  } catch {
    return null;
  }
}

// ========== PDF 页头/页脚 ==========

function addHeader(pdf: jsPDF, title: string, subtitle?: string): number {
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, PAGE_WIDTH, 24, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(title, MARGIN, 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  if (subtitle) pdf.text(subtitle, MARGIN, 18);
  pdf.setTextColor(...SLATE);
  return 34; // 顶部留白之后 y 起点
}

function addFooter(pdf: jsPDF): void {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text('NatCat Platform | Stochastic-catalog flood hazard screening', MARGIN, PAGE_HEIGHT - 7);
    pdf.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' });
  }
}

function addSectionTitle(pdf: jsPDF, title: string, y: number): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...TEAL);
  pdf.text(title, MARGIN, y);
  pdf.setDrawColor(...TEAL_LIGHT);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y + 1.5, PAGE_WIDTH - MARGIN, y + 1.5);
  pdf.setTextColor(...SLATE);
  return y + 6;
}

// ========== Key/Value 网格 ==========

function addKeyValueGrid(
  pdf: jsPDF,
  rows: Array<[string, string]>,
  yStart: number,
  cols = 2,
): number {
  const colWidth = CONTENT_WIDTH / cols;
  const rowHeight = 5;
  pdf.setFontSize(8);
  rows.forEach((row, idx) => {
    const col = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    const x = MARGIN + col * colWidth;
    const y = yStart + rowIdx * rowHeight;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(row[0], x, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...SLATE);
    const valX = x + colWidth * 0.42;
    const clipped = pdf.splitTextToSize(row[1], colWidth * 0.55)[0] || '';
    pdf.text(clipped, valX, y);
  });
  const totalRows = Math.ceil(rows.length / cols);
  return yStart + totalRows * rowHeight + 2;
}

// ========== Annual Metrics 对比表 ==========

function addAnnualMetricsComparison(
  pdf: jsPDF,
  assessments: FloodHazardQueryResult[],
  yStart: number,
): number {
  const headers = ['Metric', 'Non-typhoon rainfall', 'Typhoon compound'];
  const cols = [
    { x: MARGIN + 0,   w: 70 },
    { x: MARGIN + 70,  w: 60 },
    { x: MARGIN + 130, w: 60 },
  ];
  let y = yStart;
  // 标题行
  pdf.setFillColor(...LIGHT_SLATE);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE);
  headers.forEach((h, idx) => pdf.text(h, cols[idx].x + 2, y + 5));
  y += 7;

  const findMetric = (assessment: FloodHazardQueryResult | undefined, key: string) =>
    assessment?.annualMetrics?.[key as keyof typeof assessment.annualMetrics];

  const rainfall = assessments.find(a => a.annualMetrics?.family === 'non-typhoon-rainfall');
  const compound = assessments.find(a => a.annualMetrics?.family === 'typhoon-compound');

  const rows: Array<[string, string, string]> = [
    ['Annual flood probability',
      value((findMetric(rainfall, 'annualFloodProbability') as number | null) !== null
        ? (findMetric(rainfall, 'annualFloodProbability') as number) * 100 : null, 3, '%'),
      value((findMetric(compound, 'annualFloodProbability') as number | null) !== null
        ? (findMetric(compound, 'annualFloodProbability') as number) * 100 : null, 3, '%'),
    ],
    ['Annualized exceedance depth',
      value(findMetric(rainfall, 'annualizedExcessDepth') as number | null, 3, ' m'),
      value(findMetric(compound, 'annualizedExcessDepth') as number | null, 3, ' m'),
    ],
    ['Onset return period',
      value(rainfall?.minimumInundationReturnPeriod, 0),
      value(compound?.minimumInundationReturnPeriod, 0),
    ],
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    pdf.setTextColor(...SLATE);
    row.forEach((cell, cidx) => pdf.text(cell, cols[cidx].x + 2, y + 4.2));
    y += 6;
  });
  return y + 4;
}

// ========== Depth bar chart(11 个 return period) ==========

function addDepthBarChart(
  pdf: jsPDF,
  assessment: FloodHazardQueryResult,
  yStart: number,
  color: [number, number, number] = BLUE,
  chartHeight = 30,
  highlightRp?: number | null,
): number {
  const results = orderedResults(assessment);
  if (results.length === 0) return yStart;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE);
  pdf.text(
    `${familyName(assessment.annualMetrics?.family ?? 'non-typhoon-rainfall')} - Flood depth by return period`,
    MARGIN, yStart,
  );

  const chartX = MARGIN;
  const chartY = yStart + 4;
  const chartW = CONTENT_WIDTH;
  const chartH = chartHeight;
  const validDepths = results
    .map(r => r.depth)
    .filter((d): d is number => d !== null && d !== undefined && Number.isFinite(d));
  // maxDepth 直接取最大深度,不用 Math.max(0.5, ...) 兜底 — 避免小深度被强制拉高。
  // 没有 valid 数据时整个 chart 留空(渲染前 caller 会判 results.length)。
  const maxDepth = validDepths.length > 0 ? Math.max(...validDepths) : 0.5;

  // 网格
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.15);
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i += 1) {
    const lineY = chartY + chartH - (chartH * i) / yTicks;
    pdf.line(chartX, lineY, chartX + chartW, lineY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${(maxDepth * i / yTicks).toFixed(2)}`, chartX - 1.5, lineY + 1.5, { align: 'right' });
  }

  // onset RP 用主色高亮,其它 bar 用浅色变体 — 让"首次出现 > 0.15 m 的 RP"视觉突出。
  // 没有 highlightRp 时所有 bar 用主色(向后兼容)。
  const lightColor: [number, number, number] = [
    Math.round(color[0] + (241 - color[0]) * 0.75),
    Math.round(color[1] + (245 - color[1]) * 0.75),
    Math.round(color[2] + (249 - color[2]) * 0.75),
  ];

  const barW = chartW / results.length * 0.7;
  const stepX = chartW / results.length;
  results.forEach((r, i) => {
    const x = chartX + stepX * i + (stepX - barW) / 2;
    const depth = r.depth;
    const h = depth !== null && depth !== undefined && Number.isFinite(depth)
      ? Math.max((depth / maxDepth) * chartH, 0.6)  // 最小可见高度 0.6mm,避免 0-depth bar 看不见
      : 0;
    const isOnset = highlightRp !== null && highlightRp !== undefined
      && r.returnPeriod === highlightRp;
    const fill: [number, number, number] = isOnset ? color : lightColor;
    pdf.setFillColor(...fill);
    pdf.rect(x, chartY + chartH - h, barW, h, 'F');
    // x-label
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`R${r.returnPeriod}`, x + barW / 2, chartY + chartH + 3, { align: 'center' });
    // onset label
    if (isOnset) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5);
      pdf.setTextColor(...color);
      pdf.text('onset', x + barW / 2, chartY + chartH - h - 1, { align: 'center' });
    }
  });
  return chartY + chartH + 6;
}

// ========== Terrain Profile 章节 ==========

interface TerrainProfileSample {
  distance: number;       // 离中心点的有符号距离 (m),西/南为负,东/北为正
  elevation: number | null;
}

interface TerrainCrossProfiles {
  eastWest: TerrainProfileSample[];
  northSouth: TerrainProfileSample[];
  halfLengthMeters: number;
  centerElevation: number | null;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 中心点 ±halfLengthMeters 的两条正交剖面(E-W 与 N-S)
async function computeCrossingProfiles(
  center: { lat: number; lng: number },
  halfLengthMeters: number,
  samplesPerSide: number,
  region: 'hk' | 'mo',
  batchSize = 16,
): Promise<TerrainCrossProfiles> {
  // 米 → 度粗略(22° 纬度上 < 0.1% 误差)
  const latPerMeter = 1 / 110540;
  const lngPerMeter = 1 / (111320 * Math.cos(center.lat * Math.PI / 180));

  const ewPoints: Array<{ distance: number; lat: number; lng: number }> = [];
  const nsPoints: Array<{ distance: number; lat: number; lng: number }> = [];
  for (let i = -samplesPerSide; i <= samplesPerSide; i += 1) {
    const dist = (i / samplesPerSide) * halfLengthMeters;
    ewPoints.push({ distance: dist, lat: center.lat, lng: center.lng + dist * lngPerMeter });
    nsPoints.push({ distance: dist, lat: center.lat + dist * latPerMeter, lng: center.lng });
  }

  const allPoints: Array<{ lat: number; lng: number }> = [
    ...ewPoints.map(p => ({ lat: p.lat, lng: p.lng })),
    ...nsPoints.map(p => ({ lat: p.lat, lng: p.lng })),
  ];
  const elevations: Array<number | null> = new Array(allPoints.length).fill(null);
  for (let i = 0; i < allPoints.length; i += batchSize) {
    const batch = allPoints.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(p => sampleDemAt(p.lat, p.lng, region)));
    for (let j = 0; j < results.length; j += 1) elevations[i + j] = results[j];
  }

  const eastWest: TerrainProfileSample[] = ewPoints.map((p, idx) => ({
    distance: p.distance, elevation: elevations[idx],
  }));
  const northSouth: TerrainProfileSample[] = nsPoints.map((p, idx) => ({
    distance: p.distance, elevation: elevations[ewPoints.length + idx],
  }));

  const centerElevation = eastWest[samplesPerSide]?.elevation
    ?? northSouth[samplesPerSide]?.elevation
    ?? null;

  return { eastWest, northSouth, halfLengthMeters, centerElevation };
}

// 在 PDF 上绘制一条 elevation profile 折线图。
function addElevationProfileChart(
  pdf: jsPDF,
  samples: TerrainProfileSample[],
  title: string,
  subtitle: string,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...SLATE);
  pdf.text(title, x, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(100, 116, 139);
  pdf.text(subtitle, x, y + 9);

  const chartX = x + 22;
  const chartY = y + 14;
  const chartWidth = width - 24;
  const chartHeight = height - 22;

  const validElevs = samples
    .map(sample => sample.elevation)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (validElevs.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('No elevation samples available', x + width / 2, y + height / 2, { align: 'center' });
    return y + height + 4;
  }

  const elevMin = Math.min(...validElevs);
  const elevMax = Math.max(...validElevs);
  const elevPad = Math.max(0.5, (elevMax - elevMin) * 0.1);
  const elevLow = Math.floor((elevMin - elevPad) * 2) / 2;
  const elevHigh = Math.ceil((elevMax + elevPad) * 2) / 2;
  const elevSpan = Math.max(elevHigh - elevLow, 0.5);

  const distMin = Math.min(...samples.map(s => s.distance));
  const distMax = Math.max(...samples.map(s => s.distance));
  const distSpan = Math.max(distMax - distMin, 1);

  // Y 网格 + 刻度
  const yTickCount = 4;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(100, 116, 139);
  for (let i = 0; i <= yTickCount; i += 1) {
    const tickValue = elevLow + (elevSpan * i) / yTickCount;
    const lineY = chartY + chartHeight - (chartHeight * i) / yTickCount;
    pdf.line(chartX, lineY, chartX + chartWidth, lineY);
    pdf.text(`${tickValue.toFixed(1)}m`, chartX - 1.5, lineY + 1.5, { align: 'right' });
  }

  const projectX = (distance: number) =>
    chartX + chartWidth * ((distance - distMin) / distSpan);
  const projectY = (elevation: number) =>
    chartY + chartHeight - chartHeight * ((elevation - elevLow) / elevSpan);

  // X 轴
  const xTickCount = 5;
  pdf.setDrawColor(100, 116, 139);
  pdf.setLineWidth(0.3);
  pdf.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);
  const useMeters = Math.abs(distMax) < 1000 && Math.abs(distMin) < 1000;
  for (let i = 0; i <= xTickCount; i += 1) {
    const ratio = i / xTickCount;
    const tickDist = distMin + distSpan * ratio;
    const tickX = chartX + chartWidth * ratio;
    pdf.line(tickX, chartY + chartHeight, tickX, chartY + chartHeight + 1);
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    const sign = tickDist > 0 ? '+' : '';
    const label = useMeters
      ? `${sign}${Math.round(tickDist)}`
      : `${sign}${(tickDist / 1000).toFixed(2)}`;
    pdf.text(label, tickX, chartY + chartHeight + 4, { align: 'center' });
  }
  pdf.setFontSize(6);
  pdf.text(useMeters ? 'm' : 'km', chartX + chartWidth / 2, chartY + chartHeight + 7.5, { align: 'center' });

  // 主剖面折线(emerald-500)
  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(0.7);
  let lastPoint: { x: number; y: number } | null = null;
  samples.forEach(sample => {
    if (sample.elevation === null) {
      lastPoint = null;
      return;
    }
    const px = projectX(sample.distance);
    const py = projectY(sample.elevation);
    if (lastPoint) pdf.line(lastPoint.x, lastPoint.y, px, py);
    lastPoint = { x: px, y: py };
  });

  // 中心高亮(amber-500) — 虚线 + 点
  if (distMin <= 0 && distMax >= 0) {
    const centerPx = projectX(0);
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([1.5, 1], 0);
    pdf.line(centerPx, chartY, centerPx, chartY + chartHeight);
    pdf.setLineDashPattern([], 0);

    const centerSample = samples.find(sample => sample.distance === 0);
    if (centerSample && centerSample.elevation !== null) {
      const centerPy = projectY(centerSample.elevation);
      pdf.setFillColor(245, 158, 11);
      pdf.circle(centerPx, centerPy, 0.9, 'F');
    }
  }

  const relief = elevMax - elevMin;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...SLATE);
  pdf.text(
    `Relief ${relief.toFixed(1)} m · ${elevMin.toFixed(1)}–${elevMax.toFixed(1)} m`,
    x + width, y + 4, { align: 'right' },
  );

  return y + height + 6;
}

// 用户绘制的两点折线 profile → TerrainProfileSample[]
function userProfileToTerrainSamples(
  profile: TerrainProfilePayload,
): { samples: TerrainProfileSample[]; halfLengthMeters: number } {
  const totalDist = profile.samples.length > 0
    ? profile.samples[profile.samples.length - 1].distance
    : 0;
  const half = totalDist / 2;
  const samples: TerrainProfileSample[] = profile.samples.map(s => ({
    distance: s.distance - half,
    elevation: s.elevation,
  }));
  return { samples, halfLengthMeters: half };
}

// "Site terrain context" 页: 标题 + 2 ��正交剖面图 + 简短说明。
function addSiteTerrainContextPage(
  pdf: jsPDF,
  profiles: TerrainCrossProfiles,
  center: { lat: number; lng: number },
  region: 'hk' | 'mo',
): void {
  pdf.addPage('a4', 'portrait');
  const headerSubtitle = `Two orthogonal profiles centered at ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)} | DEM ${region.toUpperCase()} 5 m sampling`;
  let pageY = addHeader(
    pdf,
    'Site terrain context — elevation cross profiles',
    headerSubtitle,
  );

  const chartWidth = CONTENT_WIDTH;
  const chartHeight = 75;
  const leftX = MARGIN;
  const halfKmLabel = (profiles.halfLengthMeters / 1000).toFixed(2);
  const firstTopY = pageY + 4;

  // 第一张图(West <-> East)
  pageY = addElevationProfileChart(
    pdf, profiles.eastWest,
    'Profile A . West <-> East',
    `Latitude fixed at ${center.lat.toFixed(6)} . sampling every ~${(profiles.halfLengthMeters * 2 / (profiles.eastWest.length - 1)).toFixed(1)} m along +-${halfKmLabel} km`,
    leftX, firstTopY, chartWidth, chartHeight,
  );

  // 第二张图(South <-> North)
  const secondTopY = pageY + 4;
  pageY = addElevationProfileChart(
    pdf, profiles.northSouth,
    'Profile B . South <-> North',
    `Longitude fixed at ${center.lng.toFixed(6)} . sampling every ~${(profiles.halfLengthMeters * 2 / (profiles.northSouth.length - 1)).toFixed(1)} m along +-${halfKmLabel} km`,
    leftX, secondTopY, chartWidth, chartHeight,
  );

  // 页脚说明
  const footY = pageY + 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(71, 85, 105);
  const validA = profiles.eastWest.filter(s => s.elevation !== null).length;
  const validB = profiles.northSouth.filter(s => s.elevation !== null).length;
  const totalA = profiles.eastWest.length;
  const totalB = profiles.northSouth.length;
  const demName = region === 'mo' ? DEM_LAYER_NAME_MO : DEM_LAYER_NAME_HK;
  const notes = [
    `Cross profiles are sampled from ${demName} (5 m horizontal resolution). Two perpendicular lines (east-west and north-south)`,
    `extend ±${halfKmLabel} km from the query location and intersect at the asset center. The center marker (amber dot) marks`,
    `the queried coordinate. Sample gaps occur where the DEM has no-data pixels; these segments are not drawn.`,
    `Profile A sampled ${validA}/${totalA} pixels · Profile B sampled ${validB}/${totalB} pixels.`,
    'This is topographic context only. It does not include flood depth, building ingress, or hydrological connectivity.',
  ];
  notes.forEach((line, idx) => pdf.text(line, MARGIN, footY + idx * 3.4));
}

// ���户绘制 profile 的 PDF 页(单张大图 + 端点坐标)
function addUserTerrainProfilePage(
  pdf: jsPDF,
  profile: TerrainProfilePayload,
): void {
  const { samples, halfLengthMeters } = userProfileToTerrainSamples(profile);
  const valid = samples.filter(s => s.elevation !== null) as Array<{ distance: number; elevation: number }>;
  const totalSamples = samples.length;
  const totalLengthMeters = profile.samples[profile.samples.length - 1]?.distance ?? 0;

  pdf.addPage('a4', 'portrait');
  const start = profile.points[0];
  const end = profile.points[profile.points.length - 1];
  const totalKm = totalLengthMeters >= 1000
    ? `${(totalLengthMeters / 1000).toFixed(2)} km`
    : `${totalLengthMeters.toFixed(0)} m`;
  const pageY = addHeader(
    pdf,
    'User terrain profile — two-point elevation cross section',
    `From ${start.lat.toFixed(6)}, ${start.lng.toFixed(6)} to ${end.lat.toFixed(6)}, ${end.lng.toFixed(6)} | ${totalKm} total | DEM 5 m sampling`,
  );

  const chartHeight = 110;
  const nextY = addElevationProfileChart(
    pdf,
    samples,
    'Elevation profile',
    `Total ${totalKm} · ${valid.length}/${totalSamples} valid samples`,
    MARGIN,
    pageY + 4,
    CONTENT_WIDTH,
    chartHeight,
  );

  // 页脚说明
  const footY = nextY + 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(71, 85, 105);
  const minE = valid.length ? Math.min(...valid.map(s => s.elevation)) : null;
  const maxE = valid.length ? Math.max(...valid.map(s => s.elevation)) : null;
  const halfKm = (halfLengthMeters / 1000).toFixed(2);
  const notes = [
    'Profile drawn by the user on the map: two clicks placed the endpoints, and 200 samples were taken along the great-circle line.',
    'Each sample elevation was queried from the underlying DEM at 5 m horizontal resolution.',
    `Distance axis is centered on the midpoint (-${halfKm} km to +${halfKm} km); the amber dashed line marks the midpoint.`,
    valid.length === totalSamples
      ? `All ${totalSamples} samples returned valid elevations.`
      : `${valid.length} of ${totalSamples} samples returned valid elevations; gaps indicate DEM no-data pixels.`,
    minE !== null && maxE !== null
      ? `Elevation range: ${minE.toFixed(1)}–${maxE.toFixed(1)} m (relief ${(maxE - minE).toFixed(1)} m).`
      : 'No elevation samples available — DEM query failed for this region.',
    'This is topographic context only. It does not include flood depth, building ingress, or hydrological connectivity.',
  ];
  notes.forEach((line, idx) => pdf.text(pdf.splitTextToSize(line, CONTENT_WIDTH), MARGIN, footY + idx * 3.4));
}

// ========== Map Panel (地图底图 + 中心 marker + flood overlay) ==========

function addMapPanel(
  pdf: jsPDF,
  snapshot: MapSnapshot | null,
  label: string,
  yStart: number,
  lat: number,
  lng: number,
  withMarker: boolean,
  height: number,
  xOffset: number = MARGIN,
  width: number = CONTENT_WIDTH,
  noDataMessage?: { title: string; detail: string },
  skipMarker = false,
): number {
  const x = xOffset;
  const w = width;
  const h = height;
  if (!snapshot) {
    pdf.setFillColor(...LIGHT_SLATE);
    pdf.rect(x, yStart, w, h, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(x, yStart, w, h, 'S');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    const msg = noDataMessage?.title ?? 'Map snapshot unavailable';
    pdf.text(msg, x + w / 2, yStart + h / 2, { align: 'center' });
    if (noDataMessage?.detail) {
      pdf.setFontSize(6.5);
      pdf.text(noDataMessage.detail, x + w / 2, yStart + h / 2 + 4, { align: 'center' });
    }
    pdf.setTextColor(...SLATE);
    pdf.setFont('helvetica', 'normal');
  } else {
    try {
      // 第 7 个参数 alias 是 jsPDF addImage 的 compression alias;
      // 传 'FAST' 在部分 jsPDF build 下抛错("addImage: 'FAST' is not a valid alias")。
      // 这里不传 alias(jsPDF 默认 NONE),保证最大兼容性。
      pdf.addImage(snapshot.dataUrl, snapshot.format, x, yStart, w, h);
    } catch (e) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(150, 0, 0);
      pdf.text('Image render failed', x + w / 2, yStart + h / 2, { align: 'center' });
      pdf.setTextColor(...SLATE);
    }
  }
  // 中心 marker
  // 注:当 panel 是 Leaflet 截图(capturedFloodMaps)时,marker 已包含在截图里,
  // 这里不再画,避免双红点。用此函数的 fallback/offline 路径仍画在 panel 中心。
  if (withMarker && !skipMarker) {
    const cx = x + w / 2;
    const cy = yStart + h / 2;
    pdf.setFillColor(220, 38, 38);
    pdf.circle(cx, cy, 1.5, 'F');
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.4);
    pdf.circle(cx, cy, 1.5, 'S');
  }
  // 标签
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...SLATE);
  pdf.text(label, x, yStart - 1.5);
  pdf.setTextColor(...SLATE);
  pdf.setFont('helvetica', 'normal');
  return yStart + h;
}

// ========== DEM 色阶 legend(SLD dem_terrain 同款配色) ==========
//
// 用 SLD 中 0–700m 段的 8 个颜色,按 elevMin..elevMax 区间等距映射到色块。
// 高程 < elevMin 用最浅色,> elevMax 用最深色,中间线性插值取色块索引。
// legend 横向铺在 DEM panel 正下方,与 panel 等宽。
const DEM_ELEVATION_COLOR_RAMP: Array<[number, number, number]> = [
  [221, 235, 192], // #DDEBC0  SLD 0m
  [197, 221, 168], // #C5DDA8  SLD 100m
  [169, 204, 138], // #A9CC8A  SLD 200m
  [200, 210, 168], // #C8D2A8  SLD 300m
  [210, 200, 160], // #D2C8A0  SLD 400m
  [199, 185, 138], // #C7B98A  SLD 500m
  [181, 163, 117], // #B5A375  SLD 600m
  [168, 138,  90], // #A88A5A  SLD 700m
];

function addDemElevationLegend(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  cellH: number,
  elevMin: number,
  elevMax: number,
): number {
  const ramp = DEM_ELEVATION_COLOR_RAMP;
  const n = ramp.length;
  const cellW = width / n;
  ramp.forEach((color, i) => {
    const cx = x + i * cellW;
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(cx, y, cellW, cellH, 'F');
  });
  // 头/尾高程 label(7pt,SLATE,位于色块下方 1mm)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...SLATE);
  pdf.text(`${elevMin.toFixed(1)} m`, x, y + cellH + 4);
  pdf.text(`${elevMax.toFixed(1)} m`, x + width, y + cellH + 4, { align: 'right' });
  return y + cellH + 8;  // 返回下一行 y
}

function addFloodDepthLegend(
  pdf: jsPDF,
  x: number,
  y: number,
  compact = false,
): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE);
  pdf.text('Flood depth', x, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const cellW = compact ? 22 : 30;
  const cellH = 5;
  FLOOD_DEPTH_LEGEND.forEach((row, idx) => {
    const cx = x + (idx % 2) * cellW;
    const cy = y + 4 + Math.floor(idx / 2) * (cellH + 1);
    pdf.setFillColor(...row.color);
    pdf.rect(cx, cy, cellW - 14, cellH, 'F');
    pdf.setTextColor(...SLATE);
    pdf.text(row.label, cx + cellW - 13, cy + 4);
  });
  return y + 4 + Math.ceil(FLOOD_DEPTH_LEGEND.length / 2) * (cellH + 1);
}

// ========== 解释卡(6 条 numbered cards,与 areaFloodRiskPdf 同款 TEAL 视觉风格) ==========

interface InterpretationCard {
  title: string;
  body: string;
}

const INTERPRETATION_CARDS: InterpretationCard[] = [
  {
    title: 'Scenario sampling',
    body: 'For each scenario, the model samples a 100 m circular neighbourhood around the building coordinate and reports the maximum street-level flood depth across valid raster pixels as the building\'s external inundation value.',
  },
  {
    title: 'Frequency sensitivity',
    body: 'Inundation frequency sensitivity is captured by the first return period that exceeds 0.15 m of depth. Early onset at high-frequency scenarios such as R2 or R5 means the location floods more often, but it does NOT mean that R2 is more severe than R1000.',
  },
  {
    title: 'Scenario severity',
    body: 'Scenario severity is measured by the flood depth at the corresponding return period. R1000 is the 0.1% AEP rare-event tier and typically produces greater depth and broader extent than a 2% AEP scenario such as R50.',
  },
  {
    title: 'Depth severity bands',
    body: 'below 0.15 m - below threshold (not flooded); 0.15-0.5 m - shallow; 0.5-1 m - moderate; 1-2 m - deep; 2-3 m - very deep; above 3 m - extreme.',
  },
  {
    title: 'Independent event families',
    body: 'No combined flood score across the two event families is computed. The overall return-period curve should be derived by merging annual maxima or exceedance rates from the two 10,000-year event sets. Do not add, average, or take the maximum of the two family scores.',
  },
  {
    title: 'Scope of this report',
    body: 'This is a hazard screening result. It excludes building vulnerability, insurance terms, and loss calculations, and must not be interpreted as a premium or expected loss. For quantitative risk analysis, run this platform\'s Catastrophe Model (Cat Model), which combines subject attributes, vulnerability, and insurance terms to estimate expected loss and support insurance risk assessment.',
  },
];

function addInterpretationCards(pdf: jsPDF, yStart: number): number {
  const cardX = MARGIN;
  const cardW = CONTENT_WIDTH;
  const gap = 2;
  let y = yStart + 6;
  INTERPRETATION_CARDS.forEach((card, idx) => {
    // 1) 先算 body 行数 → 决定 cardH,确保不被裁剪
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const bodyLines = pdf.splitTextToSize(card.body, cardW - 14);
    const cardH = 4 + 4 + bodyLines.length * 3.2 + 3;

    // 2) 卡片背景 + 边框
    pdf.setFillColor(...LIGHT_SLATE);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(cardX, y, cardW, cardH, 'FD');

    // 3) 编号圆圈(TEAL)— 垂直居中
    const circleCx = cardX + 5;
    const circleCy = y + cardH / 2;
    pdf.setFillColor(...TEAL);
    pdf.circle(circleCx, circleCy, 2.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(`${idx + 1}`, circleCx, circleCy + 1.2, { align: 'center' });

    // 4) 标题
    pdf.setTextColor(...TEAL);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(card.title, cardX + 11, y + 4.5);

    // 5) 正文 — 完整渲染,按行
    pdf.setTextColor(...SLATE);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    bodyLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, cardX + 11, y + 8.5 + lineIdx * 3.2);
    });

    y += cardH + gap;
  });
  return y;
}

// ========== appendFloodRiskPdfPages: 4 个章节 ==========

export async function appendFloodRiskPdfPages(
  pdf: jsPDF,
  { asset, flood, profile, capturedFloodMaps, drainageSnapshot: inputDrainage, roadSnapshot: inputRoad }: FloodRiskPdfInput,
  startOnNewPage = true,
): Promise<void> {
  const assessments = flood.driverAssessments || [];
  const rainfallAssessment = assessments.find(
    a => a.annualMetrics?.family === 'non-typhoon-rainfall',
  );
  const compoundAssessment = assessments.find(
    a => a.annualMetrics?.family === 'typhoon-compound',
  );
  const rainfallOnsetReturnPeriod = rainfallAssessment?.minimumInundationReturnPeriod ?? null;
  const compoundOnsetReturnPeriod = compoundAssessment?.minimumInundationReturnPeriod ?? null;

  const region = resolveRegion(asset.latitude, asset.longitude);

  // 并行抓取所有 6 页需要的快照:
  //  Page 1 — Esri 卫星 + AMap 矢量
  //  Page 2 — DEM (HK/MO 路由)
  //  Page 3 — 6 张洪水叠加 + Esri Light Gray 共享底图(只取一次)
  // Page 2.5a/2.5b 的 drainage / road 由调用方通过 input.drainageSnapshot / input.roadSnapshot 传入
  // (MO drainage 走 LULC GeoServer 直连,BFF 无法代理,只能从 Leaflet DOM 截屏)
  // 任何抓取失败 → null(snapshot 的容错:addMapPanel 会显示 "Map snapshot unavailable" 而非崩溃)
  const [
    esriSatSnapshot,
    amapSnapshot,
    demSnapshot,
    ntOnsetOverlay,
    tcOnsetOverlay,
    ntR200Overlay,
    tcR200Overlay,
    ntR1000Overlay,
    tcR1000Overlay,
    grayBase,
  ] = await Promise.all([
    fetchMapSnapshot(asset.latitude, asset.longitude, 'satellite', 17, 'esri').catch(() => null),
    fetchAmapSnapshot(asset.latitude, asset.longitude, 17).catch(() => null),
    fetchDemSnapshot(asset.latitude, asset.longitude, region).catch(() => null),
    rainfallOnsetReturnPeriod === null
      ? Promise.resolve(null)
      : fetchFloodSnapshot(asset.latitude, asset.longitude, 'non-typhoon', rainfallOnsetReturnPeriod, 16).catch(() => null),
    compoundOnsetReturnPeriod === null
      ? Promise.resolve(null)
      : fetchFloodSnapshot(asset.latitude, asset.longitude, 'compound', compoundOnsetReturnPeriod, 16).catch(() => null),
    fetchFloodSnapshot(asset.latitude, asset.longitude, 'non-typhoon', 200, 16).catch(() => null),
    fetchFloodSnapshot(asset.latitude, asset.longitude, 'compound', 200, 16).catch(() => null),
    fetchFloodSnapshot(asset.latitude, asset.longitude, 'non-typhoon', 1000, 16).catch(() => null),
    fetchFloodSnapshot(asset.latitude, asset.longitude, 'compound', 1000, 16).catch(() => null),
    fetchEsriGraySnapshot(asset.latitude, asset.longitude, 16).catch(() => null),
  ]);
  // Page 2.5a (Drainage) + 2.5b (Road) 由 input 传入
  // (LULC GeoServer 直连,无法走 BFF fetch,所以必须从 Leaflet DOM 截屏)
  const drainageSnapshot = inputDrainage ?? null;
  const roadSnapshot = inputRoad ?? null;

  // Page 3 的 6 张合成图:Gray 底图 + WMS flood overlay。
  // Gray 底图失败时回退到卫星图(保证至少能看到底色,而不是撞 panel)。
  const baseForCompose = grayBase ?? esriSatSnapshot;
  const [
    ntOnsetComposed,
    tcOnsetComposed,
    ntR200Composed,
    tcR200Composed,
    ntR1000Composed,
    tcR1000Composed,
  ] = await Promise.all([
    composeMapSnapshots(baseForCompose, ntOnsetOverlay).catch(() => null),
    composeMapSnapshots(baseForCompose, tcOnsetOverlay).catch(() => null),
    composeMapSnapshots(baseForCompose, ntR200Overlay).catch(() => null),
    composeMapSnapshots(baseForCompose, tcR200Overlay).catch(() => null),
    composeMapSnapshots(baseForCompose, ntR1000Overlay).catch(() => null),
    composeMapSnapshots(baseForCompose, tcR1000Overlay).catch(() => null),
  ]);

  const generatedAt = new Date();
  if (startOnNewPage) pdf.addPage('a4', 'portrait');

  // ============ Page 1 — Location Overview ============
  {
    let y = addHeader(pdf, 'Location Overview',
      `${printableText(asset.address)} | ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`);
    const mapGap = 5;
    const mapW = (CONTENT_WIDTH - mapGap) / 2;
    const mapH = 60;
    const mapY = y + 4;
    addMapPanel(pdf, esriSatSnapshot, 'Esri World Imagery (satellite)',
      mapY, asset.latitude, asset.longitude, true, mapH, MARGIN, mapW);
    addMapPanel(pdf, amapSnapshot, 'OpenStreetMap (street)',
      mapY, asset.latitude, asset.longitude, true, mapH, MARGIN + mapW + mapGap, mapW);
    y = mapY + mapH + 10;

    y = addKeyValueGrid(pdf, [
      ['Region', region === 'mo' ? 'Macau' : 'Hong Kong'],
      ['Latitude', asset.latitude.toFixed(6)],
      ['Longitude', asset.longitude.toFixed(6)],
      ['Elevation', asset.elevation === null ? 'Not queried' : `${asset.elevation} m`],
      ['Distance to coast', asset.distanceToCoast === null ? 'Not queried' : `${asset.distanceToCoast} km`],
      ['Population density', asset.populationDensity === null ? 'Not queried' : `${asset.populationDensity}/km²`],
      ['Building density', printableText(asset.buildingDensity)],
      ['Land use', printableText(asset.landUse)],
      ['Data source', printableText(asset.geocodingSource || 'Coordinates')],
      ['Risk classification', printableText(flood.classification)],
      ['Assessment mode', flood.assessmentMode],
      ['Sampling', `${flood.samplingMethod} (r=${flood.samplingRadiusMeters} m, threshold=${flood.thresholdMeters} m)`],
    ], y + 2);

    // 历史洪涝一行
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    const histParts: string[] = [];
    if (flood.historicalFlood?.available) {
      histParts.push(`${flood.historicalFlood.inundationCount}/${flood.historicalFlood.queriedEvents} events inundation`);
      histParts.push(`${flood.historicalFlood.typhoonCount} TC / ${flood.historicalFlood.rainfallCount} rain`);
      if (flood.historicalFlood.maximumHistoricalDepth !== null
          && flood.historicalFlood.maximumHistoricalDepth !== undefined) {
        histParts.push(`max depth ${flood.historicalFlood.maximumHistoricalDepth.toFixed(2)} m`);
      }
    } else {
      histParts.push('Not available');
    }
    pdf.text(`Historical simulated floods: ${histParts.join(' · ')}`,
      MARGIN, y);
  }

  // ============ Page 2 — Terrain & Profile ============
  {
    pdf.addPage('a4', 'portrait');
    const y = addHeader(pdf, 'Terrain & Profile',
      `DEM ${region.toUpperCase()} 5 m | cross profiles +/-300 m`);
    // 上半:DEM 截图
    // 1:1 显示(±300m 方形 bbox → image 1024×1024 → PDF 100×100mm)。
    // image 和 PDF 都是 1:1,addImage 无变形;DEM 居中,左右各留 40mm 空白。
    const demSize = 100;
    addMapPanel(pdf, demSnapshot,
      `Digital Elevation Model - ${region === 'mo' ? 'MO_DEM_TIF_clipped' : 'HK_DEM_5m'} (+/-300 m bbox)`,
      y + 4, asset.latitude, asset.longitude,
      true, demSize, MARGIN + (CONTENT_WIDTH - demSize) / 2, demSize);
    // 下半:Profile A + B(±300m 十字) + DEM 色阶 legend
    let profiles: TerrainCrossProfiles | null = null;
    try {
      profiles = await computeCrossingProfiles(
        { lat: asset.latitude, lng: asset.longitude },
        300, 50, region,
      );
    } catch (e) {
      console.warn('Cross profile sampling failed:', e);
    }
    if (profiles) {
      const halfKm = (profiles.halfLengthMeters / 1000).toFixed(2);
      const spacingM = ((profiles.halfLengthMeters * 2) / (profiles.eastWest.length - 1)).toFixed(1);
      const validA = profiles.eastWest.filter(s => s.elevation !== null).length;
      const validB = profiles.northSouth.filter(s => s.elevation !== null).length;
      let chartY = y + 122;  // DEM 100mm + 4mm gap + 16mm legend = 122mm,profile chart 起点
    // DEM 色阶 legend(根据 profile 实际高程动态算 min/max,与 SLD 一致)
    const profileElevations = profiles
      ? [...profiles.eastWest, ...profiles.northSouth]
          .map(s => s.elevation)
          .filter((e): e is number => e !== null)
      : [];
    if (profileElevations.length > 0) {
      const elevMin = Math.min(...profileElevations);
      const elevMax = Math.max(...profileElevations);
      addDemElevationLegend(pdf,
        MARGIN + (CONTENT_WIDTH - demSize) / 2,
        y + 4 + demSize + 2,  // DEM 图正下方
        demSize, 4,
        elevMin, elevMax);
    }
      chartY = addElevationProfileChart(pdf, profiles.eastWest,
        'Profile A · West ↔ East',
        `Latitude fixed at ${asset.latitude.toFixed(6)} · sampling every ~${spacingM} m along ±${halfKm} km · ${validA}/${profiles.eastWest.length} valid`,
        MARGIN, chartY, CONTENT_WIDTH, 45);
      chartY = addElevationProfileChart(pdf, profiles.northSouth,
        'Profile B · South ↔ North',
        `Longitude fixed at ${asset.longitude.toFixed(6)} · sampling every ~${spacingM} m along ±${halfKm} km · ${validB}/${profiles.northSouth.length} valid`,
        MARGIN, chartY + 4, CONTENT_WIDTH, 45);
    } else {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Cross profile sampling failed (DEM query unavailable for this region).',
        MARGIN, y + 82);
    }
  }

  // ============ Page 2.5a — Drainage Network (zoom 17) ============
  // Site context 图 a:仅显示排水管网(conduits + junctions/outfalls/storage_tanks 或 MO pipe),
  // 帮助用户判断洪水风险位置与排水子汇水区的关系。
  // 图幅与 Page 1 卫星图 / AMap 一致(85×60 mm),保持视觉一致性。
  {
    pdf.addPage('a4', 'portrait');
    const y = addHeader(pdf, 'Site Context — Drainage Network',
      `Conduits + junctions/outfalls + storage_tanks | ${region.toUpperCase()} | zoom 17 viewport`);
    const drW = 85;
    const drH = 60;
    const drX = MARGIN;
    const drY = y + 4;
    if (drainageSnapshot) {
      addMapPanel(pdf, drainageSnapshot,
        `Drainage only (zoom 17) — ${region.toUpperCase()}`,
        drY, asset.latitude, asset.longitude,
        /* withMarker */ true, drH, drX, drW);
    } else {
      addMapPanel(pdf, null,
        `Drainage only (zoom 17) — ${region.toUpperCase()}`,
        drY, asset.latitude, asset.longitude,
        true, drH, drX, drW,
        { title: 'Drainage layer unavailable',
          detail: `No drainage layer captured for ${region.toUpperCase()} (Leaflet snapshot failed)` });
    }
    // legend:列出本图叠加的图层 + 视觉样式(line + point 颜色)
    const legendY = drY + drH + 4;
    drawMapLegendBox(pdf, drX, legendY, drW, region === 'hk' ? HK_DRAINAGE_LEGEND : MO_DRAINAGE_LEGEND);
    // 自诊断提示(仅 MO)
    if (region === 'mo') {
      const diagY = legendY + (region === 'hk' ? HK_DRAINAGE_LEGEND : MO_DRAINAGE_LEGEND).length * 4 + 4;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(220, 38, 38);
      pdf.text(
        'Note: MO drainage data covers land areas only. If only the basemap and red marker '
        + 'are visible, the coordinate likely lies over water or outside the Macau LULC extent.',
        drX, diagY, { maxWidth: drW },
      );
    }
  }

  // ============ Page 2.5b — Road Network (zoom 17) ============
  // Site context 图 b:仅显示道路中心线(CENTERLINE + 14 个 HK Transportation 子类 / MO centerline)。
  // 单独成页让 legend 可以列全 14 个 road subclass(HK) 而不挤在一起。
  {
    pdf.addPage('a4', 'portrait');
    const y = addHeader(pdf, 'Site Context — Road Network',
      `Centerlines + road sublayers | ${region.toUpperCase()} | zoom 17 viewport`);
    const drW = 85;
    const drH = 60;
    const drX = MARGIN;
    const drY = y + 4;
    if (roadSnapshot) {
      addMapPanel(pdf, roadSnapshot,
        `Road only (zoom 17) — ${region.toUpperCase()}`,
        drY, asset.latitude, asset.longitude,
        /* withMarker */ true, drH, drX, drW);
    } else {
      addMapPanel(pdf, null,
        `Road only (zoom 17) — ${region.toUpperCase()}`,
        drY, asset.latitude, asset.longitude,
        true, drH, drX, drW,
        { title: 'Road layer unavailable',
          detail: `No road layer captured for ${region.toUpperCase()} (Leaflet snapshot failed)` });
    }
    const legendY = drY + drH + 4;
    drawMapLegendBox(pdf, drX, legendY, drW, region === 'hk' ? HK_ROAD_LEGEND : MO_ROAD_LEGEND);
  }

  // ============ Page 4 — Flood Depth Maps (6 张, Gray 底图, 1:1 正方形) ============
  //
  // 关键修复:底图 composeTileSnapshot 改用 3×3 对称布局(原 3×2 非对称),
  // WMS 也用 768×768。两者都是 1:1 正方形,查询点都在 canvas 正中心 (384, 384)。
  // PDF panel 也改成 1:1 正方形 3×2 排版,addImage 1:1 贴图,无任何变形或偏移。
  //
  // 渲染策略(按优先级):
  //   1) 优先用前端 Leaflet 实时截图(capturedFloodMaps)。
  //      panel 比例按截图实际比例动态调整,避免拉伸变形。
  //   2) 缺失截图 → 降级到原 snap 合成(fetchFloodSnapshot + composeMapSnapshots)。
  {
    pdf.addPage('a4', 'portrait');
    const subtitle = capturedFloodMaps
      ? `Live Leaflet screenshot (Risk Query) | ${region.toUpperCase()}`
      : `Esri Light Gray base + WMS flood overlay | ${region.toUpperCase()}`;
    let y = addHeader(pdf, 'Flood Depth Maps - 6 Return Periods', subtitle);
    const cellGap = 5;
    // 关键:按 Leaflet 截图实际宽高比算 cellW/cellH,保证 addImage 1:1 贴图无变形。
    // 前端 Leaflet 容器通常是横向(宽 > 高),所以 cellW > cellH。
    // 排版:横向 2 列 3 行(共 6 张,每张横向),与第一张卫星图一致。
    // 约束:
    //   宽:2*cellW + 1*cellGap ≤ CONTENT_WIDTH(180) → cellW ≤ 87.5
    //   高:3*cellH + 2*cellGap_for_row ≤ 250(留 header/legend 空间) → cellH ≤ 75.7
    // 实际:cellW=86.4(由 captureRatio=1.44 决定,≤87.5), cellH=60
    // → 2*86.4+5=177.8 ≤ 180 ✓, 3*60+2*14=208 ≤ 250 ✓
    const firstCaptured = capturedFloodMaps
      ? Object.values(capturedFloodMaps).find((v) => v !== null)
      : null;
    // 默认 1.44:1(720/500)横向比例。如果截图实际比例不同,按比例调整 cellW(不能超过 87.5)
    const captureRatio = firstCaptured
      ? firstCaptured.width / firstCaptured.height
      : 1.21;
    const cellH = 60;
    const cellW = Math.min(87.5, cellH * captureRatio);
    const rowStep = cellH + 14;
    const startY = y + 4;
    const noOnsetMessage = {
      title: 'No inundation above 0.15 m',
      detail: 'No onset map applies; R200 and R1000 maps shown below.',
    };
    const onsetLabel = (family: string, rp: number | null) => rp === null
      ? `${family} | First >0.15 m: no exceedance`
      : `${family} | First >0.15 m: R${rp}`;
    const panels: Array<{
      snap: MapSnapshot | null;
      capturedKey: string;
      label: string;
      noData?: { title: string; detail: string };
    }> = [
      { snap: ntOnsetComposed, capturedKey: 'ntOnset',
        label: onsetLabel('Non-typhoon rainfall', rainfallOnsetReturnPeriod),
        noData: rainfallOnsetReturnPeriod === null ? noOnsetMessage : undefined },
      { snap: tcOnsetComposed, capturedKey: 'tcOnset',
        label: onsetLabel('Typhoon compound', compoundOnsetReturnPeriod),
        noData: compoundOnsetReturnPeriod === null ? noOnsetMessage : undefined },
      { snap: ntR200Composed, capturedKey: 'ntR200', label: 'Non-typhoon rainfall | R200' },
      { snap: tcR200Composed, capturedKey: 'tcR200', label: 'Typhoon compound | R200' },
      { snap: ntR1000Composed, capturedKey: 'ntR1000', label: 'Non-typhoon rainfall | R1000' },
      { snap: tcR1000Composed, capturedKey: 'tcR1000', label: 'Typhoon compound | R1000' },
    ];
    panels.forEach((p, idx) => {
      // 2 列 3 行(横向)排版
      const r = Math.floor(idx / 2);
      const c = idx % 2;
      const x = MARGIN + c * (cellW + cellGap);
      const yy = startY + r * rowStep;
      const captured = capturedFloodMaps?.[p.capturedKey];
      let labelDrawn = false;
      if (captured) {
        // 路径 1: Leaflet 截图 → addImage(自带底图 + 洪水层 + 红点 marker)
        try {
          pdf.addImage(captured.dataUrl, captured.format, x, yy, cellW, cellH);
        } catch (e) {
          console.warn(`capturedFloodMaps addImage failed for ${p.capturedKey}, falling back to snap:`, e);
          addMapPanel(pdf, p.snap, p.label, yy, asset.latitude, asset.longitude,
            true, cellH, x, cellW, p.noData, /* skipMarker */ true);
          labelDrawn = true; // addMapPanel 内部已画 label
        }
      } else {
        // 路径 2: 离线合成 → snap + addMapPanel(画 panel 中心红点)
        addMapPanel(pdf, p.snap, p.label, yy, asset.latitude, asset.longitude,
          true, cellH, x, cellW, p.noData);
        labelDrawn = true; // addMapPanel 内部已画 label
      }
      // 补画 label(只针对路径 1 成功 addImage 的情况;路径 2 由 addMapPanel 内部画)。
      // 行间隙 = rowStep - cellH = 14mm,够放 7pt 粗体一行(最长 label "Non-typhoon
      // rainfall | R1000" 约 35mm,cellW=86.4mm 完全放得下)。
      if (!labelDrawn) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...SLATE);
        pdf.text(p.label, x, yy - 1.5);
      }
    });
    // 把 depth legend 叠在第 6 张图(右下角)内部,腾出底部空间给页面边距。
    // 图例尺寸 44×22mm(compact),在 panel 内右下角留 3mm 内边距,画一个
    // 半透明白底防止被洪水图层盖住读不清。
    const lastIdx = panels.length - 1; // 5 → r=2, c=1(右下角)
    const lastR = Math.floor(lastIdx / 2);
    const lastC = lastIdx % 2;
    const lastPanelX = MARGIN + lastC * (cellW + cellGap);
    const lastPanelY = startY + lastR * rowStep;
    const legendPadX = 3;
    const legendPadY = 3;
    const legendW = 44;
    const legendH = 22;
    const legendX = lastPanelX + cellW - legendW - legendPadX;
    const legendY = lastPanelY + cellH - legendH - legendPadY;
    pdf.setFillColor(255, 255, 255);
    pdf.setGState(new pdf.GState({ opacity: 0.85 }));
    pdf.rect(legendX - 1.5, legendY - 1.5, legendW + 3, legendH + 3, 'F');
    pdf.setGState(new pdf.GState({ opacity: 1 }));
    addFloodDepthLegend(pdf, legendX, legendY, true);
  }

  // ============ Page 5 — Return Period Depth Chart ============
  {
    pdf.addPage('a4', 'portrait');
    let pageY = addHeader(
      pdf, 'Return Period Depth Chart',
      'Annual-maxima statistics and 11 sampled return periods per event family',
    );
    if (assessments.length > 0) {
      pageY = addAnnualMetricsComparison(pdf, assessments, pageY);
      pageY = addDepthBarChart(pdf, assessments[0], pageY + 2, BLUE, 32, rainfallOnsetReturnPeriod);
      pageY = addDepthBarChart(pdf, assessments[1], pageY + 2, VIOLET, 32, compoundOnsetReturnPeriod);
      addFloodDepthLegend(pdf, MARGIN, pageY + 2, true);
    } else if (flood.layerResults?.length) {
      // 单情景模式:用户选了某个 layer 而非 run driver assessment
      const assessment: FloodHazardQueryResult = {
        latitude: asset.latitude,
        longitude: asset.longitude,
        region: '',
        thresholdMeters: flood.thresholdMeters,
        samplingMethod: flood.samplingMethod,
        samplingRadiusMeters: flood.samplingRadiusMeters,
        minimumInundationReturnPeriod: null,
        maximumDepth: null,
        classification: flood.classification as FloodHazardQueryResult['classification'],
        assessmentMode: 'selected-scenario',
        selectedScenario: flood.selectedScenario,
        results: flood.layerResults,
        queriedAt: generatedAt.toISOString(),
        source: 'GeoServer',
      };
      pageY = addDepthBarChart(pdf, assessment, pageY, BLUE, 32);
      addFloodDepthLegend(pdf, MARGIN, pageY + 2, true);
    } else {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text('No return-period depth samples available for this query.',
        MARGIN, pageY + 6);
    }
  }

  // ============ Page 6 — Summary (不变) ============
  {
    pdf.addPage('a4', 'portrait');
    const interpY = addHeader(
      pdf, 'Summary',
      'Stochastic-catalog flood hazard screening - methodology notes',
    );
    addInterpretationCards(pdf, interpY);
  }

  // Historical events 章节已下线(避免 PDF 过长且 historical 数据是模拟而非实测,
  // 对筛检报告价值有限)。如需保留,改回 addHistoricalEventsTable 即可。
  // 用法示例:
  //   if (flood.historicalFlood?.available && flood.historicalFlood.events.length > 0) {
  //     addHistoricalEventsTable(pdf, flood.historicalFlood, addHeader(pdf, 'Historical simulated inundation events',
  //       `Location ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)} | ${flood.historicalFlood.events.length} events`));
  //   }
}

// ========== Public: 生成单点 PDF 并触发下载 ==========

export async function generateFloodRiskPdf(input: FloodRiskPdfInput): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: 'Flood Risk Assessment Report',
    subject: 'Location-level stochastic-catalog flood hazard screening',
    author: 'NatCat Platform',
    creator: 'NatCat Platform',
  });
  await appendFloodRiskPdfPages(pdf, input, false);
  addFooter(pdf);
  const { asset } = input;
  const locationName = asset.address?.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 50)
    || `${asset.latitude.toFixed(5)}_${asset.longitude.toFixed(5)}`;
  pdf.save(`flood-risk-assessment-${locationName}.pdf`);
}

// 公开类型以避免重复
export type { AreaFloodGeometry, AreaFloodHazardResult };