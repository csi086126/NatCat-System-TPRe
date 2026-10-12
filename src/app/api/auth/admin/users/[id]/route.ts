import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastAPI } from '@/lib/authProxy'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return proxyToFastAPI(request, `/api/auth/admin/users/${id}`)
}