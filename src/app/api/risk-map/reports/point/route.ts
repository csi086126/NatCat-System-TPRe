import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// BFF: POST /api/risk-map/reports/point -> FastAPI POST /api/reports/point
// 入参:{asset, flood, label?, profile?},返回 {report_id, status, report_type}。
// 后端 BackgroundTasks 异步生成 PDF + 上传 OSS,前端拿到 report_id 后轮询。
//
// Fallback URL:
//   历史代码默认 localhost:8000,但 8000 端口被 Docker Desktop
//   (com.docker.backend) 占用,实际 FastAPI 跑在 8765。
//   因此 fallback 改为 8765,跟 .env.local 中的 PORTFOLIO_API_URL 对齐。
const SERVICE_BASE_URL = process.env.PORTFOLIO_API_URL
  || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  || 'http://localhost:8765';
const ENDPOINT = `${SERVICE_BASE_URL.replace(/\/$/, '')}/api/reports/point`;
const REQUEST_TIMEOUT_MS = 8000;

const SERVICE_DOWN_MESSAGE = `报告服务(${new URL(SERVICE_BASE_URL).port})未启动`;

// BFF 鉴权感知: 后端依赖 natcat_session cookie(JWT)。如果浏览器没带
// (用户未登录),返回 503 — 这跟「OSS 未配置」的语义一致,前端
// useReportDownload 会静默走 jsPDF fallback,用户拿得到 PDF 不报错。
// 真鉴权错误(token 过期 / 篡改)发生在「有 cookie 但后端拒收」,
// 这种情况透传 401,前端弹 toast 提示用户重新登录。
const AUTH_COOKIE = 'natcat_session';

async function hasSessionCookie(request: NextRequest): Promise<boolean> {
  const cookie = await readCookieHeader(request);
  if (!cookie) return false;
  return cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE}=`));
}

// Next.js 15:request.headers.get('cookie') 偶尔返回 null(被内部消费),
// 同时尝试 next/headers 的 cookies() 兜底,确保鉴权 cookie 一定能到 FastAPI。
async function readCookieHeader(request: NextRequest): Promise<string | null> {
  // 优先取请求头里的 cookie (浏览器自动带过来),Next.js 15 偶尔会消费掉,
  // 所以再从 next/headers 兜底读一次。两者都空就返回 null。
  const fromHeaders = request.headers.get('cookie');
  if (fromHeaders) return fromHeaders;
  try {
    const store = await cookies();
    const all = store.getAll();
    if (!all || all.length === 0) return null;
    return all.map((c) => `${c.name}=${c.value}`).join('; ');
  } catch {
    return null;
  }
}

async function proxyRequest(request: NextRequest, input: string | URL, init?: RequestInit): Promise<Response> {
  // 复制所有请求头(同源代理,cookie 自动包含在内),再显式覆盖一次保险。
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  const cookie = await readCookieHeader(request);
  if (cookie) headers.set('cookie', cookie);
  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error
    && (error.message.includes('timed out') || error.message.includes('aborted'));
}

function serviceError(error: unknown): string {
  return isTimeout(error) ? '报告服务响应超时' : SERVICE_DOWN_MESSAGE;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = await response.json();
    return typeof body?.detail === 'string' ? body.detail : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!payload.asset || !payload.flood) {
      return NextResponse.json({ error: 'asset and flood are required' }, { status: 400 });
    }
    // 鉴权感知: 用户未登录 → 返回 503(等价 OSS 未配置语义),
    // 让前端 useReportDownload 静默走 jsPDF fallback。
    if (!(await hasSessionCookie(request))) {
      return NextResponse.json(
        { error: 'Not authenticated. Frontend will fall back to client-side PDF.' },
        { status: 503 },
      );
    }
    // 透传 profile 给后端 — 后端 schema 已支持, 会在 PDF 加 Terrain Profile 章节。
    const sanitized: Record<string, unknown> = {
      asset: payload.asset,
      flood: payload.flood,
      label: typeof payload.label === 'string' ? payload.label : 'Single point flood risk assessment',
    };
    if (payload.profile && typeof payload.profile === 'object') {
      sanitized.profile = payload.profile;
    }
    const response = await proxyRequest(request, ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });
    if (!response.ok) {
      // 透传真实状态码(401/403/500)。前端 useReportDownload:
      //   503  → 静默 jsPDF fallback
      //   其他 → toast 错误 + fallback
      const status = response.status;
      return NextResponse.json(
        { error: await readErrorDetail(response) || `Reports service error: HTTP ${response.status}` },
        { status },
      );
    }
    return NextResponse.json(await response.json(), { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}