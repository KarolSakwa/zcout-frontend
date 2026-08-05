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

type SkipRequestBody = {
  duel_id?: number | string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SkipRequestBody | null;
  const duelId = Number(body?.duel_id);

  if (!Number.isFinite(duelId) || duelId <= 0) {
    return NextResponse.json({ message: 'Missing duel_id' }, { status: 422 });
  }

  const resolved = resolveServerAnonId(req);

  const res = await fetch(`${API_BASE}/api/duels/skip`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...buildUpstreamAnonHeaders(resolved),
    },
    body: JSON.stringify({ duel_id: duelId }),
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
