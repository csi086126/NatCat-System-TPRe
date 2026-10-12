import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// 2026-08-20 改造:不再传 clientId,鉴权信息(httpOnly JWT cookie)由浏览器自动带到 FastAPI,
// FastAPI 端 Depends(get_current_user) 解析出当前用户,查询历史按 user_id 隔离。
const SERVICE_BASE_URL = process.env.PORTFOLIO_API_URL
  || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  || 'http://localhost:8000';
const HISTORY_ENDPOINT = `${SERVICE_BASE_URL.replace(/\/$/, '')}/api/query-history`;
const REQUEST_TIMEOUT_MS = 5000;
const VALID_QUERY_TYPES = new Set(['point', 'area', 'portfolio']);

const SERVICE_DOWN_MESSAGE = `查询历史服务(${new URL(SERVICE_BASE_URL).port})未启动,请先启动 Portfolio Management API 服务`;

function validRecordId(value: string | null): value is string {
  if (!value) return false;
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
}

// Next.js 15 在某些场景下 `request.headers.get('cookie')` 会被内部消费而返回 null,
// 这里同时尝试两个来源,确保鉴权 cookie 一定能透传到 FastAPI。
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
  return isTimeout(error) ? '查询历史服务响应超时' : SERVICE_DOWN_MESSAGE;
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
    const id = request.nextUrl.searchParams.get('id');
    if (validRecordId(id)) {
      const response = await proxyRequest(request, `${HISTORY_ENDPOINT}/${id}`);
      if (!response.ok) {
        const status = response.status === 404 || response.status === 401 ? response.status : 503;
        return NextResponse.json(
          { error: await readErrorDetail(response) || `Query history service error: HTTP ${response.status}` },
          { status },
        );
      }
      const record = await response.json();
      return NextResponse.json({ record });
    }
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0);
    const url = new URL(HISTORY_ENDPOINT);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    const response = await proxyRequest(request, url);
    if (!response.ok) {
      const status = response.status === 401 ? 401 : 503;
      return NextResponse.json(
        { error: await readErrorDetail(response) || `Query history service error: HTTP ${response.status}` },
        { status },
      );
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!VALID_QUERY_TYPES.has(payload.queryType)
      || typeof payload.label !== 'string'
      || !payload.geometry
      || !payload.result) {
      return NextResponse.json({ error: 'Invalid query history record' }, { status: 400 });
    }
    // 剥掉前端误传的 clientId / username / userId,只信任后端鉴权
    const sanitized = {
      queryType: payload.queryType,
      label: payload.label,
      region: payload.region,
      geometry: payload.geometry,
      summary: payload.summary ?? {},
      result: payload.result,
    };
    const response = await proxyRequest(request, HISTORY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });
    if (!response.ok) {
      const status = response.status === 401 ? 401 : 503;
      return NextResponse.json(
        { error: await readErrorDetail(response) || `Query history service error: HTTP ${response.status}` },
        { status },
      );
    }
    const record = await response.json();
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!validRecordId(id)) {
      return NextResponse.json({ error: 'A valid id is required' }, { status: 400 });
    }
    const response = await proxyRequest(request, `${HISTORY_ENDPOINT}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const status = response.status === 404 || response.status === 401 ? response.status : 503;
      return NextResponse.json(
        { error: await readErrorDetail(response) || 'Query history record not found' },
        { status },
      );
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: serviceError(error) }, { status: 503 });
  }
}