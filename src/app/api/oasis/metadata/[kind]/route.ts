import { NextResponse } from "next/server";
import { deleteDescription, listDescriptions, saveDescription, type MetadataKind } from "@/lib/oasis/metadata-db";
import { getRequestTokens, unauthorizedResponse } from "@/lib/oasis/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ kind: string }> };

function isMetadataKind(value: string): value is MetadataKind {
  return value === "portfolio" || value === "analysis";
}

async function getOwner() {
  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return null;
  return tokens.username || "oasis-user";
}

export async function GET(_request: Request, context: Context) {
  const owner = await getOwner();
  if (!owner) return unauthorizedResponse();
  const { kind } = await context.params;
  if (!isMetadataKind(kind)) return NextResponse.json({ detail: "Invalid metadata kind" }, { status: 400 });
  return NextResponse.json({ kind, descriptions: await listDescriptions(owner, kind) });
}

export async function PUT(request: Request, context: Context) {
  const owner = await getOwner();
  if (!owner) return unauthorizedResponse();
  const { kind } = await context.params;
  if (!isMetadataKind(kind)) return NextResponse.json({ detail: "Invalid metadata kind" }, { status: 400 });

  let body: { id?: string | number; description?: string };
  try {
    body = await request.json() as { id?: string | number; description?: string };
  } catch {
    return NextResponse.json({ detail: "Invalid JSON request" }, { status: 400 });
  }

  const oasisId = String(body.id ?? "").trim();
  if (!oasisId) return NextResponse.json({ detail: "Metadata id is required" }, { status: 400 });
  const description = String(body.description ?? "").trim();
  if (description) await saveDescription(owner, kind, oasisId, description);
  else await deleteDescription(owner, kind, oasisId);
  return NextResponse.json({ kind, id: oasisId, description });
}
