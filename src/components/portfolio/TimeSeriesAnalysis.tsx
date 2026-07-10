/**
 * Time Series Analysis Component
 * Trend visualization with year/quarter/month granularity
 * Uses client-side processing with year-specific portfolio data
 * Supports HK and MO regions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useRegion } from '@/contexts/RegionContext';

interface TimeSeriesDataPoint {
  time_period: string;
  metric_value: number;
  group_value?: string;
}

export default function TimeSeriesAnalysis() {
  const { currentRegion } = useRegion();
  const [timeGrain, setTimeGrain] = useState<'year' | 'quarter' | 'month'>('month');
  const [metric, setMetric] = useState('');
  const [aggFunc, setAggFunc] = useState('sum');
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Get currency and metric field based on region
  const currency = currentRegion === 'mo' ? 'MOP' : 'HKD';
  const exposureField = currentRegion === 'mo' ? 'company_sum_insured' : '公司保額';
  const dateField = currentRegion === 'mo' ? 'policy_start' : '保單起期';

  // Reset metric and groupBy when region changes
  useEffect(() => {
    setMetric(exposureField);
    setGroupBy(null); // Reset groupBy to avoid using invalid fields from previous region
  }, [currentRegion, exposureField]);

  const fetchTimeSeries = async () => {
    try {
      setLoading(true);

      // Load all years' data based on region
      const years = currentRegion === 'mo' 
        ? [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
        : [2021, 2022, 2023, 2024];
      
      let allPolicies: any[] = [];

      for (const year of years) {
        try {
          const timestamp = new Date().getTime();
          const dataPath = currentRegion === 'mo'
            ? `/data/macau/by-year/tpmo-portfolio-${year}.json`
            : `/data/by-year/tphk-portfolio-${year}.json`;
          
          const response = await fetch(`${dataPath}?t=${timestamp}`);
          if (response.ok) {
            const yearData = await response.json();
            allPolicies = allPolicies.concat(yearData);
          }
        } catch (err) {
          console.warn(`Failed to load ${year} data:`, err);
        }
      }

      console.log(`[TimeSeriesAnalysis] Loaded ${allPolicies.length} policies total for ${currentRegion.toUpperCase()}`);

      // Process data based on time grain and grouping
      const timeSeriesData = processTimeSeriesData(allPolicies);
      setData(timeSeriesData);
    } catch (error) {
      console.error('Failed to fetch time series:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const processTimeSeriesData = (policies: any[]): TimeSeriesDataPoint[] => {
    // Group by time period and optionally by another field
    const grouped = new Map<string, Map<string, number[]>>();

    policies.forEach(policy => {
      const policyDate = policy[dateField];
      if (!policyDate) return;

      const date = new Date(policyDate);
      let timePeriod: string;

      if (timeGrain === 'year') {
        timePeriod = date.getFullYear().toString();
      } else if (timeGrain === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        timePeriod = `${date.getFullYear()}-Q${quarter}`;
      } else { // month
        timePeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const metricValue = policy[metric] || 0;
      const groupValue = groupBy ? (policy[groupBy] || 'Unknown') : 'all';

      if (!grouped.has(timePeriod)) {
        grouped.set(timePeriod, new Map());
      }

      const periodGroups = grouped.get(timePeriod)!;
      if (!periodGroups.has(groupValue)) {
        periodGroups.set(groupValue, []);
      }

      periodGroups.get(groupValue)!.push(metricValue);
    });

    // Calculate aggregations
    const result: TimeSeriesDataPoint[] = [];

    grouped.forEach((periodGroups, timePeriod) => {
      periodGroups.forEach((values, groupValue) => {
        let metricValue: number;

        if (aggFunc === 'sum') {
          metricValue = values.reduce((sum, val) => sum + val, 0);
        } else if (aggFunc === 'avg') {
          metricValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        } else { // count
          metricValue = values.length;
        }

        result.push({
          time_period: timePeriod,
          metric_value: metricValue,
          group_value: groupValue === 'all' ? undefined : groupValue,
        });
      });
    });

    // Sort by time period
    result.sort((a, b) => a.time_period.localeCompare(b.time_period));

    return result;
  };

  useEffect(() => {
    if (metric) {
      fetchTimeSeries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeGrain, metric, aggFunc, groupBy, currentRegion]);

  const formatValue = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    // time_period is already formatted (e.g., "2024", "2024-Q1", "2024-01")
    if (timeGrain === 'year') {
      return dateStr;
    }
    if (timeGrain === 'quarter') {
      return dateStr.replace('-Q', ' Q');
    }
    // month: convert "2024-01" to "Jan 2024"
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'neutral', percentage: 0 };

    const recent = data[data.length - 1]?.metric_value || 0;
    const previous = data[data.length - 2]?.metric_value || 0;

    if (previous === 0) return { direction: 'neutral', percentage: 0 };

    const percentage = ((recent - previous) / previous) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';

    return { direction, percentage: Math.abs(percentage) };
  };

  const trend = calculateTrend();

  // Group data if groupBy is set
  const chartData = groupBy
    ? (() => {
        const grouped: Record<string, any> = {};

        data.forEach((item) => {
          const period = item.time_period;
          if (!grouped[period]) {
            grouped[period] = { time_period: period };
          }
          grouped[period][item.group_value] = item.metric_value;
        });

        return Object.values(grouped);
      })()
    : data;

  // Get unique group values for legend
  const groupValues = groupBy
    ? Array.from(new Set(data.map((d) => d.group_value).filter(v => v !== undefined)))
    : [];

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Time Series Configuration</CardTitle>
          <CardDescription>Select time granularity and grouping options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Time Grain */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Granularity</label>
              <Select value={timeGrain} onValueChange={(v: any) => setTimeGrain(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metric */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Metric</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentRegion === 'mo' ? (
                    <>
                      <SelectItem value="company_sum_insured">Company Sum Insured</SelectItem>
                      <SelectItem value="sum_insured">Sum Insured</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="公司保額">公司保額 (Sum Insured)</SelectItem>
                      <SelectItem value="共保前總保險金額">總保險金額 (Total Sum Insured)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Aggregation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aggregation</label>
              <Select value={aggFunc} onValueChange={setAggFunc}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum (總和)</SelectItem>
                  <SelectItem value="avg">Average (平均)</SelectItem>
                  <SelectItem value="count">Count (計數)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Group By (Optional)</label>
              <Select
                value={groupBy || 'none'}
                onValueChange={(v) => setGroupBy(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  {currentRegion === 'mo' ? (
                    <>
                      <SelectItem value="parish">Parish (堂區)</SelectItem>
                      <SelectItem value="insurance_type">Insurance Type</SelectItem>
                      <SelectItem value="property_type">Property Type</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="分區">分區 (District)</SelectItem>
                      <SelectItem value="險種名稱">險種名稱 (Coverage)</SelectItem>
                      <SelectItem value="業務類別">業務類別 (Business Type)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Line Chart
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Bar Chart
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {trend.direction === 'up' && (
                <TrendingUp className="h-8 w-8 text-green-600" />
              )}
              {trend.direction === 'down' && (
                <TrendingUp className="h-8 w-8 text-red-600 rotate-180" />
              )}
              {trend.direction === 'neutral' && (
                <div className="h-8 w-8 bg-gray-300 rounded-full" />
              )}
              <div>
                <div className={`text-2xl font-bold ${
                  trend.direction === 'up' ? 'text-green-600' :
                  trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                  {trend.percentage.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">vs previous period</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0 ? formatValue(data[data.length - 1]?.metric_value || 0) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.length > 0 && data[data.length - 1]?.time_period ? formatDate(data[data.length - 1].time_period) : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">
              {timeGrain} periods
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Visualization</CardTitle>
          <CardDescription>
            {aggFunc.toUpperCase()} of {metric} over time
            {groupBy && ` grouped by ${groupBy}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground">No data available</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time_period"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tickFormatter={formatValue} />
                  <Tooltip
                    formatter={(value: any) => formatValue(value)}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  {groupBy ? (
                    groupValues.map((group, idx) => (
                      <Line
                        key={group}
                        type="monotone"
                        dataKey={group}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="metric_value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={metric}
                    />
                  )}
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time_period"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tickFormatter={formatValue} />
                  <Tooltip
                    formatter={(value: any) => formatValue(value)}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  {groupBy ? (
                    groupValues.map((group, idx) => (
                      <Bar
                        key={group}
                        dataKey={group}
                        fill={colors[idx % colors.length]}
                      />
                    ))
                  ) : (
                    <Bar dataKey="metric_value" fill="#3b82f6" name={metric} />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
