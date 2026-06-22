'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initEcho } from '@/lib/echo';
import Echo from 'laravel-echo'

type RecentVoteItem = {
  id: string;
  leftPlayer: string;
  rightPlayer: string;
  leftPlayerId: number;
  rightPlayerId: number;
  winnerPlayerId: number;
  attributeKey: string;
  attributeLabel: string;
};

type EchoLike = {
  channel: (name: string) => {
    listen: <T = unknown>(event: string, callback: (payload: T) => void) => void;
    stopListening?: (event: string) => void;
    unsubscribe?: () => void;
  };
};

declare global {
  interface Window {
    Echo?: Echo<'pusher'>
  }
}

export type TopRiserItem = {
  id: string;
  playerId: number;
  player: string;
  attributeKey: string;
  attributeLabel: string;
  delta: string;
};

type TopMoversMode = 'risers' | 'fallers';

type RecentVotesResponse = {
  items: RecentVoteItem[];
};

type TopMoversSummaryResponse = {
  risers: TopRiserItem[];
  fallers: TopRiserItem[];
};

const DAILY_MODE_STORAGE_KEY = 'zcout:duels:top-movers-mode';
const LIVE_ITEMS_LIMIT = 5;
const TOP_MOVERS_REFETCH_DEBOUNCE_MS = 5000;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resolveDailyMode(): TopMoversMode {
  const todayKey = getTodayKey();
  const raw = window.localStorage.getItem(DAILY_MODE_STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { date: string; mode: TopMoversMode };

      if (
        parsed.date === todayKey &&
        (parsed.mode === 'risers' || parsed.mode === 'fallers')
      ) {
        return parsed.mode;
      }
    } catch {}
  }

  const mode: TopMoversMode = Math.random() < 0.6 ? 'risers' : 'fallers';

  window.localStorage.setItem(
    DAILY_MODE_STORAGE_KEY,
    JSON.stringify({ date: todayKey, mode })
  );

  return mode;
}

async function fetchJson<T>(input: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(input, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchTopMoversSummary(
  signal?: AbortSignal
): Promise<TopMoversSummaryResponse> {
  return fetchJson<TopMoversSummaryResponse>(
    `/api/live/top-movers-summary?period=7d&limit=${LIVE_ITEMS_LIMIT}`,
    signal
  );
}

export async function fetchRecentVotes(
  signal?: AbortSignal
): Promise<RecentVotesResponse> {
  return fetchJson<RecentVotesResponse>(
    `/api/live/recent-votes?limit=${LIVE_ITEMS_LIMIT}`,
    signal
  );
}

export function useRecentVotesLive() {
  const [recentVotes, setRecentVotes] = useState<RecentVoteItem[]>([]);
  const [latestRecentVoteId, setLatestRecentVoteId] = useState<string | null>(null);
  const [isRecentVotesLoading, setIsRecentVotesLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setIsRecentVotesLoading(true);

        const data = await fetchRecentVotes(controller.signal);

        const items = Array.isArray(data.items) ? data.items : [];

        setRecentVotes(items);
        setLatestRecentVoteId(items[0]?.id ?? null);
      } catch {
        setRecentVotes([]);
        setLatestRecentVoteId(null);
      } finally {
        setIsRecentVotesLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    initEcho();

    if (typeof window === 'undefined' || !window.Echo) {
      return;
    }

    const channel = window.Echo.channel('live');

    const handleRecentVote = (item: RecentVoteItem) => {
      setRecentVotes((prev) => {
        const next = [item, ...prev.filter((existing) => existing.id !== item.id)];
        return next.slice(0, LIVE_ITEMS_LIMIT);
      });

      setLatestRecentVoteId(item.id);
    };

    channel.listen('.live.recent-vote.created', handleRecentVote);

    return () => {
      channel.stopListening?.('.live.recent-vote.created');
      window.Echo?.leaveChannel?.('live');
    };
  }, []);

  return {
    recentVotes,
    latestRecentVoteId,
    isRecentVotesLoading,
  };
}

export function useDuelSideWidgets(_pair: unknown) {
  const { recentVotes, latestRecentVoteId, isRecentVotesLoading } = useRecentVotesLive();

  const [topMoversMode, setTopMoversMode] = useState<TopMoversMode>('risers');
  const [riserItems, setRiserItems] = useState<TopRiserItem[]>([]);
  const [fallerItems, setFallerItems] = useState<TopRiserItem[]>([]);

  const [isTopMoversLoading, setIsTopMoversLoading] = useState(true);

  const topMoversDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchTopMoversSummary = useCallback(async () => {
    try {
      const summary = await fetchTopMoversSummary();

      setRiserItems(Array.isArray(summary.risers) ? summary.risers : []);
      setFallerItems(Array.isArray(summary.fallers) ? summary.fallers : []);
    } catch (error) {
      console.error('Failed to refetch top movers summary', error);
    }
  }, []);

  useEffect(() => {
    setTopMoversMode(resolveDailyMode());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setIsTopMoversLoading(true);

        const summary = await fetchTopMoversSummary(controller.signal);

        setRiserItems(Array.isArray(summary.risers) ? summary.risers : []);
        setFallerItems(Array.isArray(summary.fallers) ? summary.fallers : []);
      } catch {
        setRiserItems([]);
        setFallerItems([]);
      } finally {
        setIsTopMoversLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

    useEffect(() => {
      initEcho();

      if (typeof window === 'undefined' || !window.Echo) {
        return;
      }

      const channel = window.Echo.channel('live');

      const handleTopMoversMaybeChanged = () => {
        if (topMoversDebounceRef.current) {
          clearTimeout(topMoversDebounceRef.current);
        }

        topMoversDebounceRef.current = setTimeout(() => {
          void refetchTopMoversSummary();
          topMoversDebounceRef.current = null;
        }, TOP_MOVERS_REFETCH_DEBOUNCE_MS);
      };

      channel.listen('.live.top-movers.maybe-changed', handleTopMoversMaybeChanged);

      return () => {
        if (topMoversDebounceRef.current) {
          clearTimeout(topMoversDebounceRef.current);
          topMoversDebounceRef.current = null;
        }

        channel.stopListening?.('.live.top-movers.maybe-changed');
        window.Echo?.leaveChannel?.('live');
      };
  }, [refetchTopMoversSummary]);

  const topMoverItems = useMemo(
    () => (topMoversMode === 'risers' ? riserItems : fallerItems),
    [topMoversMode, riserItems, fallerItems]
  );

  return {
    recentVotes,
    latestRecentVoteId,
    topMoversMode,
    topMoverItems,
    isRecentVotesLoading,
    isTopMoversLoading,
    topRiserMode: topMoversMode,
    topRiserItems: topMoverItems,
  };
}