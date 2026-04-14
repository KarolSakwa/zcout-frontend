import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

function readCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const cookieHeader = req.headers.get('cookie') ?? '';

    let anon = req.headers.get('x-zcout-anon')?.trim() ?? '';
    if (!anon) anon = readCookie(cookieHeader, 'zcout_anon') ?? '';

    const xsrf = readCookie(cookieHeader, 'XSRF-TOKEN') ?? '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: ORIGIN,
    };

    if (anon) headers['X-Zcout-Anon'] = anon;
    if (cookieHeader) headers['Cookie'] = cookieHeader;
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