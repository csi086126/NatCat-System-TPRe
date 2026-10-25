"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadOutputEntry } from "@/lib/oasis/outputs";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import type { OutputFile } from "@/lib/oasis/types";

type CsvPreview = { headers: string[]; rows: string[][] };

function parseCsv(text: string): CsvPreview {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      record.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      record.push(value); value = "";
      if (record.some((cell) => cell.trim() !== "")) records.push(record);
      record = [];
    } else value += character;
  }

  if (value || record.length) { record.push(value); records.push(record); }
  return { headers: records.shift() || [], rows: records };
}

function outputFilename(file: OutputFile) {
  return file.filename || file.file_name || file.name || "Output file";
}

function fileExtension(filename: string) {
  return filename.replace(/^output\//, "").split("?")[0].split(".").pop()?.toLowerCase() || "";
}

function isLossAmountColumn(header: string) {
  const normalized = header.replace(/[\s_-]/g, "").toLowerCase();
  return normalized === "loss" || normalized.endsWith("loss");
}

function isTivAmountColumn(header: string) {
  const normalized = header.replace(/[\s_-]/g, "").toLowerCase();
  return normalized === "tiv" || normalized.startsWith("tiv") || normalized.endsWith("tiv");
}

function formatCellValue(header: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (!isLossAmountColumn(header) && !isTivAmountColumn(header)) return trimmed;

  const amount = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : trimmed;
}

export default function OutputFilePreviewDialog({
  analysisId,
  file,
  onClose,
  loadFile,
  subtitle = "Output file preview",
}: {
  analysisId: string | number;
  file: OutputFile | null;
  onClose: () => void;
  loadFile?: (filename: string) => Promise<Response>;
  subtitle?: string;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const tableNavigatorRef = useRef<HTMLDivElement>(null);
  const [tableDimensions, setTableDimensions] = useState({ contentWidth: 0, viewportWidth: 0 });
  const filename = file ? outputFilename(file) : "";
  const extension = fileExtension(filename);
  const isCsv = extension === "csv";
  const isJson = extension === "json";
  const isPlainText = ["txt", "log", "yaml", "yml", "xml", "md"].includes(extension);
  const canPreview = isCsv || isJson || isPlainText;
  const parsed = useMemo(() => parseCsv(text), [text]);
  const formattedJson = useMemo(() => {
    if (!isJson) return "";
    try { return JSON.stringify(JSON.parse(text.replace(/^\uFEFF/, "")), null, 2); }
    catch { return text; }
  }, [isJson, text]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setText("");
    setError("");
    setLoading(false);
    if (!canPreview) return;

    setLoading(true);
    (loadFile ? loadFile(filename) : downloadOutputEntry(analysisId, filename))
      .then((response) => response.text())
      .then((content) => { if (!cancelled) setText(content); })
      .catch((loadError) => { if (!cancelled) setError(apiErrorMessage(loadError)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [analysisId, file, filename, canPreview, loadFile]);

  useEffect(() => {
    if (!isCsv || !parsed.headers.length) {
      setTableDimensions({ contentWidth: 0, viewportWidth: 0 });
      return;
    }

    const viewport = tableViewportRef.current;
    if (!viewport) return;

    const updateDimensions = () => {
      setTableDimensions({ contentWidth: viewport.scrollWidth, viewportWidth: viewport.clientWidth });
    };

    updateDimensions();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(viewport);
    const table = viewport.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [isCsv, parsed.headers.length, parsed.rows.length, text]);

  if (!file) return null;

  return <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="output-preview-title" className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0"><h2 id="output-preview-title" className="truncate text-lg font-semibold text-slate-900">{filename}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview"><X /></Button>
      </div>
      <div className="min-h-0 overflow-auto p-6">
        {!canPreview ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">This file type cannot be previewed in the browser. Use Download to save the complete file.</p>
          : loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading file…</div>
            : error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              : isCsv ? !parsed.headers.length ? <p className="py-12 text-center text-sm text-slate-500">File is empty.</p>
                : <div ref={tableViewportRef} className="overflow-x-hidden rounded-lg border" onScroll={(event) => { if (tableNavigatorRef.current) tableNavigatorRef.current.scrollLeft = event.currentTarget.scrollLeft; }}><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr>{parsed.headers.map((header, index) => <th key={`${header}-${index}`} className="whitespace-nowrap px-4 py-3">{header || `Column ${index + 1}`}</th>)}</tr></thead><tbody className="divide-y">{parsed.rows.slice(0, 200).map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-slate-50">{parsed.headers.map((header, columnIndex) => <td key={columnIndex} className="whitespace-nowrap px-4 py-3 text-slate-600">{formatCellValue(header, row[columnIndex] || "")}</td>)}</tr>)}</tbody></table>{parsed.rows.length > 200 && <p className="border-t px-4 py-3 text-xs text-slate-500">Only the first 200 rows are shown. Download the complete file for all data.</p>}</div>
                : isJson ? <pre className="max-h-[65vh] overflow-auto rounded-lg border bg-slate-950 p-5 text-left text-xs leading-6 text-slate-100">{formattedJson || "File is empty."}</pre>
                  : <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-slate-50 p-5 text-left text-sm leading-6 text-slate-700">{text || "File is empty."}</pre>}
      </div>
      {isCsv && parsed.headers.length > 0 && tableDimensions.contentWidth > tableDimensions.viewportWidth && <div className="shrink-0 border-t bg-slate-50 px-6 py-2"><div ref={tableNavigatorRef} className="h-3 overflow-x-scroll overscroll-x-contain rounded-full bg-slate-200" aria-label="Horizontal table navigation" onScroll={(event) => { if (tableViewportRef.current) tableViewportRef.current.scrollLeft = event.currentTarget.scrollLeft; }}><div style={{ width: `${tableDimensions.contentWidth}px`, height: "1px" }} /></div></div>}
    </div>
  </div>;
}
