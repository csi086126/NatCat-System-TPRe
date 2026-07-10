import React from 'react';
import { Card } from '@/components/ui/card';

interface FloodLegendProps {
  visible: boolean;
}

export const FloodLegend = ({ visible }: FloodLegendProps) => {
  if (!visible) return null;

  const items = [
    { label: '> 3.0 m', color: '#9B2226' },       // Dark Red
    { label: '2.0 - 3.0 m', color: '#D62828' },   // Red
    { label: '1.5 - 2.0 m', color: '#E55934' },   // Red-Orange
    { label: '1.0 - 1.5 m', color: '#F9A03F' },   // Orange
    { label: '0.5 - 1.0 m', color: '#FDE74C' },   // Yellow
    { label: '0.2 - 0.5 m', color: '#5BC0EB' },   // Light Blue
  ];

  return (
    <div className="absolute bottom-6 right-6 z-[1000]">
      <Card className="p-3 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
        <h4 className="text-xs font-bold text-slate-700 mb-2">Flood Depth (m)</h4>
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded-sm border border-slate-300 shadow-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-slate-600 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default FloodLegend;
