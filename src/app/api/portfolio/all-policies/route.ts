/**
 * API Route: Get All Policies (for spatial analysis)
 * Endpoint: /api/portfolio/all-policies
 * Method: GET
 * Returns: All policies with coordinates for client-side spatial analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const ANALYTICS_SCRIPT = path.join(
  process.cwd(),
  '..',
  '..',
  'scripts',
  'portfolio_management',
  'analytics',
  'get_all_policies.py'
);

const PYTHON_PATH = 'C:\\Users\\sichen\\AppData\\Local\\anaconda3\\python.exe';

/**
 * Execute Python script to get all policies
 */
async function getAllPolicies(): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonCode = `
import sys
import json
sys.path.append('${path.dirname(ANALYTICS_SCRIPT).replace(/\\/g, '\\\\')}')
from get_all_policies import get_all_policies_with_coords

# Execute function
result = get_all_policies_with_coords()

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
    const result = await getAllPolicies();

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
      metadata: {
        timestamp: new Date().toISOString(),
        note: 'Data for client-side spatial analysis',
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
