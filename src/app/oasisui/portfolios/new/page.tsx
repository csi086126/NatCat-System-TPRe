"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { FileUp, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BackButton from "@/components/oasisui/BackButton";
import OasisLayout from "@/components/oasisui/OasisLayout";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { saveOasisDescription } from "@/lib/oasis/metadata";
import { createPortfolio, type PortfolioFileKind, uploadPortfolioFile } from "@/lib/oasis/portfolios";

const fileKinds = [
  { key: "location_file" as const, label: "Location file", description: "Required OED location.csv" },
  { key: "accounts_file" as const, label: "Accounts file", description: "Required for Exposure run" },
  { key: "reinsurance_info_file" as const, label: "Reinsurance info", description: "Optional reinsurance info" },
  { key: "reinsurance_scope_file" as const, label: "Reinsurance scope", description: "Optional reinsurance scope" },
];

type SelectedFiles = Partial<Record<PortfolioFileKind, File>>;

export default function NewPortfolioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<SelectedFiles>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function selectFile(kind: PortfolioFileKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setFiles((current) => ({ ...current, [kind]: file }));
    event.target.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const created = await createPortfolio({ name: name.trim() });
      if (created?.id === undefined || created?.id === null) throw new Error("Portfolio was created without an ID");
      await saveOasisDescription("portfolio", created.id, description.trim());

      const uploadErrors: string[] = [];
      for (const { key, label } of fileKinds) {
        const file = files[key];
        if (!file) continue;
        try {
          await uploadPortfolioFile(created.id, key, file);
        } catch (uploadError) {
          uploadErrors.push(`${label}: ${apiErrorMessage(uploadError)}`);
        }
      }
      if (uploadErrors.length) {
        throw new Error(`Portfolio created, but some files could not be uploaded. ${uploadErrors.join("; ")}`);
      }
      router.push(`/oasisui/portfolios/${created.id}`);
    } catch (createError) {
      setError(apiErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  return <OasisLayout>
    <div className="mb-6">
      <BackButton className="-ml-3" />
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Create portfolio</h1>
      <p className="mt-2 text-slate-500">填写 Portfolio 信息并上传输入文件。创建后可在详情页手动执行 Validation 和 Exposure run。</p>
    </div>
    {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Portfolio information</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="portfolio-name">Name</Label><Input id="portfolio-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. HK Flood 2025" required /></div>
          <div className="space-y-2"><Label htmlFor="portfolio-description">Description</Label><textarea id="portfolio-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" className="min-h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Portfolio input files</CardTitle><p className="text-sm text-slate-500">Files are uploaded after the Portfolio is created, then can be validated from its detail page.</p></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {fileKinds.map(({ key, label, description: fileDescription }) => <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-4"><div className="min-w-0"><p className="font-medium text-slate-700">{label}</p><p className="mt-1 truncate text-xs text-slate-500" title={files[key]?.name || fileDescription}>{files[key]?.name || fileDescription}</p></div><label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><FileUp className="h-4 w-4" />{files[key] ? "Replace" : "Choose file"}<input type="file" className="hidden" accept=".csv,.parquet,.txt" onChange={(event) => selectFile(key, event)} disabled={saving} /></label></div>)}
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button type="submit" disabled={saving || !name.trim()}><Save />{saving ? "Creating…" : "Create portfolio"}</Button></div>
    </form>
  </OasisLayout>;
}
