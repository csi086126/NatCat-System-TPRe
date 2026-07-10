'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface EPPoint {
  /** Annual exceedance probability in percent, e.g. 0.4 for 0.40% */
  prob: number;
  /** Return period in years */
  rp: number;
  /** Ground-up loss */
  gu: number;
  /** Gross loss (after deductibles / limits / reinsurance) */
  gross: number;
}

export interface EPCurveProps {
  title?: string;
  /** e.g. 'Earthquake', 'Typhoon' */
  peril?: string;
  /** OEP or AEP — display only */
  metric?: 'OEP' | 'AEP';
  data: EPPoint[];
  modelledExposure?: number;
  /** Stats below the table */
  averageAnnualLoss?: { gu: number; gross: number };
  standardDeviation?: { gu: number; gross: number };
  coefficientOfVariation?: { gu: number; gross: number };
  currency?: string;
  /** Whether to show the stats / data table on the right */
  showTable?: boolean;
  height?: number;
}

const fmtMoney = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtFull = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString();

export const SAMPLE_EARTHQUAKE_OEP: EPPoint[] = [
  { prob: 0.01,  rp: 10000, gu: 2215370996, gross: 2204732213 },
  { prob: 0.02,  rp:  5000, gu: 1894343516, gross: 1878792721 },
  { prob: 0.05,  rp:  2000, gu: 1430074965, gross: 1414080788 },
  { prob: 0.10,  rp:  1000, gu: 1067155977, gross: 1052537052 },
  { prob: 0.20,  rp:   500, gu:  720115185, gross:  702465644 },
  { prob: 0.40,  rp:   250, gu:  352115946, gross:  335206103 },
  { prob: 0.50,  rp:   200, gu:  277168256, gross:  260088416 },
  { prob: 1.00,  rp:   100, gu:  109585095, gross:   92144634 },
  { prob: 2.00,  rp:    50, gu:   40799957, gross:   24176678 },
  { prob: 4.00,  rp:    25, gu:   12033916, gross:    1278849 },
  { prob: 10.0,  rp:    10, gu:    1455693, gross:          0 },
  { prob: 20.0,  rp:     5, gu:     140438, gross:          0 },
];

const CustomTooltip = ({ active, payload, label, useRP }: any) => {
  if (!active || !payload || !payload.length) return null;
  const gu = payload.find((p: any) => p.dataKey === 'gu')?.value;
  const gr = payload.find((p: any) => p.dataKey === 'gross')?.value;
  return (
    <div className="bg-white border border-gray-300 rounded shadow-lg p-2 text-xs">
      <div className="font-semibold text-purple-700 border-b border-gray-200 pb-1 mb-1">
        {useRP ? `Return Period: ${Number(label).toLocaleString()} yr` : `Exceedance: ${label}%`}
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-purple-600">● Ground Up:</span>
        <b>{fmtFull(gu)}</b>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-amber-600">■ Gross Loss:</span>
        <b>{fmtFull(gr)}</b>
      </div>
      {Number.isFinite(gu) && Number.isFinite(gr) && gu > 0 && (
        <div className="flex justify-between gap-3 mt-1 pt-1 border-t border-gray-200 text-gray-600">
          <span>Cession:</span>
          <b>{fmtFull(gu - gr)} ({((1 - gr / gu) * 100).toFixed(1)}%)</b>
        </div>
      )}
    </div>
  );
};

