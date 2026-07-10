/**
 * Portfolio Statistics API - Database Version
 * Provides multi-dimensional analysis using PostgreSQL database
 * Endpoint: /api/portfolio/statistics
 * Method: GET
 *
 * Backend: Python analytics script (portfolio_analytics.py)
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface StatisticsResult {
  dimension: string;
  data: any[];
  summary: {
    totalPolicies?: number;
    totalExposure?: number;
    avgExposure?: number;
    total_policies?: number;
    total_exposure?: number;
    avg_exposure?: number;
  };
}

// Python script paths
const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';
const ANALYTICS_SCRIPT = path.join(process.cwd(), '..', 'scripts', 'portfolio_management', 'analytics', 'portfolio_analytics.py');

/**
 * Execute Python analytics script and return results
 */
async function runPythonAnalytics(dimension: string, year?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      ANALYTICS_SCRIPT,
      '--dimension', dimension,
      '--output', 'json'
    ];

    if (year) {
      args.push('--year', year);
    }

    const python = spawn(PYTHON_PATH, args);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Normalize result format (Python uses snake_case, frontend expects camelCase)
 */
function normalizeResult(result: any): StatisticsResult {
  return {
    dimension: result.dimension,
    data: result.data || [],
    summary: {
      totalPolicies: result.summary?.total_policies || 0,
      totalExposure: result.summary?.total_exposure || 0,
      avgExposure: result.summary?.avg_exposure || 0
    }
  };
}

