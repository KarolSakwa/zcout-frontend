export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  applyAnonCookiesToResponse,
  buildClaimAnonHeadersFromRequest,
  readCookieFromHeader,
  resolveServerAnonId,
} from '@/lib/anonId/server';

const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const API_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080';

export async function POST(req: Request) {
  try {
    const resolved = resolveServerAnonId(req, { allowCreate: false });

    if (!resolved.canonical) {
      return NextResponse.json(
        { message: 'Missing X-Zcout-Anon header.' },
        { status: 422 },
      );
    }

    const cookieHeader = req.headers.get('cookie') ?? '';
    const xsrfCookie = readCookieFromHeader(cookieHeader, 'XSRF-TOKEN');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      ...buildClaimAnonHeadersFromRequest(req, resolved),
    };

    if (cookieHeader) headers.Cookie = cookieHeader;
    if (xsrfCookie) headers['X-XSRF-TOKEN'] = xsrfCookie;

    const upstream = await fetch(`${API_BASE}/api/auth/claim-anon`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    });

    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });

    if (upstream.ok) {
      applyAnonCookiesToResponse(res, resolved.canonical);
    }

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'Proxy /api/auth/claim-anon failed', message },
      { status: 500 },
    );
  }
}
