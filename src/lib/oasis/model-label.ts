import type { Model } from "./types";

export function modelDisplayName(model?: Partial<Model> | null) {
  if (!model) return "—";
  const name = String(model.name || model.model_id || "").trim();
  const version = String(model.display_version || model.version || model.version_id || "").trim();
  if (name && version) return `${name} (${version})`;
  return name || (model.id !== undefined ? `Model ${model.id}` : "Unknown model");
}
