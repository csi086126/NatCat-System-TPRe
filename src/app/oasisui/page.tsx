"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Boxes, ClipboardList, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import AnalysisStatusPanel from "@/components/oasisui/AnalysisStatusPanel";
import EmptyState from "@/components/oasisui/EmptyState";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { listAnalyses } from "@/lib/oasis/analyses";
import { listModels } from "@/lib/oasis/models";
import { listPortfolios } from "@/lib/oasis/portfolios";
import type { Analysis, Model, Portfolio } from "@/lib/oasis/types";

export default function OasisWorkbenchPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(refresh = false, showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    const results = await Promise.allSettled([listPortfolios({ refresh }), listModels(), listAnalyses({ refresh })]);
    if (results[0].status === "fulfilled") setPortfolios(results[0].value);
    if (results[1].status === "fulfilled") setModels(results[1].value);
    if (results[2].status === "fulfilled") setAnalyses(results[2].value);
    if (results.every((result) => result.status === "rejected")) {
      setError(apiErrorMessage((results[0] as PromiseRejectedResult).reason));
    }
    if (showLoading) setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(false, false); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const latestAnalyses = analyses.slice(0, 2);
  return (
    <OasisLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Workbench</h1></div>
        <Button variant="outline" onClick={() => void load(true)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
      </div>
      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}。请确认 Oasis API 和当前账号可用。</AlertDescription></Alert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Portfolios", value: portfolios.length, icon: Boxes, href: "/oasisui/portfolios", color: "text-blue-600" }, { label: "Models", value: models.length, icon: Server, href: "/oasisui/models", color: "text-cyan-600" }, { label: "Analyses", value: analyses.length, icon: ClipboardList, href: "/oasisui/analyses", color: "text-indigo-600" }, { label: "Completed runs", value: analyses.filter((item) => item.status === "RUN_COMPLETED").length, icon: Activity, href: "/oasisui/analyses", color: "text-emerald-600" }].map(({ label, value, icon: Icon, href, color }) => <Link href={href} key={label}><Card className="h-full border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-800">{loading ? "—" : value}</p></div><Icon className={`h-8 w-8 ${color}`} /></CardContent></Card></Link>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {latestAnalyses.length ? <AnalysisStatusPanel analyses={latestAnalyses} /> : <Card><CardHeader><CardTitle>Ready for your first analysis</CardTitle></CardHeader><CardContent><EmptyState title="No analyses found" description="Create a Portfolio, add a location file, then start an Oasis analysis." /><Button asChild className="mt-4"><Link href="/oasisui/portfolios">Go to portfolios <ArrowRight /></Link></Button></CardContent></Card>}
        <Card><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent className="grid gap-3"><Button asChild className="justify-between"><Link href="/oasisui/portfolios">Manage portfolios <ArrowRight /></Link></Button><Button asChild variant="outline" className="justify-between"><Link href="/oasisui/analyses/new">Create analysis <ArrowRight /></Link></Button><Button asChild variant="outline" className="justify-between"><Link href="/oasisui/models">Browse models <ArrowRight /></Link></Button></CardContent></Card>
      </div>
    </OasisLayout>
  );
}
