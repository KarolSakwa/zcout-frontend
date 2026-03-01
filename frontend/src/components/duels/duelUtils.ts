import type { PairResponse, Player } from './duelTypes';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

export const ATTR_MAP: Record<string, string> = {
  DRI: 'dribbling',
};

export const SLIDE_MS = 260;
export const EXIT_DELAY_MS = 5050;

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function toPct(rating: number) {
  const v = clamp(rating, 0, 99);
  return (v / 99) * 100;
}

export function glowForAttribute(attr: string) {
  const key = String(attr).toLowerCase();
  if (key.includes('drib')) return '#22c55e';
  if (key.includes('pass')) return '#60a5fa';
  if (key.includes('fin') || key.includes('shot')) return '#f97316';
  if (key.includes('tack') || key.includes('def')) return '#ef4444';
  return '#ffd666';
}

function asRec(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
}

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function num(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePair(raw: unknown): PairResponse {
  const o = asRec(raw);
  if (!o) throw new Error('Invalid duel response');

  const maybeLeft = asRec(o.left);
  const maybeRight = asRec(o.right);

  if (maybeLeft && maybeRight && typeof o.attribute === 'string') {
    return o as unknown as PairResponse;
  }

  const playersVal = o.players;
  if (!Array.isArray(playersVal) || playersVal.length < 2) {
    throw new Error('Brak dwóch graczy w odpowiedzi /api/duels/next');
  }

  const p1 = asRec(playersVal[0]);
  const p2 = asRec(playersVal[1]);
  if (!p1 || !p2) throw new Error('Invalid players payload');

  const mkPlayer = (p: Record<string, unknown>): Player => {
    const club = asRec(p.club);
    const country = asRec(p.country);

    const clubName = club ? (club.name == null ? null : str(club.name)) : null;

    const colorPrimary = club ? str(club.color_primary, '#1f2937') : '#1f2937';
    const colorSecondary = club ? str(club.color_secondary, '#111827') : '#111827';

    const iso2 = country ? (country.iso2 == null ? null : str(country.iso2)) : null;
    const nation = country ? (country.name == null ? null : str(country.name)) : null;

    const id = num(p.id);
    const numberVal = p.number == null ? undefined : num(p.number);

    return {
      id,
      name: str(p.name),
      position: str(p.position, 'ST'),
      nation,
      countryIso2: iso2,
      seedRating: 70,
      avatarSrc: `/players/${id}.png`,
      club: clubName,
      color: colorPrimary,
      secondaryColor: colorSecondary,
      number: numberVal,
    };
  };

  const attrVal = o.attribute;

  let attrKey = 'dribbling';
  let attrLabel: string | undefined;

  if (typeof attrVal === 'string') {
    attrKey = attrVal;
  } else {
    const a = asRec(attrVal);
    if (a?.key != null) attrKey = str(a.key);
    if (a?.label != null) attrLabel = str(a.label);
  }

  return {
    pair_id: (o.duel_id as any) ?? (o.pair_id as any) ?? 'next',
    attribute: String(attrKey).toLowerCase(),
    attributeLabel: attrLabel,
    left: mkPlayer(p1),
    right: mkPlayer(p2),
  };
}
