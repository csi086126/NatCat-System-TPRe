import { asList, oasisApi } from "./api-client";
import type { Analysis, AnalysisTaskStatus, OasisId, RunProgress } from "./types";

export function getRunProgress(id: OasisId) {
  return oasisApi.get<RunProgress>(`analyses/${id}/run_progress`);
}

export async function listTaskStatuses() {
  return asList<AnalysisTaskStatus>(await oasisApi.get("analysis-task-statuses"));
}

export function getTaskList(id: OasisId) {
  return oasisApi.get<AnalysisTaskStatus[]>(`analyses/${id}/sub_task_list`);
}

export function getAnalysisValidation(id: OasisId) {
  return oasisApi.get<Analysis>(`analyses/${id}/lookup_validation_file`);
}
