/**
 * Multi-Dimensional Analysis Component
 * Flexible filtering and grouping by any field (23 Excel fields)
 * Uses client-side processing with year-specific portfolio data
 * Supports HK and MO regions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Download, RefreshCw } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

interface MultiDimensionalAnalysisProps {
  selectedYear: number | null;
}

interface FieldOption {
  label: string;
  value: string;
  category: string;
}

interface GroupResult {
  group_value: string;
  record_count: number;
  sum_公司保額?: number;
  avg_公司保額?: number;
  count_公司保額?: number;
  min_公司保額?: number;
  max_公司保額?: number;
}

// HK fields
const HK_FIELDS: FieldOption[] = [
  { label: '分區 (District)', value: '分區', category: 'Geographic' },
  { label: '險種名稱 (Coverage Type)', value: '險種名稱', category: 'Business' },
  { label: '佔用性質 (Occupancy)', value: '佔用性質', category: 'Property' },
  { label: '建築等級 (Construction Class)', value: '建築等級', category: 'Property' },
  { label: '業務類別 (Business Type)', value: '業務類別', category: 'Business' },
  { label: '保單幣別 (Currency)', value: '保單幣別', category: 'Financial' },
  { label: '所處洲 (Continent)', value: '所處洲', category: 'Geographic' },
  { label: '國家或地區 (Country)', value: '國家或地區', category: 'Geographic' },
];

// MO fields (based on TPMO data structure)
const MO_FIELDS: FieldOption[] = [
  { label: 'Parish (堂区)', value: 'parish', category: 'Geographic' },
  { label: 'Insurance Type (险种)', value: 'insurance_type', category: 'Business' },
  { label: 'Year (年份)', value: 'year', category: 'Time' },
  { label: 'Property Type', value: 'property_type', category: 'Property' },
  { label: 'Structure', value: 'structure', category: 'Property' },
];

const AGGREGATION_OPTIONS = [
  { label: 'Sum (總和)', value: 'sum' },
  { label: 'Average (平均)', value: 'avg' },
  { label: 'Count (計數)', value: 'count' },
  { label: 'Min (最小)', value: 'min' },
  { label: 'Max (最大)', value: 'max' },
];

export default function MultiDimensionalAnalysis({ selectedYear }: MultiDimensionalAnalysisProps) {
  const { currentRegion } = useRegion();
  const [groupByField, setGroupByField] = useState('');
  const [aggFunction, setAggFunction] = useState('sum');
  const [results, setResults] = useState<GroupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);

  // Get available fields and currency based on region
  const AVAILABLE_FIELDS = currentRegion === 'mo' ? MO_FIELDS : HK_FIELDS;
  const currency = currentRegion === 'mo' ? 'MOP' : 'HKD';
  const exposureField = currentRegion === 'mo' ? 'company_sum_insured' : '公司保額';

  // Set default groupBy field when region changes
  useEffect(() => {
    if (currentRegion === 'mo') {
      setGroupByField('parish');
    } else {
      setGroupByField('險種名稱');
    }
  }, [currentRegion]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);

      // Load only selected year's data to avoid memory issues
      const yearToLoad = selectedYear || (currentRegion === 'mo' ? 2024 : 2023);
      const timestamp = new Date().getTime();
      
      // Use different data path based on region
      const dataPath = currentRegion === 'mo' 
        ? `/data/macau/by-year/tpmo-portfolio-${yearToLoad}.json`
        : `/data/by-year/tphk-portfolio-${yearToLoad}.json`;
      
      const response = await fetch(`${dataPath}?t=${timestamp}`);

      if (!response.ok) {
        throw new Error(`Failed to load portfolio data: ${response.status}`);
      }

      const allPolicies = await response.json();
      console.log(`[MultiDimensionalAnalysis] Loaded ${allPolicies.length} policies for year ${yearToLoad}`);

      // Since we're loading year-specific file, no need to filter again
      const filteredPolicies = allPolicies;

      console.log(`[MultiDimensionalAnalysis] Analyzing ${filteredPolicies.length} policies`);

      // Group and aggregate data
      const grouped = new Map<string, {
        count: number;
        values: number[];
      }>();

      filteredPolicies.forEach((policy: any) => {
        const groupValue = policy[groupByField] || 'Unknown';
        const exposureValue = policy[exposureField] || 0;

        if (!grouped.has(groupValue)) {
          grouped.set(groupValue, { count: 0, values: [] });
        }

        const group = grouped.get(groupValue)!;
        group.count++;
        if (exposureValue > 0) {
          group.values.push(exposureValue);
        }
      });

      // Calculate aggregations
      const aggregatedResults: GroupResult[] = [];

      grouped.forEach((data, groupValue) => {
        const result: GroupResult = {
          group_value: groupValue,
          record_count: data.count,
        };

        if (data.values.length > 0) {
          const sum = data.values.reduce((acc, val) => acc + val, 0);

          result.sum_公司保額 = sum;
          result.avg_公司保額 = sum / data.values.length;
          result.count_公司保額 = data.values.length;
          result.min_公司保額 = Math.min(...data.values);
          result.max_公司保額 = Math.max(...data.values);
        } else {
          result.sum_公司保額 = 0;
          result.avg_公司保額 = 0;
          result.count_公司保額 = 0;
          result.min_公司保額 = 0;
          result.max_公司保額 = 0;
        }

        aggregatedResults.push(result);
      });

      // Sort by the selected aggregation function
      aggregatedResults.sort((a, b) => {
        const aValue = a[`${aggFunction}_公司保額` as keyof GroupResult] as number || 0;
        const bValue = b[`${aggFunction}_公司保額` as keyof GroupResult] as number || 0;
        return bValue - aValue;
      });

      console.log(`[MultiDimensionalAnalysis] Generated ${aggregatedResults.length} groups`);

      setResults(aggregatedResults.slice(0, limit));
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupByField) {
      fetchAnalysis();
    }
  }, [groupByField, aggFunction, selectedYear, limit, currentRegion]);

  const formatValue = (value: number, func: string) => {
    if (func === 'count') return value.toLocaleString();

    if (value >= 1e9) return `${currency} ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${currency} ${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${currency} ${(value / 1e3).toFixed(2)}K`;
    return `${currency} ${value.toLocaleString()}`;
  };

  const exportToCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Group,Record Count,Metric Value']
        .concat(
          results.map(
            (r) =>
              `"${r.group_value}",${r.record_count},${r[`${aggFunction}_公司保額`] || 0}`
          )
        )
        .join('\n');

    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `portfolio_analysis_${groupByField}_${Date.now()}.csv`;
    link.click();
  };

  const totalValue = results.reduce(
    (sum, r) => sum + (r[`${aggFunction}_公司保額`] || 0),
    0
  );
  const maxValue = Math.max(
    ...results.map((r) => r[`${aggFunction}_公司保額`] || 0)
  );

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
          <CardDescription>
            Select field to group by and aggregation function
            {selectedYear && (
              <span className="text-blue-600 text-xs ml-2">
                (Analyzing {selectedYear} data)
              </span>
            )}
            {!selectedYear && (
              <span className="text-orange-600 text-xs ml-2">
                (Please select a year from the filter above - defaulting to 2023)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Group By Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Group By Field</label>
              <Select value={groupByField} onValueChange={setGroupByField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Geographic', 'Business', 'Property', 'Financial'].map((category) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {AVAILABLE_FIELDS.filter((f) => f.category === category).map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aggregation Function */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aggregation Function</label>
              <Select value={aggFunction} onValueChange={setAggFunction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Results Limit</label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchAnalysis} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique {groupByField} values
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatValue(totalValue, aggFunction)}</div>
            <p className="text-xs text-muted-foreground">
              {AGGREGATION_OPTIONS.find((o) => o.value === aggFunction)?.label} of 公司保額
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {results[0]?.group_value || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {results[0] ? formatValue(results[0][`${aggFunction}_公司保額`], aggFunction) : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>
            Grouped by {groupByField}, showing top {limit} results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, idx) => {
                const value = result[`${aggFunction}_公司保額`] || 0;
                const percentage = (value / maxValue) * 100;

                return (
                  <div
                    key={result.group_value}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{result.group_value || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {result.record_count.toLocaleString()} records
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatValue(value, aggFunction)}</div>
                        <div className="text-xs text-muted-foreground">
                          {((value / totalValue) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
