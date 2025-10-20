"use client"

import { useRegion } from '@/contexts/RegionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Check } from 'lucide-react';

export function RegionSelector() {
  const { currentRegion, availableRegions, switchRegion, isLoading } = useRegion();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRegion}
        onValueChange={switchRegion}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[160px] h-8 text-sm border-gray-300 bg-white focus:ring-1 focus:ring-blue-500">
          <SelectValue placeholder="Region Selection" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {availableRegions.map((region) => (
            <SelectItem 
              key={region.code} 
              value={region.code}
              className="cursor-pointer text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600 min-w-[28px]">{region.icon}</span>
                <span>-</span>
                <span>{region.nameEn}</span>
                {region.status === 'development' && (
                  <span className="text-xs text-orange-500 ml-1">(Dev)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// 简化版本 - 只显示图标和名称
export function RegionSelectorCompact() {
  const { currentRegion, regionConfig, availableRegions, switchRegion } = useRegion();

  if (!regionConfig) return null;

  return (
    <Select value={currentRegion} onValueChange={switchRegion}>
      <SelectTrigger className="w-[140px] h-9 border-blue-300 bg-white hover:bg-blue-50 transition-colors">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{regionConfig.icon}</span>
            <span className="font-medium">{regionConfig.nameEn}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableRegions.map((region) => (
          <SelectItem key={region.code} value={region.code}>
            <span className="flex items-center gap-2">
              <span>{region.icon}</span>
              <span>{region.nameEn}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
