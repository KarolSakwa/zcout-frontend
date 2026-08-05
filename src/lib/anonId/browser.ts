import {
  ANON_COOKIE_MAX_AGE_SECONDS,
  ANON_ID_COOKIE_MAX_AGE_SECONDS,
  ZCOUT_ANON_COOKIE,
  ZCOUT_ANON_ID_COOKIE,
  ZCOUT_ANON_ID_STORAGE_KEY,
} from './constants';
import {
  clearStoredLegacyAnonIds,
  readStoredLegacyAnonIds,
  rememberLegacyAnonIds,
} from './legacy';
import { resolveCanonicalAnonIdFromSources } from './resolve';
import { buildClaimAnonHeaders } from './claimHeaders';

function readBrowserCookie(name: string): string | null {
  const parts = document.cookie.split(';').map((part) => part.trim());
  const hit = parts.find((part) => part.startsWith(`${name}=`));
  if (!hit) {
    return null;
  }

  return decodeURIComponent(hit.substring(name.length + 1));
}

function writeBrowserCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function syncBrowserAnonId(canonical: string): void {
  window.localStorage.setItem(ZCOUT_ANON_ID_STORAGE_KEY, canonical);
  writeBrowserCookie(ZCOUT_ANON_COOKIE, canonical, ANON_COOKIE_MAX_AGE_SECONDS);
  writeBrowserCookie(
    ZCOUT_ANON_ID_COOKIE,
    canonical,
    ANON_ID_COOKIE_MAX_AGE_SECONDS,
  );
}

function createBrowserAnonId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Resolves the canonical anonymous id in the browser and syncs all storages.
 */
export function ensureBrowserAnonId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const resolved = resolveCanonicalAnonIdFromSources(
    {
      cookieAnon: readBrowserCookie(ZCOUT_ANON_COOKIE),
      cookieAnonId: readBrowserCookie(ZCOUT_ANON_ID_COOKIE),
      localStorageAnonId: window.localStorage.getItem(ZCOUT_ANON_ID_STORAGE_KEY),
    },
    createBrowserAnonId,
  );

  rememberLegacyAnonIds(resolved.canonical, resolved.claimAnonIds);
  syncBrowserAnonId(resolved.canonical);

  return resolved.canonical;
}

export function getBrowserAnonId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    readBrowserCookie(ZCOUT_ANON_COOKIE) ??
    readBrowserCookie(ZCOUT_ANON_ID_COOKIE) ??
    window.localStorage.getItem(ZCOUT_ANON_ID_STORAGE_KEY)
  );
}

export function getBrowserClaimAnonHeaders(): Record<string, string> {
  const canonical = ensureBrowserAnonId();
  if (!canonical) {
    return {};
  }

  const resolved = resolveCanonicalAnonIdFromSources(
    {
      cookieAnon: canonical,
      cookieAnonId: canonical,
      localStorageAnonId: canonical,
    },
    () => canonical,
  );

  return buildClaimAnonHeaders(resolved, readStoredLegacyAnonIds());
}

export function clearBrowserLegacyAnonIdsAfterClaim(): void {
  clearStoredLegacyAnonIds();
}
