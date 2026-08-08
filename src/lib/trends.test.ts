import { describe, expect, it } from 'vitest';
import {
  formatSignedDelta,
  formatTrendMagnitude,
  getTrendDirection,
  getTrendIntensityLevel,
  parseSignedDeltaInput,
} from '@/lib/trends';

describe('getTrendIntensityLevel overall', () => {
  const cases: Array<[number, number | null]> = [
    [0, null],
    [0.001, null],
    [0.0011, 1],
    [0.02, 1],
    [0.03, 2],
    [0.06, 2],
    [0.07, 3],
    [0.14, 3],
    [0.15, 4],
    [0.24, 4],
    [0.25, 5],
    [1.0, 5],
  ];

  it.each(cases)('maps %s → %s', (delta, expected) => {
    expect(getTrendIntensityLevel(delta, 'overall')).toBe(expected);
  });
});

describe('getTrendIntensityLevel attribute', () => {
  const cases: Array<[number, number | null]> = [
    [0, null],
    [0.001, null],
    [0.0011, 1],
    [0.07, 1],
    [0.15, 2],
    [0.29, 2],
    [0.35, 3],
    [0.74, 3],
    [0.75, 4],
    [1.24, 4],
    [1.25, 5],
    [4.28, 5],
    [5.22, 5],
    [8.26, 5],
  ];

  it.each(cases)('maps %s → %s', (delta, expected) => {
    expect(getTrendIntensityLevel(delta, 'attribute')).toBe(expected);
  });
});

describe('getTrendIntensityLevel edge cases', () => {
  it('uses absolute value so negatives share levels with positives', () => {
    expect(getTrendIntensityLevel(-0.03, 'overall')).toBe(2);
    expect(getTrendIntensityLevel(-0.15, 'attribute')).toBe(2);
    expect(getTrendIntensityLevel(-1.25, 'attribute')).toBe(5);
  });

  it('maps the same absolute value differently by domain', () => {
    expect(getTrendIntensityLevel(0.15, 'overall')).toBe(4);
    expect(getTrendIntensityLevel(0.15, 'attribute')).toBe(2);
  });

  it('handles NaN and Infinity without throwing', () => {
    expect(getTrendIntensityLevel(Number.NaN, 'overall')).toBeNull();
    expect(getTrendIntensityLevel(Number.POSITIVE_INFINITY, 'overall')).toBeNull();
    expect(getTrendIntensityLevel(Number.NEGATIVE_INFINITY, 'attribute')).toBeNull();
  });
});

describe('getTrendDirection', () => {
  it('returns up, down, or neutral', () => {
    expect(getTrendDirection(0.02)).toBe('up');
    expect(getTrendDirection(-0.02)).toBe('down');
    expect(getTrendDirection(0.001)).toBe('neutral');
    expect(getTrendDirection(0)).toBe('neutral');
    expect(getTrendDirection(Number.NaN)).toBe('neutral');
  });
});

describe('trend formatters', () => {
  it('formats magnitude without a sign', () => {
    expect(formatTrendMagnitude(8.26)).toBe('8.26');
    expect(formatTrendMagnitude(-4.74)).toBe('4.74');
  });

  it('formats signed deltas with a typographic minus and no -0.00', () => {
    expect(formatSignedDelta(0.29)).toBe('+0.29');
    expect(formatSignedDelta(-0.28)).toBe('−0.28');
    expect(formatSignedDelta(0)).toBe('0.00');
    expect(formatSignedDelta(-0)).toBe('0.00');
  });
});

describe('parseSignedDeltaInput', () => {
  it('parses numbers and signed strings including typographic minus', () => {
    expect(parseSignedDeltaInput(8.26)).toBe(8.26);
    expect(parseSignedDeltaInput('+8.26')).toBe(8.26);
    expect(parseSignedDeltaInput('-4.74')).toBe(-4.74);
    expect(parseSignedDeltaInput('−4.74')).toBe(-4.74);
  });

  it('rejects non-finite values without throwing', () => {
    expect(parseSignedDeltaInput(null)).toBeNull();
    expect(parseSignedDeltaInput(undefined)).toBeNull();
    expect(parseSignedDeltaInput('')).toBeNull();
    expect(parseSignedDeltaInput('not-a-number')).toBeNull();
    expect(parseSignedDeltaInput(Number.NaN)).toBeNull();
    expect(parseSignedDeltaInput(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
