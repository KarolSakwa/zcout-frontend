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

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ error: `Backend error: ${res.status} ${txt.slice(0, 400)}` }, { status: 500 });
    }

    const data = (await res.json()) as any;

    const players = Array.isArray(data.players) ? data.players : [];
    if (players.length < 2) {
      return NextResponse.json({ error: 'Not enough players (need >= 2)' }, { status: 500 });
    }

    const mapPlayer = (p: any) => {
      const nation = (p.country ?? '').toLowerCase();
      return {
        player_id: p.id,
        name: p.name,
        number: p.number ?? null,
        avatar_url: `/players/${p.id}.png`,
        flag_url: nation ? `/flags/${nation}.png` : undefined,
        club: {
          name: p.club?.name ?? null,
          color_primary: p.club?.color_primary ?? '#1f2937',
          color_accent: p.club?.color_secondary ?? '#111827',
        },
        league: { code: null, name: null },
        nation_code: p.country ?? null,
        position: { code: p.position ?? 'ST', name: p.position ?? 'ST' },
      };
    };

    return NextResponse.json({
      attr: attrRaw ?? null,
      duel_id: data.duel_id ?? null,
      players: players.map(mapPlayer),
      source: 'laravel',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy error', detail: String(err?.message ?? err) }, { status: 500 });
  }
}