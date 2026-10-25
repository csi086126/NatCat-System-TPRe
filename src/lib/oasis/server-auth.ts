import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OASIS_ACCESS_COOKIE, OASIS_REFRESH_COOKIE, OASIS_USERNAME_COOKIE } from "./constants";

export interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  [key: string]: unknown;
}

export interface PlatformUser {
  id: number;
  email: string;
  display_name?: string | null;
  role?: string;
}

export interface RequestTokens {
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  role?: string;
  platformUser?: PlatformUser;
}

const apiBase = () => (process.env.OASIS_API_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");
const portfolioApiBase = () => (process.env.PORTFOLIO_API_URL || process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || "http://localhost:8765").replace(/\/$/, "");

export function oasisApiUrl(path: string) {
  return `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

type CachedServiceToken = TokenPayload & { expiresAt: number };
const globalForOasisAuth = globalThis as typeof globalThis & {
  oasisServiceToken?: CachedServiceToken;
  oasisServiceTokenPromise?: Promise<CachedServiceToken | null>;
};

function tokenExpiry(token?: string) {
  if (!token) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return payload.exp;
  } catch {
    return undefined;
  }
}

async function requestServiceToken(force = false): Promise<CachedServiceToken | null> {
  const cached = globalForOasisAuth.oasisServiceToken;
  if (!force && cached && cached.expiresAt > Date.now() + 30_000) return cached;
  if (globalForOasisAuth.oasisServiceTokenPromise && !force) return globalForOasisAuth.oasisServiceTokenPromise;

  const promise = (async () => {
    const username = process.env.OASIS_API_USERNAME;
    const password = process.env.OASIS_API_PASSWORD;
    if (!username || !password) return null;
    try {
      const response = await fetch(oasisApiUrl("/access_token/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = await response.json() as TokenPayload;
      if (!payload.access_token) return null;
      const expiresAt = (tokenExpiry(payload.access_token) || Math.floor(Date.now() / 1000) + 600) * 1000;
      const next = { ...payload, expiresAt };
      globalForOasisAuth.oasisServiceToken = next;
      return next;
    } catch {
      return null;
    }
  })();
  globalForOasisAuth.oasisServiceTokenPromise = promise;
  try { return await promise; } finally {
    if (globalForOasisAuth.oasisServiceTokenPromise === promise) globalForOasisAuth.oasisServiceTokenPromise = undefined;
  }
}

async function getPlatformUser() {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  try {
    const response = await fetch(`${portfolioApiBase()}/api/auth/me`, {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as PlatformUser;
  } catch {
    return null;
  }
}

export async function getRequestTokens(): Promise<RequestTokens> {
  const platformUser = await getPlatformUser();
  if (!platformUser) return {};
  const serviceToken = await requestServiceToken();
  if (!serviceToken) return { platformUser, username: platformUser.email, role: platformUser.role };
  return {
    accessToken: serviceToken.access_token,
    refreshToken: serviceToken.refresh_token,
    username: platformUser.email,
    role: platformUser.role,
    platformUser,
  };
}

export async function refreshToken(refreshToken: string): Promise<TokenPayload | null> {
  try {
    const response = await fetch(oasisApiUrl("/refresh_token/"), {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const fallback = await requestServiceToken(true);
      return fallback;
    }
    const payload = await response.json() as TokenPayload;
    if (payload.access_token) {
      globalForOasisAuth.oasisServiceToken = {
        ...payload,
        expiresAt: (tokenExpiry(payload.access_token) || Math.floor(Date.now() / 1000) + 600) * 1000,
      };
    }
    return payload;
  } catch {
    return requestServiceToken(true);
  }
}

// Oasis JWTs are deliberately kept server-side. These helpers remain for the
// existing route handlers, but no Oasis token is written to browser cookies.
export function setTokenCookies(_response: NextResponse, _payload: TokenPayload, _username?: string) {}

export function clearTokenCookies(response: NextResponse) {
  for (const name of [OASIS_ACCESS_COOKIE, OASIS_REFRESH_COOKIE, OASIS_USERNAME_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
}

export function unauthorizedResponse(message = "Platform session is not authenticated") {
  const response = NextResponse.json({ detail: message }, { status: 401 });
  clearTokenCookies(response);
  return response;
}
