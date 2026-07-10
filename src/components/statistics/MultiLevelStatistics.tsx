/**
 * Multi-Level Geographic Statistics Component
 *
 * Displays portfolio statistics at different geographic levels:
 * - HK: 18 Districts, PPU (9), SPU (52), TPU (292)
 * - MO: Parishes (7), Statistical Areas (25)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Map,
  BarChart3,
  TrendingUp,
  Building2,
  Filter,
  Download,
  ChevronRight,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

interface RegionStatistics {
  id?: number;
  ppu?: number;
  spu?: number;
  tpu?: number;
  name: string;
  nameCN?: string;
  count: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;
  byOccupancy: Record<string, { count: number; totalExposure: number }>;
  byYear: Record<string, { count: number; totalExposure: number }>;
  policies: string[];
  parentPPU?: string;
  parentSPU?: string;
}

type LevelType = 'districts18' | 'ppu' | 'spu' | 'tpu' | 'subunit' | 'parishes' | 'statistical_areas';

interface LevelInfo {
  name: string;
  code: LevelType;
  count: number;
  file: string;
  description: string;
}

interface MultiLevelStatisticsProps {
  selectedYear?: number | null;
}

export function MultiLevelStatistics({ selectedYear }: MultiLevelStatisticsProps) {
  const { currentRegion } = useRegion();
  const [selectedLevel, setSelectedLevel] = useState<LevelType>('districts18');
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [statistics, setStatistics] = useState<Record<string, RegionStatistics>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'count' | 'exposure'>('exposure');
  const [filterQuery, setFilterQuery] = useState('');

  // Get currency based on region
  const currency = currentRegion === 'mo' ? 'MOP' : 'HKD';

  // Load index based on region
  useEffect(() => {
    const indexFile = currentRegion === 'mo' 
      ? '/data/statistics/macau-index.json' 
      : '/data/statistics/index.json';
    
    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    console.log(`[MultiLevelStatistics] Loading index: ${indexFile}`);
    
    fetch(`${indexFile}?t=${timestamp}`)
      .then(res => res.json())
      .then(data => {
        console.log(`[MultiLevelStatistics] Loaded levels:`, data.levels);
        setLevels(data.levels);
        // Set default level based on region
        if (currentRegion === 'mo') {
          setSelectedLevel('parishes');
        } else {
          setSelectedLevel('districts18');
        }
      })
      .catch(err => console.error('Failed to load statistics index:', err));
  }, [currentRegion]);

  // Load statistics for selected level
  useEffect(() => {
    setLoading(true);
    const levelInfo = levels.find(l => l.code === selectedLevel);
    if (!levelInfo) return;

    // Determine which file to load based on selected year
    let fileName = levelInfo.file;
    if (selectedYear) {
      // Use year-specific file if available
      // e.g., districts-18-statistics-2024.json
      const baseFileName = levelInfo.file.replace('.json', '');
      fileName = `${baseFileName}-${selectedYear}.json`;
    }

    console.log(`[MultiLevelStatistics] Loading: ${fileName}, Year: ${selectedYear || 'all'}, Level: ${selectedLevel}`);

    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    const fileUrl = `/data/statistics/${fileName}?t=${timestamp}`;

    console.log(`[MultiLevelStatistics] Fetching from: ${fileUrl}`);

    fetch(fileUrl)
      .then(res => {
        console.log(`[MultiLevelStatistics] Response status: ${res.status}, URL: ${res.url}`);
        if (!res.ok) {
          // If year-specific file doesn't exist, fall back to all-years file
          if (selectedYear) {
            console.warn(`Year-specific file not found, falling back to all-years: ${fileName}`);
            return fetch(`/data/statistics/${levelInfo.file}?t=${timestamp}`);
          }
          throw new Error(`Failed to load statistics: ${res.status}`);
        }
        return res;
      })
      .then(res => res.json())
      .then(data => {
        // Check if this is a placeholder file (has 'status' or 'note' field instead of region data)
        if (data.status === 'pending' || data.note) {
          console.warn(`[MultiLevelStatistics] Placeholder data detected for ${selectedLevel}`);
          setStatistics({});
          setLoading(false);
          return;
        }

        const regionCount = Object.keys(data).length;
        const firstRegionKey = Object.keys(data)[0];
        const firstRegionCount = firstRegionKey ? data[firstRegionKey].count : 0;
        console.log(`[MultiLevelStatistics] Loaded ${regionCount} regions. First region (${firstRegionKey}) has ${firstRegionCount} policies`);
        setStatistics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load statistics:', err);
        setLoading(false);
      });
  }, [selectedLevel, levels, selectedYear]);

  const formatExposure = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${currency} ${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
    } else {
      return `${currency} ${(value / 1000).toFixed(2)}K`;
    }
  };

  const sortedStats = Object.entries(statistics)
    .filter(([_, stats]) => {
      if (!filterQuery) return true;
      return stats.name.toLowerCase().includes(filterQuery.toLowerCase());
    })
    .sort(([_, a], [__, b]) => {
      if (sortBy === 'count') {
        return b.count - a.count;
      } else {
        return b.totalExposure - a.totalExposure;
      }
    });

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRegions(newExpanded);
  };

  const exportCSV = () => {
    const headers = ['Region', 'Policies', 'Total Exposure', 'Avg Exposure', 'Min', 'Max'];
    const rows = sortedStats.map(([_, stats]) => [
      stats.name,
      stats.count,
      stats.totalExposure,
      stats.avgExposure,
      stats.minExposure,
      stats.maxExposure
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `portfolio-statistics-${selectedLevel}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Multi-Level Geographic Statistics
            {selectedYear && (
              <span className="text-lg font-normal text-blue-600">
                ({selectedYear})
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Portfolio analysis across different geographic levels
            {selectedYear ? ` for underwriting year ${selectedYear}` : ' (All Years: 2021-2024)'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Level Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Geographic Level:</span>
          <div className="flex gap-2">
            {levels.map(level => (
              <button
                key={level.code}
                onClick={() => setSelectedLevel(level.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLevel === level.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level.name} ({level.count})
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {levels.find(l => l.code === selectedLevel)?.description}
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search regions..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'count' | 'exposure')}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="exposure">Total Exposure</option>
              <option value="count">Policy Count</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="space-y-3">
        {sortedStats.map(([key, stats]) => (
          <Card key={key} className="overflow-hidden">
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                    {expandedRegions.has(key) ? (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{stats.name}</div>
                    {stats.nameCN && (
                      <div className="text-sm text-gray-500">{stats.nameCN}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                    <div className="text-xs text-gray-500">Policies</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{formatExposure(stats.totalExposure)}</div>
                    <div className="text-xs text-gray-500">Total Exposure</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{formatExposure(stats.avgExposure)}</div>
                    <div className="text-xs text-gray-500">Average</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedRegions.has(key) && (
              <div className="border-t bg-gray-50 p-4 space-y-4">
                {/* Exposure Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Min Exposure</div>
                    <div className="text-lg font-semibold">{formatExposure(stats.minExposure)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Max Exposure</div>
                    <div className="text-lg font-semibold">{formatExposure(stats.maxExposure)}</div>
                  </div>
                </div>

                {/* By Occupancy */}
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    By Occupancy
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.byOccupancy)
                      .sort((a, b) => b[1].totalExposure - a[1].totalExposure)
                      .slice(0, 5)
                      .map(([occ, data]) => (
                        <div key={occ} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{occ}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">{data.count} policies</span>
                            <span className="font-medium">{formatExposure(data.totalExposure)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* By Year */}
                {Object.keys(stats.byYear).length > 0 && (
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      By Year
                    </div>
                    <div className="space-y-2">
                      {Object.entries(stats.byYear)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([year, data]) => (
                          <div key={year} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{year}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-500">{data.count} policies</span>
                              <span className="font-medium">{formatExposure(data.totalExposure)}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* No Results */}
      {sortedStats.length === 0 && !loading && (
        <Card className="p-8 text-center">
          {selectedLevel === 'subunit' ? (
            <div>
              <div className="text-gray-700 font-medium mb-2">Subunit Statistics Generation in Progress</div>
              <div className="text-gray-500 text-sm">
                Subunit (4,916 units) statistics require geospatial Point-in-Polygon processing.
                <br />
                This data will be available soon. Please use SPU, TPU, Districts, or PPU levels in the meantime.
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No regions match your search criteria</div>
          )}
        </Card>
      )}
    </div>
  );
}
