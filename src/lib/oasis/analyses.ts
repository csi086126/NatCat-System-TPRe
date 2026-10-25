import { oasisApi } from "./api-client";
import { invalidateCachedOasisItems, listCachedOasisItems } from "./cache-client";
import type { Analysis, OasisId } from "./types";

export async function listAnalyses(options: { refresh?: boolean } = {}) {
  return sortAnalysesLatest(await listCachedOasisItems<Analysis>("analyses", options));
}

function analysisTime(analysis: Analysis) {
  const dateValue = Date.parse(String(analysis.created || analysis.modified || ""));
  if (Number.isFinite(dateValue)) return dateValue;
  const numericId = Number(analysis.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

export function sortAnalysesLatest(analyses: Analysis[]) {
  return [...analyses].sort((left, right) => analysisTime(right) - analysisTime(left));
}

export function getAnalysis(id: OasisId) {
  return oasisApi.get<Analysis>(`analyses/${id}`);
}

export async function createAnalysis(payload: Record<string, unknown>) {
  const result = await oasisApi.post<Analysis>("analyses", payload);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function updateAnalysis(id: OasisId, payload: Record<string, unknown>) {
  const result = await oasisApi.patch<Analysis>(`analyses/${id}`, payload);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function deleteAnalysis(id: OasisId) {
  const result = await oasisApi.delete(`analyses/${id}`);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function generateInputs(id: OasisId) {
  const result = await oasisApi.post(`analyses/${id}/generate_inputs`);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function generateAndRun(id: OasisId) {
  const result = await oasisApi.post(`analyses/${id}/generate_and_run`);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function runAnalysis(id: OasisId) {
  const result = await oasisApi.post(`analyses/${id}/run`);
  invalidateCachedOasisItems("analyses");
  return result;
}

export async function cancelAnalysis(id: OasisId) {
  const result = await oasisApi.post(`analyses/${id}/cancel`);
  invalidateCachedOasisItems("analyses");
  return result;
}

export function getAnalysisSettings(id: OasisId) {
  return oasisApi.get(`analyses/${id}/settings`);
}

export async function updateAnalysisSettings(id: OasisId, payload: unknown) {
  const result = await oasisApi.post(`analyses/${id}/settings`, payload);
  invalidateCachedOasisItems("analyses");
  return result;
}
