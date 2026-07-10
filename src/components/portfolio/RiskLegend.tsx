/**
 * Risk Legend Component
 * Displays color scale legend for risk aggregation visualization
 */

'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface RiskLegendProps {
  visible: boolean;
  level?: 'statistical_area' | 'district' | 'spu' | 'subunit';
  metricType?: 'exposure' | 'density';
}

// Standard classification for all levels (Districts, SPU, TPU, Subunit)
const RISK_LEVELS = [
  { label: 'Very High', color: '#991b1b', range: 'Top 1%' },
  { label: 'High', color: '#f97316', range: '90-99%' },
  { label: 'Medium', color: '#eab308', range: '60-90%' },
  { label: 'Low', color: '#84cc16', range: '40-60%' },
  { label: 'Very Low', color: '#10b981', range: 'Bottom 40%' },
];

export default function RiskLegend({ visible, level, metricType = 'exposure' }: RiskLegendProps) {
  if (!visible) return null;

  const metricLabel = metricType === 'density' ? 'Risk Density' : 'Total Exposure';
  const metricDescription = metricType === 'density'
    ? 'Areas colored by risk density (exposure per km²)'
    : 'Areas colored by exposure quantile (distribution)';

  return (
    <Card className="absolute bottom-4 right-4 z-[1000] p-3 bg-white/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-red-600" />
        <div className="flex flex-col">
          <h3 className="font-bold text-sm">{metricLabel}</h3>
          <span className="text-[10px] text-gray-500">by Quantile</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {RISK_LEVELS.map((level) => (
          <div key={level.label} className="flex items-center gap-2 text-xs">
            <div
              className="w-6 h-4 rounded border border-gray-300"
              style={{ backgroundColor: level.color }}
            />
            <span className="font-medium min-w-[70px]">{level.label}</span>
            <span className="text-gray-500 text-[10px]">{level.range}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
        <p>{metricDescription}</p>
        <p className="mt-0.5">Click areas for detailed statistics</p>
      </div>
    </Card>
  );
}
