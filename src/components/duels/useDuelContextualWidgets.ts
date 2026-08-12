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
const RAIL_CROSSFADE_MS = 150;

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

export type NextDuelPrefetchTarget = {
  attributeKey: string;
  duelistIds: number[];
};

type PrefetchedNextContext = {
  target: NextDuelPrefetchTarget;
  riserItems: TopRiserItem[];
  fallerItems: TopRiserItem[];
  preRevealTop: AttributeTopPlayer[];
  revealedTop: AttributeTopPlayer[];
  topAttribute: { key: string; label: string } | null;
  moversReady: boolean;
  topReady: boolean;
  topHasError: boolean;
  moversHasError: boolean;
};

export async function fetchAttributeTop(
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

function targetsMatch(
  a: NextDuelPrefetchTarget,
  b: NextDuelPrefetchTarget,
): boolean {
  return (
    a.attributeKey === b.attributeKey &&
    a.duelistIds.join(',') === b.duelistIds.join(',')
  );
}

export function useDuelContextualWidgets({
  attributeKey,
  duelistIds,
}: {
  attributeKey: string;
  /** Committed pair player ids — updated only on duel transition, not during reveal. */
  duelistIds: number[];
}) {
  const { recentVotes, latestRecentVoteId, isRecentVotesLoading } =
    useRecentVotesLive();

  const [riserItems, setRiserItems] = useState<TopRiserItem[]>([]);
  const [fallerItems, setFallerItems] = useState<TopRiserItem[]>([]);
  const [isTopMoversLoading, setIsTopMoversLoading] = useState(true);
  const [moversEverLoaded, setMoversEverLoaded] = useState(false);

  const [preRevealTop, setPreRevealTop] = useState<AttributeTopPlayer[]>([]);
  const [revealedTop, setRevealedTop] = useState<AttributeTopPlayer[]>([]);
  const [topAttribute, setTopAttribute] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [isTopLoading, setIsTopLoading] = useState(true);
  const [topHasError, setTopHasError] = useState(false);
  const [topEverLoaded, setTopEverLoaded] = useState(false);

  const [railContentFading, setRailContentFading] = useState(false);

  const topMoversDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duelistKey = duelistIds.join(',');

  const prefetchRef = useRef<PrefetchedNextContext | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchSeqRef = useRef(0);
  const [prefetchingContext, setPrefetchingContext] = useState(false);
  const prefetchPromiseRef = useRef<Promise<void> | null>(null);
  const skipTopRefetchRef = useRef(false);

  const clearContextPrefetch = useCallback(() => {
    if (prefetchAbortRef.current) prefetchAbortRef.current.abort();
    prefetchAbortRef.current = null;
    prefetchSeqRef.current += 1;
    prefetchRef.current = null;
    prefetchPromiseRef.current = null;
    setPrefetchingContext(false);
  }, []);

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

    if (!moversEverLoaded) {
      setIsTopMoversLoading(true);
    }
  }, [attributeKey, moversEverLoaded]);

  useEffect(() => {
    if (!attributeKey) {
      setRiserItems([]);
      setFallerItems([]);
      setIsTopMoversLoading(false);
      setMoversEverLoaded(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        if (!moversEverLoaded) {
          setIsTopMoversLoading(true);
        }
        const summary = await fetchTopMoversSummary(
          controller.signal,
          attributeKey,
        );
        setRiserItems(summary.risers);
        setFallerItems(summary.fallers);
        setMoversEverLoaded(true);
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

    if (!topEverLoaded) {
      setIsTopLoading(true);
      setTopHasError(false);
    }
  }, [attributeKey, duelistKey, topEverLoaded]);

  useEffect(() => {
    if (!attributeKey) {
      setPreRevealTop([]);
      setRevealedTop([]);
      setTopAttribute(null);
      setIsTopLoading(false);
      setTopEverLoaded(false);
      return;
    }

    if (skipTopRefetchRef.current) {
      skipTopRefetchRef.current = false;
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        if (!topEverLoaded) {
          setIsTopLoading(true);
          setTopHasError(false);
        }

        const [preData, postData] = await Promise.all([
          fetchAttributeTop(attributeKey, duelistIds, controller.signal),
          fetchAttributeTop(attributeKey, [], controller.signal),
        ]);

        setTopAttribute(preData.attribute ?? postData.attribute ?? null);
        setPreRevealTop(Array.isArray(preData.players) ? preData.players : []);
        setRevealedTop(Array.isArray(postData.players) ? postData.players : []);
        setTopEverLoaded(true);
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
  }, [attributeKey, duelistKey, topEverLoaded]);

  const startPrefetchForNext = useCallback(
    (target: NextDuelPrefetchTarget, currentAttributeKey: string) => {
      if (!target.attributeKey) return;

      clearContextPrefetch();

      const controller = new AbortController();
      prefetchAbortRef.current = controller;
      const seq = ++prefetchSeqRef.current;
      setPrefetchingContext(true);

      const sameAttribute = target.attributeKey === currentAttributeKey;
      const draft: PrefetchedNextContext = {
        target,
        riserItems: [],
        fallerItems: [],
        preRevealTop: [],
        revealedTop: [],
        topAttribute: null,
        moversReady: sameAttribute,
        topReady: false,
        topHasError: false,
        moversHasError: false,
      };
      prefetchRef.current = draft;

      const promise = (async () => {
        try {
          const topPromise = Promise.all([
            fetchAttributeTop(
              target.attributeKey,
              target.duelistIds,
              controller.signal,
            ),
            fetchAttributeTop(target.attributeKey, [], controller.signal),
          ]);

          if (sameAttribute) {
            const [preData, postData] = await topPromise;
            if (prefetchSeqRef.current !== seq) return;

            draft.preRevealTop = Array.isArray(preData.players)
              ? preData.players
              : [];
            draft.revealedTop = Array.isArray(postData.players)
              ? postData.players
              : [];
            draft.topAttribute =
              preData.attribute ?? postData.attribute ?? null;
            draft.topReady = true;
          } else {
            const [moversResult, topResult] = await Promise.allSettled([
              fetchTopMoversSummary(controller.signal, target.attributeKey),
              topPromise,
            ]);

            if (prefetchSeqRef.current !== seq) return;

            if (moversResult.status === 'fulfilled') {
              draft.riserItems = moversResult.value.risers;
              draft.fallerItems = moversResult.value.fallers;
              draft.moversReady = true;
            } else if (!controller.signal.aborted) {
              draft.moversHasError = true;
              draft.moversReady = true;
            }

            if (topResult.status === 'fulfilled') {
              const [preData, postData] = topResult.value;
              draft.preRevealTop = Array.isArray(preData.players)
                ? preData.players
                : [];
              draft.revealedTop = Array.isArray(postData.players)
                ? postData.players
                : [];
              draft.topAttribute =
                preData.attribute ?? postData.attribute ?? null;
              draft.topReady = true;
            } else if (!controller.signal.aborted) {
              draft.topHasError = true;
              draft.topReady = true;
            }
          }

          prefetchRef.current = draft;
        } catch {
          if (controller.signal.aborted) return;
          if (prefetchSeqRef.current !== seq) return;
          prefetchRef.current = null;
        } finally {
          if (prefetchSeqRef.current === seq) {
            setPrefetchingContext(false);
            prefetchPromiseRef.current = null;
          }
        }
      })();

      prefetchPromiseRef.current = promise;
      return promise;
    },
    [clearContextPrefetch],
  );

  const isReadyForNext = useCallback(
    (target: NextDuelPrefetchTarget) => {
      const prefetched = prefetchRef.current;
      if (!prefetched || !targetsMatch(prefetched.target, target)) {
        return false;
      }

      const sameAttribute = target.attributeKey === attributeKey;
      if (sameAttribute) {
        return prefetched.topReady;
      }

      return prefetched.moversReady && prefetched.topReady;
    },
    [attributeKey],
  );

  const waitForPrefetchReady = useCallback(
    async (target: NextDuelPrefetchTarget) => {
      if (isReadyForNext(target)) return true;

      if (prefetchPromiseRef.current) {
        await prefetchPromiseRef.current;
      }

      return isReadyForNext(target);
    },
    [isReadyForNext],
  );

  const promoteForNext = useCallback(
    (target: NextDuelPrefetchTarget) => {
      const prefetched = prefetchRef.current;
      if (!prefetched || !targetsMatch(prefetched.target, target)) {
        return false;
      }

      const sameAttribute = target.attributeKey === attributeKey;
      const applyContent = () => {
        skipTopRefetchRef.current = true;

        if (!sameAttribute) {
          setRiserItems(prefetched.riserItems);
          setFallerItems(prefetched.fallerItems);
          setMoversEverLoaded(true);
          setIsTopMoversLoading(false);
        }

        setPreRevealTop(prefetched.preRevealTop);
        setRevealedTop(prefetched.revealedTop);
        setTopAttribute(prefetched.topAttribute);
        setTopHasError(prefetched.topHasError);
        setTopEverLoaded(true);
        setIsTopLoading(false);

        prefetchRef.current = null;
        prefetchSeqRef.current += 1;
      };

      if (sameAttribute) {
        applyContent();
        return true;
      }

      setRailContentFading(true);
      window.setTimeout(() => {
        applyContent();
        requestAnimationFrame(() => setRailContentFading(false));
      }, RAIL_CROSSFADE_MS);

      return true;
    },
    [attributeKey],
  );

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

  useEffect(() => {
    return () => {
      if (prefetchAbortRef.current) prefetchAbortRef.current.abort();
    };
  }, []);

  const showMoversSkeleton = isTopMoversLoading && !moversEverLoaded;
  const showTopSkeleton = isTopLoading && !topEverLoaded;

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
    showMoversSkeleton,
    showTopSkeleton,
    railContentFading,
    startPrefetchForNext,
    clearContextPrefetch,
    isReadyForNext,
    waitForPrefetchReady,
    promoteForNext,
    prefetchingContext,
  };
}
