import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.text();

  const res = await fetch(`${BACKEND}/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: request.headers.get('cookie') || '',
      'X-XSRF-TOKEN': request.headers.get('x-xsrf-token') || '',
    },
    body,
    cache: 'no-store',
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Set-Cookie': res.headers.get('Set-Cookie') || '',
    },
  });
}