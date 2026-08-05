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

export async function GET(req: Request) {
  const resolved = resolveServerAnonId(req, { allowCreate: false });

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
    'X-Requested-With': 'XMLHttpRequest',
    ...buildUpstreamAnonHeaders(resolved),
  };

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const upstream = await fetch(`${API_BASE}/api/scouting/progress`, {
    method: 'GET',
    headers,
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
}
