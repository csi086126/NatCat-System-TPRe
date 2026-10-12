import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastAPI } from '@/lib/authProxy'

export async function POST(request: NextRequest) {
  return proxyToFastAPI(request, '/api/auth/register')
}