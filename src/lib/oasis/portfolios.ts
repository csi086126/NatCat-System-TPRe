import { oasisApi } from "./api-client";
import { invalidateCachedOasisItems, listCachedOasisItems } from "./cache-client";
import type { Portfolio, PortfolioFile, PortfolioValidation, OasisId } from "./types";

export async function listPortfolios(options: { refresh?: boolean } = {}) {
  const portfolios = await listCachedOasisItems<Portfolio>("portfolios", options);
  return sortPortfoliosLatest(portfolios);
}

function portfolioTime(portfolio: Portfolio) {
  const dateValue = Date.parse(String(portfolio.created || portfolio.modified || ""));
  if (Number.isFinite(dateValue)) return dateValue;
  const numericId = Number(portfolio.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

export function sortPortfoliosLatest(portfolios: Portfolio[]) {
  return [...portfolios].sort((left, right) => portfolioTime(right) - portfolioTime(left));
}

export function getPortfolio(id: OasisId) {
  return oasisApi.get<Portfolio>(`portfolios/${id}`);
}

export async function createPortfolio(payload: { name: string; description?: string }) {
  const result = await oasisApi.post<Portfolio>("portfolios", payload);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export async function updatePortfolio(id: OasisId, payload: Partial<Portfolio>) {
  const result = await oasisApi.patch<Portfolio>(`portfolios/${id}`, payload);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export async function deletePortfolio(id: OasisId) {
  const result = await oasisApi.delete(`portfolios/${id}`);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export type PortfolioFileKind = "location_file" | "accounts_file" | "reinsurance_info_file" | "reinsurance_scope_file";

export async function deletePortfolioFile(id: OasisId, kind: PortfolioFileKind) {
  const result = await oasisApi.delete(`portfolios/${id}/${kind}`);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export async function validatePortfolio(id: OasisId) {
  const result = await oasisApi.post<PortfolioValidation>(`portfolios/${id}/validate`);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export async function runPortfolioExposure(id: OasisId, params: Record<string, unknown> = {}) {
  const result = await oasisApi.post<{ message?: string }>(`portfolios/${id}/exposure_run`, { params });
  invalidateCachedOasisItems("portfolios");
  return result;
}

export async function uploadPortfolioFile(
  id: OasisId,
  kind: PortfolioFileKind,
  file: File,
) {
  const form = new FormData();
  form.append("file", file, file.name);
  const result = await oasisApi.upload<PortfolioFile>(`portfolios/${id}/${kind}`, form);
  invalidateCachedOasisItems("portfolios");
  return result;
}

export function downloadPortfolioFile(id: OasisId, kind: string, fileFormat = "csv") {
  return oasisApi.download(`portfolios/${id}/${kind}`, { file_format: fileFormat });
}

export function downloadPortfolioErrorsFile(id: OasisId) {
  return oasisApi.download(`portfolios/${id}/errors_file`);
}

export function downloadPortfolioExposureRun(id: OasisId) {
  return oasisApi.download(`portfolios/${id}/exposure_run`);
}

export async function createAnalysisFromPortfolio(id: OasisId, payload: Record<string, unknown>) {
  const result = await oasisApi.post(`portfolios/${id}/create_analysis`, payload);
  invalidateCachedOasisItems("portfolios");
  invalidateCachedOasisItems("analyses");
  return result;
}
