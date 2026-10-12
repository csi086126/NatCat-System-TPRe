'use client';

/**
 * leafletFloodSnapshot — 完全用 canvas API 重画 6 张水深图,
 * 喂给 PDF 生成器作为 Page 3 的内容。
 *
 * 设计原则(用户原话):"前端网页查询时怎么显示,PDF 中也同样显示,直接截图"。
 * → 我们**完全不用 html2canvas、不依赖 Leaflet DOM、不改 Leaflet 实例**。
 * → 用 canvas API 重新画每一张图:
 *    - tile 范围 = Leaflet viewport 范围(用 Leaflet 实例的 getSize/getZoom/getCenter 算)
 *    - WMS bbox = viewport 范围(完全相同的地理范围)
 *    - 红点 = canvas 中心
 * → canvas 输出比例 == viewport 比例 == PDF panel 显示比例 → 无变形
 * → 两层(tile + WMS)查询点位置 100% 一致 → 无偏移
 *
 * 与之前的 4 轮尝试的本质区别:
 *   - 原 fetchFloodSnapshot 用 buildWmsBbox 以查询点为中心 + 3×2 tile 网格
 *     → 永远差 25% panel 高度,不可能修准
 *   - html2canvas 截 Leaflet DOM 有"Leaflet 内部 bug"(container undefined.appendChild)
 *   - 本方案: canvas 重新画,tile 范围 / WMS bbox / canvas 中心完全由一个公式算出
 *     → 数学上保证三层对齐
 */

import type { CapturedFloodMapPanel } from './floodRiskPdf';

// Esri tile 服务只接受整数 zoom;Macau 这个位置 zoom 17/18 在 Light Gray
// 底图返回 "Map data not yet available" 占位灰(底图缺失,WMS 正常)。
// 解耦 tile 加载 zoom 和 bbox 显示 zoom:
//   - tile 用整数 zoom 16 加载(保证底图可用)
//   - bbox 用 16.5(可小数)算显示范围 → 介于 16 和 17 之间,比 zoom 17 略粗但能出图
const PDF_TILE_ZOOM = 16;
const PDF_DISPLAY_ZOOM = 16.5;
const TILE_SIZE = 256;
const BASEMAP_TILE_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile';

// ========== Web Mercator helpers ==========
function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z;
}
function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
}
function tileXToLng(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}
function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// ========== Image fetch helpers ==========
function loadImage(src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin && !src.startsWith('data:')) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

