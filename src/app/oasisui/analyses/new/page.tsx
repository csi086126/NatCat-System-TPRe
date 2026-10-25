"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { createAnalysisFromPortfolio, listPortfolios } from "@/lib/oasis/portfolios";
import { getModelSettings, listModels } from "@/lib/oasis/models";
import { updateAnalysisSettings } from "@/lib/oasis/analyses";
import { saveOasisDescription } from "@/lib/oasis/metadata";
import { buildAnalysisSettings, defaultOutputOptions, type OutputOptions } from "@/lib/oasis/settings";
import { modelDisplayName } from "@/lib/oasis/model-label";
import type { Model, Portfolio } from "@/lib/oasis/types";

const outputFields: Array<{ key: keyof OutputOptions; label: string; description: string }> = [
  { key: "eptFullUncertaintyOep", label: "EPT full uncertainty OEP", description: "Occurrence loss exceedance curve" },
  { key: "eptFullUncertaintyAep", label: "EPT full uncertainty AEP", description: "Aggregate loss exceedance curve" },
  { key: "eptMeanSampleOep", label: "EPT mean sample OEP", description: "Sample-mean occurrence curve" },
  { key: "eptMeanSampleAep", label: "EPT mean sample AEP", description: "Sample-mean aggregate curve" },
  { key: "eptPerSampleMeanOep", label: "EPT per-sample mean OEP", description: "Per-sample mean occurrence curve" },
  { key: "eptPerSampleMeanAep", label: "EPT per-sample mean AEP", description: "Per-sample mean aggregate curve" },
  { key: "pseptOep", label: "PSEPT OEP", description: "Per-sample occurrence table" },
  { key: "pseptAep", label: "PSEPT AEP", description: "Per-sample aggregate table" },
  { key: "eltSample", label: "SELT", description: "Sample event loss table" },
  { key: "eltQuantile", label: "QELT", description: "Quantile event loss table" },
  { key: "eltMoment", label: "MELT", description: "Moment event loss table" },
  { key: "pltSample", label: "SPLT", description: "Sample period loss table" },
  { key: "pltQuantile", label: "QPLT", description: "Quantile period loss table" },
  { key: "pltMoment", label: "MPLT", description: "Moment period loss table" },
  { key: "altPeriod", label: "PALT", description: "Period average loss table" },
];

