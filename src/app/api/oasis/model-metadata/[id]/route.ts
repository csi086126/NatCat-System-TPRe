import { NextResponse } from "next/server";
import { getModelMetadata, updateModelMetadata, type ModelMetadataPatch } from "@/lib/oasis/model-meta-db";
import { getRequestTokens, unauthorizedResponse } from "@/lib/oasis/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return unauthorizedResponse();
  const { id } = await context.params;
  const metadata = await getModelMetadata(id);
  if (!metadata) return NextResponse.json({ detail: "Model metadata not found" }, { status: 404 });
  return NextResponse.json({ metadata });
}

export async function PUT(request: Request, context: Context) {
  const tokens = await getRequestTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return unauthorizedResponse();
  if (tokens.role !== "admin") return NextResponse.json({ detail: "Administrator permission is required" }, { status: 403 });

  let body: ModelMetadataPatch;
  try {
    body = await request.json() as ModelMetadataPatch;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON request" }, { status: 400 });
  }

  const { id } = await context.params;
  const metadata = await updateModelMetadata(id, {
    peril: body.peril,
    region: body.region,
    description: body.description,
  });
  if (!metadata) return NextResponse.json({ detail: "Model metadata not found" }, { status: 404 });
  return NextResponse.json({ metadata });
}
