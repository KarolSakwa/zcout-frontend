import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

type SkipRequestBody = {
  duel_id?: number | string | null;
};

async function getOrCreateAnonId() {
  const jar = await cookies();
  const existing = jar.get('zcout_anon')?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  jar.set('zcout_anon', id, { path: '/', maxAge: 60 * 60 * 24 * 365 * 2, sameSite: 'lax' });
  return id;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SkipRequestBody | null;
  const duelId = Number(body?.duel_id);

  if (!Number.isFinite(duelId) || duelId <= 0) {
    return NextResponse.json({ message: 'Missing duel_id' }, { status: 422 });
  }

  const anonHeader = req.headers.get('x-zcout-anon');
  const anon = anonHeader && anonHeader.trim() !== '' ? anonHeader : await getOrCreateAnonId();

  const res = await fetch(`${API_BASE}/api/duels/skip`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Zcout-Anon': anon,
    },
    body: JSON.stringify({ duel_id: duelId }),
  });

  const text = await res.text().catch(() => '');
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
