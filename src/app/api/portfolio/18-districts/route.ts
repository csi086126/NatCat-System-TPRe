/**
 * API Route: Get 18 Districts Exposure Statistics
 * Endpoint: /api/portfolio/18-districts
 * Method: GET
 * Query Params: year (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Path to Python analytics script
const ANALYTICS_SCRIPT = path.join(
  process.cwd(),
  '..',
  '..',
  'scripts',
  'portfolio_management',
  'analytics',
  'portfolio_analytics.py'
);

const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';

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

/**
 * Execute Python analytics API and return results
 */
async function runPythonAnalytics(
  functionName: string,
  args: any = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import ${functionName}

# Execute function
result = ${functionName}(${JSON.stringify(args.year) || 'None'})

# Output as JSON
print(json.dumps(result, ensure_ascii=False, default=str))
`;

    const python = spawn(PYTHON_PATH, ['-c', pythonCode]);
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
          reject(new Error(`Failed to parse Python output: ${output}`));
        }
      }
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    // Call Python analytics API
    const result = await runPythonAnalytics('api_get_18_districts', {
      year: year ? parseInt(year) : null,
    });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        year: year || 'all',
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
