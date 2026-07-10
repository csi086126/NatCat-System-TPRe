/**
 * District Analysis Component
 * 18 Districts Detailed Analysis with Rankings and Visualizations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, TrendingUp, TrendingDown, MapPin } from 'lucide-react';

interface DistrictExposure {
  district: string;
  policy_count: number;
  total_exposure: number;
  avg_exposure: number;
  min_exposure: number;
  max_exposure: number;
  event_count: number;
  business_type_count: number;
  currency: string;
}

interface DistrictAnalysisProps {
  selectedYear: number | null;
}

export default function DistrictAnalysis({ selectedYear }: DistrictAnalysisProps) {
  const [districts, setDistricts] = useState<DistrictExposure[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'exposure' | 'policies' | 'avg'>('exposure');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function fetchDistricts() {
      try {
        setLoading(true);
        const url = selectedYear
          ? `/api/portfolio/18-districts?year=${selectedYear}`
          : '/api/portfolio/18-districts';

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setDistricts(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch districts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDistricts();
  }, [selectedYear]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  const sortedDistricts = [...districts].sort((a, b) => {
    let aValue = 0;
    let bValue = 0;

    switch (sortBy) {
      case 'exposure':
        aValue = a.total_exposure;
        bValue = b.total_exposure;
        break;
      case 'policies':
        aValue = a.policy_count;
        bValue = b.policy_count;
        break;
      case 'avg':
        aValue = a.avg_exposure;
        bValue = b.avg_exposure;
        break;
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const toggleSort = (field: 'exposure' | 'policies' | 'avg') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalExposure = districts.reduce((sum, d) => sum + d.total_exposure, 0);
  const maxExposure = Math.max(...districts.map((d) => d.total_exposure));

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 3 Districts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedDistricts.slice(0, 3).map((district, idx) => (
                <div key={district.district} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? 'bg-yellow-500 text-white'
                        : idx === 1
                        ? 'bg-gray-400 text-white'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{district.district}</div>
                    <div className="text-xs text-muted-foreground">
                      HKD {formatCurrency(district.total_exposure)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exposure Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Highest</span>
                <span className="font-medium">
                  {formatCurrency(Math.max(...districts.map((d) => d.total_exposure)))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average</span>
                <span className="font-medium">
                  {formatCurrency(totalExposure / districts.length)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lowest</span>
                <span className="font-medium">
                  {formatCurrency(Math.min(...districts.map((d) => d.total_exposure)))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coverage Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Districts Covered</span>
                <span className="font-medium">{districts.length} / 18</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Policies</span>
                <span className="font-medium">
                  {districts.reduce((sum, d) => sum + d.policy_count, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg per District</span>
                <span className="font-medium">
                  {(
                    districts.reduce((sum, d) => sum + d.policy_count, 0) / districts.length
                  ).toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>18 Districts Detailed Rankings</CardTitle>
          <CardDescription>
            Click column headers to sort. Showing {selectedYear ? `year ${selectedYear}` : 'all years'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('policies')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Policies
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('exposure')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Total Exposure
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort('avg')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Avg Exposure
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Visualization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDistricts.map((district, idx) => {
                  const sharePercentage = (district.total_exposure / totalExposure) * 100;
                  const barWidth = (district.total_exposure / maxExposure) * 100;

                  return (
                    <TableRow key={district.district}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{district.district}</span>
                        </div>
                      </TableCell>
                      <TableCell>{district.policy_count.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="font-medium">HKD {formatCurrency(district.total_exposure)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          HKD {formatCurrency(district.avg_exposure)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{sharePercentage.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>
                        <div className="w-full max-w-[200px]">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Exposure Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Exposure Distribution by District</CardTitle>
          <CardDescription>Visual representation of exposure concentration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedDistricts.map((district) => {
              const percentage = (district.total_exposure / totalExposure) * 100;

              return (
                <div key={district.district} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{district.district}</span>
                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{district.policy_count.toLocaleString()} policies</span>
                    <span>HKD {formatCurrency(district.total_exposure)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
