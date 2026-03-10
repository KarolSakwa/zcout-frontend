export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

function readCookieFromReq(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const parts = cookie.split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.substring(name.length + 1));
}

export async function POST(req: Request) {
  try {
    const body = await req.text();

    let anonId = readCookieFromReq(req, 'zcout_anon');
    const needSetCookie = !anonId;
    if (!anonId) anonId = crypto.randomUUID();

    const cookieHeader = req.headers.get('cookie');
    const xsrfHeader = req.headers.get('x-xsrf-token');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Zcout-Anon': anonId,
    };

    if (cookieHeader) headers['Cookie'] = cookieHeader;
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

    if (needSetCookie) {
      res.cookies.set('zcout_anon', anonId, { path: '/', maxAge: 60 * 60 * 24 * 365 * 2, sameSite: 'lax' });
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