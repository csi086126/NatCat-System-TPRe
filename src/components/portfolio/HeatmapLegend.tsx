/**
 * Heatmap Legend Component
 * Displays color scale legend for heatmap visualization
 */

'use client';

import { Card } from '@/components/ui/card';

interface HeatmapLegendProps {
  visible: boolean;
  lowThreshold: number;
  mediumThreshold: number;
}

export default function HeatmapLegend({ visible, lowThreshold, mediumThreshold }: HeatmapLegendProps) {
  if (!visible) return null;

  return (
    <Card className="absolute bottom-4 right-4 z-[1000] p-3 bg-white/95 backdrop-blur-sm shadow-lg w-[280px]">
      <h4 className="font-semibold mb-3 text-sm">Heatmap Legend</h4>
      <div className="flex flex-col gap-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60"></div>
              <span className="text-xs font-medium text-gray-700">Low (Bottom 50%)</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              &lt; {lowThreshold >= 1e9 ? `${(lowThreshold / 1e9).toFixed(2)}B` : `${(lowThreshold / 1e6).toFixed(1)}M`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-60"></div>
              <span className="text-xs font-medium text-gray-700">Medium (50-90%)</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {lowThreshold >= 1e9 ? `${(lowThreshold / 1e9).toFixed(2)}B` : `${(lowThreshold / 1e6).toFixed(1)}M`} - {mediumThreshold >= 1e9 ? `${(mediumThreshold / 1e9).toFixed(2)}B` : `${(mediumThreshold / 1e6).toFixed(1)}M`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-60"></div>
              <span className="text-xs font-medium text-gray-700">High (Top 10%)</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              ≥ {mediumThreshold >= 1e9 ? `${(mediumThreshold / 1e9).toFixed(2)}B` : `${(mediumThreshold / 1e6).toFixed(1)}M`}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground border-t pt-2 mt-1">
          * Risk levels based on exposure percentiles<br/>
          * Circle size indicates exposure amount
        </div>
      </div>
    </Card>
  );
}
