"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import StatusBadge from "@/components/oasisui/StatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { getAnalysis } from "@/lib/oasis/analyses";
import { getRunProgress, getTaskList } from "@/lib/oasis/status";
import type { Analysis, AnalysisTaskStatus, RunProgress } from "@/lib/oasis/types";

export default function AnalysisProgressPage() {
  const { id } = useParams<{ id: string }>(); const [analysis, setAnalysis] = useState<Analysis | null>(null); const [progress, setProgress] = useState<RunProgress | null>(null); const [tasks, setTasks] = useState<AnalysisTaskStatus[]>([]); const [error, setError] = useState("");
  async function load() { try { const [analysisResult, progressResult, taskResult] = await Promise.all([getAnalysis(id), getRunProgress(id).catch(() => null), getTaskList(id).catch(() => [])]); setAnalysis(analysisResult); setProgress(progressResult); setTasks(Array.isArray(taskResult) ? taskResult : []); } catch (loadError) { setError(apiErrorMessage(loadError)); } }
  useEffect(() => { if (id) void load(); const timer = window.setInterval(() => { if (id) void load(); }, 5000); return () => window.clearInterval(timer); }, [id]);
  const percent = typeof progress?.progress === "number" ? Math.max(0, Math.min(100, progress.progress)) : undefined;
  return <OasisLayout><div className="mb-6"><BackButton className="-ml-3" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-slate-900">Run progress</h1><p className="mt-2 text-slate-500">Analysis {id} 的任务状态和进度。</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw /> Refresh</Button></div></div>{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Analysis status</CardTitle><StatusBadge status={analysis?.status} /></CardHeader><CardContent>{percent !== undefined && <><div className="mb-2 flex justify-between text-sm text-slate-500"><span>{progress?.message || "Processing"}</span><span>{Math.round(percent)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all" style={{ width: `${percent}%` }} /></div></>}</CardContent></Card><Card className="mt-6"><CardHeader><CardTitle>Sub-task statuses</CardTitle></CardHeader><CardContent>{tasks.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message</th></tr></thead><tbody className="divide-y">{tasks.map((task, index) => <tr key={String(task.id ?? task.task_id ?? index)}><td className="px-4 py-3 text-slate-700">{task.name || task.slug || task.task_type || task.task_id || `Task ${index + 1}`}</td><td className="px-4 py-3"><StatusBadge status={task.status} /></td><td className="px-4 py-3 text-slate-500">{task.message || "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">暂无子任务数据，页面会自动轮询 Oasis API。</p>}</CardContent></Card></OasisLayout>;
}
