import { platformDbRequest } from "./platform-db";

export type MetadataKind = "portfolio" | "analysis";
export type OasisCacheKind = "portfolios" | "analyses";

export async function listDescriptions(_owner: string, kind: MetadataKind) {
  const payload = await platformDbRequest<{ descriptions?: Record<string, string> }>(`/api/oasis-ui/metadata/${kind}`);
  return payload.descriptions || {};
}

export async function saveDescription(_owner: string, kind: MetadataKind, oasisId: string, description: string) {
  await platformDbRequest(`/api/oasis-ui/metadata/${kind}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: oasisId, description }),
  });
}

export async function deleteDescription(owner: string, kind: MetadataKind, oasisId: string) {
  return saveDescription(owner, kind, oasisId, "");
}

export async function getOasisListCache(_owner: string, kind: OasisCacheKind) {
  const payload = await platformDbRequest<{ data?: unknown; syncedAt?: string | null }>(`/api/oasis-ui/cache/${kind}`);
  if (!payload.syncedAt || payload.data === null || payload.data === undefined) return null;
  return { data: payload.data, syncedAt: payload.syncedAt };
}

export async function saveOasisListCache(_owner: string, kind: OasisCacheKind, data: unknown, syncedAt = new Date().toISOString()) {
  await platformDbRequest(`/api/oasis-ui/cache/${kind}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, syncedAt }),
  });
}

export async function invalidateOasisListCache(_owner: string, kind: OasisCacheKind) {
  try {
    await platformDbRequest(`/api/oasis-ui/cache/${kind}`, { method: "DELETE" });
  } catch {
    // Cache invalidation must never turn a successful Oasis mutation into an error.
  }
}
