"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Archive, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OutputFileList from "@/components/oasisui/OutputFileList";
import OutputFilePreviewDialog from "@/components/oasisui/OutputFilePreviewDialog";
import CsvResultViewer from "@/components/oasisui/CsvResultViewer";
import StatusBadge from "@/components/oasisui/StatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { getAnalysisSettings, updateAnalysisSettings } from "@/lib/oasis/analyses";
import { downloadAnalysisArtifact } from "@/lib/oasis/files";
import { getModel, getModelSettings } from "@/lib/oasis/models";
import { listOutputFiles, downloadOutputTar } from "@/lib/oasis/outputs";
import { buildAnalysisSettings, defaultOutputOptions } from "@/lib/oasis/settings";
import { getRunProgress, getTaskList } from "@/lib/oasis/status";
import type { Analysis, AnalysisTaskStatus, Model, OutputFile, RunProgress } from "@/lib/oasis/types";

type WorkspaceTab = "settings" | "progress" | "diagnostics" | "outputs";

const tabs = [
  { id: "outputs" as const, label: "Result dashboard" },
  { id: "settings" as const, label: "Output settings" },
  { id: "progress" as const, label: "Progress" },
  { id: "diagnostics" as const, label: "Validation & logs" },
];

const artifacts = [
  { kind: "lookup_validation_file" as const, label: "Lookup validation", description: "Validation output produced during lookup." },
  { kind: "lookup_errors_file" as const, label: "Lookup errors", description: "Errors reported while matching exposure to model data." },
  { kind: "lookup_success_file" as const, label: "Lookup success", description: "Successful lookup records for audit and review." },
  { kind: "input_generation_traceback_file" as const, label: "Input generation traceback", description: "Traceback produced when input generation fails." },
  { kind: "run_log_file" as const, label: "Run log", description: "Worker log for the analysis run." },
  { kind: "run_traceback_file" as const, label: "Run traceback", description: "Traceback produced by a failed run." },
];

