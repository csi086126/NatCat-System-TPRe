import { jsPDF } from 'jspdf';
import type {
  AreaFloodFamilyStatistics,
  AreaFloodGeometry,
  AreaFloodHazardResult,
} from '../types';
import {
  composeMapSnapshots,
  fetchEsriGraySnapshot,
  fetchFloodSnapshot,
  fetchMapSnapshot,
  type MapSnapshot,
} from './floodRiskPdf';

interface AreaFloodPdfInput {
  result: AreaFloodHazardResult & {
    type: string;
    geometry: AreaFloodGeometry;
    bounds: { north: number; south: number; east: number; west: number };
  };
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BLUE: [number, number, number] = [37, 99, 235];
const VIOLET: [number, number, number] = [124, 58, 237];
const TEAL: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [51, 65, 85];
const LIGHT_SLATE: [number, number, number] = [241, 245, 249];
const FLOOD_LEGEND: Array<{ color: [number, number, number]; label: string }> = [
  { color: [155, 34, 38], label: '> 3.0 m' },
  { color: [214, 40, 40], label: '2.0 - 3.0 m' },
  { color: [229, 89, 52], label: '1.5 - 2.0 m' },
  { color: [249, 160, 63], label: '1.0 - 1.5 m' },
  { color: [253, 231, 76], label: '0.5 - 1.0 m' },
  { color: [91, 192, 235], label: '0.2 - 0.5 m' },
];

function value(number: number | null | undefined, digits: number, suffix = ''): string {
  return number === null || number === undefined || !Number.isFinite(number)
    ? 'No data'
    : `${number.toFixed(digits)}${suffix}`;
}

// jspdf 的 GState 在类型里只声明为属性而非构造签名,直接 `new pdf.GState(...)` 会触发 TS7009。
// 这里用一层 `unknown` 断言把构造签名暴露出来,等价于 `new GState({ opacity })`,但保留 jsPDF 实例方法的访问性。
function createGState(pdf: jsPDF, opacity: number) {
  return new (pdf.GState as unknown as new (opts: { opacity: number }) => { opacity: number })({ opacity });
}

function addHeader(pdf: jsPDF, title: string, subtitle: string): number {
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, PAGE_WIDTH, 24, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, MARGIN, 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(subtitle, MARGIN, 18);
  pdf.setTextColor(...SLATE);
  return 34;
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
    pdf.text('NatCat Platform | Area stochastic-catalog flood hazard screening', MARGIN, PAGE_HEIGHT - 7);
    pdf.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' });
  }
}

function geometryRings(geometry: AreaFloodGeometry): [number, number][][] {
  return geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flat();
}

function chooseZoom(bounds: AreaFloodPdfInput['result']['bounds']): number {
  const centerLatitude = (bounds.north + bounds.south) / 2;
  const requiredLongitudeSpan = (bounds.east - bounds.west) * 1.35;
  const requiredLatitudeSpan = (bounds.north - bounds.south) * 1.35;
  for (let zoom = 18; zoom >= 12; zoom -= 1) {
    const worldPixels = 256 * 2 ** zoom;
    const longitudeSpan = 1024 * 360 / worldPixels;
    const latitudeSpan = 640 * 360 * Math.cos(centerLatitude * Math.PI / 180) / worldPixels;
    if (longitudeSpan >= requiredLongitudeSpan && latitudeSpan >= requiredLatitudeSpan) return zoom;
  }
  return 12;
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

function loadImage(dataUrl: string, crossOrigin?: 'anonymous' | 'use-credentials'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // crossOrigin='anonymous' 防止 canvas tainted (Esri / AMap tile 都是 ACAO:*)
    if (crossOrigin && !dataUrl.startsWith('data:')) {
      image.crossOrigin = crossOrigin;
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode area map image'));
    image.src = dataUrl;
  });
}

