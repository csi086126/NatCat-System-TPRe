import { NextResponse } from "next/server";
import { asList } from "@/lib/oasis/api-client";
import { OASIS_API_VERSION } from "@/lib/oasis/constants";
import {
  getOasisListCache,
  saveOasisListCache,
  type OasisCacheKind,
} from "@/lib/oasis/metadata-db";
import {
  getRequestTokens,
  refreshToken,
  setTokenCookies,
  unauthorizedResponse,
  oasisApiUrl,
  type TokenPayload,
} from "@/lib/oasis/server-auth";
import type { Analysis, Portfolio } from "@/lib/oasis/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 30_000;
type Context = { params: Promise<{ kind: string }> };

class UpstreamCacheError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "UpstreamCacheError";
    this.status = status;
    this.payload = payload;
  }
}

type SyncResult = {
  data: unknown;
  syncedAt: string;
  refreshed?: TokenPayload;
};

const globalForOasisCache = globalThis as typeof globalThis & {
  oasisCacheSyncLocks?: Map<string, Promise<SyncResult>>;
};
const syncLocks = globalForOasisCache.oasisCacheSyncLocks ||= new Map<string, Promise<SyncResult>>();

function isCacheKind(value: string): value is OasisCacheKind {
  return value === "portfolios" || value === "analyses";
}

function upstreamPath(kind: OasisCacheKind, id?: string | number) {
  const path = id === undefined ? kind : `${kind}/${encodeURIComponent(String(id))}`;
  return `/${OASIS_API_VERSION}/${path}/`;
}

async function responsePayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) return response.json().catch(() => null);
  return response.text().catch(() => null);
}

async function fetchUpstream(path: string, accessToken: string) {
  let response: Response;
  try {
    response = await fetch(oasisApiUrl(path), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    throw new UpstreamCacheError(error instanceof Error ? error.message : "Oasis API is unavailable", 503);
  }

  const payload = await responsePayload(response);
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail)
      : `Oasis API request failed (${response.status})`;
    throw new UpstreamCacheError(detail, response.status, payload);
  }
  return payload;
}

async function buildCacheData(kind: OasisCacheKind, accessToken: string) {
  const data = await fetchUpstream(upstreamPath(kind), accessToken);
  if (kind !== "portfolios") return asList<Analysis>(data);

  const portfolios = asList<Portfolio>(data);
  // The v2 list serializer omits status fields, so enrich rows while syncing
  // once every 30 seconds instead of doing this N+1 work on every page load.
  const details = await Promise.allSettled(
    portfolios.map((portfolio) => fetchUpstream(upstreamPath("portfolios", portfolio.id), accessToken)),
  );
  return portfolios.map((portfolio, index) => {
    const detail = details[index];
    if (detail.status !== "fulfilled") return portfolio;
    return { ...portfolio, ...(detail.value as Partial<Portfolio>) };
  });
}

async function syncCache(owner: string, kind: OasisCacheKind, tokens: Awaited<ReturnType<typeof getRequestTokens>>): Promise<SyncResult> {
  let accessToken = tokens.accessToken;
  let refreshed: TokenPayload | undefined;

  if (!accessToken && tokens.refreshToken) {
    const refreshedPayload = await refreshToken(tokens.refreshToken);
    if (refreshedPayload?.access_token) {
      refreshed = refreshedPayload;
      accessToken = refreshedPayload.access_token;
    }
  }
  if (!accessToken) throw new UpstreamCacheError("Oasis access token is expired", 401);

  try {
    const data = await buildCacheData(kind, accessToken);
    const syncedAt = new Date().toISOString();
    await saveOasisListCache(owner, kind, data, syncedAt);
    return { data, syncedAt, refreshed };
  } catch (error) {
    if (!(error instanceof UpstreamCacheError) || error.status !== 401 || !tokens.refreshToken) throw error;
    const refreshedPayload = await refreshToken(tokens.refreshToken);
    if (!refreshedPayload?.access_token) throw error;
    const data = await buildCacheData(kind, refreshedPayload.access_token);
    const syncedAt = new Date().toISOString();
    await saveOasisListCache(owner, kind, data, syncedAt);
    return { data, syncedAt, refreshed: refreshedPayload };
  }
}

function syncCacheOnce(owner: string, kind: OasisCacheKind, tokens: Awaited<ReturnType<typeof getRequestTokens>>) {
  const key = `${owner}:${kind}`;
  const existing = syncLocks.get(key);
  if (existing) return existing;
  const promise = syncCache(owner, kind, tokens).finally(() => syncLocks.delete(key));
  syncLocks.set(key, promise);
  return promise;
}

function cacheResponse(kind: OasisCacheKind, data: unknown, syncedAt: string, stale = false) {
  return NextResponse.json({ kind, data, syncedAt, stale });
}

function errorResponse(error: unknown) {
  if (error instanceof UpstreamCacheError) {
    const status = error.status >= 500 ? 502 : error.status;
    return NextResponse.json({ detail: error.message }, { status });
  }
  return NextResponse.json({ detail: "Oasis cache synchronization failed" }, { status: 503 });
}

export async function GET(request: Request, context: Context) {
  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return unauthorizedResponse();

  const { kind: rawKind } = await context.params;
  if (!isCacheKind(rawKind)) return NextResponse.json({ detail: "Invalid Oasis cache kind" }, { status: 400 });

  const owner = tokens.username || "oasis-user";
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const cached = await getOasisListCache(owner, rawKind);
  const cacheAge = cached ? Date.now() - Date.parse(cached.syncedAt) : Number.POSITIVE_INFINITY;
  const stale = !cached || !Number.isFinite(cacheAge) || cacheAge >= CACHE_TTL_MS;

  if (forceRefresh || !cached) {
    try {
      const synced = await syncCacheOnce(owner, rawKind, tokens);
      const response = cacheResponse(rawKind, synced.data, synced.syncedAt);
      if (synced.refreshed) setTokenCookies(response, synced.refreshed, tokens.username);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  }

  if (stale) {
    void syncCacheOnce(owner, rawKind, tokens).catch(() => undefined);
    return cacheResponse(rawKind, cached.data, cached.syncedAt, true);
  }

  return cacheResponse(rawKind, cached.data, cached.syncedAt);
}
