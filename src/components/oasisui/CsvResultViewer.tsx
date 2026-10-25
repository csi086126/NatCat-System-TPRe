"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadOutputEntry } from "@/lib/oasis/outputs";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import type { OutputFile } from "@/lib/oasis/types";

type CsvRow = Record<string, string>;

function parseCsv(text: string) {
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
  const headers = (records.shift() || []).map((header) => header.trim());
  const rows = records.map((cells) => headers.reduce<CsvRow>((row, header, index) => { row[header] = (cells[index] || "").trim(); return row; }, {}));
  return { headers, rows };
}

function findColumn(headers: string[], names: string[]) {
  return headers.find((header) => names.includes(header.toLowerCase()));
}

function numberValue(value: string | undefined) {
  const number = Number((value || "").replaceAll(",", ""));
  return Number.isFinite(number) ? number : undefined;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function curveLabel(value: string) {
  if (value === "1") return "OEP";
  if (value === "2") return "OEP TVAR";
  if (value === "3") return "AEP";
  if (value === "4") return "AEP TVAR";
  return `EPType ${value}`;
}

const EP_CURVE_TYPES = ["1", "3"];

type CurvePoint = { x: number; y: number };

function niceAxisStep(maximum: number, targetTickCount = 5) {
  const rawStep = maximum / targetTickCount;
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function formatAxisValue(value: number, step: number) {
  const fractionDigits = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: fractionDigits }).format(value);
}

