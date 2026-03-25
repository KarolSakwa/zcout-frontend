import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();

  const backendUrl = `${API_BASE}/api/search?q=${encodeURIComponent(q)}`;

  const res = await fetch(backendUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');

  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    },
  });
}