export default function NewAnalysisPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [modelId, setModelId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [numberOfSamples, setNumberOfSamples] = useState("1");
  const [outputs, setOutputs] = useState<OutputOptions>(defaultOutputOptions);
  const [modelSettings, setModelSettings] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [loadingModelSettings, setLoadingModelSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedPortfolio = new URLSearchParams(window.location.search).get("portfolio");
    if (requestedPortfolio) setPortfolioId(requestedPortfolio);
  }, []);

  useEffect(() => {
    const requestedPortfolio = new URLSearchParams(window.location.search).get("portfolio");
    // This page is commonly opened immediately after creating a Portfolio.
    // Force one server-side refresh in that flow so the new Portfolio cannot
    // be hidden by the 30-second list cache.
    Promise.allSettled([listPortfolios({ refresh: Boolean(requestedPortfolio) }), listModels()]).then(([portfolioResult, modelResult]) => {
      if (portfolioResult.status === "fulfilled") setPortfolios(portfolioResult.value);
      if (modelResult.status === "fulfilled") {
        setModels(modelResult.value);
        if (modelResult.value.length === 1) setModelId(String(modelResult.value[0].id));
      }
      const failed = portfolioResult.status === "rejected"
        ? portfolioResult.reason
        : modelResult.status === "rejected" ? modelResult.reason : null;
      if (failed) setError(apiErrorMessage(failed));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!modelId) { setModelSettings(null); return; }
    setLoadingModelSettings(true);
    getModelSettings(modelId).then(setModelSettings).catch((loadError) => setError(apiErrorMessage(loadError))).finally(() => setLoadingModelSettings(false));
  }, [modelId]);

  function toggleOutput(key: keyof OutputOptions) {
    setOutputs((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!portfolioId || !modelId || !name.trim()) return;
    if (!outputs.gulOutput && !outputs.ilOutput && !outputs.riOutput) {
      setError("至少选择一个输出视角：GUL、IL 或 RI。");
      return;
    }
    setSaving(true); setError("");
    try {
      const selectedModel = models.find((model) => String(model.id) === modelId);
      if (!selectedModel) throw new Error("Selected model was not found.");
      const result = await createAnalysisFromPortfolio(portfolioId, { name: name.trim(), model: Number(modelId) });
      const analysisId = result && typeof result === "object" && "id" in result ? String((result as { id: string | number }).id) : "";
      if (!analysisId) throw new Error("Oasis API did not return an analysis id.");
      const settings = buildAnalysisSettings(selectedModel, modelSettings, name.trim(), Math.max(0, Number(numberOfSamples) || 0), outputs);
      await updateAnalysisSettings(analysisId, settings);
      await saveOasisDescription("analysis", analysisId, description);
      router.push(`/oasisui/analyses/${analysisId}`);
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally { setSaving(false); }
  }

  return <OasisLayout>
    <div className="mb-6"><Button variant="ghost" className="-ml-3" onClick={() => router.back()}><ArrowLeft /> Back</Button><h1 className="mt-3 text-3xl font-bold text-slate-900">Create analysis</h1><p className="mt-2 text-slate-500">创建 analysis、保存输出配置，然后再运行 Oasis workflow。</p></div>
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card className="max-w-3xl"><CardHeader><CardTitle>Analysis identity</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="analysis-name">Analysis name</Label><Input id="analysis-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. HK Flood baseline 2025" required /></div>
        <div className="space-y-2"><Label htmlFor="analysis-description">Description</Label><textarea id="analysis-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the purpose, scenario or assumptions of this analysis" className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2" /></div>
        <div className="space-y-2"><Label htmlFor="portfolio">Portfolio</Label><select id="portfolio" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" required disabled={loading}><option value="">Select a portfolio</option>{portfolios.map((portfolio) => <option key={String(portfolio.id)} value={String(portfolio.id)}>{portfolio.name || `Portfolio ${portfolio.id}`}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="model">Model</Label><select id="model" value={modelId} onChange={(event) => setModelId(event.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" required disabled={loading}><option value="">Select a model</option>{models.map((model) => <option key={String(model.id)} value={String(model.id)}>{modelDisplayName(model)}</option>)}</select>{modelId && <p className="text-xs text-slate-500">Model settings are loaded from the selected Oasis model.</p>}</div>
        <div className="space-y-2"><Label htmlFor="number-of-samples">Number of samples</Label><Input id="number-of-samples" type="number" min="0" step="1" value={numberOfSamples} onChange={(event) => setNumberOfSamples(event.target.value)} /><p className="text-xs text-slate-500">0 uses analytical-only sampling; 1 or more enables sample-based calculations.</p></div>
      </CardContent></Card>
      <Card className="max-w-5xl"><CardHeader><CardTitle>Configure outputs</CardTitle><p className="text-sm text-slate-500">选择要让 Oasis worker 生成的输出文件；不会默认生成全部结果。</p></CardHeader><CardContent className="space-y-6">
        <div><p className="mb-3 text-sm font-semibold text-slate-700">Loss perspectives</p><div className="grid gap-3 sm:grid-cols-3">{([["gulOutput", "GUL", "Ground-up loss"], ["ilOutput", "IL", "Insured loss"], ["riOutput", "RI", "Loss net of reinsurance"]] as Array<[keyof OutputOptions, string, string]>).map(([key, label, detail]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"><input type="checkbox" checked={Boolean(outputs[key])} onChange={() => toggleOutput(key)} className="mt-1 h-4 w-4 accent-cyan-700" /><span><span className="block text-sm font-medium text-slate-700">{label}</span><span className="block text-xs text-slate-500">{detail}</span></span></label>)}</div></div>
        <div><p className="mb-3 text-sm font-semibold text-slate-700">Output tables and curves</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{outputFields.map(({ key, label, description: detail }) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"><input type="checkbox" checked={Boolean(outputs[key])} onChange={() => toggleOutput(key)} className="mt-1 h-4 w-4 accent-cyan-700" /><span><span className="block text-sm font-medium text-slate-700">{label}</span><span className="block text-xs text-slate-500">{detail}</span></span></label>)}</div></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"><input type="checkbox" checked={outputs.returnPeriodFile} onChange={() => toggleOutput("returnPeriodFile")} className="mt-1 h-4 w-4 accent-cyan-700" /><span><span className="block text-sm font-medium text-slate-700">Return period file</span><span className="block text-xs text-slate-500">Use the model/default return periods for EPT and PSEPT.</span></span></label>
        {loadingModelSettings && <p className="text-xs text-slate-500">Loading selected model settings…</p>}
      </CardContent></Card>
      <div className="oasis-action-row flex max-w-5xl justify-end gap-2 border-t pt-5"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={saving || loading || loadingModelSettings || !modelId}>{saving ? "Creating and configuring…" : <>Create analysis <ArrowRight /></>}</Button></div>
    </form>
  </OasisLayout>;
}
