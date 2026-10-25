import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutputFile } from "@/lib/oasis/types";
import { downloadOutputEntry, downloadOutputFile } from "@/lib/oasis/outputs";
import EmptyState from "./EmptyState";

const perspectiveLabels: Record<string, string> = {
  gul: "Ground-up loss (GUL)",
  il: "Insured loss (IL)",
  ri: "Loss net of reinsurance (RI)",
};

const outputLabels: Record<string, string> = {
  ept: "Exceedance Probability Table (EPT): EPCalc=2 full-uncertainty OEP/AEP curves and TVAR variants",
  psept: "Per-sample Exceedance Probability Table (PSEPT)",
  altmeanonly: "Average Loss Table: mean loss only",
  aalcalc: "Average annual loss and standard deviation",
  aalcalcmeanonly: "Average annual loss: mean loss only",
  palt: "Period Average Loss Table (PALT)",
  melt: "Moment Event Loss Table (MELT)",
  qelt: "Quantile Event Loss Table (QELT)",
  mplt: "Moment Period Loss Table (MPLT)",
  qplt: "Quantile Period Loss Table (QPLT)",
  splt: "Sample Period Loss Table (SPLT)",
  eltcalc: "Event loss table (legacy ELT output)",
  elt_moment: "Moment Event Loss Table (MELT)",
  elt_quantile: "Quantile Event Loss Table (QELT)",
  pltcalc: "Period loss table (legacy PLT output)",
  plt_moment: "Moment Period Loss Table (MPLT)",
  plt_quantile: "Quantile Period Loss Table (QPLT)",
  plt_sample: "Sample Period Loss Table (SPLT)",
  leccalc_full_uncertainty_aep: "Full uncertainty AEP loss exceedance curve",
  leccalc_full_uncertainty_oep: "Full uncertainty OEP loss exceedance curve",
  leccalc_sample_mean_aep: "Sample mean AEP loss exceedance curve",
  leccalc_sample_mean_oep: "Sample mean OEP loss exceedance curve",
  leccalc_wheatsheaf_aep: "Wheatsheaf AEP loss exceedance curves",
  leccalc_wheatsheaf_oep: "Wheatsheaf OEP loss exceedance curves",
  leccalc_wheatsheaf_mean_aep: "Wheatsheaf mean AEP loss exceedance curve",
  leccalc_wheatsheaf_mean_oep: "Wheatsheaf mean OEP loss exceedance curve",
  summarycalc: "Summary calculation output",
  analysis_settings: "Analysis settings used to generate the outputs",
  "summary-info": "Summary information: maps SummaryId to OED grouping fields",
};

function outputFileDescription(value: string) {
  const filename = value.replace(/^output\//, "");
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename === "analysis_settings.json") return outputLabels.analysis_settings;

  const baseName = filename.replace(/\.(csv|parquet)$/i, "");
  const parts = baseName.split("_");
  const perspective = perspectiveLabels[parts[0]?.toLowerCase() || ""];
  const summary = /^s\d+$/i.test(parts[1] || "") ? `Summary level ${parts[1].slice(1)}` : "";
  const outputKey = parts.length > 2 ? parts.slice(2).join("_").toLowerCase() : baseName.toLowerCase();
  const description = outputLabels[outputKey] || `Oasis output dataset: ${outputKey.replaceAll("_", " ")}`;
  return [perspective, summary, description].filter(Boolean).join(" · ");
}

export default function OutputFileList({ analysisId, files, onPreview }: { analysisId: string | number; files: OutputFile[]; onPreview?: (file: OutputFile) => void }) {
  async function download(file?: OutputFile) {
    const response = file?.filename
      ? await downloadOutputEntry(analysisId, file.filename)
      : await downloadOutputFile(analysisId, file?.id);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (file?.filename || file?.file_name || file?.name || `analysis-${analysisId}-output`).replace(/^output\//, "");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!files.length) return <EmptyState title="No output files yet" description="Outputs will appear here after the analysis completes." />;
  return <div className="space-y-2">{files.map((file, index) => { const filename = file.filename || file.file_name || file.name || "Output file"; const fileInfo = <><p className="font-medium text-slate-700">{filename}</p><p className="text-xs leading-5 text-slate-500">{outputFileDescription(filename)}{file.file_size ? ` · ${Math.round(file.file_size / 1024)} KB` : ""}</p></>; return <div key={String(file.id ?? file.filename ?? file.file_name ?? index)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">{onPreview ? <button type="button" className="min-w-0 flex-1 text-left hover:opacity-80" onClick={() => onPreview(file)} aria-label={`Preview ${filename}`}>{fileInfo}</button> : <div className="min-w-0 flex-1">{fileInfo}</div>}<div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => void download(file)}><Download /> Download</Button></div></div>; })}</div>;
}
