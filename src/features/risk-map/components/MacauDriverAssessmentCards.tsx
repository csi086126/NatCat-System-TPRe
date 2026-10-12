'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FloodHazardQueryResult, FloodLayerQueryResult } from '../types';

interface MacauDriverAssessmentCardsProps {
  assessments: FloodHazardQueryResult[];
}

function findAssessment(
  assessments: FloodHazardQueryResult[],
  family: FloodLayerQueryResult['scenarioFamily'],
) {
  return assessments.find(assessment => assessment.results.some(result => result.scenarioFamily === family));
}

function orderedResults(assessment: FloodHazardQueryResult | undefined) {
  return [...(assessment?.results || [])]
    .filter(result => result.returnPeriod !== null)
    .sort((a, b) => (a.returnPeriod || 0) - (b.returnPeriod || 0));
}

function AnnualMetrics({ assessment, color }: {
  assessment: FloodHazardQueryResult | undefined;
  color: string;
}) {
  const metrics = assessment?.annualMetrics;
  const probability = metrics?.annualFloodProbability;
  const annualized = metrics?.annualizedExcessDepth;
  const conditionalExcess = metrics?.conditionalMeanExcessDepth;
  const conditionalDepth = metrics?.conditionalMeanFloodDepth;
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <p className="text-[10px] text-slate-500">Annual probability &gt; 0.15 m</p>
        <p className="text-base font-bold" style={{ color }}>
          {probability === null || probability === undefined ? 'No data' : `${(probability * 100).toFixed(2)}%`}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <p className="text-[10px] text-slate-500">Annualized excess depth</p>
        <p className="text-base font-bold" style={{ color }}>
          {annualized === null || annualized === undefined ? 'No data' : `${annualized.toFixed(4)} m/yr`}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <p className="text-[10px] text-slate-500">Mean excess depth when flooded</p>
        <p className="text-base font-bold" style={{ color }}>
          {conditionalExcess === null || conditionalExcess === undefined ? 'No data' : `${conditionalExcess.toFixed(3)} m`}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <p className="text-[10px] text-slate-500">Mean depth when flooded</p>
        <p className="text-base font-bold" style={{ color }}>
          {conditionalDepth === null || conditionalDepth === undefined ? 'No data' : `${conditionalDepth.toFixed(3)} m`}
        </p>
      </div>
    </div>
  );
}

function DepthCurve({
  title,
  subtitle,
  data,
  threshold,
  color,
  samplingRadiusMeters,
}: {
  title: string;
  subtitle: string;
  data: Array<{ returnPeriod: number; depth: number | null }>;
  threshold: number;
  color: string;
  samplingRadiusMeters: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="mb-2 text-[10px] text-slate-500">{subtitle}</p>
      <div className="h-52 w-full" style={{ height: 208, minHeight: 208 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="returnPeriod"
              type="category"
              tick={{ fontSize: 9 }}
              tickFormatter={value => `R${value}`}
            />
            <YAxis
              dataKey="depth"
              type="number"
              domain={[0, 'auto']}
              tick={{ fontSize: 9 }}
              tickFormatter={value => `${Number(value).toFixed(1)}m`}
            />
            <Tooltip
              labelFormatter={value => `R${value} · ${(100 / Number(value)).toFixed(Number(value) >= 100 ? 2 : 1)}% AEP`}
              formatter={value => [value === null || value === undefined ? 'No data' : `${Number(value).toFixed(3)} m`, `${samplingRadiusMeters} m max depth`]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#dc2626"
              strokeDasharray="5 4"
              label={{ value: `Threshold ${threshold}m`, position: 'insideTopRight', fontSize: 9, fill: '#dc2626' }}
            />
            <Bar
              dataKey="depth"
              name="Flood depth"
              fill={color}
              radius={[3, 3, 0, 0]}
              maxBarSize={34}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MacauDriverAssessmentCards({ assessments }: MacauDriverAssessmentCardsProps) {
  const rainfall = findAssessment(assessments, 'non-typhoon-rainfall');
  const compound = findAssessment(assessments, 'typhoon-compound');
  const threshold = rainfall?.thresholdMeters ?? compound?.thresholdMeters ?? 0.15;
  // 采样半径从 assessment 里读取,跟随 FLOOD_SAMPLING_RADIUS_METERS 动态变化。
  // 任一评估拿不到就回退到 100,与 API 默认值保持一致。
  const samplingRadiusMeters = rainfall?.samplingRadiusMeters
    || compound?.samplingRadiusMeters
    || 100;
  const rainfallResults = orderedResults(rainfall);
  const compoundResults = orderedResults(compound);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-800">Flood depths by return period</p>
        <span className="text-[10px] text-gray-500">RP ↔ AEP · {samplingRadiusMeters} m max · threshold {threshold} m</span>
      </div>

      {rainfallResults.length > 0 && (
        <div>
          <AnnualMetrics assessment={rainfall} color="#2563eb" />
          <DepthCurve
            title="Non-typhoon rainfall flood"
            subtitle="10,000-year event catalog: sampled depth for each of eleven return periods."
            threshold={threshold}
            color="#2563eb"
            samplingRadiusMeters={samplingRadiusMeters}
            data={rainfallResults.map(result => ({ returnPeriod: result.returnPeriod as number, depth: result.depth }))}
          />
        </div>
      )}

      {compoundResults.length > 0 && (
        <div>
          <AnnualMetrics assessment={compound} color="#7c3aed" />
          <DepthCurve
            title="Typhoon compound flood"
            subtitle="10,000-year joint event catalog: sampled depth for each of eleven return periods."
            threshold={threshold}
            color="#7c3aed"
            samplingRadiusMeters={samplingRadiusMeters}
            data={compoundResults.map(result => ({ returnPeriod: result.returnPeriod as number, depth: result.depth }))}
          />
        </div>
      )}
    </div>
  );
}
