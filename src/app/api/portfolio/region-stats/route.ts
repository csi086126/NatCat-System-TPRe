/**
 * API Route: Get Portfolio Statistics by Region
 * Endpoint: /api/portfolio/region-stats
 * Method: GET
 * Query Params: tpu, ppu, spu, district, subunit
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
  'region_portfolio_analytics.py'
);

const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';

interface RegionStats {
  region_id: string;
  region_type: string;
  policy_count: number;
  total_exposure: number;
  avg_exposure: number;
  min_exposure: number;
  max_exposure: number;
  event_count?: number;
  business_type_count?: number;
}

/**
 * Execute Python analytics API and return results
 */
async function runPythonAnalytics(
  regionType: string,
  regionId: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from region_portfolio_analytics import get_region_statistics

# Execute function
result = get_region_statistics('${regionType}', '${regionId}')

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

    // Determine which region parameter is provided
    let regionType = '';
    let regionId = '';

    if (searchParams.get('tpu')) {
      regionType = 'TPU';
      regionId = searchParams.get('tpu')!;
    } else if (searchParams.get('ppu')) {
      regionType = 'PPU';
      regionId = searchParams.get('ppu')!;
    } else if (searchParams.get('spu')) {
      regionType = 'SPU';
      regionId = searchParams.get('spu')!;
    } else if (searchParams.get('district')) {
      regionType = 'DISTRICT';
      regionId = searchParams.get('district')!;
    } else if (searchParams.get('subunit')) {
      regionType = 'SUBUNIT';
      regionId = searchParams.get('subunit')!;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing region parameter (tpu, ppu, spu, district, or subunit)',
        },
        { status: 400 }
      );
    }

    // Call Python analytics API
    const result = await runPythonAnalytics(regionType, regionId);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        region_type: regionType,
        region_id: regionId,
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
