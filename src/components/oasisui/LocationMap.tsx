"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadPortfolioFile } from "@/lib/oasis/portfolios";
import { apiErrorMessage } from "@/lib/oasis/api-client";
import type { LocationPoint } from "./LocationMapCanvas";

const LocationMapCanvas = dynamic(() => import("./LocationMapCanvas"), { ssr: false });
const MAX_RENDERED_POINTS = 10_000;

type LocationMapProps = {
  portfolioId: string | number;
  locationFile?: unknown;
};

function hasLocationFile(value: unknown) {
  if (!value) return false;
  if (typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  return "file" in record ? Boolean(record.file) : Object.keys(record).length > 0;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];
    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

function numberFrom(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const number = Number(value.trim().replaceAll(",", ""));
  return Number.isFinite(number) ? number : undefined;
}

function isTivColumn(header: string) {
  return header === "tiv" || header.startsWith("tiv") || header.endsWith("tiv");
}

function formatAmount(value: number, currency?: string) {
  const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return currency ? `${currency} ${amount}` : amount;
}

function valueFor(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) return value.trim();
  }
  return "";
}

function parseLocationPoints(text: string) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { totalRows: 0, totalTiv: 0, hasTiv: false, currency: undefined, points: [], skippedRows: 0 };

  const headers = rows[0].map(normalizeHeader);
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  const tivHeaders = headers.filter(isTivColumn);
  const explicitTotalTivHeaders = tivHeaders.filter((header) => ["tiv", "totaltiv", "tivtotal"].includes(header));
  const amountHeaders = explicitTotalTivHeaders.length ? explicitTotalTivHeaders : tivHeaders;
  const currencyValues = Array.from(new Set(records.map((row) => valueFor(row, ["LocCurrency", "Currency"])).filter(Boolean)));
  const points: LocationPoint[] = [];
  let skippedRows = 0;
  let totalTiv = 0;

  records.forEach((row, index) => {
    amountHeaders.forEach((header) => {
      const amount = numberFrom(row[header]);
      if (amount !== undefined) totalTiv += amount;
    });
    const latitude = numberFrom(valueFor(row, ["Latitude", "Lat", "Y"]));
    const longitude = numberFrom(valueFor(row, ["Longitude", "Lon", "Lng", "Long", "X"]));
    if (latitude === undefined || longitude === undefined || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      skippedRows += 1;
      return;
    }

    const id = valueFor(row, ["LocID", "LocationID", "LocNumber", "PortNumber", "AddressID", "ID"]) || `Location ${index + 1}`;
    const details: Array<[string, string]> = [["Latitude", latitude.toFixed(6)], ["Longitude", longitude.toFixed(6)]];
    const address = valueFor(row, ["Address", "AddressLine1", "Address1"]);
    const city = valueFor(row, ["City", "District", "SubArea"]);
    const postalCode = valueFor(row, ["PostalCode", "Postcode", "ZIP"]);
    if (address) details.unshift(["Address", address]);
    if (city) details.push(["City", city]);
    if (postalCode) details.push(["Postal code", postalCode]);
    points.push({ key: `${id}-${index}`, label: id, latitude, longitude, details });
  });

  return { totalRows: records.length, totalTiv, hasTiv: amountHeaders.length > 0, currency: currencyValues.length === 1 ? currencyValues[0] : undefined, points, skippedRows };
}

export default function LocationMap({ portfolioId, locationFile }: LocationMapProps) {
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalTiv, setTotalTiv] = useState(0);
  const [hasTiv, setHasTiv] = useState(false);
  const [currency, setCurrency] = useState<string | undefined>();
  const [skippedRows, setSkippedRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const available = hasLocationFile(locationFile);

  useEffect(() => {
    let cancelled = false;
    if (!available) {
      setPoints([]);
      setTotalRows(0);
      setTotalTiv(0);
      setHasTiv(false);
      setCurrency(undefined);
      setSkippedRows(0);
      setError("");
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError("");
    downloadPortfolioFile(portfolioId, "location_file", "csv")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Location file request failed (${response.status})`);
        return parseLocationPoints(await response.text());
      })
      .then((result) => {
        if (cancelled) return;
        setPoints(result.points);
        setTotalRows(result.totalRows);
        setTotalTiv(result.totalTiv);
        setHasTiv(result.hasTiv);
        setCurrency(result.currency);
        setSkippedRows(result.skippedRows);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setPoints([]);
          setTotalRows(0);
          setTotalTiv(0);
          setHasTiv(false);
          setCurrency(undefined);
          setSkippedRows(0);
          setError(apiErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [available, portfolioId, locationFile]);

  const renderedPoints = useMemo(() => {
    if (points.length <= MAX_RENDERED_POINTS) return points;
    const step = Math.ceil(points.length / MAX_RENDERED_POINTS);
    return points.filter((_, index) => index % step === 0);
  }, [points]);

  return (
    <Card className="mt-6 border-slate-200">
      <CardHeader>
        <CardTitle>Location map</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex h-48 items-center justify-center gap-2 rounded-lg border bg-slate-50 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading location file…</div>
          : error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">无法加载 location 文件：{error}</div>
            : !available ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Upload a location file to display property locations on the map.</div>
              : <>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exposure location count</p><p className="mt-1 text-xl font-semibold text-slate-800">{totalRows.toLocaleString()}</p></div>
                  <div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total TIV</p><p className="mt-1 text-xl font-semibold text-slate-800">{hasTiv ? formatAmount(totalTiv, currency) : "Not available"}</p></div>
                </div>
                {!points.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Location 文件中没有找到有效的 Latitude/Longitude 坐标。</div>
                  : <>
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>Mapped locations: <strong className="text-slate-700">{points.length.toLocaleString()}</strong> / {totalRows.toLocaleString()}</span>{skippedRows > 0 && <span>Skipped rows without valid coordinates: {skippedRows.toLocaleString()}</span>}{renderedPoints.length < points.length && <span>Map rendering is limited to {renderedPoints.length.toLocaleString()} points for browser performance.</span>}</div>
                    <div className="overflow-hidden rounded-lg border"><LocationMapCanvas points={renderedPoints} /></div>
                  </>}
              </>}
      </CardContent>
    </Card>
  );
}
