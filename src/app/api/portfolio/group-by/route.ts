/**
 * API Route: Group By Field with Flexible Aggregations
 * Endpoint: /api/portfolio/group-by
 * Method: POST
 * Body: { groupBy, aggregations?, filters?, limit? }
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

interface GroupByRequest {
  groupBy: string; // Field to group by (e.g., '險種名稱', '佔用性質')
  aggregations?: Record<string, 'sum' | 'avg' | 'count' | 'min' | 'max'>;
  filters?: Record<string, any>;
  limit?: number;
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
    const body: GroupByRequest = await request.json();

    if (!body.groupBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'groupBy field is required',
        },
        { status: 400 }
      );
    }

    // Build Python code
    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import api_group_by

# Parse parameters
group_by = ${JSON.stringify(body.groupBy)}
aggregations = ${JSON.stringify(body.aggregations || null)}
filters = ${JSON.stringify(body.filters || null)}
limit = ${body.limit || 100}

# Execute
result = api_group_by(group_by, aggregations, filters)

# Limit results
if len(result) > limit:
    result = result[:limit]

print(json.dumps(result, ensure_ascii=False, default=str))
`;

    const result = await runPythonAnalytics(pythonCode);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
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

// Also support GET for simple queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy');

    if (!groupBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'groupBy query parameter is required',
        },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '100');

    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import api_group_by

result = api_group_by('${groupBy}', None, None)[:${limit}]
print(json.dumps(result, ensure_ascii=False, default=str))
`;

    const result = await runPythonAnalytics(pythonCode);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        groupBy,
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
