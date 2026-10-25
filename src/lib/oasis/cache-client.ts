import { OasisApiError, asList } from "./api-client";

type CacheKind = "portfolios" | "analyses";

const CLIENT_CACHE_TTL_MS = 30_000;
type ClientCacheEntry = { data: unknown[]; expiresAt: number };
const clientCache = new Map<CacheKind, ClientCacheEntry>();
const clientRequests = new Map<CacheKind, Promise<unknown[]>>();

export async function listCachedOasisItems<T>(kind: CacheKind, options: { refresh?: boolean } = {}) {
  const cached = clientCache.get(kind);
  if (!options.refresh && cached && cached.expiresAt > Date.now()) return cached.data as T[];

  const existingRequest = clientRequests.get(kind);
  if (existingRequest) return existingRequest as Promise<T[]>;

  const query = options.refresh ? "?refresh=1" : "";
  const request = (async () => {
    const response = await fetch(`/api/oasis/cache/${kind}${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const detail = payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : `Oasis cache request failed (${response.status})`;
      throw new OasisApiError(detail, response.status, payload);
    }

    const data = payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload;
    const items = asList<T>(data);
    clientCache.set(kind, { data: items, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
    return items as unknown[];
  })();
  clientRequests.set(kind, request);
  try {
    return await request as T[];
  } finally {
    if (clientRequests.get(kind) === request) clientRequests.delete(kind);
  }
}

export function invalidateCachedOasisItems(kind?: CacheKind) {
  if (kind) clientCache.delete(kind);
  else clientCache.clear();
}
