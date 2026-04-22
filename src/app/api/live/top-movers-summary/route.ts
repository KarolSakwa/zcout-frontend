import { NextRequest, NextResponse } from 'next/server'
const API_BASE_URL = process.env.BACKEND_URL || process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}/api/live/top-movers-summary${search ? `?${search}` : ''}`

  const response = await fetch(url, {
    cache: 'no-store',
  })

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  })
}
