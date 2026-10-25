"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import OutputFileList from "@/components/oasisui/OutputFileList";
import OutputFilePreviewDialog from "@/components/oasisui/OutputFilePreviewDialog";
import CsvResultViewer from "@/components/oasisui/CsvResultViewer";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { listOutputFiles, downloadOutputTar } from "@/lib/oasis/outputs";
import type { OutputFile } from "@/lib/oasis/types";

export default function AnalysisOutputsPage() {
  const { id } = useParams<{ id: string }>();
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

  useEffect(() => { if (id) void load(); }, [id, load]);

  async function downloadTar() {
    try { const response = await downloadOutputTar(id); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `analysis-${id}-outputs.tar.gz`; anchor.click(); URL.revokeObjectURL(url); }
    catch (downloadError) { setError(apiErrorMessage(downloadError)); }
  }

  return <OasisLayout>
    <div className="mb-6"><BackButton className="-ml-3" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-slate-900">Output centre</h1><p className="mt-2 text-slate-500">Analysis {id} 的输出文件、结果表格和损失曲线。</p></div><div className="oasis-action-row flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button><Button onClick={() => void downloadTar()} disabled={!files.length}><Archive /> Download tar.gz</Button></div></div></div>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {!loading && files.length > 0 && <div className="mb-6"><CsvResultViewer analysisId={id} files={files} /></div>}
    <Card><CardHeader><CardTitle>Available output files</CardTitle></CardHeader><CardContent>{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading output files…</p> : <OutputFileList analysisId={id} files={files} onPreview={setPreviewFile} />}</CardContent></Card>
    <OutputFilePreviewDialog analysisId={id} file={previewFile} onClose={() => setPreviewFile(null)} />
  </OasisLayout>;
}
