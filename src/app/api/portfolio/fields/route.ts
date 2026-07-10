/**
 * API Route: Get Available Fields and Field Values
 * Endpoint: /api/portfolio/fields
 * Method: GET
 * Query Params: field (optional, to get unique values for a specific field)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');

    if (field) {
      // Get unique values for a specific field
      const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import api_get_field_values

result = api_get_field_values('${field}')
print(json.dumps(result, ensure_ascii=False, default=str))
`;

      const result = await runPythonAnalytics(pythonCode);

      return NextResponse.json({
        success: true,
        data: {
          field,
          values: result,
          count: result.length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Get all available fields
      const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from portfolio_analytics import api_get_fields

result = api_get_fields()
print(json.dumps(result, ensure_ascii=False, default=str))
`;

      const result = await runPythonAnalytics(pythonCode);

      return NextResponse.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    }
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
