import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  ScoutingProgressProvider,
  useScoutingProgress,
} from '@/components/scouting/ScoutingProgressProvider';
import type { ScoutingProgress } from '@/lib/scoutingTypes';
import { getProgressDisplayValue } from '@/lib/scoutingProgressHelpers';

vi.mock('@/lib/scoutingApi', () => ({
  fetchScoutingProgress: vi.fn(),
}));

vi.mock('@/lib/anonId/browser', () => ({
  ensureBrowserAnonId: vi.fn(() => 'anon-test-id'),
}));

import { fetchScoutingProgress } from '@/lib/scoutingApi';

function lockedProgress(contributions = 8): ScoutingProgress {
  return {
    contributions,
    my_scouting_unlocked: false,
    progress_target: 25,
    stage_progress: contributions,
    stage_target: 25,
    next_unlock: 'my_scouting',
  };
}

function unlockedProgress(contributions = 25): ScoutingProgress {
  const stageProgress = Math.min(Math.max(0, contributions - 25), 100);

  return {
    contributions,
    my_scouting_unlocked: true,
    progress_target: 100,
    stage_progress: stageProgress,
    stage_target: 100,
    next_unlock: 'your_impact',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ScoutingProgressProvider>{children}</ScoutingProgressProvider>;
}

describe('ScoutingProgressProvider', () => {
  const fetchMock = vi.mocked(fetchScoutingProgress);

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      scouting_progress: lockedProgress(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state without synthetic progress', () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    expect(result.current.status).toBe('loading');
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets ready state after initial fetch', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.progress).toEqual(lockedProgress());
    expect(fetchMock).toHaveBeenCalledWith('anon-test-id', expect.any(AbortSignal));
  });

  it('does not expose synthetic 0/25 while loading', () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    expect(result.current.status).toBe('loading');
    expect(result.current.progress).toBeNull();
  });

  it('sets error state on fetch failure without breaking children access', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBe('network down');
  });

  it('refresh retries after error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fetchMock.mockResolvedValueOnce({
      scouting_progress: lockedProgress(3),
    });

    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.progress?.contributions).toBe(3);
  });

  it('updateFromResponse updates progress without another fetch', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    const callsBefore = fetchMock.mock.calls.length;

    act(() => {
      result.current.updateFromResponse(lockedProgress(12), 'duel_vote');
    });

    expect(result.current.progress?.contributions).toBe(12);
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('keeps real contributions above 125 in state with capped stage display', async () => {
    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.updateFromResponse(unlockedProgress(134));
    });

    expect(result.current.progress?.contributions).toBe(134);
    expect(getProgressDisplayValue(result.current.progress!)).toBe('100/100');
  });

  it('preserves one contribution after remount fetch', async () => {
    fetchMock.mockResolvedValueOnce({
      scouting_progress: lockedProgress(1),
    });

    const first = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(first.result.current.status).toBe('ready');
    });

    expect(first.result.current.progress?.stage_progress).toBe(1);
    first.unmount();

    fetchMock.mockResolvedValueOnce({
      scouting_progress: lockedProgress(1),
    });

    const second = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(second.result.current.status).toBe('ready');
    });

    expect(second.result.current.progress?.stage_progress).toBe(1);
    expect(getProgressDisplayValue(second.result.current.progress!)).toBe('1/25');
  });

  it('does not emit unlock event on initial loading to ready transition', async () => {
    fetchMock.mockResolvedValueOnce({
      scouting_progress: unlockedProgress(),
    });

    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.consumeMyScoutingUnlockEvent()).toBe(false);
  });

  it.each(['duel_vote', 'scout_report', 'claim'] as const)(
    'emits one unlock event after false to true via %s',
    async (source) => {
      const { result } = renderHook(() => useScoutingProgress(), { wrapper });

      await waitFor(() => {
        expect(result.current.status).toBe('ready');
      });

      act(() => {
        result.current.updateFromResponse(unlockedProgress(), source);
      });

      expect(result.current.consumeMyScoutingUnlockEvent()).toBe(true);
      expect(result.current.consumeMyScoutingUnlockEvent()).toBe(false);
    },
  );

  it('does not emit unlock event when already unlocked', async () => {
    fetchMock.mockResolvedValueOnce({
      scouting_progress: unlockedProgress(40),
    });

    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.updateFromResponse(unlockedProgress(41), 'duel_vote');
    });

    expect(result.current.consumeMyScoutingUnlockEvent()).toBe(false);
  });

  it('does not emit unlock event after refresh while already unlocked', async () => {
    fetchMock.mockResolvedValueOnce({
      scouting_progress: unlockedProgress(40),
    });

    const { result } = renderHook(() => useScoutingProgress(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    fetchMock.mockResolvedValueOnce({
      scouting_progress: unlockedProgress(41),
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.consumeMyScoutingUnlockEvent()).toBe(false);
  });
});
