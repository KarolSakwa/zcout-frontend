import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getDuelsNext } from '@/app/api/duels/next/route';
import { POST as postVote } from '@/app/api/vote/route';
import { GET as getScoutingProgress } from '@/app/api/scouting/progress/route';
import { POST as postClaimAnon } from '@/app/api/auth/claim-anon/route';
import {
  ZCOUT_ANON_COOKIE,
  ZCOUT_ANON_ID_COOKIE,
  ZCOUT_ANON_ID_STORAGE_KEY,
  ZCOUT_ANON_LEGACY_STORAGE_KEY,
} from '@/lib/anonId/constants';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import { clearStoredLegacyAnonIds } from '@/lib/anonId/legacy';

describe('anon identity end-to-end flow', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'generated-canonical-id'),
    });

    document.cookie = `${ZCOUT_ANON_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${ZCOUT_ANON_ID_COOKIE}=; Path=/; Max-Age=0`;
    window.localStorage.clear();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/duels/next')) {
        return new Response(JSON.stringify({ duel_id: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/api/votes')) {
        return new Response(
          JSON.stringify({
            scouting_progress: {
              contributions: 1,
              my_scouting_unlocked: false,
              progress_target: 25,
              stage_progress: 1,
              stage_target: 25,
              next_unlock: 'my_scouting',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      if (url.includes('/api/scouting/progress')) {
        return new Response(
          JSON.stringify({
            scouting_progress: {
              contributions: 1,
              my_scouting_unlocked: false,
              progress_target: 25,
              stage_progress: 1,
              stage_target: 25,
              next_unlock: 'my_scouting',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      if (url.includes('/api/auth/claim-anon')) {
        return new Response(
          JSON.stringify({
            claimed: 1,
            scouting_progress: {
              contributions: 1,
              my_scouting_unlocked: false,
              progress_target: 25,
              stage_progress: 1,
              stage_target: 25,
              next_unlock: 'my_scouting',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      return new Response('{}', { status: 200 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    window.localStorage.clear();
  });

  it('uses one canonical id across duels, vote, scouting and claim', async () => {
    const canonical = ensureBrowserAnonId();

    expect(canonical).toBe('generated-canonical-id');

    await getDuelsNext(
      new Request('http://localhost/api/duels/next', {
        headers: { 'x-zcout-anon': canonical! },
      }) as never,
    );

    await postVote(
      new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: {
          'x-zcout-anon': canonical!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ duel_id: 1 }),
      }),
    );

    await getScoutingProgress(
      new Request('http://localhost/api/scouting/progress', {
        headers: { 'x-zcout-anon': canonical! },
      }),
    );

    const progressAfterVote = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/scouting/progress'))
      .at(-1);

    expect(progressAfterVote?.[1]?.headers?.['X-Zcout-Anon']).toBe(canonical);

    await getScoutingProgress(
      new Request('http://localhost/api/scouting/progress', {
        headers: { 'x-zcout-anon': canonical! },
      }),
    );

    await postClaimAnon(
      new Request('http://localhost/api/auth/claim-anon', {
        method: 'POST',
        headers: {
          'x-zcout-anon': canonical!,
          cookie: `${ZCOUT_ANON_COOKIE}=${canonical}; ${ZCOUT_ANON_ID_COOKIE}=${canonical}`,
        },
      }),
    );

    const claimCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/auth/claim-anon'),
    );

    expect(claimCall?.[1]?.headers?.['X-Zcout-Anon']).toBe(canonical);

    const anonHeaders = fetchMock.mock.calls
      .map(([, init]) => init?.headers?.['X-Zcout-Anon'])
      .filter(Boolean);

    expect(new Set(anonHeaders)).toEqual(new Set([canonical]));
  });

  it('keeps legacy-only zcout_anon history visible through canonical resolution', async () => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=legacy-only-anon; Path=/; Max-Age=3600`;

    const canonical = ensureBrowserAnonId();

    expect(canonical).toBe('legacy-only-anon');

    await getScoutingProgress(
      new Request('http://localhost/api/scouting/progress', {
        headers: { 'x-zcout-anon': canonical! },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/scouting/progress'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Zcout-Anon': 'legacy-only-anon',
        }),
      }),
    );
  });

  it('preserves conflicting legacy ids for claim and clears them after successful claim', async () => {
    document.cookie = `${ZCOUT_ANON_COOKIE}=anon-primary; Path=/; Max-Age=3600`;
    document.cookie = `${ZCOUT_ANON_ID_COOKIE}=legacy-b; Path=/; Max-Age=3600`;
    window.localStorage.setItem(ZCOUT_ANON_ID_STORAGE_KEY, 'legacy-c');

    const canonical = ensureBrowserAnonId();
    expect(canonical).toBe('anon-primary');

    await postClaimAnon(
      new Request('http://localhost/api/auth/claim-anon', {
        method: 'POST',
        headers: {
          'x-zcout-anon': canonical!,
          'x-zcout-anon-legacy': 'legacy-b,legacy-c',
          cookie: `${ZCOUT_ANON_COOKIE}=anon-primary; ${ZCOUT_ANON_ID_COOKIE}=anon-primary`,
        },
      }),
    );

    const claimCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/auth/claim-anon'),
    );

    expect(claimCall?.[1]?.headers?.['X-Zcout-Anon']).toBe('anon-primary');
    expect(claimCall?.[1]?.headers?.['X-Zcout-Anon-Legacy']).toBe('legacy-b,legacy-c');

    clearStoredLegacyAnonIds();
    expect(window.localStorage.getItem(ZCOUT_ANON_LEGACY_STORAGE_KEY)).toBeNull();
  });
});