async function addGeometryBoundary(
  snapshot: MapSnapshot | null,
  geometry: AreaFloodGeometry,
  latitude: number,
  longitude: number,
  zoom: number,
): Promise<MapSnapshot | null> {
  if (!snapshot) return null;
  try {
    const image = await loadImage(snapshot.dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    if (!context) return snapshot;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const useGcj = snapshot.provider.includes('Amap');
    const useWebMercator = snapshot.provider.includes('CARTO');
    const center = useGcj ? wgs84ToGcj02(latitude, longitude) : [latitude, longitude] as [number, number];
    const worldPixels = 256 * 2 ** zoom;
    const longitudeSpan = 1024 * 360 / worldPixels;
    const latitudeSpan = 640 * 360 * Math.cos(center[0] * Math.PI / 180) / worldPixels;
    const west = center[1] - longitudeSpan / 2;
    const north = center[0] + latitudeSpan / 2;
    const centerWorldX = (center[1] + 180) / 360 * worldPixels;
    const centerLatitudeRadians = center[0] * Math.PI / 180;
    const centerWorldY = (1 - Math.asinh(Math.tan(centerLatitudeRadians)) / Math.PI) / 2 * worldPixels;
    const viewportLeft = centerWorldX - 1024 / 2;
    const viewportTop = centerWorldY - 640 / 2;

    context.fillStyle = 'rgba(15, 118, 110, 0.16)';
    context.strokeStyle = '#0f766e';
    context.lineWidth = 7;
    geometryRings(geometry).forEach(ring => {
      context.beginPath();
      ring.forEach(([ringLongitude, ringLatitude], index) => {
        const transformed = useGcj
          ? wgs84ToGcj02(ringLatitude, ringLongitude)
          : [ringLatitude, ringLongitude] as [number, number];
        const latitudeRadians = transformed[0] * Math.PI / 180;
        const worldX = (transformed[1] + 180) / 360 * worldPixels;
        const worldY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * worldPixels;
        const x = useWebMercator
          ? (worldX - viewportLeft) / 1024 * canvas.width
          : (transformed[1] - west) / longitudeSpan * canvas.width;
        const y = useWebMercator
          ? (worldY - viewportTop) / 640 * canvas.height
          : (north - transformed[0]) / latitudeSpan * canvas.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.fill();
      context.stroke();
    });
    return {
      dataUrl: canvas.toDataURL('image/png'),
      format: 'PNG',
      provider: `${snapshot.provider} | drawn-area boundary`,
    };
  } catch {
    return snapshot;
  }
}

function addMapPanel(
  pdf: jsPDF,
  snapshot: MapSnapshot | null,
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  showFloodLegend = false,
  emptyMessage?: { title: string; detail: string },
): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE);
  pdf.text(title, x, y);
  const imageY = y + 3;
  if (!snapshot) {
    if (emptyMessage) {
      pdf.setFillColor(240, 253, 250);
      pdf.setDrawColor(153, 246, 228);
      pdf.roundedRect(x, imageY, width, height, 2, 2, 'FD');
      pdf.setFillColor(...TEAL);
      pdf.circle(x + width / 2, imageY + height / 2 - 10, 4.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('OK', x + width / 2, imageY + height / 2 - 8.5, { align: 'center' });
      pdf.setTextColor(...TEAL);
      pdf.setFontSize(8);
      pdf.text(pdf.splitTextToSize(emptyMessage.title, width - 12), x + width / 2, imageY + height / 2 + 2, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(pdf.splitTextToSize(emptyMessage.detail, width - 14), x + width / 2, imageY + height / 2 + 12, { align: 'center' });
    } else {
      pdf.setFillColor(...LIGHT_SLATE);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(x, imageY, width, height, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Map unavailable', x + width / 2, imageY + height / 2, { align: 'center' });
    }
    return;
  }
  pdf.addImage(snapshot.dataUrl, snapshot.format, x, imageY, width, height, undefined, 'FAST');
  if (showFloodLegend) {
    const legendX = x + width - 29;
    const legendY = imageY + 3;
    pdf.setFillColor(255, 255, 255);
    pdf.setGState(createGState(pdf, 0.9));
    pdf.rect(legendX, legendY, 26, 31, 'F');
    pdf.setGState(createGState(pdf, 1));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.4);
    pdf.setTextColor(...SLATE);
    pdf.text('Flood depth', legendX + 2, legendY + 4);
    FLOOD_LEGEND.forEach((entry, index) => {
      const rowY = legendY + 6 + index * 4;
      pdf.setFillColor(...entry.color);
      pdf.rect(legendX + 2, rowY, 4, 2.7, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(4.9);
      pdf.setTextColor(...SLATE);
      pdf.text(entry.label, legendX + 7.5, rowY + 2.2);
    });
  }
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(createGState(pdf, 0.84));
  pdf.rect(x, imageY + height - 7, width, 7, 'F');
  pdf.setGState(createGState(pdf, 1));
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.6);
  pdf.setTextColor(...SLATE);
  pdf.text(pdf.splitTextToSize(`Source: ${snapshot.provider}`, width - 4)[0], x + 2, imageY + height - 2.5);
}

function addSummaryGrid(pdf: jsPDF, result: AreaFloodPdfInput['result'], y: number): number {
  const entries = [
    ['Geometry', result.type],
    ['Area', `${result.areaSquareKilometers.toFixed(3)} km2`],
    ['Analysis grid', `${result.rasterWidth} x ${result.rasterHeight}`],
    ['Resolution', `Approx. ${result.approximatePixelSizeMeters.toFixed(1)} m`],
    ['Historical simulated floods', result.historicalFlood?.available
      ? `${result.historicalFlood.inundationCount} of ${result.historicalFlood.queriedEvents} events`
      : 'Not available'],
    ['Historical TC / rain', result.historicalFlood?.available
      ? `${result.historicalFlood.typhoonCount} / ${result.historicalFlood.rainfallCount}`
      : 'Not available'],
    ['Maximum historical depth', result.historicalFlood?.maximumHistoricalDepth === null
      || result.historicalFlood?.maximumHistoricalDepth === undefined
      ? 'No inundation'
      : `${result.historicalFlood.maximumHistoricalDepth.toFixed(2)} m`],
    ['Historical analysis grid', result.historicalFlood?.available
      ? `${result.historicalFlood.rasterWidth} x ${result.historicalFlood.rasterHeight}`
      : 'Not available'],
  ];
  const gap = 4;
  const width = (CONTENT_WIDTH - gap) / 2;
  entries.forEach(([label, display], index) => {
    const x = MARGIN + (index % 2) * (width + gap);
    const rowY = y + Math.floor(index / 2) * 18;
    pdf.setFillColor(...LIGHT_SLATE);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(x, rowY, width, 14, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, x + 3, rowY + 4.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE);
    pdf.text(display, x + 3, rowY + 10.5);
  });
  return y + Math.ceil(entries.length / 2) * 18 + 2;
}

function addAnnualComparison(pdf: jsPDF, families: AreaFloodFamilyStatistics[], y: number): number {
  const rainfall = families.find(family => family.family === 'non-typhoon-rainfall');
  const compound = families.find(family => family.family === 'typhoon-compound');
  const rows = [
    ['1% area onset', rainfall?.onePercentAreaOnsetReturnPeriod ? `R${rainfall.onePercentAreaOnsetReturnPeriod}` : 'Not reached', compound?.onePercentAreaOnsetReturnPeriod ? `R${compound.onePercentAreaOnsetReturnPeriod}` : 'Not reached'],
    ['Mean annual probability', value(rainfall?.annualProbability.mean === null ? null : (rainfall?.annualProbability.mean ?? 0) * 100, 2, '%'), value(compound?.annualProbability.mean === null ? null : (compound?.annualProbability.mean ?? 0) * 100, 2, '%')],
    ['P90 annual probability', value(rainfall?.annualProbability.p90 === null ? null : (rainfall?.annualProbability.p90 ?? 0) * 100, 2, '%'), value(compound?.annualProbability.p90 === null ? null : (compound?.annualProbability.p90 ?? 0) * 100, 2, '%')],
    ['Mean annualized excess', value(rainfall?.annualizedExcessDepth.mean, 4, ' m/yr'), value(compound?.annualizedExcessDepth.mean, 4, ' m/yr')],
  ];
  const labelWidth = 72;
  const valueWidth = (CONTENT_WIDTH - labelWidth) / 2;
  pdf.setFillColor(...LIGHT_SLATE);
  pdf.rect(MARGIN, y, labelWidth, 9, 'F');
  pdf.setFillColor(...BLUE);
  pdf.rect(MARGIN + labelWidth, y, valueWidth, 9, 'F');
  pdf.setFillColor(...VIOLET);
  pdf.rect(MARGIN + labelWidth + valueWidth, y, valueWidth, 9, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...SLATE);
  pdf.text('Area hazard metric', MARGIN + 3, y + 5.8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Non-typhoon rainfall', MARGIN + labelWidth + valueWidth / 2, y + 5.8, { align: 'center' });
  pdf.text('Typhoon compound', MARGIN + labelWidth + valueWidth * 1.5, y + 5.8, { align: 'center' });
  rows.forEach((row, index) => {
    const rowY = y + 9 + index * 8;
    if (index % 2) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN, rowY, CONTENT_WIDTH, 8, 'F');
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(MARGIN, rowY, CONTENT_WIDTH, 8, 'S');
    pdf.line(MARGIN + labelWidth, rowY, MARGIN + labelWidth, rowY + 8);
    pdf.line(MARGIN + labelWidth + valueWidth, rowY, MARGIN + labelWidth + valueWidth, rowY + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...SLATE);
    pdf.text(row[0], MARGIN + 3, rowY + 5.2);
    pdf.setFont('helvetica', 'bold');
    pdf.text(row[1], MARGIN + labelWidth + valueWidth / 2, rowY + 5.2, { align: 'center' });
    pdf.text(row[2], MARGIN + labelWidth + valueWidth * 1.5, rowY + 5.2, { align: 'center' });
  });
  return y + 45;
}

function addAreaChart(
  pdf: jsPDF,
  family: AreaFloodFamilyStatistics,
  y: number,
  color: [number, number, number],
): number {
  const title = family.family === 'non-typhoon-rainfall'
    ? 'Non-typhoon rainfall - flooded area and wet mean depth'
    : 'Typhoon compound - flooded area and wet mean depth';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...SLATE);
  pdf.text(title, MARGIN, y);
  const chartX = MARGIN + 12;
  const chartY = y + 6;
  const chartWidth = CONTENT_WIDTH - 24;
  const chartHeight = 48;
  const depthMaxRaw = Math.max(...family.scenarios.map(scenario => scenario.meanWetDepth ?? 0), 0.1);
  const depthMax = Math.ceil(depthMaxRaw * 10) / 10;
  for (let tick = 0; tick <= 4; tick += 1) {
    const lineY = chartY + chartHeight - tick / 4 * chartHeight;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(chartX, lineY, chartX + chartWidth, lineY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${tick * 25}%`, chartX - 2, lineY + 1.5, { align: 'right' });
    pdf.text(`${(depthMax * tick / 4).toFixed(1)}m`, chartX + chartWidth + 2, lineY + 1.5);
  }
  const slot = chartWidth / family.scenarios.length;
  const points: Array<[number, number]> = [];
  family.scenarios.forEach((scenario, index) => {
    const barHeight = scenario.floodedAreaFraction * chartHeight;
    const barWidth = Math.min(8, slot * 0.55);
    const x = chartX + index * slot + (slot - barWidth) / 2;
    pdf.setFillColor(...color);
    pdf.rect(x, chartY + chartHeight - barHeight, barWidth, barHeight, 'F');
    const pointX = chartX + index * slot + slot / 2;
    const pointY = chartY + chartHeight - ((scenario.meanWetDepth ?? 0) / depthMax) * chartHeight;
    points.push([pointX, pointY]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.4);
    pdf.setTextColor(...SLATE);
    pdf.text(`R${scenario.returnPeriod}`, pointX, chartY + chartHeight + 4.5, { align: 'center' });
  });
  pdf.setDrawColor(...TEAL);
  pdf.setLineWidth(0.7);
  points.forEach((point, index) => {
    if (index > 0) pdf.line(points[index - 1][0], points[index - 1][1], point[0], point[1]);
    pdf.setFillColor(...TEAL);
    pdf.circle(point[0], point[1], 1.2, 'F');
  });
  pdf.setFontSize(6);
  pdf.setTextColor(...SLATE);
  pdf.text('Bars: flooded area (left axis)', chartX, chartY + chartHeight + 10);
  pdf.setTextColor(...TEAL);
  pdf.text('Line: wet mean depth (right axis)', chartX + chartWidth, chartY + chartHeight + 10, { align: 'right' });
  return chartY + chartHeight + 15;
}

export async function generateAreaFloodRiskPdf({ result }: AreaFloodPdfInput): Promise<void> {
  const centerLatitude = (result.bounds.north + result.bounds.south) / 2;
  const centerLongitude = (result.bounds.east + result.bounds.west) / 2;
  const zoom = chooseZoom(result.bounds);
  const rainfall = result.families.find(family => family.family === 'non-typhoon-rainfall');
  const compound = result.families.find(family => family.family === 'typhoon-compound');
  const rainfallOnset = rainfall?.onePercentAreaOnsetReturnPeriod ?? null;
  const compoundOnset = compound?.onePercentAreaOnsetReturnPeriod ?? null;

  const [satellite, roadmap, grayBase, rainfallOnsetOverlay, compoundOnsetOverlay, ...fixedOverlays] = await Promise.all([
    fetchMapSnapshot(centerLatitude, centerLongitude, 'satellite', zoom),
    fetchMapSnapshot(centerLatitude, centerLongitude, 'roadmap', zoom, 'amap'),
    fetchEsriGraySnapshot(centerLatitude, centerLongitude, zoom),
    rainfallOnset === null ? Promise.resolve(null) : fetchFloodSnapshot(centerLatitude, centerLongitude, 'non-typhoon', rainfallOnset, zoom),
    compoundOnset === null ? Promise.resolve(null) : fetchFloodSnapshot(centerLatitude, centerLongitude, 'compound', compoundOnset, zoom),
    fetchFloodSnapshot(centerLatitude, centerLongitude, 'non-typhoon', 200, zoom),
    fetchFloodSnapshot(centerLatitude, centerLongitude, 'compound', 200, zoom),
    fetchFloodSnapshot(centerLatitude, centerLongitude, 'non-typhoon', 1000, zoom),
    fetchFloodSnapshot(centerLatitude, centerLongitude, 'compound', 1000, zoom),
  ]);
  if (!satellite || !roadmap) {
    throw new Error('Required satellite or road snapshot is unavailable');
  }
  // `grayBase` 是洪水叠加层的底图(浅灰风格突出 flood overlay)。
  // 若 Esri 浅灰 tile 失败则降级到卫星图,flood overlay 仍可见。
  const floodBase = grayBase ?? satellite;
  const overlays: Array<MapSnapshot | null> = [rainfallOnsetOverlay, compoundOnsetOverlay, ...fixedOverlays];
  if (fixedOverlays.some((overlay: MapSnapshot | null) => !overlay)
    || (rainfallOnset !== null && !rainfallOnsetOverlay)
    || (compoundOnset !== null && !compoundOnsetOverlay)) {
    throw new Error('One or more requested flood scenario snapshots are unavailable');
  }
  const composed = await Promise.all([
    addGeometryBoundary(satellite, result.geometry, centerLatitude, centerLongitude, zoom),
    addGeometryBoundary(roadmap, result.geometry, centerLatitude, centerLongitude, zoom),
    ...overlays.map(async overlay =>
      addGeometryBoundary(
        await composeMapSnapshots(floodBase, overlay),
        result.geometry,
        centerLatitude,
        centerLongitude,
        zoom,
      )
    ),
  ]);
  const [satelliteMap, roadmapMap, rainfallOnsetMap, compoundOnsetMap, rainfallR200, compoundR200, rainfallR1000, compoundR1000] = composed;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: 'Area Flood Hazard Assessment',
    subject: 'Polygon zonal statistics from stochastic-catalog flood hazard products',
    author: 'NatCat Platform',
    creator: 'NatCat Platform',
  });

  let y = addHeader(pdf, 'Area Flood Hazard Assessment', `Polygon-masked WCS analysis | ${result.queriedAt}`);
  y = addSummaryGrid(pdf, result, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Map zoom ${zoom} | Center ${centerLatitude.toFixed(6)}, ${centerLongitude.toFixed(6)} | Teal outline = analyzed area`, MARGIN, y);
  const mapGap = 5;
  const mapWidth = (CONTENT_WIDTH - mapGap) / 2;
  const mapHeight = mapWidth / 1.6;
  addMapPanel(pdf, satelliteMap, 'Satellite imagery', MARGIN, y + 8, mapWidth, mapHeight);
  addMapPanel(pdf, roadmapMap, 'Road and place map', MARGIN + mapWidth + mapGap, y + 8, mapWidth, mapHeight);
  pdf.setFontSize(7.2);
  pdf.setTextColor(...SLATE);
  pdf.text(pdf.splitTextToSize(
    'Scope: external flood hazard within the drawn geometry. Results do not include building vulnerability, insurance terms, or loss calculations.',
    CONTENT_WIDTH,
  ), MARGIN, y + mapHeight + 24);

  pdf.addPage();
  y = addHeader(pdf, 'Flood extent scenarios', '1% area onset, R200 and R1000 | Identical center, zoom and bounds');
  const rowStep = mapHeight + 18;
  const rightX = MARGIN + mapWidth + mapGap;
  const noAreaOnsetMessage = {
    title: 'No tested scenario reached the 1% area threshold.',
    detail: 'No onset map applies; R200 and R1000 maps remain shown below.',
  };
  addMapPanel(pdf, rainfallOnsetMap, rainfallOnset === null ? 'Non-typhoon | 1% area onset: not reached' : `Non-typhoon | 1% area onset R${rainfallOnset}`, MARGIN, y, mapWidth, mapHeight, true, rainfallOnset === null ? noAreaOnsetMessage : undefined);
  addMapPanel(pdf, compoundOnsetMap, compoundOnset === null ? 'Typhoon compound | 1% area onset: not reached' : `Typhoon compound | 1% area onset R${compoundOnset}`, rightX, y, mapWidth, mapHeight, true, compoundOnset === null ? noAreaOnsetMessage : undefined);
  addMapPanel(pdf, rainfallR200, 'Non-typhoon rainfall | R200', MARGIN, y + rowStep, mapWidth, mapHeight, true);
  addMapPanel(pdf, compoundR200, 'Typhoon compound | R200', rightX, y + rowStep, mapWidth, mapHeight, true);
  addMapPanel(pdf, rainfallR1000, 'Non-typhoon rainfall | R1000', MARGIN, y + rowStep * 2, mapWidth, mapHeight, true);
  addMapPanel(pdf, compoundR1000, 'Typhoon compound | R1000', rightX, y + rowStep * 2, mapWidth, mapHeight, true);

  pdf.addPage();
  y = addHeader(pdf, 'Area hazard metrics and return-period profiles', 'Bars show flooded area; lines show mean depth among flooded pixels');
  y = addAnnualComparison(pdf, result.families, y);
  if (rainfall) y = addAreaChart(pdf, rainfall, y + 2, BLUE);
  if (compound) y = addAreaChart(pdf, compound, y + 3, VIOLET);
  pdf.setFillColor(...LIGHT_SLATE);
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(MARGIN, y + 2, CONTENT_WIDTH, 28, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEAL);
  pdf.text('Interpretation', MARGIN + 3, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...SLATE);
  const interpretation = 'The 1% area onset is the first tested return period where at least 1% of valid pixels exceed 0.15 m. Flooded-area percentages and wet mean depths describe different dimensions of hazard. Event families remain separate; they must not be added, averaged, or maximized into a combined flood score.';
  pdf.text(pdf.splitTextToSize(interpretation, CONTENT_WIDTH - 6), MARGIN + 3, y + 14);

  if (result.historicalFlood?.available && result.historicalFlood.events.length > 0) {
    const rowsPerPage = 30;
    for (let offset = 0; offset < result.historicalFlood.events.length; offset += rowsPerPage) {
      pdf.addPage();
      let tableY = addHeader(
        pdf,
        'Historical simulated inundation events',
        `Events ${offset + 1}-${Math.min(offset + rowsPerPage, result.historicalFlood.events.length)} of ${result.historicalFlood.events.length} | Data Hub flood-depth rasters`,
      );
      pdf.setFillColor(...LIGHT_SLATE);
      pdf.rect(MARGIN, tableY, CONTENT_WIDTH, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...SLATE);
      pdf.text('Event', MARGIN + 2, tableY + 5.2);
      pdf.text('Year', MARGIN + 105, tableY + 5.2);
      pdf.text('Family', MARGIN + 125, tableY + 5.2);
      pdf.text('Area max depth', PAGE_WIDTH - MARGIN - 2, tableY + 5.2, { align: 'right' });
      tableY += 8;
      result.historicalFlood.events.slice(offset, offset + rowsPerPage).forEach((event, index) => {
        if (index % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(MARGIN, tableY, CONTENT_WIDTH, 7, 'F');
        }
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...SLATE);
        pdf.text(pdf.splitTextToSize(event.display, 98)[0], MARGIN + 2, tableY + 4.7);
        pdf.text(event.year === null ? '-' : String(event.year), MARGIN + 105, tableY + 4.7);
        pdf.text(event.family === 'rainfall' ? 'Rain' : 'TC compound', MARGIN + 125, tableY + 4.7);
        pdf.text(value(event.depth, 2, ' m'), PAGE_WIDTH - MARGIN - 2, tableY + 4.7, { align: 'right' });
        tableY += 7;
      });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Count criterion: any polygon-masked pixel > ${result.historicalFlood.thresholdMeters.toFixed(2)} m. Simulation rasters are not independently verified observed loss records.`,
        MARGIN,
        tableY + 7,
      );
    }
  }

  addFooter(pdf);
  const locationName = `${centerLatitude.toFixed(5)}-${centerLongitude.toFixed(5)}`.replace(/[^a-zA-Z0-9.-]/g, '-');
  pdf.save(`area-flood-hazard-${locationName}.pdf`);
}
