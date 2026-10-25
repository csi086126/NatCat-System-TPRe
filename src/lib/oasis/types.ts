export type OasisId = string | number;

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export interface Session {
  authenticated: boolean;
  username?: string;
  expiresAt?: number;
}

export interface Portfolio {
  id: OasisId;
  name?: string;
  description?: string;
  created?: string;
  modified?: string;
  user?: string;
  exposure_status?: PortfolioStatus;
  validation_status?: PortfolioStatus;
  exposure_transform_status?: PortfolioStatus;
  location_file?: string | null;
  accounts_file?: string | null;
  reinsurance_info_file?: string | null;
  reinsurance_scope_file?: string | null;
  [key: string]: unknown;
}

export type PortfolioStatus =
  | "NONE"
  | "INSUFFICIENT_DATA"
  | "STARTED"
  | "ERROR"
  | "RUN_COMPLETED"
  | string;

export interface PortfolioValidation {
  location_validated?: string;
  accounts_validated?: string;
  reinsurance_info_validated?: string;
  reinsurance_scope_validated?: string;
  [key: string]: unknown;
}

export interface PortfolioFile {
  id?: OasisId;
  name?: string;
  file_name?: string;
  file_size?: number;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface Model {
  id: OasisId;
  name?: string;
  model_id?: string;
  version?: string;
  version_id?: string;
  modified?: string;
  peril?: string;
  supplier?: string;
  supplier_id?: string;
  run_mode?: string;
  display_version?: string;
  metadata?: ModelMetadata;
  created?: string;
  [key: string]: unknown;
}

export interface ModelMetadata {
  oasis_model_id?: OasisId;
  display_version?: string;
  peril?: string;
  region?: string;
  description?: string;
  oasis_modified?: string;
  metadata_updated_at?: string;
  needs_completion?: boolean;
  needs_review?: boolean;
  [key: string]: unknown;
}

export interface ModelVersion {
  id?: OasisId;
  version?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SettingTemplate {
  id: OasisId;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export type AnalysisStatus =
  | "NEW"
  | "READY"
  | "INPUTS_GENERATION_QUEUED"
  | "INPUTS_GENERATION_STARTED"
  | "INPUTS_GENERATION_ERROR"
  | "INPUTS_GENERATION_CANCELLED"
  | "RUN_QUEUED"
  | "RUN_STARTED"
  | "RUN_COMPLETED"
  | "RUN_ERROR"
  | "RUN_CANCELLED"
  | string;

export interface Analysis {
  id: OasisId;
  name?: string;
  status?: AnalysisStatus;
  model?: OasisId | Model;
  model_version?: OasisId | string;
  portfolio?: OasisId | Portfolio;
  created?: string;
  modified?: string;
  run_mode?: string;
  [key: string]: unknown;
}

export interface AnalysisTaskStatus {
  id?: OasisId;
  task_id?: string;
  name?: string;
  slug?: string;
  queue_name?: string;
  task_type?: string;
  status?: string;
  message?: string;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface RunProgress {
  progress?: number;
  completed?: number;
  total?: number;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface OutputFile {
  id?: OasisId;
  name?: string;
  file_name?: string;
  filename?: string;
  file?: string;
  sql?: string;
  file_size?: number;
  mime_type?: string;
  created?: string;
  [key: string]: unknown;
}

export interface ValidationSummary {
  valid?: boolean;
  errors?: number;
  warnings?: number;
  message?: string;
  [key: string]: unknown;
}

export interface Paginated<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
  data?: T[];
  items?: T[];
  [key: string]: unknown;
}

export type OasisList<T> = T[] | Paginated<T> | Record<string, unknown>;
