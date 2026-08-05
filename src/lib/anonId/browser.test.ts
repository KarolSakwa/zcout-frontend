import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ZCOUT_ANON_COOKIE,
  ZCOUT_ANON_ID_COOKIE,
  ZCOUT_ANON_ID_STORAGE_KEY,
  ZCOUT_ANON_LEGACY_STORAGE_KEY,
} from './constants';
import { ensureBrowserAnonId, getBrowserClaimAnonHeaders } from './browser';
import { readStoredLegacyAnonIds } from './legacy';

function readBrowserCookie(name: string): string | null {
  const parts = document.cookie.split(';').map((part) => part.trim());
  const hit = parts.find((part) => part.startsWith(`${name}=`));
  if (!hit) {
    return null;
  }

  return decodeURIComponent(hit.substring(name.length + 1));
}

describe('ensureBrowserAnonId', () => {
  beforeEach(() => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${ZCOUT_ANON_ID_COOKIE}=; Path=/; Max-Age=0`;
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('prefers zcout_anon and syncs legacy storage locations', () => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=anon-primary; Path=/; Max-Age=3600`;
    document.cookie = `${ZCOUT_ANON_ID_COOKIE}=legacy-id; Path=/; Max-Age=3600`;
    window.localStorage.setItem(ZCOUT_ANON_ID_STORAGE_KEY, 'storage-id');

    const resolved = ensureBrowserAnonId();

    expect(resolved).toBe('anon-primary');
    expect(readBrowserCookie(ZCOUT_ANON_COOKIE)).toBe('anon-primary');
    expect(readBrowserCookie(ZCOUT_ANON_ID_COOKIE)).toBe('anon-primary');
    expect(window.localStorage.getItem(ZCOUT_ANON_ID_STORAGE_KEY)).toBe('anon-primary');
  });

  it('preserves conflicting legacy ids until claim', () => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=anon-primary; Path=/; Max-Age=3600`;
    document.cookie = `${ZCOUT_ANON_ID_COOKIE}=legacy-id; Path=/; Max-Age=3600`;
    window.localStorage.setItem(ZCOUT_ANON_ID_STORAGE_KEY, 'storage-id');

    ensureBrowserAnonId();

    expect(readStoredLegacyAnonIds().sort()).toEqual(['legacy-id', 'storage-id']);
    expect(getBrowserClaimAnonHeaders()).toEqual({
      'X-Zcout-Anon': 'anon-primary',
      'X-Zcout-Anon-Legacy': 'legacy-id,storage-id',
    });
  });

  it('creates exactly one canonical id for a new visitor', () => {
    const first = ensureBrowserAnonId();
    const second = ensureBrowserAnonId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(readBrowserCookie(ZCOUT_ANON_COOKIE)).toBe(first);
    expect(readBrowserCookie(ZCOUT_ANON_ID_COOKIE)).toBe(first);
    expect(window.localStorage.getItem(ZCOUT_ANON_ID_STORAGE_KEY)).toBe(first);
    expect(window.localStorage.getItem(ZCOUT_ANON_LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('reuses only zcout_anon without creating a new id', () => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=legacy-only-anon; Path=/; Max-Age=3600`;

    const resolved = ensureBrowserAnonId();

    expect(resolved).toBe('legacy-only-anon');
    expect(readBrowserCookie(ZCOUT_ANON_ID_COOKIE)).toBe('legacy-only-anon');
    expect(window.localStorage.getItem(ZCOUT_ANON_ID_STORAGE_KEY)).toBe('legacy-only-anon');
  });
});
