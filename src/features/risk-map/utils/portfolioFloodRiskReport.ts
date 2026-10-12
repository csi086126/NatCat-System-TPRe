import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { AssetInfo } from '../types';
import { appendFloodRiskPdfPages } from './floodRiskPdf';

export interface PortfolioFloodReportLocation {
  id?: string;
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  totalTIV?: number | null;
  buildingTIV?: number | null;
  contentTIV?: number | null;
  biTIV?: number | null;
  currency?: string;
  occupancy?: string;
  yearBuilt?: string | number;
  structure?: string;
  stories?: string | number;
  basement?: string;
  status?: string;
  error?: string;
  assetInfo?: AssetInfo;
  riskScores?: any;
}

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const MARGIN = 10;
const TEAL: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [51, 65, 85];
const LIGHT_SLATE: [number, number, number] = [241, 245, 249];

function printable(value: unknown): string {
  const text = String(value ?? '');
  return /^[\x20-\x7E]*$/.test(text) ? text : '[Non-Latin text]';
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayNumber(value: unknown, digits = 2): string {
  const parsed = number(value);
  return parsed === null ? 'No data' : parsed.toFixed(digits);
}

function displayReturnPeriod(value: unknown): string {
  const parsed = number(value);
  return parsed === null ? 'Not reached' : `R${parsed}`;
}

function compactAmount(value: unknown): string {
  const parsed = number(value);
  if (parsed === null) return '-';
  if (Math.abs(parsed) >= 1e9) return `${(parsed / 1e9).toFixed(2)}B`;
  if (Math.abs(parsed) >= 1e6) return `${(parsed / 1e6).toFixed(2)}M`;
  if (Math.abs(parsed) >= 1e3) return `${(parsed / 1e3).toFixed(2)}K`;
  return parsed.toFixed(0);
}

function assessment(location: PortfolioFloodReportLocation, family: string): any | null {
  return location.riskScores?.flood?.driverAssessments?.find((item: any) =>
    item.results?.some((result: any) => result.scenarioFamily === family)
  ) || null;
}

function scenarioDepth(location: PortfolioFloodReportLocation, family: string, returnPeriod: number): number | null {
  const result = assessment(location, family)?.results?.find((item: any) => item.returnPeriod === returnPeriod);
  return number(result?.depth);
}

function addHeader(pdf: jsPDF, title: string, subtitle: string): void {
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, PAGE_WIDTH, 22, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(title, MARGIN, 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(subtitle, MARGIN, 17);
  pdf.setTextColor(...SLATE);
}

function addFooters(pdf: jsPDF): void {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(226, 232, 240);
    pdf.line(MARGIN, pageHeight - 10, pageWidth - MARGIN, pageHeight - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('NatCat Platform | Portfolio flood screening | 0.15 m inundation threshold', MARGIN, pageHeight - 5);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 5, { align: 'right' });
  }
}

export async function generatePortfolioFloodRiskPdf(
  locations: PortfolioFloodReportLocation[],
  onProgress?: (current: number, total: number, location: PortfolioFloodReportLocation) => void,
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const successful = locations.filter(location => location.status === 'success' && location.riskScores);
  const failed = locations.filter(location => location.status === 'error');
  const levels = ['Extreme', 'High', 'Medium', 'Low'];
  const levelCounts = Object.fromEntries(levels.map(level => [
    level,
    successful.filter(location => location.riskScores?.overall?.level === level).length,
  ]));
  const tivByCurrency = new Map<string, number>();
  successful.forEach(location => {
    const currency = location.currency || 'Unspecified';
    tivByCurrency.set(currency, (tivByCurrency.get(currency) || 0) + (number(location.totalTIV) || 0));
  });

  addHeader(pdf, 'Portfolio Flood Risk Assessment', `Generated ${new Date().toLocaleString()} | ${locations.length} uploaded locations`);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Portfolio summary', MARGIN, 34);

  const cards: Array<[string, string]> = [
    ['Uploaded locations', String(locations.length)],
    ['Successful assessments', String(successful.length)],
    ['Failed assessments', String(failed.length)],
    ['Extreme / High', `${levelCounts.Extreme} / ${levelCounts.High}`],
    ['Medium / Low', `${levelCounts.Medium} / ${levelCounts.Low}`],
  ];
  cards.forEach(([label, value], index) => {
    const x = MARGIN + index * 54;
    pdf.setFillColor(...LIGHT_SLATE);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x, 40, 49, 22, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, x + 3, 47);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...SLATE);
    pdf.text(value, x + 3, 57);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TIV by currency', MARGIN, 76);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const tivLines = Array.from(tivByCurrency.entries()).map(([currency, total]) => `${currency}: ${compactAmount(total)}`);
  pdf.text(tivLines.length ? tivLines : ['No TIV supplied'], MARGIN, 83);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Report structure', 110, 76);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text([
    'The following appendix lists every uploaded location, including failed records.',
    'The companion Excel workbook contains all 22 return-period scenario values per successful location.',
    'Scores are screening indicators based on inundation frequency, not insured loss estimates.',
  ], 110, 83);

  const columns = [
    { label: 'ID', width: 24 },
    { label: 'Name', width: 40 },
    { label: 'Latitude', width: 22 },
    { label: 'Longitude', width: 22 },
    { label: 'TIV', width: 25 },
    { label: 'Rain onset', width: 23 },
    { label: 'Compound onset', width: 27 },
    { label: 'Rain R1000', width: 24 },
    { label: 'Comp. R1000', width: 24 },
    { label: 'Hist. floods', width: 20 },
    { label: 'Level / status', width: 26 },
  ];
  const firstPageRows = 11;
  const continuationPageRows = 22;
  let offset = 0;
  let isFirstTablePage = true;
  while (offset < locations.length) {
    const rowsOnPage = isFirstTablePage ? firstPageRows : continuationPageRows;
    const pageLocations = locations.slice(offset, offset + rowsOnPage);
    let y: number;
    if (isFirstTablePage) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...SLATE);
      pdf.text('All Location Results', MARGIN, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Locations 1-${pageLocations.length} of ${locations.length}`, MARGIN + 39, 105);
      y = 115;
    } else {
      pdf.addPage('a4', 'landscape');
      addHeader(pdf, 'All Location Results', `Locations ${offset + 1}-${offset + pageLocations.length} of ${locations.length}`);
      y = 31;
    }
    let x = MARGIN;
    pdf.setFillColor(226, 232, 240);
    pdf.rect(MARGIN, y - 5, PAGE_WIDTH - MARGIN * 2, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    columns.forEach(column => {
      pdf.text(column.label, x + 1, y);
      x += column.width;
    });
    y += 7;

    pageLocations.forEach((location, rowIndex) => {
      const isSuccess = location.status === 'success' && location.riskScores;
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(MARGIN, y - 4, PAGE_WIDTH - MARGIN * 2, 7, 'F');
      }
      const values = [
        printable(location.id || '-'),
        printable(location.name || '-'),
        displayNumber(location.latitude, 5),
        displayNumber(location.longitude, 5),
        `${compactAmount(location.totalTIV)} ${printable(location.currency || '')}`.trim(),
        isSuccess ? displayReturnPeriod(location.riskScores.flood.rainfallOnsetReturnPeriod) : '-',
        isSuccess ? displayReturnPeriod(location.riskScores.flood.compoundProxyOnsetReturnPeriod) : '-',
        isSuccess ? `${displayNumber(scenarioDepth(location, 'non-typhoon-rainfall', 1000), 2)} m` : '-',
        isSuccess ? `${displayNumber(scenarioDepth(location, 'typhoon-compound', 1000), 2)} m` : '-',
        isSuccess && location.riskScores.flood.historicalFlood?.available
          ? String(location.riskScores.flood.historicalFlood.inundationCount)
          : '-',
        isSuccess ? location.riskScores.overall.level : `Failed: ${printable(location.error || 'Unknown')}`,
      ];
      x = MARGIN;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.2);
      values.forEach((value, index) => {
        const width = columns[index].width;
        const clipped = pdf.splitTextToSize(value, width - 2)[0] || '';
        pdf.text(clipped, x + 1, y);
        x += width;
      });
      y += 7;
    });
    offset += pageLocations.length;
    isFirstTablePage = false;
  }

  for (let index = 0; index < successful.length; index += 1) {
    const location = successful[index];
    const latitude = number(location.latitude);
    const longitude = number(location.longitude);
    if (latitude === null || longitude === null) continue;
    const asset: AssetInfo = location.assetInfo || {
      latitude,
      longitude,
      elevation: null,
      populationDensity: null,
      buildingDensity: 'Not queried',
      distanceToCoast: null,
      landUse: location.occupancy || 'Not queried',
      worldcover: 'Not queried',
      address: location.address || location.name || location.id || `${latitude}, ${longitude}`,
      geocodingSource: 'Portfolio coordinates',
    };
    asset.address = location.address || location.name || location.id || asset.address;
    await appendFloodRiskPdfPages(pdf, {
      asset,
      flood: location.riskScores.flood,
    });
    onProgress?.(index + 1, successful.length, location);
  }

  addFooters(pdf);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `portfolio-flood-risk-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function createPortfolioFloodRiskWorkbook(locations: PortfolioFloodReportLocation[]): XLSX.WorkBook {
  const locationRows = locations.map(location => {
    const rain = assessment(location, 'non-typhoon-rainfall');
    const compound = assessment(location, 'typhoon-compound');
    return {
      ID: location.id || '',
      Name: location.name || '',
      Address: location.address || '',
      Latitude: location.latitude ?? '',
      Longitude: location.longitude ?? '',
      Status: location.status || '',
      Error: location.error || '',
      Currency: location.currency || '',
      TotalTIV: location.totalTIV ?? '',
      BuildingTIV: location.buildingTIV ?? '',
      ContentTIV: location.contentTIV ?? '',
      BITIV: location.biTIV ?? '',
      Occupancy: location.occupancy || '',
      YearBuilt: location.yearBuilt ?? '',
      Structure: location.structure || '',
      Stories: location.stories ?? '',
      Basement: location.basement || '',
      RiskLevel: location.riskScores?.overall?.level || '',
      ScreeningScore: location.riskScores?.overall?.score ?? '',
      RainfallOnsetRP: rain?.minimumInundationReturnPeriod ?? '',
      CompoundOnsetRP: compound?.minimumInundationReturnPeriod ?? '',
      RainfallAnnualProbabilityPercent: rain?.annualMetrics?.annualFloodProbability === null
        || rain?.annualMetrics?.annualFloodProbability === undefined
        ? ''
        : rain.annualMetrics.annualFloodProbability * 100,
      CompoundAnnualProbabilityPercent: compound?.annualMetrics?.annualFloodProbability === null
        || compound?.annualMetrics?.annualFloodProbability === undefined
        ? ''
        : compound.annualMetrics.annualFloodProbability * 100,
      RainfallAnnualizedExcessDepth: rain?.annualMetrics?.annualizedExcessDepth ?? '',
      CompoundAnnualizedExcessDepth: compound?.annualMetrics?.annualizedExcessDepth ?? '',
      HistoricalInundationCount: location.riskScores?.flood?.historicalFlood?.available
        ? location.riskScores.flood.historicalFlood.inundationCount
        : '',
      HistoricalTyphoonCount: location.riskScores?.flood?.historicalFlood?.available
        ? location.riskScores.flood.historicalFlood.typhoonCount
        : '',
      HistoricalRainfallCount: location.riskScores?.flood?.historicalFlood?.available
        ? location.riskScores.flood.historicalFlood.rainfallCount
        : '',
      MaximumHistoricalDepth: location.riskScores?.flood?.historicalFlood?.maximumHistoricalDepth ?? '',
    };
  });

  const scenarioRows: Record<string, unknown>[] = [];
  const historicalEventRows: Record<string, unknown>[] = [];
  locations.forEach(location => {
    location.riskScores?.flood?.driverAssessments?.forEach((driver: any) => {
      driver.results?.forEach((result: any) => {
        scenarioRows.push({
          ID: location.id || '',
          Name: location.name || '',
          Latitude: location.latitude ?? '',
          Longitude: location.longitude ?? '',
          Family: result.scenarioFamily || '',
          ReturnPeriod: result.returnPeriod ?? '',
          DepthMeters: result.depth ?? '',
          Inundated: result.inundated ?? '',
          Status: result.status || '',
          Layer: result.layer || '',
          ValidPixelCount: result.validPixelCount ?? '',
          SampledPixelCount: result.sampledPixelCount ?? '',
        });
      });
    });
    location.riskScores?.flood?.historicalFlood?.events?.forEach((event: any) => {
      historicalEventRows.push({
        ID: location.id || '',
        Name: location.name || '',
        Latitude: location.latitude ?? '',
        Longitude: location.longitude ?? '',
        Event: event.display || '',
        Year: event.year ?? '',
        Family: event.family || '',
        DepthMeters: event.depth ?? '',
        Layer: event.layer || '',
      });
    });
  });

  const workbook = XLSX.utils.book_new();
  const locationsSheet = XLSX.utils.json_to_sheet(locationRows);
  const scenariosSheet = XLSX.utils.json_to_sheet(scenarioRows);
  const historicalEventHeaders = [
    'ID', 'Name', 'Latitude', 'Longitude', 'Event', 'Year', 'Family', 'DepthMeters', 'Layer',
  ];
  const historicalEventsSheet = historicalEventRows.length > 0
    ? XLSX.utils.json_to_sheet(historicalEventRows, { header: historicalEventHeaders })
    : XLSX.utils.aoa_to_sheet([historicalEventHeaders]);
  (locationsSheet as any)['!cols'] = Object.keys(locationRows[0] || { ID: '' }).map(key => ({ wch: Math.min(34, Math.max(12, key.length + 2)) }));
  (scenariosSheet as any)['!cols'] = Object.keys(scenarioRows[0] || { ID: '' }).map(key => ({ wch: Math.min(40, Math.max(12, key.length + 2)) }));
  (historicalEventsSheet as any)['!cols'] = historicalEventHeaders.map(key => ({ wch: Math.min(40, Math.max(12, key.length + 2)) }));
  XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Locations');
  XLSX.utils.book_append_sheet(workbook, scenariosSheet, 'Flood Scenarios');
  XLSX.utils.book_append_sheet(workbook, historicalEventsSheet, 'Historical Flood Events');
  return workbook;
}

export function generatePortfolioFloodRiskWorkbook(locations: PortfolioFloodReportLocation[]): void {
  const workbook = createPortfolioFloodRiskWorkbook(locations);
  XLSX.writeFile(workbook, `portfolio-flood-detail-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
