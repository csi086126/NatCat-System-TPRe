/**
 * GeoServer WCS Proxy — 与 getfeatureinfo 同款透传,但转发到 /wcs endpoint。
 *
 * 用途:前端 sampleDemAt 走 WCS GetCoverage 读 DEM 单像素高程。
 * 直接 fetch GeoServer 会被浏览器 CORS block(response 无 Access-Control-Allow-Origin),
 * 走这个同源 BFF 后 BFF 服务端 fetch GeoServer(无 CORS),把 binary GeoTIFF 透传回前端。
 *
 * 注意:WCS 返回的 binary(GeoTIFF)不是 text/html / application/json,
 * 所以不能复用 getfeatureinfo 那个 route 里的 text()/json() 分支 — 必须透传 arrayBuffer + contentType。
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEOSERVER_URL =
  process.env.GEOSERVER_INTERNAL_URL ||
  process.env.GEOSERVER_GEOSPATIAL_URL?.replace(/\/wms\/?$/, '') ||
  process.env.GEOSERVER_URL ||
  'http://10.253.22.15:8080/geoserver';
const REQUEST_TIMEOUT_MS = 20_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const geoserverUrl = `${GEOSERVER_URL}/wcs?${searchParams.toString()}`;
    const response = await fetch(geoserverUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'GeoServer WCS request failed', status: response.status },
        { status: response.status },
      );
    }
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('WCS proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to GeoServer WCS', details: String(error) },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
