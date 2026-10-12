import { useState, useEffect } from 'react';

// Define data source types
export type DataSource = 'reinsurance' | 'direct';
export type ViewMode = 'map' | 'analytics' | 'regional';
export type PerformanceMode = 'sample' | 'full';

interface PortfolioDataConfig {
  dataSource: DataSource;
  viewMode: ViewMode;
  performanceMode?: PerformanceMode; // Only for direct insurance
  selectedYear?: number | null;
}

interface PortfolioDataResult {
  data: any[];
  isLoading: boolean;
  error: Error | null;
  stats: {
    totalRecords: number;
    totalExposure: number;
    avgExposure: number;
  };
}

/**
 * Unified data access hook for portfolio management
 * Consolidates Treaties, Regional, Direct, and Portfolio modes
 */
export function usePortfolioData(config: PortfolioDataConfig): PortfolioDataResult {
  const { dataSource, viewMode, performanceMode = 'sample', selectedYear } = config;

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalExposure: 0,
    avgExposure: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (dataSource === 'reinsurance') {
          // Load reinsurance treaty data
          if (viewMode === 'map') {
            // Individual treaty markers
            const mockTreaties = await loadReinsuranceTreaties();
            setData(mockTreaties);
            calculateStats(mockTreaties, 'treaty');
          } else if (viewMode === 'regional') {
            // Regional aggregation
            const regionalData = await loadRegionalAggregations();
            setData(regionalData);
            calculateStats(regionalData, 'regional');
          }
        } else if (dataSource === 'direct') {
          // Load direct insurance data
          if (performanceMode === 'sample') {
            // Sample mode: 5,000 policies from static JSON
            const sampleData = await loadDirectSample();
            setData(sampleData);
            calculateStats(sampleData, 'direct-sample');
          } else {
            // Full mode: 68,762 policies from database API
            const fullData = await loadDirectFull(selectedYear);
            setData(fullData);
            calculateStats(fullData, 'direct-full');
          }
        }
      } catch (err) {
        setError(err as Error);
        console.error('Failed to load portfolio data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataSource, viewMode, performanceMode, selectedYear]);

  const calculateStats = (data: any[], type: string) => {
    if (type === 'treaty') {
      const totalExposure = data.reduce((sum, t) => sum + (t.currentExposure || 0), 0);
      setStats({
        totalRecords: data.length,
        totalExposure,
        avgExposure: data.length > 0 ? totalExposure / data.length : 0
      });
    } else if (type.startsWith('direct')) {
      const totalExposure = data.reduce((sum, p) => sum + (Number(p.sum_insured || p.公司保額) || 0), 0);
      setStats({
        totalRecords: data.length,
        totalExposure,
        avgExposure: data.length > 0 ? totalExposure / data.length : 0
      });
    } else if (type === 'regional') {
      const totalExposure = data.reduce((sum, r) => sum + (r.totalExposure || 0), 0);
      setStats({
        totalRecords: data.length,
        totalExposure,
        avgExposure: data.length > 0 ? totalExposure / data.length : 0
      });
    }
  };

  return { data, isLoading, error, stats };
}

// Data loading functions

async function loadReinsuranceTreaties() {
  // Return mock treaty data
  return [
    {
      id: 'TP-HK-001',
      name: 'HK Property Cat XL 2024',
      cedantId: 'CED-001',
      cedantName: 'ABC Insurance Co. Ltd.',
      type: 'CatXL',
      coverage: ['Property', 'Typhoon', 'Flood'],
      regions: ['Hong Kong'],
      treatyLimit: 50000000,
      currentExposure: 42500000,
      limitUtilization: 85,
      premium: 2500000,
      lossRatio: 65,
      effectiveDate: '2024-01-01',
      expiryDate: '2024-12-31',
      status: 'Active',
      layer: {
        limit: 50000000,
        attachment: 10000000,
        description: '$50M xs $10M'
      },
      coordinates: [22.3193, 114.1694]
    },
    {
      id: 'TP-GBA-005',
      name: 'GBA Regional QS Treaty',
      cedantId: 'CED-002',
      cedantName: 'XYZ Reinsurance Group',
      type: 'QS',
      coverage: ['Property', 'Casualty'],
      regions: ['GBA', 'Hong Kong', 'Macau'],
      treatyLimit: 100000000,
      currentExposure: 65000000,
      limitUtilization: 65,
      premium: 5000000,
      lossRatio: 72,
      effectiveDate: '2024-01-01',
      expiryDate: '2024-12-31',
      status: 'Active',
      coordinates: [22.5431, 114.0579]
    },
    {
      id: 'TP-MO-012',
      name: 'Macau Property XL',
      cedantId: 'CED-003',
      cedantName: 'DEF Life Insurance',
      type: 'XL',
      coverage: ['Property'],
      regions: ['Macau'],
      treatyLimit: 20000000,
      currentExposure: 18500000,
      limitUtilization: 92,
      premium: 800000,
      lossRatio: 45,
      effectiveDate: '2024-01-01',
      expiryDate: '2025-01-01',
      status: 'Active',
      layer: {
        limit: 20000000,
        attachment: 5000000,
        description: '$20M xs $5M'
      },
      coordinates: [22.1987, 113.5439]
    },
    {
      id: 'TP-TH-032',
      name: 'Thailand Flood Cat XL',
      cedantId: 'CED-004',
      cedantName: 'Bangkok General Insurance',
      type: 'CatXL',
      coverage: ['Flood', 'Typhoon'],
      regions: ['Thailand'],
      treatyLimit: 30000000,
      currentExposure: 23400000,
      limitUtilization: 78,
      premium: 1200000,
      lossRatio: 88,
      effectiveDate: '2024-06-01',
      expiryDate: '2025-05-31',
      status: 'Active',
      layer: {
        limit: 30000000,
        attachment: 8000000,
        description: '$30M xs $8M'
      },
      coordinates: [13.7563, 100.5018]
    },
    {
      id: 'TP-SG-018',
      name: 'Singapore Marine & Property',
      cedantId: 'CED-005',
      cedantName: 'Singapore Re Ltd',
      type: 'XL',
      coverage: ['Marine', 'Property'],
      regions: ['Singapore'],
      treatyLimit: 40000000,
      currentExposure: 22000000,
      limitUtilization: 55,
      premium: 1500000,
      lossRatio: 52,
      effectiveDate: '2024-01-01',
      expiryDate: '2024-12-31',
      status: 'Expiring',
      layer: {
        limit: 40000000,
        attachment: 10000000,
        description: '$40M xs $10M'
      },
      coordinates: [1.3521, 103.8198]
    },
    {
      id: 'TP-HK-099',
      name: 'HK SME Stop Loss 2023',
      cedantId: 'CED-001',
      cedantName: 'ABC Insurance Co. Ltd.',
      type: 'StopLoss',
      coverage: ['All Risks'],
      regions: ['Hong Kong'],
      treatyLimit: 15000000,
      currentExposure: 14850000,
      limitUtilization: 99,
      premium: 600000,
      lossRatio: 105,
      effectiveDate: '2023-01-01',
      expiryDate: '2023-12-31',
      status: 'Expired',
      coordinates: [22.3193, 114.1694]
    }
  ];
}

async function loadRegionalAggregations() {
  // Calculate regional aggregations from treaties
  const treaties = await loadReinsuranceTreaties();
  const regionCenters: Record<string, [number, number]> = {
    'Hong Kong': [22.3193, 114.1694],
    'Macau': [22.1987, 113.5439],
    'GBA': [23.1291, 113.2644],
    'Thailand': [13.7563, 100.5018],
    'Singapore': [1.3521, 103.8198],
    'ASEAN': [10.8231, 106.6297],
  };

  const aggregations: Map<string, any> = new Map();

  treaties.forEach(treaty => {
    treaty.regions.forEach(region => {
      if (!aggregations.has(region)) {
        aggregations.set(region, {
          region,
          coordinates: regionCenters[region] || [0, 0],
          totalExposure: 0,
          totalLimit: 0,
          utilization: 0,
          treatyCount: 0,
          color: '#10B981'
        });
      }

      const agg = aggregations.get(region)!;
      agg.totalExposure += treaty.currentExposure;
      agg.totalLimit += treaty.treatyLimit;
      agg.treatyCount += 1;
    });
  });

  // Calculate utilization and assign colors
  aggregations.forEach(agg => {
    agg.utilization = Math.round((agg.totalExposure / agg.totalLimit) * 100);

    if (agg.utilization >= 90) agg.color = '#DC2626';
    else if (agg.utilization >= 80) agg.color = '#F97316';
    else if (agg.utilization >= 70) agg.color = '#FACC15';
    else agg.color = '#10B981';
  });

  return Array.from(aggregations.values());
}

async function loadDirectSample() {
  // Load 5K sample from static JSON
  try {
    const response = await fetch('/data/tphk_portfolio_subset_5000.json');
    if (!response.ok) throw new Error('Failed to load sample data');

    // Parse JSON text manually to handle NaN values
    const text = await response.text();
    const sanitizedText = text.replace(/:\s*NaN/g, ': null');
    const data = JSON.parse(sanitizedText);

    return data;
  } catch (error) {
    console.error('Error loading direct sample:', error);
    return [];
  }
}

async function loadDirectFull(year?: number | null) {
  // Load full data from database API
  // TODO: Python analytics script not yet available, temporarily using sample data
  // Path: portfolio_management/data_processing/portfolio_analytics.py(默认相对仓库根;可通过 PORTFOLIO_ANALYTICS_SCRIPT 环境变量覆盖)

  console.warn('⚠️ Full mode: Python analytics script not available, using sample data');

  try {
    // Temporarily fallback to sample data
    // When Python script is ready, uncomment the API call below:
    /*
    const url = year
      ? `/api/portfolio/18-districts?year=${year}`
      : '/api/portfolio/18-districts';

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load full data');

    const result = await response.json();
    return result.data || [];
    */

    // Fallback: Use sample data with NaN sanitization
    return await loadDirectSample();
  } catch (error) {
    console.error('Error loading direct full data:', error);
    return [];
  }
}