function SettingsTab({ id, analysis, model }: { id: string; analysis: Analysis; model: Model | null }) {
  const [text, setText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const settings = await getAnalysisSettings(id);
        if (!cancelled) setText(JSON.stringify(settings, null, 2));
        return;
      } catch (settingsError) {
        try {
          const inlineModel = analysis.model && typeof analysis.model === "object" ? analysis.model as Model : null;
          const selectedModel = model || inlineModel || (analysis.model !== undefined && analysis.model !== null ? await getModel(analysis.model as string | number) : null);
          if (!selectedModel) throw settingsError;
          const modelSettings = await getModelSettings(selectedModel.id);
          const samples = typeof analysis.number_of_samples === "number" ? analysis.number_of_samples : 1;
          const defaults = buildAnalysisSettings(selectedModel, modelSettings, String(analysis.name || `Analysis ${id}`), samples, defaultOutputOptions);
          if (!cancelled) {
            setText(JSON.stringify(defaults, null, 2));
            setMessage("该 analysis 还没有 output settings，已加载默认配置；请检查后保存。");
          }
        } catch {
          if (!cancelled) setError(apiErrorMessage(settingsError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSettings();
    return () => { cancelled = true; };
  }, [analysis, id, model]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      await updateAnalysisSettings(id, JSON.parse(text) as unknown);
      setMessage("Settings saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof SyntaxError ? "Settings 必须是有效的 JSON。" : apiErrorMessage(saveError));
    } finally { setSaving(false); }
  }

  return <div><Card><CardHeader><CardTitle>Settings JSON</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{message && <Alert><AlertDescription className="text-emerald-700">{message}</AlertDescription></Alert>}<textarea value={text} onChange={(event) => setText(event.target.value)} disabled={loading || saving} className="min-h-[480px] w-full rounded-lg border bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none ring-blue-500 focus:ring-2" spellCheck={false} /><div className="flex justify-end"><Button type="submit" disabled={loading || saving}><Save />{saving ? "Saving…" : "Save settings"}</Button></div></form></CardContent></Card></div>;
}

function ProgressTab({ id }: { id: string }) {
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [tasks, setTasks] = useState<AnalysisTaskStatus[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [progressResult, taskResult] = await Promise.all([getRunProgress(id).catch(() => null), getTaskList(id).catch(() => [])]);
      setProgress(progressResult); setTasks(Array.isArray(taskResult) ? taskResult : []);
    } catch (loadError) { setError(apiErrorMessage(loadError)); }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const percent = typeof progress?.progress === "number" ? Math.max(0, Math.min(100, progress.progress)) : undefined;
  return <div className="space-y-4">{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{percent !== undefined && <Card><CardContent className="pt-6"><div className="mb-2 flex justify-between text-sm text-slate-500"><span>{progress?.message || "Processing"}</span><span>{Math.round(percent)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all" style={{ width: `${percent}%` }} /></div></CardContent></Card>}<Card><CardHeader><CardTitle>Sub-task statuses</CardTitle></CardHeader><CardContent>{tasks.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message</th></tr></thead><tbody className="divide-y">{tasks.map((task, index) => <tr key={String(task.id ?? task.task_id ?? index)}><td className="px-4 py-3 text-slate-700">{task.name || task.slug || task.task_type || task.task_id || `Task ${index + 1}`}</td><td className="px-4 py-3"><StatusBadge status={task.status} /></td><td className="px-4 py-3 text-slate-500">{task.message || "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">暂无子任务数据，页面会自动轮询 Oasis API。</p>}</CardContent></Card></div>;
}

function DiagnosticsTab({ id }: { id: string }) {
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  async function download(kind: (typeof artifacts)[number]["kind"], label: string) {
    setDownloading(kind); setError("");
    try { const response = await downloadAnalysisArtifact(id, kind); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `analysis-${id}-${label.toLowerCase().replaceAll(" ", "-")}`; anchor.click(); URL.revokeObjectURL(url); } catch (downloadError) { setError(apiErrorMessage(downloadError)); } finally { setDownloading(""); }
  }
  return <div>{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 md:grid-cols-2">{artifacts.map(({ kind, label, description }) => <Card key={kind}><CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{description}</p><Button variant="outline" size="sm" onClick={() => void download(kind, label)} disabled={Boolean(downloading)}><Download />{downloading === kind ? "Downloading…" : "Download"}</Button></CardContent></Card>)}</div></div>;
}

function OutputsTab({ id }: { id: string }) {
  const [files, setFiles] = useState<OutputFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewFile, setPreviewFile] = useState<OutputFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setFiles(await listOutputFiles(id)); }
    catch (loadError) { setError(apiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function downloadTar() {
    try { const response = await downloadOutputTar(id); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `analysis-${id}-outputs.tar.gz`; anchor.click(); URL.revokeObjectURL(url); }
    catch (downloadError) { setError(apiErrorMessage(downloadError)); }
  }

  return <div className="space-y-4">{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{!loading && files.length > 0 && <CsvResultViewer analysisId={id} files={files} />}<Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle>Output files</CardTitle><Button onClick={() => void downloadTar()} disabled={!files.length}><Archive /> Download all</Button></CardHeader><CardContent>{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading output files…</p> : <OutputFileList analysisId={id} files={files} onPreview={setPreviewFile} />}</CardContent></Card><OutputFilePreviewDialog analysisId={id} file={previewFile} onClose={() => setPreviewFile(null)} /></div>;
}

export default function AnalysisWorkspaceTabs({ analysisId, analysis, model }: { analysisId: string; analysis: Analysis; model: Model | null }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("outputs");
  return <Card className="mt-6"><div role="tablist" aria-label="Analysis workspace" className="grid gap-2 px-5 py-3 sm:grid-cols-2 xl:grid-cols-4">{tabs.map(({ id: tabId, label }) => <button key={tabId} type="button" role="tab" aria-selected={activeTab === tabId} onClick={() => setActiveTab(tabId)} className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === tabId ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</div><CardContent className="pt-6">{activeTab === "settings" && <SettingsTab id={analysisId} analysis={analysis} model={model} />}{activeTab === "progress" && <ProgressTab id={analysisId} />}{activeTab === "diagnostics" && <DiagnosticsTab id={analysisId} />}{activeTab === "outputs" && <OutputsTab id={analysisId} />}</CardContent></Card>;
}
