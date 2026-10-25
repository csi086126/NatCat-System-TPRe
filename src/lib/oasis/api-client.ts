import type { ApiError } from "./types";

export class OasisApiError extends Error {
  status: number;
  payload: ApiError | unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "OasisApiError";
    this.status = status;
    this.payload = payload;
  }
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function parseQuery(query?: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
    return response.json().catch(() => null);
  }
  return response.arrayBuffer();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [pathname, search] = path.split("?");
  const response = await fetch(`/api/oasis/v2/${encodePath(pathname)}${search ? `?${search}` : ""}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    redirectToLoginOnUnauthorized(response);
    const detail = formatApiError(payload, response.status);
    throw new OasisApiError(detail, response.status, payload);
  }
  return payload as T;
}

function formatApiError(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (!payload || typeof payload !== "object") return `Oasis API request failed (${status})`;
  const record = payload as Record<string, unknown>;
  if (record.detail) return String(record.detail);
  if (record.message) return String(record.message);
  const fields = Object.entries(record)
    .map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${field}: ${message}`;
    })
    .filter((entry) => entry.length > 0);
  return fields.length ? fields.join("; ") : `Oasis API request failed (${status})`;
}

export const oasisApi = {
  get<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
    return request<T>(`${path}${parseQuery(query)}`);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  },
  delete<T = void>(path: string) {
    return request<T>(path, { method: "DELETE", headers: { Accept: "application/json" } });
  },
  upload<T>(path: string, formData: FormData) {
    return request<T>(path, { method: "POST", body: formData });
  },
  async download(path: string, query?: Record<string, string | number | boolean | undefined>) {
    const response = await fetch(`/api/oasis/v2/${encodePath(path)}${parseQuery(query)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      redirectToLoginOnUnauthorized(response);
      const payload = await parseResponse(response);
      throw new OasisApiError(`Download failed (${response.status})`, response.status, payload);
    }
    return response;
  },
};

function redirectToLoginOnUnauthorized(response: Response) {
  if (response.status !== 401 || typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["results", "data", "items", "objects"]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

export function apiErrorMessage(error: unknown) {
  if (error instanceof OasisApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "请求 Oasis API 时发生未知错误";
}
