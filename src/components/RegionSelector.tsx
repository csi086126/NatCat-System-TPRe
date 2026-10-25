"use client";

import { useRegion } from "@/contexts/RegionContext";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

/** Compact header selector: only the region abbreviation is visible before opening it. */
export function RegionSelector() {
  const { currentRegion, regionConfig, availableRegions, switchRegion, isLoading } = useRegion();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select value={currentRegion} onValueChange={switchRegion} disabled={isLoading}>
        <SelectTrigger
          className="h-9 w-[72px] shrink-0 justify-between border-gray-300 bg-white px-2 text-sm focus:ring-1 focus:ring-blue-500"
          title={regionConfig?.nameEn || "Region Selection"}
        >
          <span className="font-semibold text-blue-600">{regionConfig?.icon || currentRegion.toUpperCase()}</span>
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {availableRegions.map((region) => (
            <SelectItem key={region.code} value={region.code} className="cursor-pointer text-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-[28px] font-semibold text-blue-600">{region.icon}</span>
                <span>-</span>
                <span>{region.nameEn}</span>
                {region.status === "development" && <span className="ml-1 text-xs text-orange-500">(Dev)</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RegionSelectorCompact() {
  const { currentRegion, regionConfig, availableRegions, switchRegion } = useRegion();

  if (!regionConfig) return null;

  return (
    <Select value={currentRegion} onValueChange={switchRegion}>
      <SelectTrigger className="h-9 w-[72px] border-blue-300 bg-white px-2 transition-colors hover:bg-blue-50" title={regionConfig.nameEn}>
        <span className="font-semibold text-blue-600">{regionConfig.icon}</span>
      </SelectTrigger>
      <SelectContent>
        {availableRegions.map((region) => (
          <SelectItem key={region.code} value={region.code}>
            <span className="flex items-center gap-2"><span>{region.icon}</span><span>{region.nameEn}</span></span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
