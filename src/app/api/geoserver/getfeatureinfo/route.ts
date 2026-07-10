/**
 * GeoServer GetFeatureInfo Proxy
 * Proxies WMS GetFeatureInfo requests to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://10.253.22.15:8080/geoserver';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the request
    const { searchParams } = new URL(request.url);

    // Build GeoServer WMS GetFeatureInfo URL
    const geoserverUrl = `${GEOSERVER_URL}/wms?${searchParams.toString()}`;

    console.log('Proxying request to:', geoserverUrl);

    // Forward request to GeoServer
    const response = await fetch(geoserverUrl);

    if (!response.ok) {
      console.error('GeoServer error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'GeoServer request failed', status: response.status },
        { status: response.status }
      );
    }

    // Get content type from GeoServer response
    const contentType = response.headers.get('content-type') || 'text/html';

    // Handle JSON responses
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Handle HTML/text responses
    const data = await response.text();

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to GeoServer', details: String(error) },
      { status: 500 }
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
