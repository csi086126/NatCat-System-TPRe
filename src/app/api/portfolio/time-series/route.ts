/**
 * API Route: Time Series Analysis
 * Endpoint: /api/portfolio/time-series
 * Method: POST
 * Body: { timeGrain, metric, aggFunc, groupBy?, startDate?, endDate? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';
const ANALYTICS_SCRIPT = path.join(
  process.cwd(),
  '..',
  '..',
  'scripts',
  'portfolio_management',
  'analytics',
  'portfolio_analytics.py'
);

interface TimeSeriesRequest {
  timeGrain: 'year' | 'quarter' | 'month';
  metric: string; // e.g., '公司保額'
  aggFunc: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string; // Optional: e.g., '分區' to see trends by district
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
}

async function runPythonAnalytics(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON_PATH, ['-c', code]);
    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python error: ${errorOutput}`));
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse output: ${output}`));
        }
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: TimeSeriesRequest = await request.json();

    if (!body.timeGrain || !body.metric || !body.aggFunc) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeGrain, metric, and aggFunc are required',
        },
        { status: 400 }
      );
    }

    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import api_time_series

result = api_time_series(
    time_grain='${body.timeGrain}',
    metric='${body.metric}',
    agg_func='${body.aggFunc}',
    group_by=${body.groupBy ? `'${body.groupBy}'` : 'None'}
)

print(json.dumps(result, ensure_ascii=False, default=str))
`;

    const result = await runPythonAnalytics(pythonCode);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        timeGrain: body.timeGrain,
        metric: body.metric,
        aggFunc: body.aggFunc,
        groupBy: body.groupBy,
        recordCount: result.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
