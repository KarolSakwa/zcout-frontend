import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZCOUT_ANON_LEGACY_STORAGE_KEY } from './constants';
import {
  clearStoredLegacyAnonIds,
  normalizeLegacyAnonIds,
  parseLegacyAnonHeader,
  readStoredLegacyAnonIds,
  rememberLegacyAnonIds,
} from './legacy';

describe('anon legacy storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('stores non-canonical ids without duplicates', () => {
    const stored = rememberLegacyAnonIds('canonical-a', [
      'legacy-b',
      'legacy-c',
      'canonical-a',
      'legacy-b',
    ]);

    expect(stored).toEqual(['legacy-b', 'legacy-c']);
    expect(readStoredLegacyAnonIds()).toEqual(['legacy-b', 'legacy-c']);
  });

  it('merges with previously stored legacy ids', () => {
    rememberLegacyAnonIds('canonical-a', ['legacy-b']);
    rememberLegacyAnonIds('canonical-a', ['legacy-c']);

    expect(readStoredLegacyAnonIds()).toEqual(['legacy-b', 'legacy-c']);
  });

  it('clears stored legacy ids after claim', () => {
    rememberLegacyAnonIds('canonical-a', ['legacy-b']);
    clearStoredLegacyAnonIds();

    expect(readStoredLegacyAnonIds()).toEqual([]);
    expect(
      window.localStorage.getItem(ZCOUT_ANON_LEGACY_STORAGE_KEY),
    ).toBeNull();
  });

  it('parses legacy header values', () => {
    expect(parseLegacyAnonHeader('legacy-b, legacy-c')).toEqual([
      'legacy-b',
      'legacy-c',
    ]);
  });

  it('rejects canonical id in normalized legacy list', () => {
    expect(normalizeLegacyAnonIds(['canonical-a', 'legacy-b'], 'canonical-a')).toEqual([
      'legacy-b',
    ]);
  });
});
