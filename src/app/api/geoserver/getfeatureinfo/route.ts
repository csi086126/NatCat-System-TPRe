/**
 * GeoServer GetFeatureInfo / WMS GetMap Proxy
 *
 * 历史:本 route 最初是为 GetFeatureInfo 设计的,所有 binary 走 response.text(),
 * 把 PNG bytes 当 UTF-8 解码后透传给前端 — 二进制损坏,前端 loadImage 失败。
 *
 * 修复:任何 WMS / WFS 请求(包括 GetMap 返回 PNG)都用 arrayBuffer() 透传。
 * text/json 仍然走 text() + 解析。
 *
 * 用途:floodRiskPdf.ts 把所有 WMS GetMap 走这个 BFF 绕过 GeoServer 无 ACAO 的 CORS。
 */

import { NextRequest, NextResponse } from 'next/server';

const GEOSERVER_URL =
  process.env.GEOSERVER_INTERNAL_URL ||
  process.env.GEOSERVER_GEOSPATIAL_URL?.replace(/\/wms\/?$/, '') ||
  process.env.GEOSERVER_URL ||
  'http://10.253.22.15:8080/geoserver';
// LULC GeoServer(Macau drainage / pipe / road layer 实际发布在另一个 server,
// 前端 Leaflet 直连不带 ACAO 头导致 html2canvas 截屏失败 — 通过本 BFF 转发带 ACAO 头,
// html2canvas 就能正确截到彩色管线样式)
// 用法:URL 加 &geoserver=lulc 标记 → BFF 转发到 LULC_URL 并在 response 加 ACAO 头。
const GEOSERVER_LULC_URL =
  process.env.GEOSERVER_LULC_URL || 'http://10.253.22.15:8080/geoserver';
const REQUEST_TIMEOUT_MS = 30_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // ?geoserver=lulc → 转发到 LULC server(用于 drainage / pipe / road 等
    // 实际发布在 LULC server 的 layer;同源 BFF 转发带 ACAO 头,前端
    // html2canvas 截屏能正确捕获彩色管线样式)。
    const isLulc = searchParams.get('geoserver') === 'lulc';
    const targetUrl = isLulc ? GEOSERVER_LULC_URL : GEOSERVER_URL;
    // 移除标记参数,不要把 ?geoserver=lulc 转发到 GeoServer
    const forwardParams = new URLSearchParams(searchParams);
    forwardParams.delete('geoserver');
    const geoserverUrl = `${targetUrl}/wms?${forwardParams.toString()}`;
    const response = await fetch(geoserverUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'GeoServer request failed', status: response.status },
        { status: response.status },
      );
    }
    const contentType = response.headers.get('content-type') || 'text/html';

    // JSON / 文本 走 text()
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
    if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
      // PNG / GeoTIFF 等 binary 必须用 arrayBuffer,不能用 text()(text 会把 binary 当 UTF-8 破坏)
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }
    // 其它(text/html / text/plain / XML exception reports)走 text
    const data = await response.text();
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('GeoServer proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to GeoServer', details: String(error) },
      { status: 500 },
    );
  }
}

// Handle OPTIONS requests for CORS preflight
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
