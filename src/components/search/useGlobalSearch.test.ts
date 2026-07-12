import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}));

import { logEvent } from '@/lib/telemetry';
import { useGlobalSearch } from './useGlobalSearch';

const player = {
  id: 1,
  name: 'Lionel Messi',
  slug: 'lionel-messi',
  position: 'RW',
  club: 'Inter Miami',
  overall: 91,
};

const club = {
  id: 10,
  name: 'Inter Miami',
  slug: 'inter-miami',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useGlobalSearch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(logEvent).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not request search results for queries shorter than 3 characters', async () => {
    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('ab');
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await flushPromises();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.players).toEqual([]);
    expect(result.current.clubs).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('debounces search requests by 150 ms', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ query: 'leo', players: [player], clubs: [] }),
    );

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('leo');
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(149);
      await flushPromises();
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/search?q=leo',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('aborts stale requests when the query changes quickly', async () => {
    let resolveSlow: (value: Response) => void = () => undefined;
    const slowResponse = new Promise<Response>((resolve) => {
      resolveSlow = resolve;
    });

    fetchMock
      .mockImplementationOnce((_url, init) => {
        const signal = init?.signal as AbortSignal;
        return new Promise<Response>((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
          slowResponse.then(resolve).catch(reject);
        });
      })
      .mockResolvedValueOnce(
        jsonResponse({
          query: 'leona',
          players: [{ ...player, id: 2, name: 'Leona Stars' }],
          clubs: [],
        }),
      );

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('leo');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    act(() => {
      result.current.setQuery('leona');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    resolveSlow(
      jsonResponse({
        query: 'leo',
        players: [{ ...player, id: 99, name: 'Stale Player' }],
        clubs: [],
      }),
    );

    await act(async () => {
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.players).toEqual([
      { ...player, id: 2, name: 'Leona Stars' },
    ]);
    expect(result.current.loading).toBe(false);
  });

  it('stores successful players and clubs, logs telemetry, and clears loading', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        query: 'messi',
        players: [player],
        clubs: [club],
      }),
    );

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('messi');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    expect(result.current.players).toEqual([player]);
    expect(result.current.clubs).toEqual([club]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(logEvent).toHaveBeenCalledWith('search_used', {
      query: 'messi',
      players_count: 1,
      clubs_count: 1,
    });
  });

  it('sets an error and clears results for failed HTTP responses', async () => {
    fetchMock.mockResolvedValue(
      new Response('backend unavailable', { status: 500 }),
    );

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('fail');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    expect(result.current.error).toBe('Search failed: 500 backend unavailable');
    expect(result.current.players).toEqual([]);
    expect(result.current.clubs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('ignores aborted requests without setting an error or leaving loading stuck', async () => {
    let rejectRequest: (reason?: unknown) => void = () => undefined;
    const pendingResponse = new Promise<Response>((_resolve, reject) => {
      rejectRequest = reject;
    });

    fetchMock.mockImplementationOnce((_url, init) => {
      const signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
        pendingResponse.catch(reject);
      });
    });

    const { result } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('abort');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setQuery('ab');
    });

    rejectRequest(new DOMException('The operation was aborted.', 'AbortError'));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('aborts the active request on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;

    fetchMock.mockImplementationOnce((_url, init) => {
      capturedSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    });

    const { result, unmount } = renderHook(() => useGlobalSearch());

    act(() => {
      result.current.setQuery('unmount');
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
      await flushPromises();
    });

    expect(capturedSignal?.aborted).toBe(false);

    act(() => {
      unmount();
    });

    expect(capturedSignal?.aborted).toBe(true);
  });
});
