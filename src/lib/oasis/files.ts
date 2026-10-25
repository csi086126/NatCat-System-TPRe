import { asList, oasisApi } from "./api-client";
import type { OasisId, PortfolioFile } from "./types";

export async function listAnalysisDataFiles(id: OasisId) {
  return asList<PortfolioFile>(await oasisApi.get(`analyses/${id}/data_files`));
}

export function downloadInputFile(id: OasisId) {
  return oasisApi.download(`analyses/${id}/input_file`);
}

export function downloadInputTar(id: OasisId) {
  return oasisApi.download(`analyses/${id}/input_file`, { file_format: "tar" });
}

export function downloadAnalysisArtifact(id: OasisId, kind: "lookup_validation_file" | "lookup_errors_file" | "lookup_success_file" | "run_log_file" | "run_traceback_file" | "input_generation_traceback_file") {
  return oasisApi.download(`analyses/${id}/${kind}`);
}
