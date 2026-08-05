import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  ScoutingProgressProvider,
  useScoutingProgress,
} from '@/components/scouting/ScoutingProgressProvider';

vi.mock('@/lib/scoutingApi', () => ({
  fetchScoutingProgress: vi.fn().mockResolvedValue({
    scouting_progress: {
      contributions: 0,
      my_scouting_unlocked: false,
      progress_target: 25,
      stage_progress: 0,
      stage_target: 25,
      next_unlock: 'my_scouting',
    },
  }),
}));

vi.mock('@/lib/anonId/browser', () => ({
  ensureBrowserAnonId: vi.fn(() => 'anon-test-id'),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ScoutingProgressProvider>{children}</ScoutingProgressProvider>;
}

describe('write-path scouting progress integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('duel vote success can update provider from response payload', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateFromResponse(
        {
          contributions: 9,
          my_scouting_unlocked: false,
          progress_target: 25,
          stage_progress: 9,
          stage_target: 25,
          next_unlock: 'my_scouting',
        },
        'duel_vote',
      );
    });

    expect(result.current.progress?.contributions).toBe(9);
  });

  it('scout report success can update provider from response payload', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateFromResponse(
        {
          contributions: 27,
          my_scouting_unlocked: true,
          progress_target: 100,
          stage_progress: 2,
          stage_target: 100,
          next_unlock: 'your_impact',
        },
        'scout_report',
      );
    });

    expect(result.current.progress?.contributions).toBe(27);
  });

  it('claim success can update provider from response payload', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateFromResponse(
        {
          contributions: 30,
          my_scouting_unlocked: true,
          progress_target: 100,
          stage_progress: 5,
          stage_target: 100,
          next_unlock: 'your_impact',
        },
        'claim',
      );
    });

    expect(result.current.progress?.contributions).toBe(30);
  });
});
