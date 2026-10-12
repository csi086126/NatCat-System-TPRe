'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, Droplets, Grid3X3 } from 'lucide-react';
import type { AreaFloodFamilyStatistics, AreaFloodHazardResult } from '../types';

interface AreaFloodHazardResultsProps {
  result: AreaFloodHazardResult & { type: string };
}

function metric(value: number | null, digits: number, suffix = ''): string {
  return value === null || !Number.isFinite(value) ? 'No data' : `${value.toFixed(digits)}${suffix}`;
}

function onset(returnPeriod: number | null): string {
  return returnPeriod === null ? 'Not reached' : `R${returnPeriod}`;
}

function scenarioAt(family: AreaFloodFamilyStatistics, returnPeriod: number) {
  return family.scenarios.find(scenario => scenario.returnPeriod === returnPeriod);
}

function ReturnPeriodChart({ family, color }: { family: AreaFloodFamilyStatistics; color: string }) {
  const data = family.scenarios.map(scenario => ({
    returnPeriod: scenario.returnPeriod,
    floodedPercent: scenario.floodedAreaFraction * 100,
    wetMeanDepth: scenario.meanWetDepth,
  }));
  return (
    <div className="h-48 w-full" style={{ height: 192, minHeight: 192 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 0, left: -20, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="returnPeriod" tick={{ fontSize: 9 }} tickFormatter={value => `R${value}`} />
          <YAxis
            yAxisId="area"
            domain={[0, 100]}
            tick={{ fontSize: 9 }}
            tickFormatter={value => `${value}%`}
          />
          <YAxis
            yAxisId="depth"
            orientation="right"
            domain={[0, 'auto']}
            tick={{ fontSize: 9 }}
            width={35}
            tickFormatter={value => `${Number(value).toFixed(1)}m`}
          />
          <Tooltip
            labelFormatter={value => `R${value} · ${(100 / Number(value)).toFixed(Number(value) >= 100 ? 2 : 1)}% AEP`}
            formatter={(value, name) => [
              name === 'Flooded area'
                ? `${Number(value).toFixed(1)}%`
                : `${Number(value).toFixed(3)} m`,
              name,
            ]}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            yAxisId="area"
            dataKey="floodedPercent"
            name="Flooded area"
            fill={color}
            fillOpacity={0.76}
            maxBarSize={22}
          />
          <Line
            yAxisId="depth"
            type="monotone"
            dataKey="wetMeanDepth"
            name="Wet mean depth"
            stroke="#0f766e"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FamilySection({ family }: { family: AreaFloodFamilyStatistics }) {
  const isCompound = family.family === 'typhoon-compound';
  const title = isCompound ? 'Typhoon compound flood' : 'Non-typhoon rainfall flood';
  const color = isCompound ? '#7c3aed' : '#2563eb';
  const accent = isCompound ? 'text-violet-700' : 'text-blue-700';
  const band = isCompound ? 'bg-violet-50' : 'bg-blue-50';
  const r200 = scenarioAt(family, 200);
  const r1000 = scenarioAt(family, 1000);

  return (
    <section className="border-t border-slate-200 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className={`h-4 w-4 ${accent}`} />
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        <span className="text-[10px] text-slate-500">bars: area · line: depth</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1 text-center">
        <div className={`${band} p-2`}>
          <span className="block text-[9px] text-slate-500">Any-area onset</span>
          <strong className={`text-sm ${accent}`}>{onset(family.anyAreaOnsetReturnPeriod)}</strong>
        </div>
        <div className={`${band} p-2`}>
          <span className="block text-[9px] text-slate-500">1% area onset</span>
          <strong className={`text-sm ${accent}`}>{onset(family.onePercentAreaOnsetReturnPeriod)}</strong>
        </div>
        <div className={`${band} p-2`}>
          <span className="block text-[9px] text-slate-500">10% area onset</span>
          <strong className={`text-sm ${accent}`}>{onset(family.tenPercentAreaOnsetReturnPeriod)}</strong>
        </div>
      </div>

      <ReturnPeriodChart family={family} color={color} />

      <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 text-xs">
        {[r200, r1000].map((scenario, index) => (
          <div key={index} className="bg-white p-2">
            <strong className="text-slate-800">R{index === 0 ? 200 : 1000}</strong>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
              <span>Flooded</span><span className="text-right text-slate-700">{metric((scenario?.floodedAreaFraction ?? 0) * 100, 1, '%')}</span>
              <span>Wet mean</span><span className="text-right text-slate-700">{metric(scenario?.meanWetDepth ?? null, 2, ' m')}</span>
              <span>Maximum</span><span className="text-right text-slate-700">{metric(scenario?.maximumDepth ?? null, 2, ' m')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="border border-slate-200 bg-slate-50 p-2">
          <span className="block text-[10px] text-slate-500">Mean annual probability</span>
          <strong style={{ color }}>{metric(family.annualProbability.mean === null ? null : family.annualProbability.mean * 100, 2, '%')}</strong>
          <span className="mt-1 block text-[9px] text-slate-500">P90 {metric(family.annualProbability.p90 === null ? null : family.annualProbability.p90 * 100, 2, '%')}</span>
        </div>
        <div className="border border-slate-200 bg-slate-50 p-2">
          <span className="block text-[10px] text-slate-500">Mean annualized excess</span>
          <strong style={{ color }}>{metric(family.annualizedExcessDepth.mean, 4, ' m/yr')}</strong>
          <span className="mt-1 block text-[9px] text-slate-500">P90 {metric(family.annualizedExcessDepth.p90, 4, ' m/yr')}</span>
        </div>
      </div>

      <details className="group border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700">
          Full return-period statistics
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-hidden border-t border-slate-200">
          <table className="w-full table-fixed text-right text-[10px] text-slate-700">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="w-[14%] px-2 py-1.5 text-left">RP</th>
                <th className="w-[22%] px-1 py-1.5">Flooded</th>
                <th className="px-1 py-1.5">Wet mean</th>
                <th className="px-1 py-1.5">P90</th>
                <th className="px-2 py-1.5">Max</th>
              </tr>
            </thead>
            <tbody>
              {family.scenarios.map(scenario => (
                <tr key={scenario.returnPeriod} className="border-t border-slate-100 even:bg-slate-50">
                  <td className="px-2 py-1 text-left font-semibold">R{scenario.returnPeriod}</td>
                  <td className="px-1 py-1">{metric(scenario.floodedAreaFraction * 100, 1, '%')}</td>
                  <td className="px-1 py-1">{metric(scenario.meanWetDepth, 2, ' m')}</td>
                  <td className="px-1 py-1">{metric(scenario.p90Depth, 2, ' m')}</td>
                  <td className="px-2 py-1">{metric(scenario.maximumDepth, 2, ' m')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function AreaFloodHazardResults({ result }: AreaFloodHazardResultsProps) {
  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-800">Coverage and resolution</h3>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden border border-slate-200 bg-slate-200 text-xs">
          <div className="bg-white p-2"><span className="block text-slate-500">Geometry</span><strong className="capitalize">{result.type}</strong></div>
          <div className="bg-white p-2"><span className="block text-slate-500">Area</span><strong>{metric(result.areaSquareKilometers, 3, ' km²')}</strong></div>
          <div className="bg-white p-2"><span className="block text-slate-500">Analysis grid</span><strong>{result.rasterWidth} × {result.rasterHeight}</strong></div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Polygon-masked WCS analysis at approximately {metric(result.approximatePixelSizeMeters, 1, ' m')} resolution.</p>
      </section>
      <section className="border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-800">Historical simulated inundation</h3>
          </div>
          <strong className="text-xl text-teal-800">
            {result.historicalFlood?.available ? result.historicalFlood.inundationCount : 'N/A'}
          </strong>
        </div>
        {result.historicalFlood?.available ? (
          <>
            <div className="grid grid-cols-3 gap-px overflow-hidden border border-teal-200 bg-teal-200 text-center text-xs">
              <div className="bg-white p-2"><span className="block text-[9px] text-slate-500">TC-induced</span><b>{result.historicalFlood.typhoonCount}</b></div>
              <div className="bg-white p-2"><span className="block text-[9px] text-slate-500">Rain-induced</span><b>{result.historicalFlood.rainfallCount}</b></div>
              <div className="bg-white p-2"><span className="block text-[9px] text-slate-500">Catalog queried</span><b>{result.historicalFlood.queriedEvents}/{result.historicalFlood.totalEvents}</b></div>
            </div>
            {result.historicalFlood.events.length > 0 && (
              <details className="mt-2 border border-teal-200 bg-white">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-teal-800">Events intersecting the drawn area</summary>
                <div className="max-h-48 overflow-y-auto border-t border-teal-100">
                  {result.historicalFlood.events.map(event => (
                    <div key={event.layer} className="grid grid-cols-[1fr_60px] gap-2 border-t border-slate-100 px-3 py-1.5 text-[10px] first:border-t-0">
                      <span>{event.display}</span>
                      <b className="text-right">{metric(event.depth, 2, ' m')}</b>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <p className="mt-2 text-[9px] leading-4 text-slate-500">
              An event is counted when any masked analysis pixel exceeds {result.historicalFlood.thresholdMeters.toFixed(2)} m.
              Approximate grid resolution: {metric(result.historicalFlood.approximatePixelSizeMeters ?? null, 1, ' m')}.
              These are simulation rasters from the Data Hub, not independently verified observed loss records.
            </p>
          </>
        ) : (
          <p className="text-[10px] text-slate-500">{result.historicalFlood?.reason || 'Historical flood layers are unavailable for this area.'}</p>
        )}
      </section>
      {result.families.map(family => <FamilySection key={family.family} family={family} />)}
      <p className="border-t border-slate-200 pt-3 text-[10px] leading-4 text-slate-500">
        Flooded area uses depth &gt; {result.thresholdMeters.toFixed(2)} m. Event families remain separate and are not combined into a score.
      </p>
    </div>
  );
}
