"use client";

export type MetadataKind = "portfolio" | "analysis";

const legacyStorageKeys: Record<MetadataKind, string> = {
  portfolio: "natcat:oasisui:portfolio-descriptions",
  analysis: "natcat:oasisui:analysis-descriptions",
};

function readLegacyDescriptions(kind: MetadataKind): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(legacyStorageKeys[kind]) || "{}");
    return value && typeof value === "object" ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

async function metadataRequest(kind: MetadataKind, init?: RequestInit) {
  const response = await fetch(`/api/oasis/metadata/${kind}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Metadata request failed (${response.status})`);
  }
  return response.json() as Promise<{ descriptions?: Record<string, string> }>;
}

export async function getOasisDescriptions(kind: MetadataKind) {
  const payload = await metadataRequest(kind);
  const serverDescriptions = payload.descriptions || {};
  const legacyDescriptions = readLegacyDescriptions(kind);
  const missingLegacy = Object.entries(legacyDescriptions).filter(([id]) => !serverDescriptions[id]);

  if (missingLegacy.length) {
    const migrated = await Promise.allSettled(missingLegacy.map(([id, description]) => saveOasisDescription(kind, id, description)));
    if (migrated.every((result) => result.status === "fulfilled")) {
      window.localStorage.removeItem(legacyStorageKeys[kind]);
    }
  }

  return { ...legacyDescriptions, ...serverDescriptions };
}

export async function getOasisDescription(kind: MetadataKind, id: string | number) {
  const descriptions = await getOasisDescriptions(kind);
  return descriptions[String(id)] || "";
}

export async function saveOasisDescription(kind: MetadataKind, id: string | number, description: string) {
  await metadataRequest(kind, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, description }),
  });
}

export async function deleteOasisDescription(kind: MetadataKind, id: string | number) {
  return saveOasisDescription(kind, id, "");
}
