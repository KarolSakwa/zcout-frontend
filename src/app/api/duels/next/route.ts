import { NextRequest, NextResponse } from 'next/server';
import {
  applyAnonCookiesToResponse,
  resolveServerAnonId,
} from '@/lib/anonId/server';
import { buildUpstreamAnonHeaders } from '@/lib/anonId/proxy';

const API_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  'http://localhost:8080';

const ATTR_MAP: Record<string, string> = {
  DRI: 'dribbling',
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const attrRaw = url.searchParams.get('attribute');
  if (attrRaw) {
    const mapped = ATTR_MAP[attrRaw.toUpperCase()] ?? attrRaw.toLowerCase();
    url.searchParams.set('attribute', mapped);
  }

  const resolved = resolveServerAnonId(req);
  const backendUrl = `${API_BASE}/api/duels/next${url.search}`;

  const res = await fetch(backendUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...buildUpstreamAnonHeaders(resolved),
    },
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');

  const out = new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });

  if (resolved.canonical) {
    applyAnonCookiesToResponse(out, resolved.canonical);
  }

  return out;
}
