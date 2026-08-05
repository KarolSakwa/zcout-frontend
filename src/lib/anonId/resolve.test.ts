import { describe, expect, it, vi } from 'vitest';
import { resolveCanonicalAnonIdFromSources } from './resolve';

describe('resolveCanonicalAnonIdFromSources', () => {
  it('prefers zcout_anon over zcout_anon_id and localStorage', () => {
    const resolved = resolveCanonicalAnonIdFromSources(
      {
        cookieAnon: 'anon-primary',
        cookieAnonId: 'legacy-id',
        localStorageAnonId: 'storage-id',
      },
      () => 'generated-id',
    );

    expect(resolved.canonical).toBe('anon-primary');
    expect(resolved.created).toBe(false);
    expect(resolved.claimAnonIds).toEqual([
      'anon-primary',
      'legacy-id',
      'storage-id',
    ]);
  });

  it('falls back to zcout_anon_id when zcout_anon is missing', () => {
    const resolved = resolveCanonicalAnonIdFromSources(
      {
        cookieAnon: null,
        cookieAnonId: 'legacy-id',
        localStorageAnonId: 'storage-id',
      },
      () => 'generated-id',
    );

    expect(resolved.canonical).toBe('legacy-id');
    expect(resolved.created).toBe(false);
    expect(resolved.claimAnonIds).toEqual(['legacy-id', 'storage-id']);
  });

  it('falls back to localStorage when cookies are missing', () => {
    const resolved = resolveCanonicalAnonIdFromSources(
      {
        cookieAnon: null,
        cookieAnonId: null,
        localStorageAnonId: 'storage-id',
      },
      () => 'generated-id',
    );

    expect(resolved.canonical).toBe('storage-id');
    expect(resolved.created).toBe(false);
  });

  it('creates a new id when no source exists', () => {
    const createId = vi.fn(() => 'generated-id');

    const resolved = resolveCanonicalAnonIdFromSources(
      {
        cookieAnon: null,
        cookieAnonId: null,
        localStorageAnonId: null,
      },
      createId,
    );

    expect(createId).toHaveBeenCalledOnce();
    expect(resolved.canonical).toBe('generated-id');
    expect(resolved.created).toBe(true);
    expect(resolved.claimAnonIds).toEqual(['generated-id']);
  });

  it('deduplicates claim ids when sources match', () => {
    const resolved = resolveCanonicalAnonIdFromSources(
      {
        cookieAnon: 'same-id',
        cookieAnonId: 'same-id',
        localStorageAnonId: 'same-id',
      },
      () => 'generated-id',
    );

    expect(resolved.canonical).toBe('same-id');
    expect(resolved.claimAnonIds).toEqual(['same-id']);
  });
});