export default function EPCurveChart({
  title,
  peril = 'Earthquake',
  metric = 'OEP',
  data,
  modelledExposure,
  averageAnnualLoss,
  standardDeviation,
  coefficientOfVariation,
  currency = '',
  showTable = true,
  height = 420,
}: EPCurveProps) {
  const [xMode, setXMode] = useState<'rp' | 'prob'>('rp');
  const [logX, setLogX] = useState(true);
  const [logY, setLogY] = useState(false);

  const useRP = xMode === 'rp';

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (useRP ? a.rp - b.rp : a.prob - b.prob));
  }, [data, useRP]);

  // Convert 0 -> tiny positive on log Y so points are still drawn
  const chartData = useMemo(() => {
    return sortedData.map(d => ({
      x: useRP ? d.rp : d.prob,
      gu: logY && d.gu === 0 ? 0.5 : d.gu,
      gross: logY && d.gross === 0 ? 0.5 : d.gross,
      _origGu: d.gu,
      _origGross: d.gross,
      _rp: d.rp,
      _prob: d.prob,
    }));
  }, [sortedData, useRP, logY]);

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardTitle className="text-base text-purple-800 flex items-center justify-between">
          <span>{title || `${peril} ${metric} — Exceedance Probability Curve`}</span>
          {modelledExposure !== undefined && (
            <span className="text-xs font-normal text-gray-600">
              Modelled Exposure: <b className="text-purple-700">{fmtFull(modelledExposure)}</b>
              {currency && ` ${currency}`}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-3">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <div className="inline-flex rounded border border-gray-300 overflow-hidden">
            <button
              onClick={() => setXMode('rp')}
              className={`px-3 py-1 ${useRP ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Return Period (yr)
            </button>
            <button
              onClick={() => setXMode('prob')}
              className={`px-3 py-1 border-l border-gray-300 ${!useRP ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Exceedance Prob (%)
            </button>
          </div>

          <Label className="flex items-center gap-1 ml-2 cursor-pointer">
            <input type="checkbox" checked={logX} onChange={e => setLogX(e.target.checked)} />
            Log X
          </Label>
          <Label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={logY} onChange={e => setLogY(e.target.checked)} />
            Log Y
          </Label>
        </div>

        <div className={showTable ? 'grid grid-cols-1 lg:grid-cols-3 gap-4' : ''}>
          {/* Chart */}
          <div className={showTable ? 'lg:col-span-2' : ''}>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="x"
                  type="number"
                  scale={logX ? 'log' : 'linear'}
                  domain={['auto', 'auto']}
                  allowDataOverflow
                  tickFormatter={(v) => useRP ? `${v >= 1000 ? `${v / 1000}k` : v}` : `${v}%`}
                  label={{
                    value: useRP ? 'Return Period (years)' : 'Annual Exceedance Probability (%)',
                    position: 'insideBottom',
                    offset: -35,
                    style: { fontSize: 12, fill: '#5b21b6' },
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  scale={logY ? 'log' : 'linear'}
                  domain={logY ? [1, 'auto'] : [0, 'auto']}
                  allowDataOverflow
                  tickFormatter={(v) => fmtMoney(v)}
                  label={{
                    value: `Loss${currency ? ` (${currency})` : ''}`,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#5b21b6' },
                  }}
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip useRP={useRP} />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="gu"
                  name="Ground Up"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#7c3aed' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="gross"
                  name="Gross Loss"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table + Stats */}
          {showTable && (
            <div className="text-xs">
              <div className="overflow-y-auto max-h-[360px] border border-gray-200 rounded">
                <table className="w-full">
                  <thead className="bg-purple-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-purple-700">Prob.</th>
                      <th className="text-right px-2 py-1.5 text-purple-700">RP</th>
                      <th className="text-right px-2 py-1.5 text-purple-700">Ground Up</th>
                      <th className="text-right px-2 py-1.5 text-purple-700">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.slice().sort((a, b) => b.rp - a.rp).map((r, i) => (
                      <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                        <td className="px-2 py-1">{r.prob.toFixed(2)}%</td>
                        <td className="px-2 py-1 text-right">{r.rp.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right font-mono">{fmtMoney(r.gu)}</td>
                        <td className="px-2 py-1 text-right font-mono">{fmtMoney(r.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(averageAnnualLoss || standardDeviation || coefficientOfVariation) && (
                <div className="mt-3 border-t-2 border-purple-200 pt-2 space-y-1">
                  {averageAnnualLoss && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Annual Loss</span>
                      <span className="font-semibold text-purple-700">
                        {fmtMoney(averageAnnualLoss.gu)} / {fmtMoney(averageAnnualLoss.gross)}
                      </span>
                    </div>
                  )}
                  {standardDeviation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Standard Deviation</span>
                      <span className="font-semibold text-purple-700">
                        {fmtMoney(standardDeviation.gu)} / {fmtMoney(standardDeviation.gross)}
                      </span>
                    </div>
                  )}
                  {coefficientOfVariation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coefficient of Variation</span>
                      <span className="font-semibold text-purple-700">
                        {coefficientOfVariation.gu.toFixed(2)} / {coefficientOfVariation.gross.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 pt-1">GU / Gross</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
