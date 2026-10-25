import { NextResponse } from "next/server";
import { OASIS_API_ROOTS, OASIS_API_VERSION } from "@/lib/oasis/constants";
import { invalidateOasisListCache, type OasisCacheKind } from "@/lib/oasis/metadata-db";
import {
  clearTokenCookies,
  getRequestTokens,
  oasisApiUrl,
  refreshToken,
  setTokenCookies,
  unauthorizedResponse,
} from "@/lib/oasis/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
type ProxyRequest = Request & { method: string };

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);

function isAllowedPath(segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    return false;
  }
  if (!(OASIS_API_ROOTS as readonly string[]).includes(segments[0])) return false;
  const path = segments.join("/");
  return [
    /^analyses$/,
    /^analyses\/[^/]+$/,
    /^analyses\/[^/]+\/(cancel|cancel_analysis_run|cancel_generate_inputs|chunking_configuration|copy|data_files|generate_and_run|generate_inputs|input_file|input_file_tar_extract|input_file_tar_list|input_generation_traceback_file|lookup_errors_file|lookup_success_file|lookup_validation_file|output_file|output_file_list|output_file_tar_extract|output_file_tar_list|run|run_log_file|run_progress|run_traceback_file|settings|settings_file|storage_links|sub_task_list|summary_levels_file)$/,
    /^analyses\/[^/]+\/output_file_sql\/[^/]+$/,
    /^analysis-task-statuses$/,
    /^analysis-task-statuses\/[^/]+$/,
    /^analysis-task-statuses\/[^/]+\/(error_log|output_log|retry_log)$/,
    /^data_files$/,
    /^data_files\/[^/]+(\/content)?$/,
    /^models$/,
    /^models\/[^/]+$/,
    /^models\/[^/]+\/(versions|chunking_configuration|data_files|scaling_configuration|settings|storage_links)$/,
    /^models\/[^/]+\/setting_templates$/,
    /^models\/[^/]+\/setting_templates\/[^/]+(\/content)?$/,
    /^portfolios$/,
    /^portfolios\/[^/]+$/,
    /^portfolios\/[^/]+\/(accounts_file|create_analysis|currency_conversion_json|errors_file|exposure_run|exposure_transform|location_file|reinsurance_info_file|reinsurance_scope_file|reporting_currency|storage_links|validate)$/,
    /^oed_peril_codes$/,
    /^server_info$/,
    /^queue(-status)?$/,
  ].some((pattern) => pattern.test(path));
}

function upstreamPath(segments: string[]) {
  return `/${OASIS_API_VERSION}/${segments.map((segment) => encodeURIComponent(segment)).join("/")}/`;
}

async function sendUpstream(request: ProxyRequest, segments: string[], accessToken: string) {
  const incoming = new URL(request.url);
  const target = new URL(oasisApiUrl(upstreamPath(segments)));
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("authorization");
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", headers.get("Accept") || "application/json");

  // DELETE requests in the UI have no payload. Passing an empty ArrayBuffer
  // makes undici send a mismatched content-length and throws before reaching
  // Oasis, which was incorrectly reported as "Oasis API is unavailable".
  const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method);
  return fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });
}

function responseFromUpstream(upstream: Response) {
  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length", "cache-control", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

function cacheKindsForMutation(segments: string[]): OasisCacheKind[] {
  if (segments[0] === "analyses") return ["analyses"];
  if (segments[0] === "portfolios" && segments[2] === "create_analysis") return ["portfolios", "analyses"];
  if (segments[0] === "portfolios") return ["portfolios"];
  return [];
}

async function handle(request: ProxyRequest, context: Context) {
  if (!allowedMethods.has(request.method)) return NextResponse.json({ detail: "Method not allowed" }, { status: 405 });
  const { path } = await context.params;
  if (!isAllowedPath(path)) return NextResponse.json({ detail: "Oasis endpoint is not allowed" }, { status: 404 });

  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return unauthorizedResponse();

  let accessToken = tokens.accessToken;
  let refreshed: Awaited<ReturnType<typeof refreshToken>> = null;
  if (!accessToken && tokens.refreshToken) refreshed = await refreshToken(tokens.refreshToken);
  if (refreshed?.access_token) accessToken = refreshed.access_token;
  if (!accessToken) return unauthorizedResponse("Oasis access token is expired");

  try {
    let upstream = await sendUpstream(request, path, accessToken);
    if (upstream.status === 401 && tokens.refreshToken) {
      refreshed = await refreshToken(tokens.refreshToken);
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token;
        upstream = await sendUpstream(request, path, accessToken);
      }
    }

    const response = responseFromUpstream(upstream);
    if (refreshed?.access_token) setTokenCookies(response, refreshed, tokens.username);
    if (upstream.status === 401) clearTokenCookies(response);
    if (upstream.ok && !["GET", "HEAD"].includes(request.method)) {
      const owner = tokens.username || "oasis-user";
      try {
        await Promise.all(cacheKindsForMutation(path).map((kind) => invalidateOasisListCache(owner, kind)));
      } catch {
        // Cache invalidation must never turn a successful Oasis mutation into a failure.
      }
    }
    return response;
  } catch {
    return NextResponse.json({ detail: "Oasis API is unavailable" }, { status: 503 });
  }
}

export const GET = (request: Request, context: Context) => handle(request as ProxyRequest, context);
export const POST = (request: Request, context: Context) => handle(request as ProxyRequest, context);
export const PUT = (request: Request, context: Context) => handle(request as ProxyRequest, context);
export const PATCH = (request: Request, context: Context) => handle(request as ProxyRequest, context);
export const DELETE = (request: Request, context: Context) => handle(request as ProxyRequest, context);
export const HEAD = (request: Request, context: Context) => handle(request as ProxyRequest, context);
