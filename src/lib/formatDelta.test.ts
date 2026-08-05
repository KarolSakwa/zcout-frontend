import { describe, expect, it } from 'vitest';
import { formatOverallValue, formatSignedDelta } from '@/lib/formatDelta';

describe('formatSignedDelta', () => {
  it('formats positive, negative, zero and null values', () => {
    expect(formatSignedDelta(0.03)).toBe('+0.03');
    expect(formatSignedDelta(-0.02)).toBe('−0.02');
    expect(formatSignedDelta(0)).toBe('0.00');
    expect(formatSignedDelta(null)).toBe('—');
  });
});

describe('formatOverallValue', () => {
  it('formats overall values and null', () => {
    expect(formatOverallValue(83.74)).toBe('83.74');
    expect(formatOverallValue(null)).toBe('—');
  });
});
