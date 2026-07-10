/**
 * GeoServer WFS Proxy API
 * Proxies requests to GeoServer to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get GeoServer URL from environment or use default
    const geoserverUrl = process.env.NEXT_PUBLIC_GEOSERVER_URL || 'http://10.253.22.15:8080/geoserver';

    // Build WFS request URL
    const wfsUrl = new URL(`${geoserverUrl}/wfs`);

    // Copy all query parameters
    searchParams.forEach((value, key) => {
      wfsUrl.searchParams.append(key, value);
    });

    console.log('Proxying GeoServer WFS request:', wfsUrl.toString());

    // Fetch from GeoServer
    const response = await fetch(wfsUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('GeoServer WFS error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `GeoServer error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('GeoServer WFS proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
