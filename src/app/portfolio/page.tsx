/**
 * Portfolio Management Dashboard - Main Page
 * Direct Insurance Portfolio Management (TPHK/TPMO)
 * Uses Global Region Context from AppHeader
 */

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/AppHeader';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Map as MapIcon,
  Building2,
  BarChart3,
  TrendingUp,
  Calendar,
  Globe,
  Filter,
  List
} from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

const PortfolioMap = dynamic(() => import('@/components/portfolio/PortfolioMap'), { ssr: false });
import PortfolioOverviewSidebar from '@/components/portfolio/PortfolioOverviewSidebar';
import MultiDimensionalAnalysis from '@/components/portfolio/MultiDimensionalAnalysis';
import TimeSeriesAnalysis from '@/components/portfolio/TimeSeriesAnalysis';
import { MultiLevelStatistics } from '@/components/statistics/MultiLevelStatistics';

const GROUP_FIELDS = [
  { label: 'None', value: 'none' },
  { label: 'Occupancy', value: 'occupancy' },
  { label: 'Construction', value: 'construction' },
  { label: 'Business Type', value: 'business_type' },
  { label: 'Coverage', value: 'coverage' },
];

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('map'); // Changed to 'map' - show Map View by default
  const [selectedYear, setSelectedYear] = useState<string>('2024');

  // Group By Filter State
  const [groupByField, setGroupByField] = useState<string>('');
  const [groupByValue, setGroupByValue] = useState<string>('all');
  const [availableValues, setAvailableValues] = useState<Record<string, string[]>>({});

  // Overview stats state
  const [overviewStats, setOverviewStats] = useState({
    totalPolicies: 0,
    totalExposure: 0,
    avgExposure: 0,
    topDistrict: '',
    topDistrictExposure: 0,
  });

  // Use global region context
  const { currentRegion, regionConfig } = useRegion();

  const handleDataLoaded = (data: any[]) => {
    const values: Record<string, Set<string>> = {};
    const fields = ['occupancy', 'construction', 'business_type', 'coverage'];
    
    fields.forEach(field => {
      values[field] = new Set();
      data.forEach(item => {
        if (item[field]) values[field].add(String(item[field]));
      });
    });

    // Convert Sets to sorted Arrays
    const sortedValues: Record<string, string[]> = {};
    Object.keys(values).forEach(key => {
        sortedValues[key] = Array.from(values[key]).sort();
    });
    
    setAvailableValues(sortedValues);
  };

  // Convert string year to number or null for components
  const yearValue = selectedYear === 'all' ? null : parseInt(selectedYear);

  const isPortfolioDataRegion = currentRegion === 'hk' || currentRegion === 'mo';

  // Get region display name for UI
  const regionName = regionConfig ? regionConfig.nameEn : 'Select Region';

  const navItems = [
    { id: 'map', label: 'Map View', icon: MapIcon },
    { id: 'districts', label: 'Districts', icon: Building2 },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r bg-white flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Portfolio</h2>
            <p className="text-sm text-gray-500 mt-1">Management Dashboard</p>
          </div>

          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {/* Year Filter - Only show when region is selected */}
            {isPortfolioDataRegion && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span>Underwriting Year</span>
                  </div>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2021">2021</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Group By Filter (Only for Map View) */}
                {activeTab === 'map' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Filter className="w-4 h-4" />
                        <span>Group By Field</span>
                      </div>
                      <Select value={groupByField || 'none'} onValueChange={(val) => {
                        setGroupByField(val === 'none' ? '' : val);
                        setGroupByValue('all'); // Reset value when field changes
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {GROUP_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value Filter (Only shown when field is selected) */}
                    {groupByField && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <List className="w-4 h-4" />
                          <span>Filter Value</span>
                        </div>
                        <Select value={groupByValue} onValueChange={setGroupByValue}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Values" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="all">All Values</SelectItem>
                            {availableValues[groupByField]?.map(val => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                Views
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${
                    activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Portfolio Overview - Show when on map tab and region has data */}
            {activeTab === 'map' && isPortfolioDataRegion && (
              <div className="border-t pt-3">
                <PortfolioOverviewSidebar
                  stats={overviewStats}
                  selectedYear={yearValue}
                />
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500">
              <div className="flex justify-between mb-1">
                <span>Last Updated:</span>
                <span className="font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Source:</span>
                <span className="font-medium">
                  {currentRegion === 'hk' ? 'TPHK Core' :
                   currentRegion === 'mo' ? 'TPMO (Dev)' :
                   regionName}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto bg-gray-50 ${activeTab === 'map' ? 'p-0' : 'p-6'}`}>
          <div className={`${activeTab === 'map' ? 'h-full w-full' : 'max-w-7xl mx-auto h-full'}`}>
            <Tabs value={activeTab} className="h-full space-y-0">
              {/* We don't need TabsList here as we use custom sidebar navigation */}

              <TabsContent value="map" className="mt-0 h-full">
                <PortfolioMap
                  selectedYear={yearValue}
                  region={currentRegion}
                  groupByField={groupByField}
                  groupByValue={groupByValue}
                  onDataLoaded={handleDataLoaded}
                  onOverviewStatsChange={setOverviewStats}
                />
              </TabsContent>

              <TabsContent value="districts" className="mt-0 h-full">
                {isPortfolioDataRegion ? (
                  <MultiLevelStatistics selectedYear={yearValue} />
                ) : (
                  <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Globe className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-500">Select a data region (HK or MO) to view statistics</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="mt-0 h-full">
                {isPortfolioDataRegion ? (
                  <MultiDimensionalAnalysis selectedYear={yearValue} />
                ) : (
                  <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Globe className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-500">Select a data region (HK or MO) to view analysis</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-0 h-full">
                {isPortfolioDataRegion ? (
                  <TimeSeriesAnalysis />
                ) : (
                  <div className="h-full w-full bg-gray-50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <Globe className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-500">Select a data region (HK or MO) to view trends</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
