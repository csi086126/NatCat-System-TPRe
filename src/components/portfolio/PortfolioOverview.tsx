/**
 * Portfolio Overview Component
 * Displays KPI cards with summary statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, DollarSign } from 'lucide-react';

interface PortfolioOverviewProps {
  selectedYear: number | null;
}

export default function PortfolioOverview({ selectedYear }: PortfolioOverviewProps) {
  const [stats, setStats] = useState({
    totalPolicies: 0,
    totalExposure: 0,
    topDistrict: '',
    topDistrictExposure: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // Fetch 18 districts data
        const url = selectedYear
          ? `/api/portfolio/18-districts?year=${selectedYear}`
          : '/api/portfolio/18-districts';

        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
          const totalPolicies = result.data.reduce(
            (sum: number, d: any) => sum + (d.policy_count || 0),
            0
          );
          const totalExposure = result.data.reduce(
            (sum: number, d: any) => sum + (d.total_exposure || 0),
            0
          );

          const topDistrict = result.data[0];

          setStats({
            totalPolicies,
            totalExposure,
            topDistrict: topDistrict.district,
            topDistrictExposure: topDistrict.total_exposure,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [selectedYear]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `HKD ${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `HKD ${(value / 1e6).toFixed(2)}M`;
    } else {
      return `HKD ${value.toLocaleString()}`;
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPolicies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {selectedYear ? `Year ${selectedYear}` : 'All Years (2021-2024)'}
            </p>
          </CardContent>
        </Card>

        {/* Total Exposure */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExposure)}</div>
            <p className="text-xs text-muted-foreground">
              Company share (公司保額)
            </p>
          </CardContent>
        </Card>

        {/* Top District */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top District</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topDistrict}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.topDistrictExposure)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Geocoding Success Rate</span>
                <span className="font-medium">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coverage Period</span>
                <span className="font-medium">2021-2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Districts Covered</span>
                <span className="font-medium">18 / 18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data Source</span>
                <span className="font-medium">TPHK 承保数据</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Year Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[2021, 2022, 2023, 2024].map((year) => (
                <div key={year} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{year}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          year === 2024
                            ? 'bg-blue-600'
                            : year === 2023
                            ? 'bg-blue-500'
                            : year === 2022
                            ? 'bg-blue-400'
                            : 'bg-blue-300'
                        }`}
                        style={{
                          width: `${
                            year === 2024 ? 90 : year === 2023 ? 100 : year === 2022 ? 70 : 20
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {year === 2024 ? '22.5K' : year === 2023 ? '28.7K' : year === 2022 ? '14.7K' : '1.2K'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
