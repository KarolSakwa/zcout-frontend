import { NextResponse } from 'next/server';

const API_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080';

export async function GET() {
  const upstream = await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const res = new NextResponse(null, {
    status: upstream.status,
  });

  const setCookie = upstream.headers.get('set-cookie');

  if (setCookie) {
    res.headers.set('set-cookie', setCookie);
  }

  return res;
}