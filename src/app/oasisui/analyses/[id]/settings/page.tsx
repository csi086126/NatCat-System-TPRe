"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { getAnalysis, getAnalysisSettings, updateAnalysisSettings } from "@/lib/oasis/analyses";
import { getModel, getModelSettings } from "@/lib/oasis/models";
import { buildAnalysisSettings, defaultOutputOptions } from "@/lib/oasis/settings";
import type { Model } from "@/lib/oasis/types";

export default function AnalysisSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function loadSettings() {
      try {
        const settings = await getAnalysisSettings(id);
        setText(JSON.stringify(settings, null, 2));
        return;
      } catch (settingsError) {
        try {
          const analysis = await getAnalysis(id);
          const selectedModel = analysis.model && typeof analysis.model === "object"
            ? analysis.model as Model
            : analysis.model !== undefined && analysis.model !== null
              ? await getModel(analysis.model)
              : null;
          if (!selectedModel) throw settingsError;
          const modelSettings = await getModelSettings(selectedModel.id);
          const samples = typeof analysis.number_of_samples === "number" ? analysis.number_of_samples : 1;
          const defaults = buildAnalysisSettings(selectedModel, modelSettings, String(analysis.name || `Analysis ${id}`), samples, defaultOutputOptions);
          setText(JSON.stringify(defaults, null, 2));
          setMessage("该 analysis 还没有 output settings，已加载默认配置；请检查后保存。");
        } catch {
          setError(apiErrorMessage(settingsError));
        }
      } finally { setLoading(false); }
    }
    void loadSettings();
  }, [id]);

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

  return <OasisLayout><div className="mb-6"><BackButton className="-ml-3" /><h1 className="mt-3 text-3xl font-bold text-slate-900">Analysis settings</h1><p className="mt-2 text-slate-500">编辑 Oasis analysis settings JSON，提交前会在浏览器检查格式。</p></div><Card><CardHeader><CardTitle>Settings JSON</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{message && <Alert><AlertDescription className="text-emerald-700">{message}</AlertDescription></Alert>}<textarea value={text} onChange={(event) => setText(event.target.value)} disabled={loading || saving} className="min-h-[480px] w-full rounded-lg border bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none ring-blue-500 focus:ring-2" spellCheck={false} /><div className="flex justify-end"><Button type="submit" disabled={loading || saving}><Save />{saving ? "Saving…" : "Save settings"}</Button></div></form></CardContent></Card></OasisLayout>;
}
