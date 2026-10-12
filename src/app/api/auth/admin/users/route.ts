import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastAPI } from '@/lib/authProxy'

export async function GET(request: NextRequest) {
  return proxyToFastAPI(request, '/api/auth/admin/users')
}