export const OASIS_ACCESS_COOKIE = "oasis_access_token";
export const OASIS_REFRESH_COOKIE = "oasis_refresh_token";
export const OASIS_USERNAME_COOKIE = "oasis_username";

export const OASIS_API_VERSION = process.env.OASIS_API_VERSION || "v2";

export const OASIS_API_ROOTS = [
  "analyses",
  "analysis-task-statuses",
  "data_files",
  "models",
  "oed_peril_codes",
  "portfolios",
  "server_info",
  "setting_templates",
  "status",
] as const;

export const OASIS_ACCESS_MAX_AGE = 15 * 60;
export const OASIS_REFRESH_MAX_AGE = 7 * 24 * 60 * 60;
