import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/anonId/browser', () => ({
  getBrowserClaimAnonHeaders: vi.fn(() => ({
    'X-Zcout-Anon': 'anon-test-id',
  })),
  clearBrowserLegacyAnonIdsAfterClaim: vi.fn(),
}));

import {
  applyClaimAnonToScoutingProgress,
  claimAnonVotes,
} from '@/lib/claimAnon';
import { clearBrowserLegacyAnonIdsAfterClaim } from '@/lib/anonId/browser';
import type { ScoutingProgress } from '@/lib/scoutingTypes';

describe('claimAnon integration', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('claim success returns scouting_progress from response', async () => {
    const progress: ScoutingProgress = {
      contributions: 12,
      my_scouting_unlocked: false,
      progress_target: 25,
      stage_progress: 12,
      stage_target: 25,
      next_unlock: 'my_scouting',
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ claimed: 5, scouting_progress: progress }),
    });

    const result = await claimAnonVotes();

    expect(result).toEqual({ claimed: 5, scouting_progress: progress });
    expect(clearBrowserLegacyAnonIdsAfterClaim).toHaveBeenCalled();
  });

  it('applyClaimAnonToScoutingProgress uses response progress without refresh', async () => {
    const progress: ScoutingProgress = {
      contributions: 25,
      my_scouting_unlocked: true,
      progress_target: 100,
      stage_progress: 0,
      stage_target: 100,
      next_unlock: 'your_impact',
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ claimed: 3, scouting_progress: progress }),
    });

    const updateFromResponse = vi.fn();
    const refresh = vi.fn();

    await applyClaimAnonToScoutingProgress({
      updateFromResponse,
      refresh,
    });

    expect(updateFromResponse).toHaveBeenCalledWith(progress, 'claim');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('applyClaimAnonToScoutingProgress falls back to refresh for legacy response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ claimed: 2 }),
    });

    const updateFromResponse = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);

    await applyClaimAnonToScoutingProgress({
      updateFromResponse,
      refresh,
    });

    expect(updateFromResponse).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
