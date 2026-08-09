'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { initEcho } from '@/lib/echo';
import {
  fetchTopMoversSummary,
  type TopRiserItem,
  useRecentVotesLive,
} from '@/components/duels/useDuelSideWidgets';
import Echo from 'laravel-echo';

declare global {
  interface Window {
    Echo?: Echo<'pusher'>;
  }
}

const TOP_MOVERS_REFETCH_DEBOUNCE_MS = 5000;

export type AttributeTopPlayer = {
  id: string;
  playerId: number;
  player: string;
  rating: number;
  rank: number;
};

export type AttributeTopResponse = {
  attribute: { key: string; label: string } | null;
  players: AttributeTopPlayer[];
};

async function fetchAttributeTop(
  attributeKey: string,
  excludePlayerIds: number[],
  signal?: AbortSignal,
): Promise<AttributeTopResponse> {
  const params = new URLSearchParams({
    attribute_key: attributeKey,
  });

  if (excludePlayerIds.length > 0) {
    params.set('exclude', excludePlayerIds.join(','));
  }

  const response = await fetch(`/api/live/attribute-top?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<AttributeTopResponse>;
}

export function useDuelContextualWidgets({
  attributeKey,
  duelistIds,
}: {
  attributeKey: string;
  /** Current pair player ids — used only when attribute context changes, not on reveal. */
  duelistIds: number[];
}) {
  const { recentVotes, latestRecentVoteId, isRecentVotesLoading } =
    useRecentVotesLive();

  const [riserItems, setRiserItems] = useState<TopRiserItem[]>([]);
  const [fallerItems, setFallerItems] = useState<TopRiserItem[]>([]);
  const [isTopMoversLoading, setIsTopMoversLoading] = useState(true);

  const [preRevealTop, setPreRevealTop] = useState<AttributeTopPlayer[]>([]);
  const [revealedTop, setRevealedTop] = useState<AttributeTopPlayer[]>([]);
  const [topAttribute, setTopAttribute] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [isTopLoading, setIsTopLoading] = useState(true);
  const [topHasError, setTopHasError] = useState(false);

  const topMoversDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duelistKey = duelistIds.join(',');

  const refetchTopMoversSummary = useCallback(async () => {
    if (!attributeKey) return;

    try {
      const summary = await fetchTopMoversSummary(undefined, attributeKey);
      setRiserItems(summary.risers);
      setFallerItems(summary.fallers);
    } catch (error) {
      console.error('Failed to refetch contextual top movers', error);
    }
  }, [attributeKey]);

  useLayoutEffect(() => {
    if (!attributeKey) {
      return;
    }

    setIsTopMoversLoading(true);
  }, [attributeKey]);

  useEffect(() => {
    if (!attributeKey) {
      setRiserItems([]);
      setFallerItems([]);
      setIsTopMoversLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setIsTopMoversLoading(true);
        const summary = await fetchTopMoversSummary(
          controller.signal,
          attributeKey,
        );
        setRiserItems(summary.risers);
        setFallerItems(summary.fallers);
      } catch {
        if (!controller.signal.aborted) {
          setRiserItems([]);
          setFallerItems([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTopMoversLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [attributeKey]);

  useLayoutEffect(() => {
    if (!attributeKey) {
      return;
    }

    setIsTopLoading(true);
    setTopHasError(false);
  }, [attributeKey, duelistKey]);

  useEffect(() => {
    if (!attributeKey) {
      setPreRevealTop([]);
      setRevealedTop([]);
      setTopAttribute(null);
      setIsTopLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setIsTopLoading(true);
        setTopHasError(false);

        const [preData, postData] = await Promise.all([
          fetchAttributeTop(attributeKey, duelistIds, controller.signal),
          fetchAttributeTop(attributeKey, [], controller.signal),
        ]);

        setTopAttribute(preData.attribute ?? postData.attribute ?? null);
        setPreRevealTop(Array.isArray(preData.players) ? preData.players : []);
        setRevealedTop(Array.isArray(postData.players) ? postData.players : []);
      } catch {
        if (!controller.signal.aborted) {
          setPreRevealTop([]);
          setRevealedTop([]);
          setTopAttribute(null);
          setTopHasError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTopLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [attributeKey, duelistKey]);

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

  return {
    recentVotes,
    latestRecentVoteId,
    isRecentVotesLoading,
    riserItems,
    fallerItems,
    isTopMoversLoading,
    preRevealTop,
    revealedTop,
    topAttribute,
    isTopLoading,
    topHasError,
  };
}
