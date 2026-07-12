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

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function toStringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

function toNumberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePlayer(playerRaw: Record<string, unknown>): Player {
  const club = toObjectRecord(playerRaw.club);
  const country = toObjectRecord(playerRaw.country);

  const clubName = club ? (club.name == null ? null : toStringValue(club.name)) : null;

  const colorPrimary = club ? toStringValue(club.color_primary, '#1f2937') : '#1f2937';
  const colorSecondary = club ? toStringValue(club.color_secondary, '#111827') : '#111827';

  const iso2 = country ? (country.iso2 == null ? null : toStringValue(country.iso2)) : null;
  const nation = country ? (country.name == null ? null : toStringValue(country.name)) : null;

  const id = toNumberValue(playerRaw.id);
  const numberVal = playerRaw.number == null ? undefined : toNumberValue(playerRaw.number);

  return {
    id,
    name: toStringValue(playerRaw.name),
    position: toStringValue(playerRaw.position, 'ST'),
    nation,
    countryIso2: iso2,
    seedRating: 70,
    avatarSrc: `/players/${id}.png`,
    club: clubName,
    color: colorPrimary,
    secondaryColor: colorSecondary,
    number: numberVal,
  };
}

function normalizeAttribute(attributeRaw: unknown): {
  attribute: string;
  attributeLabel?: string;
} {
  let attributeKey = 'dribbling';
  let attributeLabel: string | undefined;

  if (typeof attributeRaw === 'string') {
    attributeKey = attributeRaw;
  } else {
    const attributeObject = toObjectRecord(attributeRaw);
    if (attributeObject?.key != null) attributeKey = toStringValue(attributeObject.key);
    if (attributeObject?.label != null) attributeLabel = toStringValue(attributeObject.label);
  }

  return {
    attribute: String(attributeKey).toLowerCase(),
    attributeLabel,
  };
}

function normalizePairId(payload: Record<string, unknown>): string {
  const pairIdRaw = payload.duel_id ?? payload.pair_id;
  return pairIdRaw == null ? 'next' : toStringValue(pairIdRaw);
}

function buildNormalizedPair(
  payload: Record<string, unknown>,
  leftPlayerRaw: Record<string, unknown>,
  rightPlayerRaw: Record<string, unknown>,
): PairResponse {
  return {
    pair_id: normalizePairId(payload),
    ...normalizeAttribute(payload.attribute),
    left: normalizePlayer(leftPlayerRaw),
    right: normalizePlayer(rightPlayerRaw),
  };
}

export function normalizePair(raw: unknown): PairResponse {
  const payload = toObjectRecord(raw);
  if (!payload) throw new Error('Invalid duel response');

  const leftPlayerRaw = toObjectRecord(payload.left);
  const rightPlayerRaw = toObjectRecord(payload.right);

  if (leftPlayerRaw && rightPlayerRaw) {
    return buildNormalizedPair(payload, leftPlayerRaw, rightPlayerRaw);
  }

  const players = payload.players;
  if (!Array.isArray(players) || players.length < 2) {
    throw new Error('Expected two players in the /api/duels/next response.');
  }

  const firstPlayerRaw = toObjectRecord(players[0]);
  const secondPlayerRaw = toObjectRecord(players[1]);
  if (!firstPlayerRaw || !secondPlayerRaw) throw new Error('Invalid players payload');

  return buildNormalizedPair(payload, firstPlayerRaw, secondPlayerRaw);
}
