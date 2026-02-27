import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080';
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';

  const res = await fetch(`${BACKEND}/sanctum/csrf-cookie`, {
    method: 'GET',
    headers: {
      Cookie: cookie,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    cache: 'no-store',
  });

  const out = new NextResponse(null, { status: res.status });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) out.headers.set('set-cookie', setCookie);

  return out;
}