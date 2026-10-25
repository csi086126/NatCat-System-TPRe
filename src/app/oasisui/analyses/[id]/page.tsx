"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Play, RefreshCw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import AnalysisWorkspaceTabs from "@/components/oasisui/AnalysisWorkspaceTabs";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import StatusBadge from "@/components/oasisui/StatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { cancelAnalysis, deleteAnalysis, getAnalysis, runAnalysis } from "@/lib/oasis/analyses";
import { deleteOasisDescription, getOasisDescription } from "@/lib/oasis/metadata";
import { getModel } from "@/lib/oasis/models";
import { getPortfolio } from "@/lib/oasis/portfolios";
import type { Analysis, Model, OasisId, Portfolio } from "@/lib/oasis/types";

const activeStatuses = new Set(["INPUTS_GENERATION_QUEUED", "INPUTS_GENERATION_STARTED", "RUN_QUEUED", "RUN_STARTED"]);
const runStatuses = new Set(["READY", "RUN_COMPLETED", "RUN_CANCELLED", "RUN_ERROR"]);

function relationId(relation: unknown): OasisId | undefined {
  const value = relation && typeof relation === "object" && "id" in relation
    ? (relation as { id?: unknown }).id
    : relation;
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function relationName(relation: unknown, fallback: string) {
  if (relation && typeof relation === "object" && "name" in relation) {
    const name = String((relation as { name?: unknown }).name || "").trim();
    if (name) return name;
  }
  return fallback;
}

function linkedRelationLabel(name: string, id: OasisId) {
  return `${name} (${String(id)})`;
}

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [analysisResult, savedDescription] = await Promise.all([getAnalysis(id), getOasisDescription("analysis", id)]);
      setAnalysis(analysisResult); setDescription(savedDescription || String(analysisResult.description || ""));
      const inlineModel = analysisResult.model && typeof analysisResult.model === "object" ? analysisResult.model : null;
      const inlinePortfolio = analysisResult.portfolio && typeof analysisResult.portfolio === "object" ? analysisResult.portfolio : null;
      const modelId = relationId(analysisResult.model);
      const portfolioId = relationId(analysisResult.portfolio);
      const [modelResult, portfolioResult] = await Promise.all([
        modelId !== undefined && modelId !== null ? getModel(modelId).catch(() => null) : Promise.resolve(null),
        portfolioId !== undefined && portfolioId !== null ? getPortfolio(portfolioId).catch(() => null) : Promise.resolve(null),
      ]);
      setModel(modelResult || inlineModel);
      setPortfolio(portfolioResult || inlinePortfolio);
    } catch (loadError) { setError(apiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);
  useEffect(() => {
    const analysisStatus = analysis?.status;
    if (!analysisStatus || !activeStatuses.has(String(analysisStatus))) return;
    const poll = async () => {
      try {
        setAnalysis(await getAnalysis(id));
      } catch { /* The next poll or a manual refresh can recover transient API errors. */ }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(timer);
  }, [analysis?.status, id]);

  async function actionRun(name: "run" | "cancel") {
    setAction(name); setError("");
    try {
      if (name === "run") await runAnalysis(id);
      if (name === "cancel") await cancelAnalysis(id);
      await load();
    } catch (actionError) { setError(apiErrorMessage(actionError)); }
    finally { setAction(""); }
  }

  async function removeAnalysis() {
    if (!window.confirm(`Delete analysis “${analysis?.name || id}” and its generated files? This cannot be undone.`)) return;
    setDeleting(true); setError("");
    try {
      await deleteAnalysis(id);
      await deleteOasisDescription("analysis", id).catch(() => undefined);
      router.push("/oasisui/analyses");
    } catch (deleteError) { setError(apiErrorMessage(deleteError)); setDeleting(false); }
  }

  return <OasisLayout>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><BackButton className="mb-2 -ml-3" /><h1 className="text-3xl font-bold text-slate-900">{analysis?.name || `Analysis ${id}`}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}<p className="mt-2 text-sm text-slate-500">Analysis ID {id}</p></div>
      <div className="oasis-action-row flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading || deleting}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button><Button variant="outline" onClick={() => void actionRun("run")} disabled={!analysis || Boolean(action) || !runStatuses.has(String(analysis?.status))}><Play />{action === "run" ? "Starting…" : "Run analysis"}</Button><Button variant="outline" onClick={() => void actionRun("cancel")} disabled={!analysis || Boolean(action) || !activeStatuses.has(String(analysis?.status))}><Ban />{action === "cancel" ? "Cancelling…" : "Cancel task"}</Button><Button variant="destructive" onClick={() => void removeAnalysis()} disabled={loading || deleting || Boolean(action)}><Trash2 />{deleting ? "Deleting…" : "Delete"}</Button></div>
    </div>
    {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
    {loading && !analysis ? <div className="py-16 text-center text-sm text-slate-500">Loading analysis…</div> : analysis ? <>
      <Card className="mb-6">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2 text-sm text-slate-500">
            {(() => {
              const portfolioId = relationId(analysis.portfolio);
              const portfolioName = relationName(portfolio, `Portfolio ${String(portfolioId)}`);
              return <p>Portfolio: {portfolioId !== undefined && portfolioId !== null ? <Link href={`/oasisui/portfolios/${portfolioId}`} className="font-medium text-cyan-700 hover:underline">{linkedRelationLabel(portfolioName, portfolioId)}</Link> : <span className="font-medium text-slate-700">—</span>}</p>;
            })()}
            {(() => {
              const modelId = relationId(analysis.model);
              const modelName = relationName(model, model ? (model.model_id || `Model ${String(modelId)}`) : `Model ${String(modelId)}`);
              return <p>Model: {modelId !== undefined && modelId !== null ? <Link href={`/oasisui/models/${modelId}`} className="font-medium text-cyan-700 hover:underline">{linkedRelationLabel(modelName, modelId)}</Link> : <span className="font-medium text-slate-700">—</span>}</p>;
            })()}
            <p>Run mode: <span className="font-medium text-slate-700">{String(analysis.run_mode ?? "—")}</span></p>
          </div>
          <div className="border-t pt-4 md:min-w-48 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <p className="text-sm text-slate-500">Current status</p>
            <div className="mt-2"><StatusBadge status={analysis.status} /></div>
            <p className="mt-2 text-xs text-slate-500"><LocalTimestamp value={analysis.modified || analysis.created} fallback="时间未提供" /></p>
          </div>
        </CardContent>
      </Card>
      <AnalysisWorkspaceTabs analysisId={id} analysis={analysis} model={model} />
    </> : <Alert variant="destructive"><AlertDescription>Analysis not found.</AlertDescription></Alert>}
  </OasisLayout>;
}
