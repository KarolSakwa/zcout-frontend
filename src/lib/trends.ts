export type TrendDomain = 'overall' | 'attribute';

export type TrendIntensityLevel = 1 | 2 | 3 | 4 | 5;

export type TrendDirection = 'up' | 'down' | 'neutral';

export const TREND_ZERO_EPSILON = 0.001;

export const OVERALL_TREND_INTENSITY_THRESHOLDS = [
  0.03,
  0.07,
  0.15,
  0.25,
] as const;

export const ATTRIBUTE_TREND_INTENSITY_THRESHOLDS = [
  0.15,
  0.35,
  0.75,
  1.25,
] as const;

const TYPOGRAPHIC_MINUS = '−';

function normalizeFiniteDelta(delta: number): number | null {
  if (!Number.isFinite(delta)) {
    return null;
  }

  // Avoid negative zero propagating into sign checks / formatting.
  return Object.is(delta, -0) || delta === 0 ? 0 : delta;
}

export function getTrendDirection(delta: number): TrendDirection {
  const normalized = normalizeFiniteDelta(delta);

  if (normalized === null || Math.abs(normalized) <= TREND_ZERO_EPSILON) {
    return 'neutral';
  }

  return normalized > 0 ? 'up' : 'down';
}

export function getTrendIntensityLevel(
  delta: number,
  domain: TrendDomain,
): TrendIntensityLevel | null {
  const normalized = normalizeFiniteDelta(delta);

  if (normalized === null) {
    return null;
  }

  const abs = Math.abs(normalized);

  if (abs <= TREND_ZERO_EPSILON) {
    return null;
  }

  const thresholds =
    domain === 'overall'
      ? OVERALL_TREND_INTENSITY_THRESHOLDS
      : ATTRIBUTE_TREND_INTENSITY_THRESHOLDS;

  for (let index = 0; index < thresholds.length; index += 1) {
    if (abs < thresholds[index]) {
      return (index + 1) as TrendIntensityLevel;
    }
  }

  return 5;
}

/** Absolute magnitude formatted to two decimals (no sign). */
export function formatTrendMagnitude(delta: number): string {
  const normalized = normalizeFiniteDelta(delta);

  if (normalized === null) {
    return '0.00';
  }

  return Math.abs(normalized).toFixed(2);
}

/** Signed delta with typographic minus; never emits -0.00. */
export function formatSignedDelta(delta: number): string {
  const normalized = normalizeFiniteDelta(delta);

  if (normalized === null || normalized === 0) {
    return '0.00';
  }

  const magnitude = Math.abs(normalized).toFixed(2);
  return normalized > 0 ? `+${magnitude}` : `${TYPOGRAPHIC_MINUS}${magnitude}`;
}

/**
 * Parse API delta values that may arrive as numbers or preformatted strings
 * such as "+8.26", "-4.74", or "−4.74".
 */
export function parseSignedDeltaInput(
  value: string | number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    return normalizeFiniteDelta(value);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .replace(/^\+/, '')
    .replace(/−/g, '-')
    .replace(/,/g, '');

  const parsed = Number(normalized);

  return normalizeFiniteDelta(parsed);
}
