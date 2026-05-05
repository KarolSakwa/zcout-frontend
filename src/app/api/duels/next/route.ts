import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

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

  let anon = req.headers.get('x-zcout-anon')?.trim() ?? '';

  if (!anon) {
    anon = req.cookies.get('zcout_anon')?.value ?? '';
  }

  if (!anon) {
    anon = crypto.randomUUID();
  }

  const needSetCookie = !anon;
  if (!anon) anon = crypto.randomUUID();

  const backendUrl = `${API_BASE}/api/duels/next${url.search}`;

  const res = await fetch(backendUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Zcout-Anon': anon,
    },
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');

  const out = new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });

  if (needSetCookie) {
    out.cookies.set('zcout_anon', anon, { path: '/', maxAge: 60 * 60 * 24 * 365 * 2, sameSite: 'lax' });
  }

  return out;
}