import { cookies } from "next/headers";

function backendUrl(path: string) {
  const base = (process.env.PORTFOLIO_API_URL || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || "http://localhost:8765").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function platformDbRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  const response = await fetch(backendUrl(path), { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail)
      : `Platform database request failed (${response.status})`;
    throw new Error(detail);
  }
  return payload as T;
}

