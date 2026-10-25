"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import EmptyState from "@/components/oasisui/EmptyState";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import StatusBadge from "@/components/oasisui/StatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { listAnalyses } from "@/lib/oasis/analyses";
import { getOasisDescriptions } from "@/lib/oasis/metadata";
import type { Analysis } from "@/lib/oasis/types";

export default function AnalysesPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [descriptionMap, setDescriptionMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(refresh = false, showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setAnalyses(await listAnalyses({ refresh }));
      setDescriptionMap(await getOasisDescriptions("analysis"));
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(false, false); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return <OasisLayout>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-slate-900">Analyses</h1></div>
      <div className="oasis-action-row flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load(true)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button><Button asChild><Link href="/oasisui/analyses/new"><Plus /> New analysis</Link></Button></div>
    </div>
    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading analyses…</div> : analyses.length === 0 ? <EmptyState title="No analyses found" description="先选择一个 Portfolio 和 Model 创建分析。" /> : (
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Analysis</th><th className="w-40 min-w-[10rem] whitespace-nowrap px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Modified</th></tr></thead><tbody className="divide-y">
        {analyses.map((analysis) => <tr key={String(analysis.id)} tabIndex={0} role="link" className="cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={() => router.push(`/oasisui/analyses/${analysis.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/oasisui/analyses/${analysis.id}`); } }}><td className="px-5 py-4 text-slate-500">{analysis.id}</td><td className="px-5 py-4"><span className="font-semibold text-slate-800">{analysis.name || `Analysis ${analysis.id}`}</span>{descriptionMap[String(analysis.id)] && <p className="mt-1 max-w-sm truncate text-xs text-slate-500" title={descriptionMap[String(analysis.id)]}>{descriptionMap[String(analysis.id)]}</p>}</td><td className="w-40 min-w-[10rem] whitespace-nowrap px-5 py-4"><StatusBadge status={analysis.status} /></td><td className="px-5 py-4 text-slate-500"><LocalTimestamp value={analysis.created} /></td><td className="px-5 py-4 text-slate-500"><LocalTimestamp value={analysis.modified} /></td></tr>)}
      </tbody></table></div>
    )}
  </OasisLayout>;
}
