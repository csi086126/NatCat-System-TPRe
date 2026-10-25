"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, GitCompareArrows, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "./OasisLayout";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";
import CsvResultViewer from "./CsvResultViewer";
import LocalTimestamp from "./LocalTimestamp";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { listAnalyses } from "@/lib/oasis/analyses";
import { listOutputFiles } from "@/lib/oasis/outputs";
import type { Analysis, OutputFile } from "@/lib/oasis/types";

export default function AnalysisDashboard({ mode }: { mode: "single" | "batch" | "compare" }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [resultFiles, setResultFiles] = useState<OutputFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");
  const completed = analyses.filter((analysis) => analysis.status === "RUN_COMPLETED");

  async function load(refresh = false, showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try { setAnalyses(await listAnalyses({ refresh })); }
    catch (loadError) { setError(apiErrorMessage(loadError)); }
    finally { if (showLoading) setLoading(false); }
  }

  useEffect(() => { void load(); }, [mode]);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(false, false); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (mode !== "single") return;
    if (!completed.some((analysis) => String(analysis.id) === selectedId)) setSelectedId(String(completed[0]?.id || ""));
  }, [analyses, mode, selectedId]);
  useEffect(() => {
    if (mode !== "single" || !selectedId) { setResultFiles([]); return; }
    setLoadingResults(true);
    listOutputFiles(selectedId).then(setResultFiles).catch(() => setResultFiles([])).finally(() => setLoadingResults(false));
  }, [mode, selectedId]);

  const title = mode === "single" ? "Single analysis dashboard" : mode === "batch" ? "Batch analysis dashboard" : "Compare analyses";
  const description = mode === "single" ? "查看单个 Analysis 的状态、输出表格和损失曲线。" : mode === "batch" ? "按状态汇总多个 Analysis，便于批量运行监控。" : "并排选择已完成 Analysis，为后续损失指标对比提供入口。";
  return <OasisLayout>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-slate-500">{description}</p></div><Button variant="outline" onClick={() => void load(true)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total analyses</p><p className="mt-2 text-3xl font-bold text-slate-800">{loading ? "—" : analyses.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Completed</p><p className="mt-2 text-3xl font-bold text-emerald-600">{loading ? "—" : completed.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-500">Active</p><p className="mt-2 text-3xl font-bold text-blue-600">{loading ? "—" : analyses.filter((analysis) => ["RUN_QUEUED", "RUN_STARTED", "INPUTS_GENERATION_STARTED"].includes(String(analysis.status))).length}</p></CardContent></Card></div>
    {mode === "single" && completed.length > 0 && <Card className="mb-6"><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-700" /> Loss results</CardTitle><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-9 max-w-[360px] rounded-md border bg-white px-3 text-sm">{completed.map((analysis) => <option key={String(analysis.id)} value={String(analysis.id)}>{analysis.name || `Analysis ${analysis.id}`}</option>)}</select></CardHeader><CardContent>{loadingResults ? <p className="py-10 text-center text-sm text-slate-500">正在读取输出数据…</p> : <CsvResultViewer analysisId={selectedId} files={resultFiles} />}</CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2">{mode === "compare" ? <GitCompareArrows className="h-5 w-5 text-blue-600" /> : <BarChart3 className="h-5 w-5 text-blue-600" />} Analysis results</CardTitle></CardHeader><CardContent>{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading dashboard data…</p> : !analyses.length ? <EmptyState title="No analysis data" description="完成一个 Oasis analysis 后，结果摘要会显示在这里。" /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Analysis</th><th className="w-40 min-w-[10rem] px-4 py-3">Status</th><th className="px-4 py-3">Portfolio</th><th className="px-4 py-3">Modified</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y">{analyses.map((analysis) => <tr key={String(analysis.id)}><td className="px-4 py-3 font-medium text-slate-700">{analysis.name || `Analysis ${analysis.id}`}</td><td className="w-40 min-w-[10rem] whitespace-nowrap px-4 py-3"><StatusBadge status={analysis.status} /></td><td className="px-4 py-3 text-slate-500">{String(analysis.portfolio ?? "—")}</td><td className="px-4 py-3 text-slate-500"><LocalTimestamp value={analysis.modified} /></td><td className="px-4 py-3 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/oasisui/analyses/${analysis.id}`}>View <BarChart3 /></Link></Button></td></tr>)}</tbody></table></div>}</CardContent></Card>
  </OasisLayout>;
}
