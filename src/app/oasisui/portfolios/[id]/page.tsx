"use client";

import "leaflet/dist/leaflet.css";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, Edit3, FileUp, Play, RefreshCw, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OasisLayout from "@/components/oasisui/OasisLayout";
import BackButton from "@/components/oasisui/BackButton";
import LocalTimestamp from "@/components/oasisui/LocalTimestamp";
import LocationMap from "@/components/oasisui/LocationMap";
import OutputFilePreviewDialog from "@/components/oasisui/OutputFilePreviewDialog";
import PortfolioStatusBadge from "@/components/oasisui/PortfolioStatusBadge";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import { deleteOasisDescription, getOasisDescription, saveOasisDescription } from "@/lib/oasis/metadata";
import { deletePortfolio, deletePortfolioFile, downloadPortfolioErrorsFile, downloadPortfolioExposureRun, downloadPortfolioFile, getPortfolio, runPortfolioExposure, type PortfolioFileKind, updatePortfolio, uploadPortfolioFile, validatePortfolio } from "@/lib/oasis/portfolios";
import type { Portfolio } from "@/lib/oasis/types";

const fileKinds = [
  { key: "location_file" as const, label: "Location file", description: "OED location.csv" },
  { key: "accounts_file" as const, label: "Accounts file", description: "Optional accounts.csv" },
  { key: "reinsurance_info_file" as const, label: "Reinsurance info", description: "Optional reinsurance info" },
  { key: "reinsurance_scope_file" as const, label: "Reinsurance scope", description: "Optional reinsurance scope" },
];

function fileLabel(value: unknown) {
  if (value && typeof value === "object" && "file_name" in value) {
    return String((value as { file_name?: unknown }).file_name || "File attached");
  }
  return value ? "File attached" : "";
}

