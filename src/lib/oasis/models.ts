import { asList, oasisApi } from "./api-client";
import type { Model, ModelVersion, OasisId, SettingTemplate } from "./types";

export async function listModels(options: { refresh?: boolean } = {}) {
  const response = await fetch(`/api/oasis/model-metadata${options.refresh ? "?refresh=1" : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail)
      : `Model metadata request failed (${response.status})`;
    throw new Error(detail);
  }
  const models = payload && typeof payload === "object" && "models" in payload
    ? (payload as { models?: unknown }).models
    : payload;
  return asList<Model>(models);
}

export function getModel(id: OasisId) {
  return oasisApi.get<Model>(`models/${id}`);
}

export function getModelSettings(id: OasisId) {
  return oasisApi.get(`models/${id}/settings`);
}

export async function listModelVersions(id: OasisId) {
  return asList<ModelVersion>(await oasisApi.get(`models/${id}/versions`));
}

export async function listSettingTemplates(modelId: OasisId) {
  return asList<SettingTemplate>(await oasisApi.get(`models/${modelId}/setting_templates`));
}

export async function updateModelMetadata(id: OasisId, metadata: { peril: string; region: string; description: string }) {
  const response = await fetch(`/api/oasis/model-metadata/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(metadata),
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail)
      : `Model metadata update failed (${response.status})`;
    throw new Error(detail);
  }
  return payload;
}
