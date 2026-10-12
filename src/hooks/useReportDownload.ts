'use client';

/**
 * useReportDownload — 统一的后端报告下载流程。
 *
 * 流程:
 *  1) POST 创建 pending report (返回 report_id)
 *  2) 后端 BackgroundTasks 异步生成 PDF + 上传 OSS
 *  3) 前端每 2 秒 GET 详情,轮询 status
 *  4) status === 'ready' → POST /download 拿 signed URL → 浏览器跳转下载
 *  5) status === 'failed' → toast 报错并调用 fallback callback
 *  6) OSS 未配置(503) → 静默降级到 jsPDF fallback
 *  7) 网络错误 / 后端宕机 → toast 警告并调用 fallback
 *
 * 用法:
 *   const { requestDownload, isDownloading } = useReportDownload({
 *     onFallbackPoint: ({ asset, flood, profile }) => generateFloodRiskPdf({ asset, flood, profile }),
 *     onFallbackArea:  ({ result }) => generateAreaFloodRiskPdf({ result }),
 *     onFallbackPortfolio: (locations, onProgress) => generatePortfolioFloodRiskPdf(locations, onProgress),
 *   });
 *   await requestDownload({ kind: 'point', asset, flood, profile });
 */

import { useCallback, useState } from 'react';

export type ReportKind = 'point' | 'area' | 'portfolio';

export interface TerrainProfilePayload {
  points: Array<{ lat: number; lng: number }>;
  samples: Array<{ distance: number; elevation: number | null }>;
}

interface MapSnapshot {
  dataUrl: string;
  format: 'PNG';
  width: number;
  height: number;
}

interface PointPayload {
  kind: 'point';
  asset: any;
  flood: any;
  label?: string;
  // 用户在地图上画的 terrain profile。可选。
  // - jsPDF fallback 会消费它(用于在 PDF 加 profile 章节)
  // - 后端 BFF 当前只识别 asset/flood/label,sanitized 会丢弃多余字段,
  //   所以加在 payload 里是 safe 的(只是后端路径暂时用不到)
  profile?: TerrainProfilePayload;
  /**
   * 前端 Leaflet 实时截图的 6 张水深图(Risk Query 走这个路径)。
   * 存在 → 跳过 BFF,直接走 jsPDF 拼 PDF(Page 3 用截图,坐标系与前端一致)。
   * 缺失 → 走 BFF 或 jsPDF 合成路径。
   */
  capturedFloodMaps?: Record<string, MapSnapshot>;
  /**
   * 前端 Leaflet DOM 截屏的 drainage-only 图(Page 2.5a)。
   * MO drainage 走 LULC GeoServer 直连(跨网段,BFF 无法代理),
   * 所以必须从 Leaflet DOM 截屏而不是 fetch。
   * 缺失 → Page 2.5a 显示 no-data 占位。
   */
  drainageSnapshot?: MapSnapshot | null;
  /**
   * 前端 Leaflet DOM 截屏的 road-only 图(Page 2.5b)。
   * 同上,MO road 走 LULC GeoServer 直连,必须从 Leaflet DOM 截屏。
   * 缺失 → Page 2.5b 显示 no-data 占位。
   */
  roadSnapshot?: MapSnapshot | null;
}
interface AreaPayload { kind: 'area'; result: any; label?: string; profile?: TerrainProfilePayload; }
interface PortfolioPayload {
  kind: 'portfolio';
  locations: any[];
  meta?: any;
  label?: string;
  onProgress?: (current: number, total: number, location: any) => void;
}
export type ReportPayload = PointPayload | AreaPayload | PortfolioPayload;

