import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// BFF: GET /api/risk-map/reports -> FastAPI /api/reports(列出当前用户所有报告)
// 鉴权由浏览器 httpOnly JWT cookie 自动透传到 FastAPI,Depends(get_current_user) 解析。
const SERVICE_BASE_URL = process.env.PORTFOLIO_API_URL
  || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  || 'http://localhost:8000';
const REPORTS_ENDPOINT = `${SERVICE_BASE_URL.replace(/\/$/, '')}/api/reports`;
const REQUEST_TIMEOUT_MS = 8000;

const SERVICE_DOWN_MESSAGE = `报告服务(${new URL(SERVICE_BASE_URL).port})未启动,请先启动 Portfolio Management API 服务`;

// Next.js 15:request.headers.get('cookie') 偶尔返回 null,这里用 next/headers 兜底。
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

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0);
    const url = new URL(REPORTS_ENDPOINT);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    const response = await proxyRequest(request, url);
    if (!response.ok) {
      const status = response.status === 401 ? 401 : 503;
      return NextResponse.json(
        { error: await readErrorDetail(response) || `Reports service error: HTTP ${response.status}` },
        { status },
      );
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}