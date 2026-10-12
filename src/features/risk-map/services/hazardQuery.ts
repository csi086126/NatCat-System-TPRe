import type { FloodHazardQueryResult, HistoricalFloodQueryResult } from '../types';

/**
 * Default timeouts (ms) for hazard queries.
 * Tuned for typical GeoServer WMS GetFeatureInfo + Next.js API → FastAPI round-trip
 * under normal load. Bulk callers (portfolio batch) can lower per-call budget when
 * running many concurrent requests.
 */
const DEFAULT_FLOOD_TIMEOUT_MS = 15_000;
const DEFAULT_HISTORICAL_TIMEOUT_MS = 20_000;
const DEFAULT_AREA_HISTORICAL_TIMEOUT_MS = 45_000;

export interface FloodHazardQueryOptions {
  timeoutMs?: number;
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /aborted|timeout/i.test(error.message))
  );
}

function wrapTimeoutError(timeoutMs: number): Error {
  return new Error(
    `Request timed out after ${Math.round(timeoutMs / 1000)}s. ` +
    `The hazard service is slow or unreachable. Please retry.`,
  );
}

async function safeJson(response: Response, contextLabel: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const responseText = await response.text().catch(() => '');
    const serverMessage = responseText.match(/<pre[^>]*>([^<]+)/i)?.[1]?.trim();
    throw new Error(
      serverMessage
        ? `${contextLabel}: ${serverMessage}`
        : `${contextLabel} returned ${response.status} ${response.statusText || 'with a non-JSON response'}`,
    );
  }
  return response.json();
}

export async function queryFloodHazard(
  latitude: number,
  longitude: number,
  region: string,
  scenario?: {
    family: 'non-typhoon-rainfall' | 'typhoon-compound';
    stormSurgeReturnPeriod: number | null;
    rainfallReturnPeriod: number | null;
  },
  seriesFamily?: 'non-typhoon-rainfall' | 'typhoon-compound',
  options: FloodHazardQueryOptions = {},
): Promise<FloodHazardQueryResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FLOOD_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetch('/api/hazards/flood-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, region, scenario, seriesFamily }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw wrapTimeoutError(timeoutMs);
    throw error;
  }

  const payload = await safeJson(response, 'Flood query service');
  if (!response.ok) {
    throw new Error(payload.error || 'GeoServer flood query failed');
  }
  return payload as FloodHazardQueryResult;
}

export async function queryHistoricalFloodHazard(
  latitude: number,
  longitude: number,
  region: string,
  options: FloodHazardQueryOptions = {},
): Promise<HistoricalFloodQueryResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_HISTORICAL_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetch('/api/hazards/historical-flood-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, region }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw wrapTimeoutError(timeoutMs);
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Historical flood query failed');
  return payload as HistoricalFloodQueryResult;
}

export async function queryHistoricalAreaFloodHazard(
  geometry: unknown,
  region: string,
  options: FloodHazardQueryOptions = {},
): Promise<HistoricalFloodQueryResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_AREA_HISTORICAL_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetch('/api/hazards/historical-flood-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry, region }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) throw wrapTimeoutError(timeoutMs);
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Historical area flood query failed');
  return payload as HistoricalFloodQueryResult;
}