// Mock data fallback (used if database connection fails)
const generateMockStatistics = (dimension: string, year?: string): StatisticsResult => {
  if (dimension === 'district') {
    return {
      dimension: 'district',
      data: [
        { district: '中西區', policy_count: 3842, total_exposure: 8750000000, avg_exposure: 2277000, min_exposure: 50000, max_exposure: 125000000 },
        { district: '灣仔', policy_count: 4156, total_exposure: 9200000000, avg_exposure: 2213000, min_exposure: 45000, max_exposure: 98000000 },
        { district: '東區', policy_count: 5234, total_exposure: 7800000000, avg_exposure: 1490000, min_exposure: 38000, max_exposure: 85000000 },
        { district: '南區', policy_count: 3621, total_exposure: 6500000000, avg_exposure: 1795000, min_exposure: 42000, max_exposure: 72000000 },
        { district: '油尖旺', policy_count: 6789, total_exposure: 12300000000, avg_exposure: 1812000, min_exposure: 35000, max_exposure: 145000000 },
        { district: '深水埗', policy_count: 5892, total_exposure: 8900000000, avg_exposure: 1510000, min_exposure: 32000, max_exposure: 68000000 },
        { district: '九龍城', policy_count: 4523, total_exposure: 7200000000, avg_exposure: 1592000, min_exposure: 36000, max_exposure: 82000000 },
        { district: '黃大仙', policy_count: 4187, total_exposure: 6100000000, avg_exposure: 1457000, min_exposure: 30000, max_exposure: 55000000 },
        { district: '觀塘', policy_count: 7234, total_exposure: 10500000000, avg_exposure: 1451000, min_exposure: 28000, max_exposure: 92000000 },
        { district: '葵青', policy_count: 5678, total_exposure: 8400000000, avg_exposure: 1479000, min_exposure: 31000, max_exposure: 78000000 },
        { district: '荃灣', policy_count: 4321, total_exposure: 6900000000, avg_exposure: 1597000, min_exposure: 34000, max_exposure: 86000000 },
        { district: '屯門', policy_count: 3892, total_exposure: 5200000000, avg_exposure: 1336000, min_exposure: 29000, max_exposure: 62000000 },
        { district: '元朗', policy_count: 4156, total_exposure: 5800000000, avg_exposure: 1395000, min_exposure: 27000, max_exposure: 71000000 },
        { district: '北區', policy_count: 2987, total_exposure: 3900000000, avg_exposure: 1306000, min_exposure: 25000, max_exposure: 48000000 },
        { district: '大埔', policy_count: 3124, total_exposure: 4200000000, avg_exposure: 1344000, min_exposure: 26000, max_exposure: 53000000 },
        { district: '沙田', policy_count: 5987, total_exposure: 8700000000, avg_exposure: 1453000, min_exposure: 30000, max_exposure: 89000000 },
        { district: '西貢', policy_count: 2834, total_exposure: 5100000000, avg_exposure: 1800000, min_exposure: 38000, max_exposure: 112000000 },
        { district: '離島', policy_count: 1543, total_exposure: 2400000000, avg_exposure: 1556000, min_exposure: 32000, max_exposure: 67000000 }
      ],
      summary: {
        totalPolicies: 68762,
        totalExposure: 127750000000,
        avgExposure: 1858000
      }
    };
  } else if (dimension === 'year') {
    return {
      dimension: 'year',
      data: [
        { year: 2021, policy_count: 15234, total_exposure: 28500000000, avg_exposure: 1871000, district_count: 18 },
        { year: 2022, policy_count: 16892, total_exposure: 31200000000, avg_exposure: 1847000, district_count: 18 },
        { year: 2023, policy_count: 18123, total_exposure: 33800000000, avg_exposure: 1865000, district_count: 18 },
        { year: 2024, policy_count: 18513, total_exposure: 34250000000, avg_exposure: 1850000, district_count: 18 }
      ],
      summary: {
        totalPolicies: 68762,
        totalExposure: 127750000000,
        avgExposure: 1858000
      }
    };
  } else if (dimension === 'occupancy') {
    return {
      dimension: 'occupancy',
      data: [
        { occupancy_type: '住宅', policy_count: 28934, total_exposure: 42300000000, avg_exposure: 1462000, district_count: 18 },
        { occupancy_type: '商業', policy_count: 15678, total_exposure: 45200000000, avg_exposure: 2883000, district_count: 18 },
        { occupancy_type: '工業', policy_count: 8234, total_exposure: 18700000000, avg_exposure: 2271000, district_count: 15 },
        { occupancy_type: '辦公室', policy_count: 12456, total_exposure: 38900000000, avg_exposure: 3123000, district_count: 12 },
        { occupancy_type: '倉庫', policy_count: 3460, total_exposure: 7200000000, avg_exposure: 2081000, district_count: 14 },
        { occupancy_type: '其他', policy_count: 10, total_exposure: 450000000, avg_exposure: 45000000, district_count: 8 }
      ],
      summary: {
        totalPolicies: 68762,
        totalExposure: 127750000000,
        avgExposure: 1858000
      }
    };
  } else if (dimension === 'construction') {
    return {
      dimension: 'construction',
      data: [
        { construction_type: 'I級 (混凝土)', policy_count: 42387, total_exposure: 85600000000, avg_exposure: 2020000, district_count: 18 },
        { construction_type: 'II級 (鋼結構)', policy_count: 18234, total_exposure: 32400000000, avg_exposure: 1777000, district_count: 18 },
        { construction_type: 'III級 (磚石)', policy_count: 6892, total_exposure: 8200000000, avg_exposure: 1190000, district_count: 16 },
        { construction_type: 'IV級 (木結構)', policy_count: 1249, total_exposure: 1550000000, avg_exposure: 1241000, district_count: 12 }
      ],
      summary: {
        totalPolicies: 68762,
        totalExposure: 127750000000,
        avgExposure: 1858000
      }
    };
  }

  // Default fallback
  return {
    dimension: 'district',
    data: [],
    summary: {
      totalPolicies: 0,
      totalExposure: 0,
      avgExposure: 0
    }
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dimension = searchParams.get('dimension') || 'district';
    const year = searchParams.get('year');
    const useMock = searchParams.get('mock') === 'true'; // Allow forcing mock data

    // Validate dimension
    const validDimensions = ['district', 'year', 'occupancy', 'construction'];
    if (!validDimensions.includes(dimension)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}`
        },
        { status: 400 }
      );
    }

    let result: StatisticsResult;
    let dataSource = 'postgresql';
    let errorMessage = '';

    // Try to use Python backend for database query (unless mock is forced)
    if (!useMock) {
      try {
        console.log(`[Statistics API] Calling Python backend: dimension=${dimension}, year=${year || 'all'}`);
        const pythonResult = await runPythonAnalytics(dimension, year || undefined);

        // Check if Python returned an error
        if (pythonResult.error) {
          throw new Error(pythonResult.error);
        }

        result = normalizeResult(pythonResult);
        dataSource = 'postgresql';
        console.log(`[Statistics API] Database query successful: ${result.data.length} records`);
      } catch (error: any) {
        console.warn(`[Statistics API] Database query failed: ${error.message}`);
        console.warn('[Statistics API] Falling back to mock data');
        errorMessage = error.message;
        result = generateMockStatistics(dimension, year || undefined);
        dataSource = 'mock (database unavailable)';
      }
    } else {
      console.log('[Statistics API] Using mock data (forced via query parameter)');
      result = generateMockStatistics(dimension, year || undefined);
      dataSource = 'mock (forced)';
    }

    return NextResponse.json({
      success: true,
      ...result,
      metadata: {
        dimension,
        year: year || 'all',
        timestamp: new Date().toISOString(),
        dataSource,
        ...(errorMessage && { databaseError: errorMessage }),
        note: dataSource.includes('mock')
          ? 'Using sample data. Check database connection for real-time statistics.'
          : 'Live data from PostgreSQL database'
      }
    });
  } catch (error: any) {
    console.error('[Statistics API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: 'Failed to generate statistics.'
      },
      { status: 500 }
    );
  }
}
