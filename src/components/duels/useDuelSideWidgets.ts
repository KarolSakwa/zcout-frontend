'use client';

import { useEffect, useMemo, useState } from 'react';
import { initEcho } from '@/lib/echo'

type RecentVoteItem = {
  id: string;
  winner: string;
  loser: string;
  winnerPlayerId: number;
  loserPlayerId: number;
  attributeKey: string;
  attributeLabel: string;
};

type EchoLike = {
  channel: (name: string) => {
    listen: (event: string, callback: (payload: RecentVoteItem) => void) => void;
    stopListening?: (event: string) => void;
    unsubscribe?: () => void;
  };
};

declare global {
  interface Window {
    Echo?: EchoLike;
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

type TopMoversResponse = {
  items: TopRiserItem[];
};

const DAILY_MODE_STORAGE_KEY = 'zcout:duels:top-movers-mode';
const LIVE_ITEMS_LIMIT = 5;

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

export function useDuelSideWidgets(_pair: unknown) {
  const [recentVotes, setRecentVotes] = useState<RecentVoteItem[]>([]);
  const [latestRecentVoteId, setLatestRecentVoteId] = useState<string | null>(null);

  const [topMoversMode, setTopMoversMode] = useState<TopMoversMode>('risers');
  const [riserItems, setRiserItems] = useState<TopRiserItem[]>([]);
  const [fallerItems, setFallerItems] = useState<TopRiserItem[]>([]);

  const [isRecentVotesLoading, setIsRecentVotesLoading] = useState(true);
  const [isTopMoversLoading, setIsTopMoversLoading] = useState(true);

  useEffect(() => {
    setTopMoversMode(resolveDailyMode());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setIsRecentVotesLoading(true);

        const data = await fetchJson<RecentVotesResponse>(
          `/api/live/recent-votes?limit=${LIVE_ITEMS_LIMIT}`,
          controller.signal
        );

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
    const controller = new AbortController();

    (async () => {
      try {
        setIsTopMoversLoading(true);

        const [risersData, fallersData] = await Promise.all([
          fetchJson<TopMoversResponse>(
            `/api/live/top-movers?direction=risers&period=7d&limit=${LIVE_ITEMS_LIMIT}`,
            controller.signal
          ),
          fetchJson<TopMoversResponse>(
            `/api/live/top-movers?direction=fallers&period=7d&limit=${LIVE_ITEMS_LIMIT}`,
            controller.signal
          ),
        ]);

        setRiserItems(Array.isArray(risersData.items) ? risersData.items : []);
        setFallerItems(Array.isArray(fallersData.items) ? fallersData.items : []);
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
    initEcho()
}, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Echo) {
      return;
    }

    const channel = window.Echo.channel('live');

    const handleRecentVote = (item: RecentVoteItem) => {
      setRecentVotes(prev => {
        const next = [item, ...prev.filter(existing => existing.id !== item.id)];
        return next.slice(0, LIVE_ITEMS_LIMIT);
      });

      setLatestRecentVoteId(item.id);
    };

    channel.listen('.live.recent-vote.created', handleRecentVote);

    return () => {
      channel.stopListening?.('.live.recent-vote.created');
      channel.unsubscribe?.();
    };
  }, []);

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