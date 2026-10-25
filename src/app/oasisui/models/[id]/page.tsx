"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, RefreshCw, Save, Server, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import EmptyState from "@/components/oasisui/EmptyState";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import StatusBadge from "@/components/oasisui/StatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { useAuth } from "@/lib/AuthContext";
import { getModel, listModels, updateModelMetadata } from "@/lib/oasis/models";
import type { Model, ModelMetadata } from "@/lib/oasis/types";

function modelName(model: Model) {
  return model.name || model.model_id || `Model ${model.id}`;
}

function splitPerils(value: unknown) {
  const perils = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  return perils.length ? perils : ["NOT_CONFIGURED"];
}

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [model, setModel] = useState<Model | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [peril, setPeril] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const [catalogModels, oasisModel] = await Promise.all([listModels({ refresh }), getModel(id)]);
      const catalogModel = catalogModels.find((candidate) => String(candidate.id) === String(id));
      const mergedModel = { ...oasisModel, ...catalogModel };
      const nextMetadata = catalogModel?.metadata || null;
      setModel(mergedModel);
      setMetadata(nextMetadata);
      setPeril(String(nextMetadata?.peril || ""));
      setRegion(String(nextMetadata?.region || ""));
      setDescription(String(nextMetadata?.description || ""));
      setIsAdmin(user?.role === "admin");
      setIsEditing(false);
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!id || !isAdmin) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await updateModelMetadata(id, { peril, region, description });
      const nextMetadata = result && typeof result === "object" && "metadata" in result ? (result as { metadata?: ModelMetadata }).metadata || null : null;
      setMetadata(nextMetadata);
      setModel((current) => current ? { ...current, metadata: nextMetadata || undefined, display_version: "v0.0.1" } : current);
      setMessage("Model metadata saved.");
      setIsEditing(false);
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setPeril(String(metadata?.peril || ""));
    setRegion(String(metadata?.region || ""));
    setDescription(String(metadata?.description || ""));
    setIsEditing(false);
  }

  const needsAttention = Boolean(metadata?.needs_completion || metadata?.needs_review);

  return <OasisLayout>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><BackButton className="mb-2 -ml-3" /><h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900"><Server className="h-7 w-7 text-cyan-700" />{model ? modelName(model) : `Model ${id}`}</h1><p className="mt-2 text-sm text-slate-500">Model ID {id}</p></div>
      <Button variant="outline" onClick={() => void load(true)} disabled={loading || saving}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
    </div>
    {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
    {message && <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-800"><AlertDescription>{message}</AlertDescription></Alert>}
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading model…</div> : !model ? <EmptyState title="Model not found" description="当前 Oasis API 没有返回这个模型。" /> : <>
      {needsAttention && <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-900"><AlertDescription>{isAdmin ? "这个模型是新注册或 Oasis 后台最近更新过的模型，请补全或复核下面的元信息。" : "这个模型的元信息尚未完整，请联系管理员补全 Peril、Region 和 Description。"}</AlertDescription></Alert>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Display version</p><p className="mt-2 text-xl font-bold text-slate-800">v0.0.1</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Oasis version ID</p><p className="mt-2 font-semibold text-slate-700">{String(model.version_id || "—")}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Run mode</p><p className="mt-2 font-semibold text-slate-700">{String(model.run_mode || "—")}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Updated</p><p className="mt-2 font-semibold text-slate-700"><LocalTimestamp value={model.modified || metadata?.oasis_modified} /></p></CardContent></Card>
      </div>
      <Card className="mb-6"><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Model information</CardTitle></div>{isAdmin && (isEditing ? <div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}><X />Cancel</Button><Button type="submit" form="model-metadata-form" disabled={saving}><Save />{saving ? "Saving…" : "Save"}</Button></div> : <Button type="button" variant="outline" onClick={() => { setMessage(""); setError(""); setIsEditing(true); }} disabled={loading || saving}><Pencil />Edit</Button>)}</CardHeader><CardContent><form id="model-metadata-form" onSubmit={save} className="grid gap-5 text-sm sm:grid-cols-2"><div><p className="text-slate-500">Supplier ID</p><p className="mt-1 font-medium text-slate-800">{String(model.supplier_id || model.supplier || "—")}</p></div><div><p className="text-slate-500">Model ID</p><p className="mt-1 font-medium text-slate-800">{String(model.model_id || model.id)}</p></div><div><p className="text-slate-500">Peril</p>{isEditing ? <input id="model-peril" value={peril} onChange={(event) => setPeril(event.target.value)} placeholder="e.g. OSF or WSS, OSF" className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500" required /> : <div className="mt-1 flex flex-wrap gap-2">{splitPerils(metadata?.peril || model.peril).map((item) => <StatusBadge key={item} status={item} />)}</div>}</div><div><p className="text-slate-500">Region</p>{isEditing ? <input id="model-region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="e.g. Hong Kong" className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500" required /> : <p className="mt-1 font-medium text-slate-800">{metadata?.region || "Not configured"}</p>}</div><div className="sm:col-span-2"><p className="text-slate-500">Description</p>{isEditing ? <textarea id="model-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe this catastrophe model" className="mt-1 min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500" required /> : <p className="mt-1 leading-6 text-slate-700">{metadata?.description || "No description provided."}</p>}</div><div className="sm:col-span-2"><p className="text-slate-500">Groups</p><p className="mt-1 text-slate-700">{Array.isArray(model.groups) && model.groups.length ? model.groups.join(", ") : "—"}</p></div></form></CardContent></Card>
    </>}
  </OasisLayout>;
}
