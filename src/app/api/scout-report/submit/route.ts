import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();

  const res = await fetch(`${BACKEND}/api/scout-reports`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
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