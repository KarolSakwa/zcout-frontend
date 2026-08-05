import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import {
  ZCOUT_ANON_COOKIE,
  ZCOUT_ANON_ID_COOKIE,
} from './constants';
import {
  applyAnonCookiesToResponse,
  buildClaimAnonHeaders,
  readCookieFromHeader,
  resolveServerAnonId,
} from './server';

describe('anonId server helpers', () => {
  it('reads cookies from the request cookie header', () => {
    const value = readCookieFromHeader(
      'foo=bar; zcout_anon=anon-primary; zcout_anon_id=legacy-id',
      ZCOUT_ANON_COOKIE,
    );

    expect(value).toBe('anon-primary');
  });

  it('prefers request header over cookies', () => {
    const req = new Request('http://localhost/api/scouting/progress', {
      headers: {
        'x-zcout-anon': 'header-canonical',
        cookie: 'zcout_anon=anon-primary; zcout_anon_id=legacy-id',
      },
    });

    const resolved = resolveServerAnonId(req, { allowCreate: false });

    expect(resolved.canonical).toBe('header-canonical');
    expect(resolved.claimAnonIds).toEqual([
      'header-canonical',
      'anon-primary',
      'legacy-id',
    ]);
  });

  it('resolves zcout_anon before zcout_anon_id from the request', () => {
    const req = new Request('http://localhost/api/vote', {
      headers: {
        cookie: 'zcout_anon=anon-primary; zcout_anon_id=legacy-id',
      },
    });

    const resolved = resolveServerAnonId(req);

    expect(resolved.canonical).toBe('anon-primary');
    expect(resolved.created).toBe(false);
    expect(resolved.claimAnonIds).toEqual(['anon-primary', 'legacy-id']);
  });

  it('returns empty canonical when creation is disabled and no identity exists', () => {
    const req = new Request('http://localhost/api/auth/claim-anon');

    const resolved = resolveServerAnonId(req, { allowCreate: false });

    expect(resolved.canonical).toBe('');
    expect(resolved.created).toBe(true);
  });

  it('syncs the canonical id into both cookies on the response', () => {
    const res = NextResponse.json({ ok: true });

    applyAnonCookiesToResponse(res, 'canonical-id');

    expect(res.cookies.get(ZCOUT_ANON_COOKIE)?.value).toBe('canonical-id');
    expect(res.cookies.get(ZCOUT_ANON_ID_COOKIE)?.value).toBe('canonical-id');
  });

  it('builds claim headers with legacy ids when they differ', () => {
    const headers = buildClaimAnonHeaders({
      canonical: 'anon-primary',
      created: false,
      claimAnonIds: ['anon-primary', 'legacy-id'],
    });

    expect(headers).toEqual({
      'X-Zcout-Anon': 'anon-primary',
      'X-Zcout-Anon-Legacy': 'legacy-id',
    });
  });
});