function LossCurve({ rows, headers, isPsept }: { rows: CsvRow[]; headers: string[]; isPsept: boolean }) {
  const [selectedSample, setSelectedSample] = useState("");
  const [hovered, setHovered] = useState<{ curve: string; point: CurvePoint; x: number; y: number } | null>(null);
  const returnPeriodColumn = findColumn(headers, ["returnperiod", "return_period", "return period"]);
  const lossColumn = findColumn(headers, ["loss", "meanloss", "mean loss", "eploss"]);
  const calculationColumn = findColumn(headers, ["epcalc", "ep_calc", "type"]);
  const curveColumn = findColumn(headers, ["eptype", "ep_type", "ep type"]);
  const sampleColumn = findColumn(headers, ["sampleid", "sample_id", "sample id"]);

  if (!returnPeriodColumn || !lossColumn) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">当前文件没有可绘制的 ReturnPeriod/Loss 字段。</div>;
  }

  const sampleValues = isPsept && sampleColumn
    ? Array.from(new Set(rows.map((row) => row[sampleColumn]).filter(Boolean))).sort((left, right) => Number(left) - Number(right))
    : [];
  const activeSample = sampleValues.includes(selectedSample) ? selectedSample : sampleValues[0];

  // Native OasisUI plots EPT (not PSEPT) for the full-uncertainty EP curve.
  // EPT uses EPCalc=2 and EPType 1/3 (OEP/AEP). PSEPT has no EPCalc column;
  // it contains one separate curve per SampleId, so never connect samples.
  const selectedCalculation = calculationColumn && !isPsept ? 2 : undefined;
  const scopedRows = rows.filter((row) => {
    const calculation = calculationColumn ? numberValue(row[calculationColumn]) : undefined;
    const curve = curveColumn ? row[curveColumn] : "1";
    const sampleMatches = !isPsept || !sampleColumn || row[sampleColumn] === activeSample;
    return sampleMatches && (selectedCalculation === undefined || calculation === selectedCalculation) && (!curveColumn || EP_CURVE_TYPES.includes(curve));
  });
  const curveValues = curveColumn ? Array.from(new Set(scopedRows.map((row) => row[curveColumn]).filter((value) => EP_CURVE_TYPES.includes(value)))) : ["1"];
  const series = curveValues.map((curve) => ({
    curve,
    points: scopedRows.filter((row) => !curveColumn || row[curveColumn] === curve).map((row) => ({ x: numberValue(row[returnPeriodColumn]), y: numberValue(row[lossColumn]) })).filter((point): point is { x: number; y: number } => point.x !== undefined && point.y !== undefined).sort((a, b) => a.x - b.x),
  })).filter((item) => item.points.length > 0);
  if (!series.length) return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">{isPsept ? "没有找到当前 SampleId 的 EPType=1/3 数据。" : "没有符合 Oasis EP 曲线规则的数据（需要 EPCalc=2 且 EPType=1/3）。"}</div>;

  const width = 960; const height = 460; const left = 78; const right = 28; const top = 24; const bottom = 94;
  const allPoints = series.flatMap((item) => item.points).filter((point) => point.x > 0);
  const xValues = Array.from(new Set(allPoints.map((point) => point.x))).sort((a, b) => a - b);
  const minX = Math.min(...xValues); const maxX = Math.max(...xValues, minX * 10);
  const logMinX = Math.log10(minX); const logMaxX = Math.log10(maxX);
  const maxYValue = Math.max(...allPoints.map((point) => Math.max(point.y, 0) / 1e6), 0);
  const yStep = niceAxisStep(maxYValue || 1);
  const yMax = Math.max(yStep, Math.ceil(maxYValue / yStep) * yStep);
  const yTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, index) => index * yStep);
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const coordinate = (point: CurvePoint) => ({
    x: left + ((Math.log10(point.x) - logMinX) / (logMaxX - logMinX)) * plotWidth,
    y: height - bottom - (Math.max(point.y, 0) / 1e6 / yMax) * plotHeight,
  });
  const colors = ["#0e7490", "#4f46e5"];
  const tooltipWidth = 188; const tooltipHeight = 50;
  const tooltipX = hovered ? Math.min(Math.max(hovered.x + 12, left + 4), width - right - tooltipWidth - 4) : 0;
  const tooltipY = hovered ? Math.min(Math.max(hovered.y - tooltipHeight - 12, top + 4), height - bottom - tooltipHeight - 4) : 0;

  return <div>
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {series.map((item, index) => <span key={item.curve} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{curveLabel(item.curve)}</span>)}
      {isPsept && sampleValues.length > 0 && <label className="inline-flex items-center gap-2"><span className="text-slate-500">PSEPT SampleId</span><select value={activeSample} onChange={(event) => setSelectedSample(event.target.value)} className="h-8 rounded-md border bg-white px-2 text-xs">{sampleValues.map((sample) => <option key={sample} value={sample}>{sample}</option>)}</select></label>}
      <span className="text-slate-400">{isPsept ? "PSEPT per-sample EP curve / EPType 1 + 3" : "Full uncertainty (EPCalc=2)"}</span>
    </div>
    <div className="overflow-x-auto rounded-lg border bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[760px] w-full" role="img" aria-label="OEP and AEP loss curves">
        {yTicks.map((tick) => {
          const y = height - bottom - (tick / yMax) * plotHeight;
          return <g key={`y-grid-${tick}`}><line x1={left} y1={y} x2={width - right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" /><text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">{formatAxisValue(tick, yStep)}</text></g>;
        })}
        {xValues.map((tick) => {
          const x = left + ((Math.log10(tick) - logMinX) / (logMaxX - logMinX)) * plotWidth;
          return <g key={`x-grid-${tick}`}><line x1={x} y1={top} x2={x} y2={height - bottom} stroke="#e2e8f0" strokeDasharray="3 3" /><text x={x} y={height - bottom + 18} textAnchor="end" transform={`rotate(-45 ${x} ${height - bottom + 18})`} fontSize="11" fill="#64748b">{formatNumber(tick)}</text></g>;
        })}
        <line x1={left} y1={top} x2={left} y2={height - bottom} stroke="#94a3b8" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#94a3b8" />
        {series.map((item, seriesIndex) => {
          const coordinates = item.points.filter((point) => point.x > 0).map((point) => ({ point, ...coordinate(point) }));
          const points = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
          const color = colors[seriesIndex % colors.length];
          return <g key={item.curve}><polyline fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />{coordinates.map(({ point, x, y }, pointIndex) => <circle key={`${item.curve}-${point.x}-${pointIndex}`} cx={x} cy={y} r="4.5" fill={color} stroke="white" strokeWidth="1.5" tabIndex={0} aria-label={`${curveLabel(item.curve)}, return period ${formatNumber(point.x)}, loss ${formatNumber(point.y / 1e6)} million`} onMouseEnter={() => setHovered({ curve: item.curve, point, x, y })} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered({ curve: item.curve, point, x, y })} onBlur={() => setHovered(null)} />)}</g>;
        })}
        <text x={left + plotWidth / 2} y={height - 12} textAnchor="middle" fontSize="12" fill="#475569">Return period (years)</text>
        <text x="16" y={top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 16 ${top + plotHeight / 2})`} fontSize="12" fill="#475569">Loss (millions)</text>
        {hovered && <g pointerEvents="none"><rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="#0f172a" opacity="0.95" /><text x={tooltipX + 10} y={tooltipY + 19} fontSize="11" fill="white">{curveLabel(hovered.curve)} · Return period: {formatNumber(hovered.point.x)}</text><text x={tooltipX + 10} y={tooltipY + 38} fontSize="11" fill="#cbd5e1">Loss: {formatNumber(hovered.point.y / 1e6)} million</text></g>}
      </svg>
    </div>
  </div>;
}

export default function CsvResultViewer({ analysisId, files }: { analysisId: string | number; files: OutputFile[] }) {
  const csvFiles = files.filter((file) => (file.filename || file.file_name || file.name || "").toLowerCase().endsWith(".csv"));
  const preferred = csvFiles.find((file) => (file.filename || "").toLowerCase().endsWith("_ept.csv")) || csvFiles[0];
  const [selected, setSelected] = useState("");
  const [text, setText] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const selectedFile = csvFiles.find((file) => (file.filename || file.file_name || file.name) === selected) || preferred;
  const filename = selectedFile?.filename || selectedFile?.file_name || selectedFile?.name || "";
  const isPsept = filename.toLowerCase().endsWith("_psept.csv");
  const parsed = useMemo(() => parseCsv(text), [text]);

  useEffect(() => { if (filename && selected !== filename) setSelected(filename); }, [filename, selected]);
  useEffect(() => {
    if (!filename) { setText(""); return; }
    setLoading(true); setError("");
    downloadOutputEntry(analysisId, filename).then((response) => response.text()).then(setText).catch((loadError) => setError(apiErrorMessage(loadError))).finally(() => setLoading(false));
  }, [analysisId, filename]);

  function downloadChart() {
    const svg = chartContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const chart = svg.cloneNode(true) as SVGSVGElement;
    chart.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    chart.setAttribute("width", "960");
    chart.setAttribute("height", "460");
    const source = new XMLSerializer().serializeToString(chart);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename.replace(/^output\//, "").replace(/\.csv$/i, "")}-loss-preview.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!csvFiles.length) return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">该 Analysis 暂无 CSV 输出文件。请先确认任务已 RUN_COMPLETED。</div>;
  return <div className="space-y-5"><Card><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Preview</CardTitle><div className="oasis-action-row flex items-center gap-2"><select value={filename} onChange={(event) => setSelected(event.target.value)} className="h-9 max-w-[320px] rounded-md border bg-white px-3 text-sm">{csvFiles.map((file) => { const fileName = file.filename || file.file_name || file.name || "output.csv"; return <option key={fileName} value={fileName}>{fileName.replace(/^output\//, "")}</option>; })}</select><Button variant="outline" size="sm" onClick={downloadChart} disabled={loading || !parsed.rows.length}><Download /> Download</Button></div></CardHeader><CardContent>{error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : loading ? <p className="py-10 text-center text-sm text-slate-500">正在读取 {filename.replace(/^output\//, "")}…</p> : <div ref={chartContainerRef}><LossCurve rows={parsed.rows} headers={parsed.headers} isPsept={isPsept} /></div>}</CardContent></Card></div>;
}
