import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

function getXsrfFromCookie(cookie: string) {
  const m = cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const xsrf = getXsrfFromCookie(cookie);

  const res = await fetch(`${BACKEND}/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': xsrf,
    },
    cache: 'no-store',
  });

  const out = new NextResponse(null, { status: res.status });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) out.headers.set('set-cookie', setCookie);

  return out;
}