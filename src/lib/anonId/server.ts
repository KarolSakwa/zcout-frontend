import type { NextResponse } from 'next/server';
import {
  ANON_COOKIE_MAX_AGE_SECONDS,
  ANON_ID_COOKIE_MAX_AGE_SECONDS,
  ZCOUT_ANON_COOKIE,
  ZCOUT_ANON_ID_COOKIE,
} from './constants';
import {
  resolveCanonicalAnonIdFromSources,
  type ResolvedAnonId,
} from './resolve';

export { buildClaimAnonHeaders, buildClaimAnonHeadersFromRequest } from './claimHeaders';

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function readCookieFromHeader(
  cookieHeader: string,
  name: string,
): string | null {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const hit = parts.find((part) => part.startsWith(`${name}=`));
  if (!hit) {
    return null;
  }

  return decodeURIComponent(hit.substring(name.length + 1));
}

export function readAnonCookiesFromRequest(req: Request): {
  cookieAnon: string | null;
  cookieAnonId: string | null;
} {
  const cookieHeader = req.headers.get('cookie') ?? '';

  return {
    cookieAnon: readCookieFromHeader(cookieHeader, ZCOUT_ANON_COOKIE),
    cookieAnonId: readCookieFromHeader(cookieHeader, ZCOUT_ANON_ID_COOKIE),
  };
}

export function resolveServerAnonId(
  req: Request,
  options?: { allowCreate?: boolean },
): ResolvedAnonId {
  const headerAnon = trimOrNull(req.headers.get('x-zcout-anon'));
  const { cookieAnon, cookieAnonId } = readAnonCookiesFromRequest(req);
  const allowCreate = options?.allowCreate ?? true;

  if (headerAnon) {
    const distinct = new Set<string>();

    for (const id of [cookieAnon, cookieAnonId]) {
      if (id && id !== headerAnon) {
        distinct.add(id);
      }
    }

    return {
      canonical: headerAnon,
      created: false,
      claimAnonIds: [headerAnon, ...distinct],
    };
  }

  const resolved = resolveCanonicalAnonIdFromSources(
    { cookieAnon, cookieAnonId },
    () => crypto.randomUUID(),
  );

  if (!allowCreate && resolved.created) {
    return {
      canonical: '',
      created: true,
      claimAnonIds: [],
    };
  }

  return resolved;
}

export function applyAnonCookiesToResponse(
  res: NextResponse,
  canonical: string,
): void {
  res.cookies.set(ZCOUT_ANON_COOKIE, canonical, {
    path: '/',
    maxAge: ANON_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  });
  res.cookies.set(ZCOUT_ANON_ID_COOKIE, canonical, {
    path: '/',
    maxAge: ANON_ID_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  });
}
