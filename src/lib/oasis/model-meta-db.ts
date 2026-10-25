import { platformDbRequest } from "./platform-db";
import type { Model, ModelMetadata } from "./types";

export type ModelMetadataPatch = Pick<ModelMetadata, "peril" | "region" | "description">;

export async function getCachedModels() {
  return platformDbRequest<{ models: Model[]; syncedAt: string | null }>("/api/oasis-ui/models");
}

export async function getModelMetadata(id: string | number) {
  try {
    const payload = await platformDbRequest<{ metadata?: ModelMetadata }>(`/api/oasis-ui/models/${encodeURIComponent(String(id))}`);
    return payload.metadata || null;
  } catch {
    return null;
  }
}

export async function saveSyncedModels(models: Model[], defaultsFor: (model: Model) => Pick<ModelMetadata, "peril" | "region" | "description">) {
  const payload = await platformDbRequest<{ models: Model[]; syncedAt: string | null }>("/api/oasis-ui/models/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      syncedAt: new Date().toISOString(),
      models: models.map((model) => ({ ...model, metadataDefaults: defaultsFor(model) })),
    }),
  });
  return payload;
}

export async function updateModelMetadata(id: string | number, patch: ModelMetadataPatch) {
  const payload = await platformDbRequest<{ metadata?: ModelMetadata }>(`/api/oasis-ui/models/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return payload.metadata || null;
}
