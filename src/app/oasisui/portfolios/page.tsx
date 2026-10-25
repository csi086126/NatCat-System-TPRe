"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import EmptyState from "@/components/oasisui/EmptyState";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import PortfolioStatusBadge from "@/components/oasisui/PortfolioStatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { getOasisDescriptions } from "@/lib/oasis/metadata";
import { listPortfolios } from "@/lib/oasis/portfolios";
import type { Portfolio } from "@/lib/oasis/types";

export default function PortfoliosPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [descriptionMap, setDescriptionMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(refresh = false, showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const nextPortfolios = await listPortfolios({ refresh });
      setPortfolios(nextPortfolios);
      setDescriptionMap(await getOasisDescriptions("portfolio"));
    } catch (loadError) { setError(apiErrorMessage(loadError)); } finally { if (showLoading) setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void load(false, false); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return <OasisLayout><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Portfolios</h1></div><div className="oasis-action-row flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load(true)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button><Button onClick={() => router.push("/oasisui/portfolios/new")}><Plus /> New portfolio</Button></div></div>
    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading portfolios…</div> : portfolios.length === 0 ? <EmptyState title="No portfolios found" description="Create your first Portfolio to start an Oasis workflow." /> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Exposure</th><th className="px-5 py-3">Validation</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Modified</th></tr></thead><tbody className="divide-y">{portfolios.map((portfolio) => <tr key={String(portfolio.id)} tabIndex={0} role="link" className="cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={() => router.push(`/oasisui/portfolios/${portfolio.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/oasisui/portfolios/${portfolio.id}`); } }}><td className="px-5 py-4 text-slate-500">{portfolio.id}</td><td className="px-5 py-4"><span className="font-semibold text-slate-800">{portfolio.name || `Portfolio ${portfolio.id}`}</span>{descriptionMap[String(portfolio.id)] && <p className="mt-1 max-w-sm truncate text-xs text-slate-500" title={descriptionMap[String(portfolio.id)]}>{descriptionMap[String(portfolio.id)]}</p>}</td><td className="px-5 py-4"><PortfolioStatusBadge status={portfolio.exposure_status} kind="exposure" /></td><td className="px-5 py-4"><PortfolioStatusBadge status={portfolio.validation_status} kind="validation" /></td><td className="px-5 py-4 text-slate-500"><LocalTimestamp value={portfolio.created} /></td><td className="px-5 py-4 text-slate-500"><LocalTimestamp value={portfolio.modified} /></td></tr>)}</tbody></table></div>}
  </OasisLayout>;
}
