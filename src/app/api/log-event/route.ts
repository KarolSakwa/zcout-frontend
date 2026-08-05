import { NextRequest, NextResponse } from 'next/server';
import { readCookieFromHeader } from '@/lib/anonId/server';
import { buildUpstreamAnonHeaders, resolveAnonForBff } from '@/lib/anonId/proxy';

const API_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const cookieHeader = req.headers.get('cookie') ?? '';
    const resolved = resolveAnonForBff(req, { allowCreate: false });
    const xsrf = readCookieFromHeader(cookieHeader, 'XSRF-TOKEN') ?? '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: ORIGIN,
      ...buildUpstreamAnonHeaders(resolved),
    };

    if (cookieHeader) headers.Cookie = cookieHeader;
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

    const upstream = await fetch(`${API_BASE}/api/log-event`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