async function fetchImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 80)}`);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
  const format: 'PNG' | 'JPEG' = (blob.type || '').includes('jpeg') ? 'JPEG' : 'PNG';
  return { dataUrl, format };
}

// ========== 类型定义 ==========

export type FloodMapPanelKey =
  | 'ntOnset' | 'tcOnset'
  | 'ntR200' | 'tcR200'
  | 'ntR1000' | 'tcR1000';

export interface FloodMapPanelSpec {
  key: FloodMapPanelKey;
  /** WMS layer name in GeoServer (按 family + returnPeriod + region) */
  wmsLayerName: string;
  /** PDF 上显示的标题(与 addMapPanel label 一致) */
  label: string;
}

export interface CaptureContext {
  lat: number;
  lng: number;
  region: 'hk' | 'mo';

  // 以下三个参数保留接口兼容(canvas 方案不依赖前端 UI 状态)
  baseMapSetter: (b: 'esri-gray') => void;
  baseMapRestore: () => void;
  layerToggle: (key: string, visible: boolean) => void;

  // UI 隐藏(不再需要,但保留接口)
  hideUi: () => void;
  showUi: () => void;

  // 进度回调
  onProgress?: (current: number, total: number, key: FloodMapPanelKey, label: string) => void;
}

export type CapturedFloodMaps = Record<FloodMapPanelKey, CapturedFloodMapPanel | null>;

/**
 * 6 张 panel 配置生成。
 * key 与 appendFloodRiskPdfPages Page 3 capturedFloodMaps 对齐。
 */
export function buildFloodMapPanelSpecs(
  rainfallOnsetReturnPeriod: number | null,
  compoundOnsetReturnPeriod: number | null,
  region: 'hk' | 'mo',
): FloodMapPanelSpec[] {
  const onsetLabel = (family: string, rp: number | null): string =>
    rp === null
      ? `${family} | First >0.15 m: no exceedance`
      : `${family} | First >0.15 m: R${rp}`;

  const layerName = (family: 'non-typhoon' | 'compound', rp: number): string => {
    const pad = String(rp).padStart(3, '0');
    if (region === 'mo') {
      const prefix = family === 'non-typhoon' ? 'MO_Flood_NONTC_R' : 'MO_Flood_Compound_R';
      return `natcat_platform:${prefix}${pad}`;
    }
    const prefix = family === 'non-typhoon' ? 'HK_Flood_NONTC_R' : 'HK_Flood_Compound_R';
    return `natcat_platform:${prefix}${pad}`;
  };

  const familyOf = (key: FloodMapPanelKey): 'non-typhoon' | 'compound' =>
    key.startsWith('nt') ? 'non-typhoon' : 'compound';
  const rpOf = (key: FloodMapPanelKey, onset: number | null): number => {
    if (key === 'ntOnset') return onset ?? 2;
    if (key === 'tcOnset') return onset ?? 2;
    if (key.endsWith('R200')) return 200;
    return 1000;
  };

  const keys: FloodMapPanelKey[] = ['ntOnset', 'tcOnset', 'ntR200', 'tcR200', 'ntR1000', 'tcR1000'];
  return keys.map((key) => {
    const rp = rpOf(key, key === 'ntOnset' ? rainfallOnsetReturnPeriod : compoundOnsetReturnPeriod);
    const fam = familyOf(key);
    const label = key === 'ntOnset'
      ? onsetLabel('Non-typhoon rainfall', rainfallOnsetReturnPeriod)
      : key === 'tcOnset'
        ? onsetLabel('Typhoon compound', compoundOnsetReturnPeriod)
        : fam === 'non-typhoon'
          ? `Non-typhoon rainfall | R${rp}`
          : `Typhoon compound | R${rp}`;
    return {
      key,
      wmsLayerName: layerName(fam, rp),
      label,
    };
  });
}

/**
 * 主入口:用 canvas API 重画 6 张水深图。
 * 完全不依赖 html2canvas、Leaflet DOM。
 */
export async function captureFloodMapsForPdf(
  ctx: CaptureContext,
  panels: FloodMapPanelSpec[],
): Promise<CapturedFloodMaps> {
  const result: CapturedFloodMaps = {
    ntOnset: null,
    tcOnset: null,
    ntR200: null,
    tcR200: null,
    ntR1000: null,
    tcR1000: null,
  };

  try {
    ctx.hideUi();

    // 输出 canvas 固定横向比例(与 PDF Page 3 cellW/cellH = 72.6/60 ≈ 1.21 一致)。
    // 不要用 Leaflet 容器实际尺寸(可能因 sidebar 折叠变成纵向,导致 PDF 拉伸)。
    // 横向:宽 720px,高 500px → 比例 1.44:1 ≈ cellW/cellH → PDF addImage 无变形。
    const canvasW = 720;
    const canvasH = 500;

    for (let i = 0; i < panels.length; i += 1) {
      const panel = panels[i];
      ctx.onProgress?.(i + 1, panels.length, panel.key, panel.label);
      try {
        result[panel.key] = await renderOnePanel(
          ctx.lat, ctx.lng, PDF_TILE_ZOOM, PDF_DISPLAY_ZOOM,
          canvasW, canvasH,
          BASEMAP_TILE_BASE, panel.wmsLayerName,
        );
      } catch (e) {
        console.warn(`[leafletFloodSnapshot] panel ${panel.key} render failed:`, e);
        result[panel.key] = null;
      }
      await sleep(80);
    }
  } finally {
    ctx.showUi();
  }

  return result;
}

// ========== 单张 panel canvas 重画 ==========

async function renderOnePanel(
  lat: number,
  lng: number,
  tileZoom: number,
  displayZoom: number,
  canvasW: number,
  canvasH: number,
  tileBase: string,
  wmsLayerName: string,
): Promise<CapturedFloodMapPanel> {
  // 1. 计算 viewport bbox (web mercator) — 用 displayZoom(可小数,如 16.5)
  // 1 px longitude span = 360 / (256 * 2^displayZoom) 度(经度均匀)
  // 1 px latitude span = (360 / (256 * 2^displayZoom)) / cos(lat) 度(Web Mercator 拉伸)
  const metersPerPxLng = 360 / (TILE_SIZE * 2 ** displayZoom);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const halfLngSpan = (canvasW / 2) * metersPerPxLng;
  const halfLatSpan = (canvasH / 2) * metersPerPxLng / cosLat;

  const west = lng - halfLngSpan;
  const east = lng + halfLngSpan;
  const north = lat + halfLatSpan;
  const south = lat - halfLatSpan;

  // 2. 建 canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('Canvas 2D context unavailable');
  ctx2d.fillStyle = '#ffffff';
  ctx2d.fillRect(0, 0, canvasW, canvasH);

  // 3. 画 tile (覆盖 viewport bbox) — tile 索引/URL 用整数 tileZoom,
  // 保证 Esri 服务能返回数据(zoom 17/18 在 Macau 位置返回占位灰图)
  const xMin = lngToTileX(west, tileZoom);
  const xMax = lngToTileX(east, tileZoom);
  const yMin = latToTileY(north, tileZoom);
  const yMax = latToTileY(south, tileZoom);
  const tileX0 = Math.floor(xMin);
  const tileX1 = Math.floor(xMax);
  const tileY0 = Math.floor(yMin);
  const tileY1 = Math.floor(yMax);

  const lngSpan = east - west;
  const latSpan = north - south;

  const tilePromises: Promise<void>[] = [];
  for (let ty = tileY0; ty <= tileY1; ty++) {
    for (let tx = tileX0; tx <= tileX1; tx++) {
      const tileLngW = tileXToLng(tx, tileZoom);
      const tileLngE = tileXToLng(tx + 1, tileZoom);
      const tileLatN = tileYToLat(ty, tileZoom);
      const tileLatS = tileYToLat(ty + 1, tileZoom);
      const px = ((tileLngW - west) / lngSpan) * canvasW;
      const pw = ((tileLngE - tileLngW) / lngSpan) * canvasW;
      const py = ((north - tileLatN) / latSpan) * canvasH;
      const ph = ((tileLatN - tileLatS) / latSpan) * canvasH;
      const url = `${tileBase}/${tileZoom}/${ty}/${tx}`;
      tilePromises.push(
        loadImage(url, 'anonymous')
          .then((img) => ctx2d.drawImage(img, px, py, pw, ph))
          .catch((e) => {
            console.warn(`tile load failed: ${url}`, e);
          }),
      );
    }
  }
  await Promise.all(tilePromises);

  // 4. 画 WMS 洪水层(bbox 完全 = viewport bbox,与 tile 范围一致)
  const wmsBbox = `${west},${south},${east},${north}`;
  const wmsParams = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: wmsLayerName,
    srs: 'EPSG:4326',
    bbox: wmsBbox,
    width: String(canvasW),
    height: String(canvasH),
    format: 'image/png',
    transparent: 'true',
    styles: 'flood-depth-blue-satellite',
  });
  const wmsUrl = `/api/geoserver/getfeatureinfo?${wmsParams.toString()}`;
  try {
    const { dataUrl } = await fetchImageAsDataUrl(wmsUrl);
    const wmsImg = await loadImage(dataUrl);
    ctx2d.drawImage(wmsImg, 0, 0, canvasW, canvasH);
  } catch (e) {
    console.warn(`WMS load failed for ${wmsLayerName}:`, e);
  }

  // 5. 画红点 marker 在 canvas 正中心 = 查询点
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  ctx2d.beginPath();
  ctx2d.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx2d.fillStyle = '#ffffff';
  ctx2d.fill();
  ctx2d.beginPath();
  ctx2d.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx2d.fillStyle = '#dc2626';
  ctx2d.fill();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    format: 'PNG',
    width: canvasW,
    height: canvasH,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ========== Drainage + Road: Leaflet DOM 截屏(Page 2.5) ==========
//
// MO drainage 走 LULC GeoServer(http://10.253.22.15:8080/geoserver/wms)直连,
// 与前端 Leaflet 同源 BFF 跨网段 → BFF 无法代理 → fetch 拿不到数据。
// 解法:用户必须在前端 Geospatial & Disaster Data Hub 侧栏勾选 Pipe Network /
// Transportation 下的 layer;PDF 生成时用 html2canvas 截 Leaflet DOM 容器,
// 拿到当前页面真实显示的 drainage + road 复合图。
//
// 限制:
// - allowTaint=true:MO LULC 跨域 tile 没 ACAO 头,html2canvas 会画空白(但不抛错)
// - 等 2s 让所有 WMS tile 加载完,避免截到半透明 tile
// - 用 ignoreElements 排除 leaflet-control / popup / marker
//
// 调用方(riskmap/page.tsx)负责确保 PDF 生成前 drainage/road layer 已勾选。
// 函数返回 null = 截图失败(Leaflet 未挂载/UI 隐藏/tile 未加载),由调用方走 no-data 占位。
export type DrainageRoadSnapshot = {
  dataUrl: string;
  format: 'PNG';
  width: number;
  height: number;
};

export async function captureDrainageRoadFromLeaflet(
  mapInstance: any | null,
  opts?: { waitMs?: number },
): Promise<DrainageRoadSnapshot | null> {
  return captureMapLayerFromLeaflet(mapInstance, opts);
}

/**
 * 通用 Leaflet DOM 截屏 helper(Page 2.5a Drainage / 2.5b Road 共用)。
 * - 等待 WMS tile 加载完(waitMs)
 * - html2canvas 截 map container(动态 import,browser-only)
 * - 忽略 leaflet-control / popup / tooltip / marker overlay
 * - 返回 dataURL PNG + 实际宽高(由调用方交给 addMapPanel 做 1:1 贴图)
 */
export async function captureMapLayerFromLeaflet(
  mapInstance: any | null,
  opts?: { waitMs?: number },
): Promise<DrainageRoadSnapshot | null> {
  if (!mapInstance || typeof mapInstance.getContainer !== 'function') {
    return null;
  }
  const container: HTMLElement = mapInstance.getContainer();
  if (!container || !container.offsetWidth || !container.offsetHeight) {
    return null;
  }
  // 等 WMS tile 加载完
  const waitMs = opts?.waitMs ?? 2000;
  await sleep(waitMs);
  try {
    // 动态 import:html2canvas 是 browser-only,避免 SSR 阶段报错
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,  // MO LULC 跨域 → 允许 tainted,跨域 img 会画空白但不抛错
      backgroundColor: '#ffffff',
      logging: false,
      width: container.offsetWidth,
      height: container.offsetHeight,
      ignoreElements: (el: Element) => {
        if (!(el instanceof HTMLElement)) return false;
        // 排除 Leaflet UI overlay (zoom 按钮、popup、tooltip、marker 图标)
        return !!el.closest(
          '.leaflet-control-container,.leaflet-popup-pane,.leaflet-tooltip-pane,.leaflet-marker-icon',
        );
      },
    });
    return {
      dataUrl: canvas.toDataURL('image/png'),
      format: 'PNG',
      width: canvas.width,
      height: canvas.height,
    };
  } catch (e) {
    console.warn('[captureMapLayerFromLeaflet] html2canvas failed:', e);
    return null;
  }
}
