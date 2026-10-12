import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// BFF: GET /api/risk-map/reports/{id} -> FastAPI /api/reports/{id}
//
// Fallback URL:
//   历史代码默认 localhost:8000,但 8000 端口被 Docker Desktop 占用,
//   实际 FastAPI 跑在 8765。fallback 改为 8765 与 .env.local 对齐。
const SERVICE_BASE_URL = process.env.PORTFOLIO_API_URL
  || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  || 'http://localhost:8765';
const REQUEST_TIMEOUT_MS = 5000;

const SERVICE_DOWN_MESSAGE = `报告服务(${new URL(SERVICE_BASE_URL).port})未启动`;

function validId(value: string | null): value is string {
  if (!value) return false;
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!validId(id)) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
  }
  try {
    const endpoint = `${SERVICE_BASE_URL.replace(/\/$/, '')}/api/reports/${id}`;
    const response = await proxyRequest(request, endpoint);
    if (!response.ok) {
      const status = response.status === 404 || response.status === 401 ? response.status : 503;
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