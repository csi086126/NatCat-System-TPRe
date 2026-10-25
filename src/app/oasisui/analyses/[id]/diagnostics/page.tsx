"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { downloadAnalysisArtifact } from "@/lib/oasis/files";

const artifacts = [
  { kind: "lookup_validation_file" as const, label: "Lookup validation", description: "Validation output produced during lookup." },
  { kind: "lookup_errors_file" as const, label: "Lookup errors", description: "Errors reported while matching exposure to model data." },
  { kind: "lookup_success_file" as const, label: "Lookup success", description: "Successful lookup records for audit and review." },
  { kind: "input_generation_traceback_file" as const, label: "Input generation traceback", description: "Traceback produced when input generation fails." },
  { kind: "run_log_file" as const, label: "Run log", description: "Worker log for the analysis run." },
  { kind: "run_traceback_file" as const, label: "Run traceback", description: "Traceback produced by a failed run." },
];

export default function AnalysisDiagnosticsPage() {
  const { id } = useParams<{ id: string }>();
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  async function download(kind: (typeof artifacts)[number]["kind"], label: string) {
    setDownloading(kind); setError("");
    try { const response = await downloadAnalysisArtifact(id, kind); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `analysis-${id}-${label.toLowerCase().replaceAll(" ", "-")}`; anchor.click(); URL.revokeObjectURL(url); } catch (downloadError) { setError(apiErrorMessage(downloadError)); } finally { setDownloading(""); }
  }
  return <OasisLayout><div className="mb-6"><BackButton className="-ml-3" /><h1 className="mt-3 text-3xl font-bold text-slate-900">Validation & logs</h1><p className="mt-2 text-slate-500">下载 Oasis API 生成的校验文件、错误日志和运行日志。</p></div>{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 md:grid-cols-2">{artifacts.map(({ kind, label, description }) => <Card key={kind}><CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{description}</p><Button variant="outline" size="sm" onClick={() => void download(kind, label)} disabled={Boolean(downloading)}><Download />{downloading === kind ? "Downloading…" : "Download"}</Button></CardContent></Card>)}</div></OasisLayout>;
}
