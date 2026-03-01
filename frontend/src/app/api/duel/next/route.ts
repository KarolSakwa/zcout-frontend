import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

const ATTR_MAP: Record<string, string> = {
  DRI: 'dribbling',
};

function readCookieFromReq(req: Request, name: string): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const parts = cookie.split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.substring(name.length + 1));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const attrRaw = url.searchParams.get('attr');
  const attrKey = attrRaw ? (ATTR_MAP[attrRaw.toUpperCase()] ?? attrRaw.toLowerCase()) : null;

  const backendUrl = attrKey
    ? `${API_BASE}/api/duels/next?attribute=${encodeURIComponent(attrKey)}`
    : `${API_BASE}/api/duels/next`;

  const anonId = readCookieFromReq(req, 'zcout_anon_id');
  const cookieHeader = req.headers.get('cookie');

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (anonId) headers['X-Zcout-Anon'] = anonId;
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const res = await fetch(backendUrl, {
      cache: 'no-store',
      headers,
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy error', detail: String(err?.message ?? err) }, { status: 500 });
  }
}