'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, ChevronDown, ChevronUp, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatisticsData {
  dimension: string;
  data: any[];
  summary: {
    totalPolicies: number;
    totalExposure: number;
    avgExposure: number;
  };
  metadata?: {
    dataSource: string;
    timestamp: string;
  };
}

interface StatisticsFloatingPanelProps {
  dimension: 'district' | 'year' | 'occupancy' | 'construction' | null;
  year: number | null;
  onClose?: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function StatisticsFloatingPanel({ dimension, year, onClose }: StatisticsFloatingPanelProps) {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dimension) {
      loadStatistics();
    }
  }, [dimension, year]);

  const loadStatistics = async () => {
    if (!dimension) return;

    setIsLoading(true);
    setError(null);

    try {
      const yearParam = year ? `&year=${year}` : '';
      const response = await fetch(`/api/portfolio/statistics?dimension=${dimension}${yearParam}`);

      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!dimension) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `HKD ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `HKD ${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `HKD ${(value / 1e3).toFixed(2)}K`;
    return `HKD ${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getDimensionLabel = () => {
    const labels = {
      district: '📍 By District',
      year: '📅 By Year',
      occupancy: '🏢 By Occupancy',
      construction: '🏗️ By Construction'
    };
    return labels[dimension] || dimension;
  };

  const renderChart = () => {
    if (!data || !data.data || data.data.length === 0) return null;

    const chartData = data.data.slice(0, 8); // Limit to top 8 for readability

    if (dimension === 'district') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="district"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${(value / 1e9).toFixed(1)}B`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="total_exposure" fill="#3B82F6" name="Total Exposure" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (dimension === 'year') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${(value / 1e9).toFixed(1)}B`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="total_exposure" stroke="#3B82F6" strokeWidth={2} name="Total Exposure" />
            <Line type="monotone" dataKey="policy_count" stroke="#10B981" strokeWidth={2} name="Policy Count" yAxisId="right" />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (dimension === 'occupancy' || dimension === 'construction') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="total_exposure"
              nameKey={dimension === 'occupancy' ? 'occupancy_type' : 'construction_type'}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry) => `${entry[dimension === 'occupancy' ? 'occupancy_type' : 'construction_type']}: ${((entry.total_exposure / data.summary.totalExposure) * 100).toFixed(1)}%`}
              labelStyle={{ fontSize: 10 }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div
      className="absolute bottom-6 right-6 z-[1000] w-[450px] max-h-[calc(100vh-200px)] shadow-2xl"
      style={{
        pointerEvents: 'auto',
        transform: isMinimized ? 'translateY(calc(100% - 60px))' : 'translateY(0)'
      }}
    >
      <Card className="border-2 border-gray-300 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3 pt-3 px-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              {getDimensionLabel()}
              {year && <span className="text-xs text-gray-500">({year})</span>}
            </CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <ChevronUp className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-sm text-red-600">Failed to load statistics</p>
                <p className="text-xs text-gray-500 mt-1">{error}</p>
              </div>
            )}

            {data && !isLoading && !error && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-[10px] text-blue-600 font-medium mb-1">Total Policies</div>
                    <div className="text-lg font-bold text-blue-900">{formatNumber(data.summary.totalPolicies)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-[10px] text-green-600 font-medium mb-1">Total Exposure</div>
                    <div className="text-sm font-bold text-green-900">{formatCurrency(data.summary.totalExposure)}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="text-[10px] text-purple-600 font-medium mb-1">Avg Exposure</div>
                    <div className="text-sm font-bold text-purple-900">{formatCurrency(data.summary.avgExposure)}</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {renderChart()}
                </div>

                {/* Data Source Info */}
                {data.metadata && (
                  <div className="text-[10px] text-gray-500 text-center border-t pt-2">
                    <div className="flex items-center justify-center gap-2">
                      <span>Data Source: {data.metadata.dataSource}</span>
                      <span>•</span>
                      <span>{new Date(data.metadata.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
