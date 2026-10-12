import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// BFF: POST /api/risk-map/reports/area -> FastAPI POST /api/reports/area
// 入参:{result, label?, profile?}
//
// Fallback URL:
//   历史代码默认 localhost:8000,但 8000 端口被 Docker Desktop 占用,
//   实际 FastAPI 跑在 8765。fallback 改为 8765 与 .env.local 对齐。
const SERVICE_BASE_URL = process.env.PORTFOLIO_API_URL
  || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  || 'http://localhost:8765';
const ENDPOINT = `${SERVICE_BASE_URL.replace(/\/$/, '')}/api/reports/area`;
const REQUEST_TIMEOUT_MS = 8000;

const SERVICE_DOWN_MESSAGE = `报告服务(${new URL(SERVICE_BASE_URL).port})未启动`;

// BFF 鉴权感知: 未登录 → 返回 503(等价 OSS 未配置语义),前端静默 fallback。
// 真鉴权错误 → 透传 401,前端弹 toast。
const AUTH_COOKIE = 'natcat_session';

async function hasSessionCookie(request: NextRequest): Promise<boolean> {
  const cookie = await readCookieHeader(request);
  if (!cookie) return false;
  return cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE}=`));
}

async function readCookieHeader(request: NextRequest): Promise<string | null> {
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
    if (!payload.result) {
      return NextResponse.json({ error: 'result is required' }, { status: 400 });
    }
    // 鉴权感知: 未登录 → 静默 fallback 路径。
    if (!(await hasSessionCookie(request))) {
      return NextResponse.json(
        { error: 'Not authenticated. Frontend will fall back to client-side PDF.' },
        { status: 503 },
      );
    }
    const sanitized: Record<string, unknown> = {
      result: payload.result,
      label: typeof payload.label === 'string' ? payload.label : 'Area flood risk assessment',
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
      // 透传真实状态码 — 前端 useReportDownload:
      //   503 → 静默 fallback;其他 → toast 错误 + fallback。
      return NextResponse.json(
        { error: await readErrorDetail(response) || `Reports service error: HTTP ${response.status}` },
        { status: response.status },
      );
    }
    return NextResponse.json(await response.json(), { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}