export interface UseReportDownloadOpts {
  // jsPDF fallback(OSS 503 / 后端宕机时调用)
  onFallbackPoint?: (args: {
    asset: any;
    flood: any;
    profile?: TerrainProfilePayload;
    capturedFloodMaps?: Record<string, MapSnapshot>;
    drainageSnapshot?: MapSnapshot | null;
    roadSnapshot?: MapSnapshot | null;
  }) => Promise<void> | void;
  onFallbackArea?: (args: { result: any; profile?: TerrainProfilePayload }) => Promise<void> | void;
  onFallbackPortfolio?: (
    locations: any[],
    onProgress?: (current: number, total: number, location: any) => void,
  ) => Promise<void> | void;
  // toast(可选,默认 console)
  onToast?: (kind: 'info' | 'success' | 'warning' | 'error', title: string) => void;
}

export interface ReportDownloadHandle {
  requestDownload: (payload: ReportPayload) => Promise<void>;
  isDownloading: boolean;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;  // 5 分钟
const REQUEST_TIMEOUT_MS = 10_000;

// BFF 鉴权感知: 浏览器必须带 natcat_session cookie 才能让 BFF 转发到 FastAPI。
// 这里客户端做预检测,避免发起一次必失败的网络请求。
// 真实鉴权错误(cookie 存在但 token 过期)由 BFF 透传 401,会走 !createRes.ok 分支弹 toast。
const AUTH_COOKIE_NAME = 'natcat_session';
function hasClientSession(): boolean {
  if (typeof document === 'undefined') return true; // SSR 兜底:不预判
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}

async function postJson(url: string, body: any, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  });
}

async function getJson(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, { method: 'GET', cache: 'no-store', signal });
}

