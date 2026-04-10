import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

function getCookieValue(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const hit = parts.find((part) => part.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(name.length + 1));
}

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const xsrfToken = getCookieValue(cookie, 'XSRF-TOKEN');

  const res = await fetch(`${BACKEND}/api/scout-reports`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
    },
    body,
    cache: 'no-store',
  });

  const text = await res.text();
  const out = new NextResponse(text, { status: res.status });

  const contentType = res.headers.get('content-type');
  if (contentType) out.headers.set('content-type', contentType);

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) out.headers.set('set-cookie', setCookie);

  return out;
}