import { NextResponse } from "next/server";
import { asList } from "@/lib/oasis/api-client";
import { OASIS_API_VERSION } from "@/lib/oasis/constants";
import { getCachedModels, saveSyncedModels } from "@/lib/oasis/model-meta-db";
import {
  getRequestTokens,
  oasisApiUrl,
  refreshToken,
  setTokenCookies,
  unauthorizedResponse,
  type TokenPayload,
} from "@/lib/oasis/server-auth";
import type { Model, ModelMetadata } from "@/lib/oasis/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYNC_TTL_MS = 30_000;

class ModelSyncError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ModelSyncError";
    this.status = status;
  }
}

type SyncResult = { models: Model[]; syncedAt: string; refreshed?: TokenPayload };
const globalForModelSync = globalThis as typeof globalThis & {
  oasisModelSyncLock?: Promise<SyncResult>;
};

function modelText(model: Model) {
  return [model.name, model.model_id, model.supplier_id, model.version_id].filter(Boolean).join(" ").toLowerCase();
}

function modelDefaults(model: Model): Pick<ModelMetadata, "peril" | "region" | "description"> {
  const text = modelText(model);
  if (text.includes("piwind")) {
    return {
      peril: "XSL",
      region: "United Kingdom",
      description: "Probabilistic wind catastrophe model for the United Kingdom.",
    };
  }
  const isHongKongDualPerilModel = /(?:^|[^a-z0-9])hkflood10(?:[^0-9]|$)/.test(text)
    || /(?:^|[^a-z0-9])hkflood10000(?:[^0-9]|$)/.test(text);
  if (isHongKongDualPerilModel) {
    return {
      peril: "WSS, OSF",
      region: "Hong Kong",
      description: "Hong Kong flood catastrophe model.",
    };
  }
  if (text.includes("flood")) {
    return { peril: "OSF", region: "", description: "Flood catastrophe model." };
  }
  return { peril: "", region: "", description: "" };
}

async function readPayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) return response.json().catch(() => null);
  return response.text().catch(() => null);
}

async function fetchModels(accessToken: string) {
  let response: Response;
  try {
    response = await fetch(oasisApiUrl(`/${OASIS_API_VERSION}/models/`), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ModelSyncError("Oasis API is unavailable", 503);
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload
      ? String((payload as { detail?: unknown }).detail)
      : `Oasis API request failed (${response.status})`;
    throw new ModelSyncError(detail, response.status);
  }
  return asList<Model>(payload);
}

async function syncModels(tokens: Awaited<ReturnType<typeof getRequestTokens>>): Promise<SyncResult> {
  let accessToken = tokens.accessToken;
  let refreshed: TokenPayload | undefined;
  if (!accessToken && tokens.refreshToken) {
    const refreshedPayload = await refreshToken(tokens.refreshToken);
    if (refreshedPayload?.access_token) {
      accessToken = refreshedPayload.access_token;
      refreshed = refreshedPayload;
    }
  }
  if (!accessToken) throw new ModelSyncError("Oasis access token is expired", 401);

  try {
    const models = await fetchModels(accessToken);
    const cached = await saveSyncedModels(models, modelDefaults);
    return { models: cached.models, syncedAt: cached.syncedAt || new Date().toISOString(), refreshed };
  } catch (error) {
    if (!(error instanceof ModelSyncError) || error.status !== 401 || !tokens.refreshToken) throw error;
    const refreshedPayload = await refreshToken(tokens.refreshToken);
    if (!refreshedPayload?.access_token) throw error;
    const models = await fetchModels(refreshedPayload.access_token);
    const cached = await saveSyncedModels(models, modelDefaults);
    return { models: cached.models, syncedAt: cached.syncedAt || new Date().toISOString(), refreshed: refreshedPayload };
  }
}

function syncOnce(tokens: Awaited<ReturnType<typeof getRequestTokens>>) {
  if (globalForModelSync.oasisModelSyncLock) return globalForModelSync.oasisModelSyncLock;
  const promise = syncModels(tokens).finally(() => { globalForModelSync.oasisModelSyncLock = undefined; });
  globalForModelSync.oasisModelSyncLock = promise;
  return promise;
}

function responseError(error: unknown) {
  if (error instanceof ModelSyncError) {
    return NextResponse.json({ detail: error.message }, { status: error.status >= 500 ? 502 : error.status });
  }
  return NextResponse.json({ detail: "Model metadata synchronization failed" }, { status: 503 });
}

export async function GET(request: Request) {
  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return unauthorizedResponse();

  const cached = await getCachedModels();
  const age = cached.syncedAt ? Date.now() - Date.parse(cached.syncedAt) : Number.POSITIVE_INFINITY;
  const stale = !cached.syncedAt || !Number.isFinite(age) || age >= SYNC_TTL_MS;
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";

  if (forceRefresh || !cached.models.length || !cached.syncedAt) {
    try {
      const synced = await syncOnce(tokens);
      const response = NextResponse.json({ models: synced.models, syncedAt: synced.syncedAt, stale: false });
      if (synced.refreshed) setTokenCookies(response, synced.refreshed, tokens.username);
      return response;
    } catch (error) {
      return responseError(error);
    }
  }

  if (stale) {
    void syncOnce(tokens).catch(() => undefined);
    return NextResponse.json({ models: cached.models, syncedAt: cached.syncedAt, stale: true });
  }
  return NextResponse.json({ models: cached.models, syncedAt: cached.syncedAt, stale: false });
}