async function pollUntilDone(
  reportId: number,
  onInfo?: (msg: string) => void,
): Promise<{ ok: boolean; status: string; error?: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // 后端 POST 返回 202 后,BackgroundTask 写库有 ~ 几百 ms ~ 数秒的延迟;
  // 在此期间 GET 会短暂返回 404。把 404 当作"还在生成",重试到上限才放弃。
  const MAX_CONSECUTIVE_404 = 15; // 15 × 2s = 30 s 容忍
  let consecutiveNotFound = 0;

  while (Date.now() < deadline) {
    const res = await getJson(`/api/risk-map/reports/${reportId}`);

    if (res.status === 404) {
      consecutiveNotFound += 1;
      if (consecutiveNotFound > MAX_CONSECUTIVE_404) {
        return {
          ok: false,
          status: 'failed',
          error: `Report ${reportId} not found after ${MAX_CONSECUTIVE_404 * POLL_INTERVAL_MS / 1000}s`,
        };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    if (!res.ok) {
      // 401 / 500 / 其他错误才视为终止
      return { ok: false, status: 'failed', error: `HTTP ${res.status}` };
    }

    consecutiveNotFound = 0; // 成功响应,重置计数
    const record = await res.json();
    if (record.status === 'ready') return { ok: true, status: 'ready' };
    if (record.status === 'failed') {
      return { ok: false, status: 'failed', error: record.error_message || 'Unknown error' };
    }
    // pending / generating → 继续轮询
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { ok: false, status: 'timeout', error: 'Report generation timed out' };
}

async function fetchSignedUrl(reportId: number): Promise<{ url: string; filename: string } | null> {
  try {
    const res = await postJson(`/api/risk-map/reports/${reportId}/download`, {}, AbortSignal.timeout(REQUEST_TIMEOUT_MS));
    if (!res.ok) return null;
    const data = await res.json();
    return data?.download_url ? { url: data.download_url, filename: data.filename } : null;
  } catch {
    return null;
  }
}

export function useReportDownload(opts: UseReportDownloadOpts = {}): ReportDownloadHandle {
  const [isDownloading, setIsDownloading] = useState(false);

  const toast = useCallback((kind: 'info' | 'success' | 'warning' | 'error', title: string) => {
    if (opts.onToast) opts.onToast(kind, title);
    else console.log(`[${kind}]`, title);
  }, [opts]);

  const requestDownload = useCallback(async (payload: ReportPayload) => {
    setIsDownloading(true);
    try {
      // 0) 客户端预检测: 未登录直接走 jsPDF fallback,不发后端请求。
      //    BFF 也会做同样的检测,但少一次往返 + 少一行错误日志更干净。
      //    不算 toasting — 这是预期路径,跟 OSS 未配置走同一逻辑。
      if (!hasClientSession()) {
        return await runFallback(payload, opts);
      }
      // 0.5) point + capturedFloodMaps → 后端拿不到前端 Leaflet 截图,
      //      直接走 jsPDF 路径。跳 BFF 省一次往返 + 避免后端 sanitized 丢字段。
      if (payload.kind === 'point' && payload.capturedFloodMaps) {
        return await runFallback(payload, opts);
      }
      // 1) 创建 pending report
      let endpoint: string;
      let body: any;
      if (payload.kind === 'point') {
        endpoint = '/api/risk-map/reports/point';
        body = {
          asset: payload.asset,
          flood: payload.flood,
          label: payload.label,
          profile: payload.profile, // 后端 sanitized 当前会丢弃,只为 jsPDF fallback 保留
        };
      } else if (payload.kind === 'area') {
        endpoint = '/api/risk-map/reports/area';
        body = { result: payload.result, label: payload.label, profile: payload.profile };
      } else {
        endpoint = '/api/risk-map/reports/portfolio';
        body = {
          locations: payload.locations,
          meta: payload.meta,
          label: payload.label,
        };
      }

      let createRes: Response;
      try {
        createRes = await postJson(endpoint, body, AbortSignal.timeout(REQUEST_TIMEOUT_MS));
      } catch (err) {
        // 网络错误 → toast 警告 + fallback
        toast('warning', '报告服务连接失败,改用浏览器生成');
        return await runFallback(payload, opts);
      }

      if (createRes.status === 503) {
        // OSS 未配置 / 服务主动降级 → 静默走 jsPDF fallback。
        // 503 是后端主动降级信号(不是故障),不弹 toast:用户拿到 PDF 就行,
        // 不需要知道走的哪条链路。等 OSS 配好后这个分支自然不再触发。
        return await runFallback(payload, opts);
      }
      if (!createRes.ok) {
        toast('error', `报告创建失败: HTTP ${createRes.status}`);
        return await runFallback(payload, opts);
      }

      const { report_id } = await createRes.json();
      toast('info', `报告已提交 (ID: ${report_id}),正在生成...`);

      // 2) 轮询 status
      const polled = await pollUntilDone(report_id);
      if (!polled.ok) {
        toast('error', `报告生成失败: ${polled.error}`);
        return await runFallback(payload, opts);
      }

      // 3) 拿 signed URL → 浏览器跳转
      const signed = await fetchSignedUrl(report_id);
      if (!signed) {
        toast('error', '获取下载链接失败');
        return await runFallback(payload, opts);
      }
      toast('success', `报告就绪 (ID: ${report_id}),开始下载`);
      // 浏览器直接跳转签名 URL,触发下载
      window.location.href = signed.url;
    } finally {
      setIsDownloading(false);
    }
  }, [opts, toast]);

  return { requestDownload, isDownloading };
}

async function runFallback(payload: ReportPayload, opts: UseReportDownloadOpts): Promise<void> {
  if (payload.kind === 'point' && opts.onFallbackPoint) {
    await opts.onFallbackPoint({
      asset: payload.asset,
      flood: payload.flood,
      profile: payload.profile,
      capturedFloodMaps: payload.capturedFloodMaps,
      drainageSnapshot: payload.drainageSnapshot,
      roadSnapshot: payload.roadSnapshot,
    });
  } else if (payload.kind === 'area' && opts.onFallbackArea) {
    await opts.onFallbackArea({ result: payload.result, profile: payload.profile });
  } else if (payload.kind === 'portfolio' && opts.onFallbackPortfolio) {
    await opts.onFallbackPortfolio(payload.locations, payload.onProgress);
  }
}