function hasFile(value: unknown) {
  if (!value) return false;
  if (typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  return "file" in record ? Boolean(record.file) : Object.keys(record).length > 0;
}

function hasRequiredExposureFiles(value: Portfolio) {
  return hasFile(value.location_file) && hasFile(value.accounts_file);
}

function displayFileName(value: unknown, kind: PortfolioFileKind) {
  const name = fileLabel(value);
  if (name !== "File attached") return name;
  return `${kind.replace(/_file$/, "")}.csv`;
}

function fileFormat(fileName: string) {
  return fileName.toLowerCase().endsWith(".parquet") ? "parquet" : "csv";
}

type PortfolioPreviewFile = {
  filename: string;
  subtitle: string;
  loadFile: (filename: string) => Promise<Response>;
};

function hasRunningStatus(status: unknown) {
  return status === "STARTED";
}

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [description, setDescription] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [deleting, setDeleting] = useState("");
  const [downloading, setDownloading] = useState("");
  const [previewFile, setPreviewFile] = useState<PortfolioPreviewFile | null>(null);
  const [runningAction, setRunningAction] = useState<"validation" | "exposure" | "">("");
  const [automationMessage, setAutomationMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [result, savedDescription] = await Promise.all([getPortfolio(id), getOasisDescription("portfolio", id)]);
      setPortfolio(result);
      const nextDescription = savedDescription || String(result.description || "");
      setDescription(nextDescription);
      if (!editingRef.current) {
        setDraftName(String(result.name || ""));
        setDraftDescription(nextDescription);
      }
    }
    catch (loadError) { setError(apiErrorMessage(loadError)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);

  const exposureStatus = portfolio?.exposure_status;
  const validationStatus = portfolio?.validation_status;

  useEffect(() => {
    if (!id || (!hasRunningStatus(exposureStatus) && !hasRunningStatus(validationStatus))) return;
    const timer = window.setTimeout(() => void load(false), 2500);
    return () => window.clearTimeout(timer);
  }, [id, exposureStatus, validationStatus, load]);

  function beginEdit() {
    if (!portfolio) return;
    setDraftName(String(portfolio.name || ""));
    setDraftDescription(description);
    setError("");
    setAutomationMessage("");
    editingRef.current = true;
    setEditing(true);
  }

  function cancelEdit() {
    if (portfolio) setDraftName(String(portfolio.name || ""));
    setDraftDescription(description);
    editingRef.current = false;
    setEditing(false);
    setError("");
    setAutomationMessage("");
  }

  async function savePortfolio() {
    if (!portfolio || !draftName.trim() || saving) return;
    setSaving(true); setError(""); setAutomationMessage("");
    try {
      const updated = await updatePortfolio(id, { name: draftName.trim() });
      await saveOasisDescription("portfolio", id, draftDescription.trim());
      const nextDescription = draftDescription.trim();
      setPortfolio({ ...portfolio, ...updated, name: draftName.trim() });
      setDescription(nextDescription);
      setDraftName(draftName.trim());
      setDraftDescription(nextDescription);
      editingRef.current = false;
      setEditing(false);
      setAutomationMessage("Portfolio saved.");
    } catch (saveError) {
      setError(apiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function waitForProcessing(kind: "validation" | "exposure", label: string) {
    const deadline = Date.now() + 15 * 60 * 1000;
    let current = await getPortfolio(id);
    setPortfolio(current);
    while (hasRunningStatus(kind === "validation" ? current.validation_status : current.exposure_status)) {
      if (Date.now() >= deadline) throw new Error(`${label} timed out while waiting for completion.`);
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
      current = await getPortfolio(id);
      setPortfolio(current);
    }
    const status = kind === "validation" ? current.validation_status : current.exposure_status;
    if (status !== "RUN_COMPLETED") throw new Error(`${label} ended with status ${String(status || "NONE")}.`);
    return current;
  }

  async function runValidationAndExposure() {
    if (!portfolio || !hasRequiredExposureFiles(portfolio) || runningAction || hasRunningStatus(portfolio.validation_status) || hasRunningStatus(portfolio.exposure_status)) return;
    setRunningAction("validation"); setError(""); setAutomationMessage("");
    try {
      await validatePortfolio(id);
      setAutomationMessage("Portfolio validation is running…");
      await waitForProcessing("validation", "Portfolio validation");
      setRunningAction("exposure");
      setAutomationMessage("Validation completed. Exposure processing is running…");
      await runPortfolioExposure(id);
      await waitForProcessing("exposure", "Exposure processing");
      setAutomationMessage("Validation and exposure processing completed.");
      await load(false);
    } catch (processingError) {
      setError(`Portfolio processing failed: ${apiErrorMessage(processingError)}`);
    } finally {
      setRunningAction("");
    }
  }

  async function upload(kind: (typeof fileKinds)[number]["key"], event: ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(kind); setError("");
    try {
      await uploadPortfolioFile(id, kind, file);
      setAutomationMessage("File uploaded. Use Run validation when the input files are ready.");
      await load();
    }
    catch (uploadError) { setError(apiErrorMessage(uploadError)); }
    finally { setUploading(""); event.target.value = ""; }
  }

  async function saveDownload(response: Response, filename: string) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openInputPreview(kind: PortfolioFileKind, value: unknown) {
    const filename = displayFileName(value, kind);
    setPreviewFile({
      filename,
      subtitle: "Portfolio input file preview",
      loadFile: () => downloadPortfolioFile(id, kind, fileFormat(filename)),
    });
  }

  async function downloadInputFile(kind: PortfolioFileKind, value: unknown) {
    const filename = displayFileName(value, kind);
    setDownloading(kind);
    setError("");
    try {
      await saveDownload(await downloadPortfolioFile(id, kind, fileFormat(filename)), filename);
    } catch (downloadError) {
      setError(apiErrorMessage(downloadError));
    } finally {
      setDownloading("");
    }
  }

  function openArtifactPreview(kind: "errors" | "exposure") {
    const isErrors = kind === "errors";
    setPreviewFile({
      filename: isErrors ? `portfolio_${id}_errors.txt` : `portfolio_${id}_exposure_run.csv`,
      subtitle: isErrors ? "Validation / exposure error file" : "Exposure run result",
      loadFile: () => isErrors ? downloadPortfolioErrorsFile(id) : downloadPortfolioExposureRun(id),
    });
  }

  async function downloadArtifact(kind: "errors" | "exposure") {
    const isErrors = kind === "errors";
    const filename = isErrors ? `portfolio_${id}_errors.txt` : `portfolio_${id}_exposure_run.csv`;
    setDownloading(kind);
    setError("");
    try {
      const response = isErrors ? await downloadPortfolioErrorsFile(id) : await downloadPortfolioExposureRun(id);
      await saveDownload(response, filename);
    } catch (downloadError) {
      setError(apiErrorMessage(downloadError));
    } finally {
      setDownloading("");
    }
  }

  async function removeFile(kind: PortfolioFileKind, label: string) {
    if (!editing) return;
    if (!window.confirm(`Delete the uploaded ${label}? This cannot be undone.`)) return;
    setDeleting(kind); setError("");
    try { await deletePortfolioFile(id, kind); await load(); }
    catch (deleteError) { setError(apiErrorMessage(deleteError)); }
    finally { setDeleting(""); }
  }

  async function removePortfolio() {
    if (!editing) return;
    if (!window.confirm(`Delete portfolio “${portfolio?.name || id}” and its uploaded files? This cannot be undone.`)) return;
    setDeleting("portfolio"); setError("");
    try {
      await deletePortfolio(id);
      await deleteOasisDescription("portfolio", id).catch(() => undefined);
      router.push("/oasisui/portfolios");
    } catch (deleteError) { setError(apiErrorMessage(deleteError)); setDeleting(""); }
  }

  return (
    <OasisLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton className="mb-2 -ml-3" />
          {editing ? <h1 className="text-3xl font-bold text-slate-900">Edit portfolio</h1> : <><h1 className="text-3xl font-bold text-slate-900">{portfolio?.name || `Portfolio ${id}`}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}</>}
          <p className="mt-2 text-sm text-slate-500">Portfolio ID {id}</p>
        </div>
        <div className="oasis-action-row flex flex-wrap gap-2">
          {!editing && <Button variant="outline" onClick={() => void load()} disabled={loading || saving || Boolean(uploading || deleting)}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>}
          {!editing && <><Button variant="outline" onClick={beginEdit} disabled={loading || !portfolio}><Edit3 /> Edit</Button><Button variant="outline" onClick={() => void runValidationAndExposure()} disabled={loading || saving || Boolean(uploading || deleting || runningAction) || !portfolio || !hasRequiredExposureFiles(portfolio) || hasRunningStatus(portfolio?.validation_status) || hasRunningStatus(portfolio?.exposure_status)} title={!portfolio || !hasRequiredExposureFiles(portfolio) ? "Location and Accounts files are required" : undefined}><ShieldCheck />{runningAction === "validation" ? "Validating…" : runningAction === "exposure" ? "Running exposure…" : "Run validation"}</Button><Button onClick={() => router.push(`/oasisui/analyses/new?portfolio=${id}`)}><Play /> Create analysis</Button></>}
          {editing && <><Button onClick={() => void savePortfolio()} disabled={saving || loading || !draftName.trim()}><Save />{saving ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={cancelEdit} disabled={saving || Boolean(uploading || deleting)}><X /> Cancel</Button><Button variant="destructive" onClick={() => void removePortfolio()} disabled={Boolean(uploading || deleting || saving)}><Trash2 />{deleting === "portfolio" ? "Deleting…" : "Delete"}</Button></>}
        </div>
      </div>
      {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
      {automationMessage && <Alert className="mb-5 border-blue-200 bg-blue-50 text-blue-800"><AlertDescription>{automationMessage}</AlertDescription></Alert>}
      {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading portfolio…</div> : portfolio ? (
        <>
          {editing && <Card className="mb-6 border-blue-100"><CardHeader><CardTitle>Portfolio information</CardTitle><p className="text-sm text-slate-500">Update the Portfolio name and description, then save your changes.</p></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="portfolio-name">Name</Label><Input id="portfolio-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="e.g. HK Flood 2025" required /></div><div className="space-y-2"><Label htmlFor="portfolio-description">Description</Label><textarea id="portfolio-description" value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} placeholder="Optional description" className="min-h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div></CardContent></Card>}
          {!editing && <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Validation status</p><div className="mt-2"><PortfolioStatusBadge status={portfolio.validation_status} kind="validation" /></div>{validationStatus === "ERROR" && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openArtifactPreview("errors")} disabled={Boolean(downloading)}>View error file</Button><Button type="button" variant="outline" size="sm" onClick={() => void downloadArtifact("errors")} disabled={Boolean(downloading)}><Download />{downloading === "errors" ? "Downloading…" : "Download"}</Button></div>}</CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Exposure status</p><div className="mt-2"><PortfolioStatusBadge status={portfolio.exposure_status} kind="exposure" /></div>{exposureStatus === "ERROR" && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openArtifactPreview("errors")} disabled={Boolean(downloading)}>View error file</Button><Button type="button" variant="outline" size="sm" onClick={() => void downloadArtifact("errors")} disabled={Boolean(downloading)}><Download />{downloading === "errors" ? "Downloading…" : "Download"}</Button></div>}{exposureStatus === "RUN_COMPLETED" && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openArtifactPreview("exposure")} disabled={Boolean(downloading)}>View result</Button><Button type="button" variant="outline" size="sm" onClick={() => void downloadArtifact("exposure")} disabled={Boolean(downloading)}><Download />{downloading === "exposure" ? "Downloading…" : "Download"}</Button></div>}</CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Last modified</p><p className="mt-2 font-semibold text-slate-700"><LocalTimestamp value={portfolio.modified || portfolio.created} /></p></CardContent></Card>
          </div>}
          <Card className="mt-6">
            <CardHeader><CardTitle>Portfolio input files</CardTitle><p className="text-sm text-slate-500">Click a file entry to preview its contents, or download the original file.</p></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {fileKinds.map(({ key, label, description }) => {
                const value = portfolio[key];
                const attached = hasFile(value);
                return <div key={key} className={`flex items-center justify-between gap-3 rounded-lg border p-4 ${attached ? "cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-300" : ""}`} onClick={attached ? () => openInputPreview(key, value) : undefined} onKeyDown={attached ? (event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openInputPreview(key, value); } } : undefined} role={attached ? "button" : undefined} tabIndex={attached ? 0 : undefined}><div className="min-w-0"><p className="font-medium text-slate-700">{label}</p><p className="mt-1 truncate text-xs text-slate-500">{description}</p></div>{attached ? <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>{!editing && <Button type="button" variant="outline" size="sm" onClick={() => void downloadInputFile(key, value)} disabled={Boolean(uploading || deleting || saving || downloading)}><Download />{downloading === key ? "Downloading…" : "Download"}</Button>}{editing && <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => void removeFile(key, label)} disabled={Boolean(uploading || deleting || saving || downloading)}><Trash2 />{deleting === key ? "Deleting…" : "Delete"}</Button>}</div> : editing ? <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><FileUp className="h-4 w-4" />{uploading === key ? "Uploading…" : "Upload"}<input type="file" className="hidden" accept=".csv,.parquet,.txt" onChange={(event) => void upload(key, event)} disabled={Boolean(uploading || deleting || saving || downloading)} /></label> : <span className="text-xs text-slate-400">Not uploaded</span>}</div>;
              })}
            </CardContent>
          </Card>
          {!editing && <LocationMap portfolioId={id} locationFile={portfolio.location_file} />}
          <OutputFilePreviewDialog analysisId={id} file={previewFile ? { filename: previewFile.filename } : null} loadFile={previewFile?.loadFile} subtitle={previewFile?.subtitle} onClose={() => setPreviewFile(null)} />
        </>
      ) : <Alert variant="destructive"><AlertDescription>Portfolio not found.</AlertDescription></Alert>}
    </OasisLayout>
  );
}
