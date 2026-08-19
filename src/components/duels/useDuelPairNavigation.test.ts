import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDuelPairNavigation } from './useDuelPairNavigation';
import { fetchDuelPair } from './duelApi';
import { SLIDE_MS, normalizePair } from './duelUtils';

vi.mock('./duelApi', () => ({
  fetchDuelPair: vi.fn(),
}));

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}));

const mockPairRaw = {
  pair_id: '1',
  attribute: 'DRI',
  attributeLabel: 'Dribbling',
  players: [
    { id: 10, name: 'A', position: 'ST', club: null, country: null },
    { id: 20, name: 'B', position: 'ST', club: null, country: null },
  ],
};

const mockNextPairRaw = {
  pair_id: '2',
  attribute: 'PAC',
  attributeLabel: 'Pace',
  players: [
    { id: 30, name: 'C', position: 'ST', club: null, country: null },
    { id: 40, name: 'D', position: 'ST', club: null, country: null },
  ],
};

function createOptions(
  overrides: Partial<Parameters<typeof useDuelPairNavigation>[0]> = {},
) {
  return {
    clearAutoNext: vi.fn(),
    resetRevealState: vi.fn(),
    clearPendingUi: vi.fn(),
    voting: false,
    lastWinner: 1 as number | null,
    ...overrides,
  };
}

describe('useDuelPairNavigation', () => {
  beforeEach(() => {
    vi.mocked(fetchDuelPair).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch next pair until goNext is called', async () => {
    const { result } = renderHook(() =>
      useDuelPairNavigation({
        ...createOptions(),
        initialPair: mockPairRaw,
      }),
    );

    expect(fetchDuelPair).not.toHaveBeenCalled();
    expect(result.current.pair?.pair_id).toBe('1');
    expect(result.current.loadingPair).toBe(false);
  });

  it('keeps current pair visible while next pair loads', async () => {
    let resolveNext:
      | ((value: ReturnType<typeof normalizePair>) => void)
      | null = null;

    vi.mocked(fetchDuelPair).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useDuelPairNavigation({
        ...createOptions(),
        initialPair: mockPairRaw,
      }),
    );

    act(() => {
      result.current.goNext();
    });

    expect(result.current.loadingPair).toBe(true);
    expect(result.current.pair?.pair_id).toBe('1');
    expect(result.current.transition).toBe('idle');
    expect(fetchDuelPair).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveNext?.(normalizePair(mockNextPairRaw));
      await Promise.resolve();
    });

    expect(result.current.transition).toBe('exit');
    expect(result.current.pair?.pair_id).toBe('1');
  });

  it('waits for prepareNextPair before swapping', async () => {
    vi.mocked(fetchDuelPair).mockResolvedValue(normalizePair(mockNextPairRaw));

    let resolvePrepare: ((value: boolean) => void) | null = null;
    const prepareNextPair = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePrepare = resolve;
        }),
    );

    const options = createOptions({ prepareNextPair });
    const { result } = renderHook(() =>
      useDuelPairNavigation({
        ...options,
        initialPair: mockPairRaw,
      }),
    );

    await act(async () => {
      result.current.goNext();
      await Promise.resolve();
    });

    expect(prepareNextPair).toHaveBeenCalled();
    expect(result.current.loadingPair).toBe(true);
    expect(result.current.pair?.pair_id).toBe('1');
    expect(result.current.transition).toBe('idle');

    vi.useFakeTimers();

    await act(async () => {
      resolvePrepare?.(true);
      await Promise.resolve();
    });

    expect(result.current.transition).toBe('exit');

    act(() => {
      vi.advanceTimersByTime(SLIDE_MS);
    });

    vi.useRealTimers();

    expect(result.current.pair?.pair_id).toBe('2');
    expect(options.resetRevealState).toHaveBeenCalled();
    expect(result.current.transition).toBe('enter');
  });

  it('does not start a duplicate next fetch while loading', async () => {
    let resolveNext:
      | ((value: ReturnType<typeof normalizePair>) => void)
      | null = null;

    vi.mocked(fetchDuelPair).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useDuelPairNavigation({
        ...createOptions(),
        initialPair: mockPairRaw,
      }),
    );

    act(() => {
      result.current.goNext();
      result.current.goNext();
    });

    expect(fetchDuelPair).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveNext?.(normalizePair(mockNextPairRaw));
      await Promise.resolve();
    });
  });
});
