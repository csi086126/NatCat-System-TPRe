import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OASIS_UI_URL = process.env.OASIS_UI_URL || 'http://localhost:8088';

export async function GET() {
  try {
    const response = await fetch(OASIS_UI_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: 'text/html' },
    });
    const contentType = response.headers.get('content-type') || '';
    const content = contentType.includes('text/html') ? await response.text() : '';
    const isOasisUi = response.ok && /<title>\s*OasisUI\s*<\/title>/i.test(content);

    return NextResponse.json({
      running: isOasisUi,
      url: OASIS_UI_URL,
      status: response.status,
    }, { status: isOasisUi ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({
      running: false,
      url: OASIS_UI_URL,
      error: error instanceof Error ? error.message : 'OasisUI health check failed',
    }, { status: 503 });
  }
}
