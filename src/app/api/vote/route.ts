export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  applyAnonCookiesToResponse,
  resolveServerAnonId,
} from '@/lib/anonId/server';
import { buildUpstreamAnonHeaders } from '@/lib/anonId/proxy';

const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const API_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const resolved = resolveServerAnonId(req);
    const cookieHeader = req.headers.get('cookie');
    const xsrfHeader = req.headers.get('x-xsrf-token');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      ...buildUpstreamAnonHeaders(resolved),
    };

    if (cookieHeader) headers.Cookie = cookieHeader;
    if (xsrfHeader) headers['X-XSRF-TOKEN'] = xsrfHeader;

    const upstream = await fetch(`${API_BASE}/api/votes`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    const text = await upstream.text().catch(() => '');

    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });

    if (resolved.canonical) {
      applyAnonCookiesToResponse(res, resolved.canonical);
    }

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(JSON.stringify({ error: 'Proxy /api/vote failed', message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
