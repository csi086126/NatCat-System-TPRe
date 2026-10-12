import { NextRequest, NextResponse } from 'next/server'

/**
 * Transparent proxy to the FastAPI backend.
 * Used by all /api/auth/* route handlers so the browser can rely on
 * same-origin cookies (no CORS dance, no SameSite issues).
 *
 * Hop-by-hop headers are stripped; Set-Cookie is preserved so the
 * session cookie set by FastAPI reaches the browser unchanged.
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
])

function getUpstreamBase(): string {
  const url = process.env.PORTFOLIO_API_URL || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL
  if (!url) {
    throw new Error(
      'PORTFOLIO_API_URL is not configured. Set it in .env to enable /api/auth/* proxying.',
    )
  }
  return url.replace(/\/+$/, '')
}

export async function proxyToFastAPI(
  request: NextRequest,
  upstreamPath: string,
): Promise<NextResponse> {
  const base = getUpstreamBase()
  const url = `${base}${upstreamPath}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
    // Content-Length 由 fetch 自动计算,无需手动设
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(url, init)
  } catch (error) {
    console.error(`[auth proxy] Failed to reach FastAPI at ${url}:`, error)
    return NextResponse.json(
      { error: 'Authentication service is unavailable. Please try again.' },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers()
  upstreamResponse.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return
    if (key.toLowerCase() === 'set-cookie') {
      responseHeaders.append('set-cookie', value)
      return
    }
    responseHeaders.set(key, value)
  })

  const body = await upstreamResponse.text()
  return new NextResponse(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}