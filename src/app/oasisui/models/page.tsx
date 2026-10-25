"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import EmptyState from "@/components/oasisui/EmptyState";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { useAuth } from "@/lib/AuthContext";
import { listModels } from "@/lib/oasis/models";
import type { Model } from "@/lib/oasis/types";

function modelName(model: Model) {
  return model.name || model.model_id || `Model ${model.id}`;
}

function modelVersion(model: Model) {
  return model.display_version || model.metadata?.display_version || "v0.0.1";
}

export default function ModelsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setModels(await listModels({ refresh }));
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setIsAdmin(user?.role === "admin"); }, [user]);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(false, false); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const incompleteModels = models.filter((model) => model.metadata?.needs_completion || model.metadata?.needs_review);

  return <OasisLayout>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-slate-900">Models</h1></div>
      <Button variant="outline" onClick={() => void load(true)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
    </div>
    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    {isAdmin && incompleteModels.length > 0 && <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-900"><AlertDescription>有 {incompleteModels.length} 个模型的元信息需要补全或复核。请点击对应模型卡片编辑 Peril、Region 和 Description。</AlertDescription></Alert>}
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading models…</div> : models.length === 0 ? <EmptyState title="No models found" description="请先向 Oasis API 注册模型或检查当前账号权限。" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {models.map((model) => {
        const metadataNeedsAttention = Boolean(model.metadata?.needs_completion || model.metadata?.needs_review);
        return <Card
          key={String(model.id)}
          tabIndex={0}
          role="link"
          onClick={() => router.push(`/oasisui/models/${model.id}`)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/oasisui/models/${model.id}`); } }}
          className="cursor-pointer border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <CardHeader><div className="flex items-start gap-3"><div className="rounded-lg bg-cyan-50 p-2.5"><Server className="h-5 w-5 text-cyan-700" /></div><div className="min-w-0"><CardTitle className="truncate text-lg">{modelName(model)}</CardTitle><p className="mt-1 truncate text-xs text-slate-500">{model.supplier_id || model.supplier || "Supplier not provided"}</p></div></div></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p><span className="font-medium text-slate-700">Version:</span> {modelVersion(model)}</p>
            <p><span className="font-medium text-slate-700">Peril:</span> {String(model.metadata?.peril || model.peril || "—")}</p>
            <p><span className="font-medium text-slate-700">Region:</span> {String(model.metadata?.region || "—")}</p>
            <p><span className="font-medium text-slate-700">Updated:</span> <LocalTimestamp value={model.modified || model.metadata?.oasis_modified} /></p>
            {metadataNeedsAttention && <p className="pt-1 text-xs font-medium text-amber-700">Metadata needs attention</p>}
          </CardContent>
        </Card>;
      })}
    </div>}
  </OasisLayout>;
}
