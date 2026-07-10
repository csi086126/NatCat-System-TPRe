/**
 * Portfolio Overview Sidebar Component
 * Compact version for sidebar display
 */

'use client';

import React from 'react';
import { Building2, MapPin, DollarSign } from 'lucide-react';

interface PortfolioOverviewSidebarProps {
  stats: {
    totalPolicies: number;
    totalExposure: number;
    avgExposure: number;
    topDistrict: string;
    topDistrictExposure: number;
  };
  selectedYear: number | null;
}

export default function PortfolioOverviewSidebar({ stats, selectedYear }: PortfolioOverviewSidebarProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else {
      return value.toLocaleString();
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
        Overview
      </div>

      {/* Total Policies */}
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-600">Total Policies</span>
          </div>
          <div className="text-base font-bold text-gray-900">
            {stats.totalPolicies.toLocaleString()}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {selectedYear ? `Year ${selectedYear}` : 'All Years'}
        </p>
      </div>

      {/* Total Exposure */}
      <div className="bg-green-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-600">Total Exposure</span>
          </div>
          <div className="text-base font-bold text-gray-900">
            HKD {formatCurrency(stats.totalExposure)}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Company share
        </p>
      </div>

      {/* Top District */}
      <div className="bg-orange-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-gray-600">Top District</span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {stats.topDistrict || 'Loading...'}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          HKD {formatCurrency(stats.topDistrictExposure)}
        </p>
      </div>
    </div>
  );
}
