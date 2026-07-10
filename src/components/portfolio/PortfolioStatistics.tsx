'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface StatisticsData {
  dimension: string;
  data: any[];
  summary: {
    totalPolicies: number;
    totalExposure: number;
    avgExposure: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function PortfolioStatistics({ selectedYear }: { selectedYear: number | null }) {
  const [dimension, setDimension] = useState<'district' | 'year' | 'occupancy' | 'construction'>('district');
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, [dimension, selectedYear]);

  const loadStatistics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const yearParam = selectedYear ? `&year=${selectedYear}` : '';
      const response = await fetch(`/api/portfolio/statistics?dimension=${dimension}${yearParam}`);

      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setData(result);
    } catch (err: any) {
      console.error('Statistics loading error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `HKD ${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `HKD ${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `HKD ${(value / 1000).toFixed(2)}K`;
    }
    return `HKD ${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US');
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-2">⚠️ Failed to load statistics</p>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={loadStatistics}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.summary.totalPolicies)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.summary.totalExposure)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.summary.avgExposure)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dimension Selector */}
      <Tabs value={dimension} onValueChange={(value: any) => setDimension(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="district">🏘️ By District</TabsTrigger>
          <TabsTrigger value="year">📅 By Year</TabsTrigger>
          <TabsTrigger value="occupancy">🏢 By Occupancy</TabsTrigger>
          <TabsTrigger value="construction">🏗️ By Construction</TabsTrigger>
        </TabsList>

        {/* District Analysis */}
        <TabsContent value="district" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">Loading district statistics...</p>
              </CardContent>
            </Card>
          ) : data && data.data.length > 0 ? (
            <>
              {/* Bar Chart - Exposure by District */}
              <Card>
                <CardHeader>
                  <CardTitle>Total Exposure by District</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="district" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="total_exposure" fill="#3B82F6" name="Total Exposure" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pie Chart - Policy Count Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Policy Distribution by District</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={data.data.slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.district}: ${entry.policy_count}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="policy_count"
                      >
                        {data.data.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Statistics by District</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">District</th>
                          <th className="px-4 py-2 text-right">Policies</th>
                          <th className="px-4 py-2 text-right">Total Exposure</th>
                          <th className="px-4 py-2 text-right">Avg Exposure</th>
                          <th className="px-4 py-2 text-right">Min Exposure</th>
                          <th className="px-4 py-2 text-right">Max Exposure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.data.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{row.district}</td>
                            <td className="px-4 py-2 text-right">{formatNumber(row.policy_count)}</td>
                            <td className="px-4 py-2 text-right text-blue-600 font-semibold">
                              {formatCurrency(row.total_exposure)}
                            </td>
                            <td className="px-4 py-2 text-right">{formatCurrency(row.avg_exposure)}</td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {formatCurrency(row.min_exposure)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {formatCurrency(row.max_exposure)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">No data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Year Analysis */}
        <TabsContent value="year" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">Loading year statistics...</p>
              </CardContent>
            </Card>
          ) : data && data.data.length > 0 ? (
            <>
              {/* Line Chart - Trend Over Years */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Growth Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any, name: string) => {
                        if (name === 'total_exposure') return formatCurrency(value);
                        return formatNumber(value);
                      }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="policy_count" stroke="#3B82F6" strokeWidth={2} name="Policy Count" />
                      <Line yAxisId="right" type="monotone" dataKey="total_exposure" stroke="#10B981" strokeWidth={2} name="Total Exposure" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar Chart - Exposure by Year */}
              <Card>
                <CardHeader>
                  <CardTitle>Annual Exposure</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="total_exposure" fill="#10B981" name="Total Exposure" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Year-over-Year Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Year</th>
                        <th className="px-4 py-2 text-right">Policies</th>
                        <th className="px-4 py-2 text-right">Total Exposure</th>
                        <th className="px-4 py-2 text-right">Avg Exposure</th>
                        <th className="px-4 py-2 text-right">Districts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{row.year}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(row.policy_count)}</td>
                          <td className="px-4 py-2 text-right text-blue-600 font-semibold">
                            {formatCurrency(row.total_exposure)}
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.avg_exposure)}</td>
                          <td className="px-4 py-2 text-right">{row.district_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Occupancy Analysis */}
        <TabsContent value="occupancy" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">Loading occupancy statistics...</p>
              </CardContent>
            </Card>
          ) : data && data.data.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Exposure by Occupancy Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.data} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <YAxis dataKey="occupancy_type" type="category" width={150} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="total_exposure" fill="#F59E0B" name="Total Exposure" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Statistics by Occupancy Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Occupancy Type</th>
                        <th className="px-4 py-2 text-right">Policies</th>
                        <th className="px-4 py-2 text-right">Total Exposure</th>
                        <th className="px-4 py-2 text-right">Avg Exposure</th>
                        <th className="px-4 py-2 text-right">Districts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{row.occupancy_type || 'Unknown'}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(row.policy_count)}</td>
                          <td className="px-4 py-2 text-right text-blue-600 font-semibold">
                            {formatCurrency(row.total_exposure)}
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.avg_exposure)}</td>
                          <td className="px-4 py-2 text-right">{row.district_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Construction Analysis */}
        <TabsContent value="construction" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">Loading construction statistics...</p>
              </CardContent>
            </Card>
          ) : data && data.data.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Exposure by Construction Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="construction_type" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="total_exposure" fill="#8B5CF6" name="Total Exposure" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Statistics by Construction Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Construction Type</th>
                        <th className="px-4 py-2 text-right">Policies</th>
                        <th className="px-4 py-2 text-right">Total Exposure</th>
                        <th className="px-4 py-2 text-right">Avg Exposure</th>
                        <th className="px-4 py-2 text-right">Districts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{row.construction_type || 'Unknown'}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(row.policy_count)}</td>
                          <td className="px-4 py-2 text-right text-blue-600 font-semibold">
                            {formatCurrency(row.total_exposure)}
                          </td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.avg_exposure)}</td>
                          <td className="px-4 py-2 text-right">{row.district_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
