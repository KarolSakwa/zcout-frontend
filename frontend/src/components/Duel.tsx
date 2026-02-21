'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ZLoader from './ZLoader';
import type { PairResponse, RatingsMap, VoteApiResponse } from './duels/duelTypes';
import { API_BASE, ATTR_MAP, SLIDE_MS, glowForAttribute, normalizePair, toPct } from './duels/duelUtils';
import DuelCountdownBar from './duels/DuelCountdownBar';
import DuelAttributeHeader from './duels/DuelAttributeHeader';
import DuelCardsRow from './duels/DuelCardsRow';
import DuelRevealPanel from './duels/DuelRevealPanel';

const AUTO_NEXT_MS = 5000;
const COUNTDOWN_BAR_H = 7;
const COUNTDOWN_START_AFTER_REVEAL_MS = 450;
const COUNTDOWN_TICK_MS = 50;

export default function Duel({ initialPair }: { initialPair?: unknown }) {
  const [pair, setPair] = useState<PairResponse | null>(() => {
    try {
      return initialPair ? normalizePair(initialPair) : null;
    } catch {
      return null;
    }
  });

  const [loadingPair, setLoadingPair] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPendingUi, setShowPendingUi] = useState(false);
  const pendingUiTimerRef = useRef<number | null>(null);

  const [postVoteRatings, setPostVoteRatings] = useState<RatingsMap | null>(null);
  const [lastWinner, setLastWinner] = useState<number | null>(null);

  const [impactVisible, setImpactVisible] = useState(false);
  const [barPct, setBarPct] = useState<Record<string, number>>({});
  const [transition, setTransition] = useState<'idle' | 'exit' | 'enter'>('idle');

  const [autoNextProgress, setAutoNextProgress] = useState(0);
  const [autoNextRunning, setAutoNextRunning] = useState(false);
  const [autoNextPaused, setAutoNextPaused] = useState(false);

  const [nextHover, setNextHover] = useState(false);
  const [duelVotePct, setDuelVotePct] = useState<{ left: number; right: number } | null>(null);

  const autoNextStartTimerRef = useRef<number | null>(null);
  const autoNextIntervalRef = useRef<number | null>(null);
  const autoNextStartAtRef = useRef<number | null>(null);
  const autoNextElapsedRef = useRef(0);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef(0);

  const didAutoFetchRef = useRef(false);

  const attribute = pair?.attribute ?? '';
  const glow = useMemo(() => glowForAttribute(attribute), [attribute]);

  const clearAutoNext = useCallback((resetProgress: boolean) => {
    if (autoNextStartTimerRef.current) window.clearTimeout(autoNextStartTimerRef.current);
    autoNextStartTimerRef.current = null;

    if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
    autoNextIntervalRef.current = null;

    autoNextStartAtRef.current = null;
    autoNextElapsedRef.current = 0;

    setAutoNextRunning(false);
    setAutoNextPaused(false);
    if (resetProgress) setAutoNextProgress(0);
  }, []);

  const resetRevealState = useCallback(() => {
    setPostVoteRatings(null);
    setLastWinner(null);
    setImpactVisible(false);
    setBarPct({});
    setDuelVotePct(null);

    setShowPendingUi(false);
    if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;
  }, []);

  const fetchInitialPair = useCallback(async () => {
    clearAutoNext(true);

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const seq = ++fetchSeqRef.current;

    setError(null);
    setLoadingPair(true);

    setPair(null);
    resetRevealState();
    setTransition('idle');

    try {
      const res = await fetch(`${API_BASE}/api/duels/next`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (fetchSeqRef.current !== seq) return;

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Pair fetch failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      const raw = (await res.json()) as unknown;

      if (fetchSeqRef.current !== seq) return;

      setTransition('enter');
      setPair(normalizePair(raw));
      requestAnimationFrame(() => setTransition('idle'));
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      if (fetchSeqRef.current !== seq) return;
      const msg = e instanceof Error ? e.message : 'Błąd pobierania pary';
      setError(msg);
      setTransition('idle');
    } finally {
      if (fetchSeqRef.current !== seq) return;
      setLoadingPair(false);
    }
  }, [clearAutoNext, resetRevealState]);

  const fetchNextPair = useCallback(async () => {
    if (loadingPair) return;

    clearAutoNext(true);

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const seq = ++fetchSeqRef.current;

    setError(null);
    setLoadingPair(true);

    try {
      const res = await fetch(`${API_BASE}/api/duels/next`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (fetchSeqRef.current !== seq) return;

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Pair fetch failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      const raw = (await res.json()) as unknown;

      if (fetchSeqRef.current !== seq) return;

      const next = normalizePair(raw);

      setTransition('exit');
      window.setTimeout(() => {
        if (fetchSeqRef.current !== seq) return;

        setPair(next);
        resetRevealState();

        setTransition('enter');
        requestAnimationFrame(() => setTransition('idle'));

        setLoadingPair(false);
      }, SLIDE_MS);
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      if (fetchSeqRef.current !== seq) return;
      const msg = e instanceof Error ? e.message : 'Błąd pobierania pary';
      setError(msg);
      setTransition('idle');
      setLoadingPair(false);
    }
  }, [loadingPair, clearAutoNext, resetRevealState]);

  const goNext = useCallback(() => {
    if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;
    setShowPendingUi(false);

    fetchNextPair();
  }, [fetchNextPair]);

  const startAutoNextNow = useCallback(() => {
    if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
    autoNextIntervalRef.current = null;

    autoNextElapsedRef.current = 0;
    autoNextStartAtRef.current = performance.now();

    setAutoNextProgress(0);
    setAutoNextRunning(true);
    setAutoNextPaused(false);

    autoNextIntervalRef.current = window.setInterval(() => {
      const startAt = autoNextStartAtRef.current;
      const base = autoNextElapsedRef.current;
      const now = performance.now();
      const elapsed = startAt == null ? base : base + (now - startAt);
      const p = Math.min(1, elapsed / AUTO_NEXT_MS);
      setAutoNextProgress(p);

      if (p >= 1) {
        if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
        autoNextIntervalRef.current = null;
        autoNextStartAtRef.current = null;
        autoNextElapsedRef.current = 0;
        setAutoNextRunning(false);
        setAutoNextPaused(false);
        goNext();
      }
    }, COUNTDOWN_TICK_MS);
  }, [goNext]);

  const scheduleAutoNextAfterReveal = useCallback(() => {
    if (autoNextStartTimerRef.current) window.clearTimeout(autoNextStartTimerRef.current);
    autoNextStartTimerRef.current = window.setTimeout(() => {
      autoNextStartTimerRef.current = null;
      startAutoNextNow();
    }, COUNTDOWN_START_AFTER_REVEAL_MS);
  }, [startAutoNextNow]);

  const pauseAutoNext = useCallback(() => {
    if (!autoNextRunning || autoNextPaused) return;

    if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
    autoNextIntervalRef.current = null;

    const startAt = autoNextStartAtRef.current;
    if (startAt != null) autoNextElapsedRef.current += performance.now() - startAt;
    autoNextStartAtRef.current = null;
    setAutoNextPaused(true);
  }, [autoNextRunning, autoNextPaused]);

  const resumeAutoNext = useCallback(() => {
    if (!autoNextRunning || !autoNextPaused) return;

    autoNextStartAtRef.current = performance.now();
    setAutoNextPaused(false);

    if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
    autoNextIntervalRef.current = window.setInterval(() => {
      const startAt = autoNextStartAtRef.current;
      const base = autoNextElapsedRef.current;
      const now = performance.now();
      const elapsed = startAt == null ? base : base + (now - startAt);
      const p = Math.min(1, elapsed / AUTO_NEXT_MS);
      setAutoNextProgress(p);

      if (p >= 1) {
        if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
        autoNextIntervalRef.current = null;
        autoNextStartAtRef.current = null;
        autoNextElapsedRef.current = 0;
        setAutoNextRunning(false);
        setAutoNextPaused(false);
        goNext();
      }
    }, COUNTDOWN_TICK_MS);
  }, [autoNextRunning, autoNextPaused, goNext]);

  const showReveal = lastWinner !== null;

  const cardStyle = useCallback(
    (side: 'left' | 'right'): React.CSSProperties => {
      const isLeft = side === 'left';

      const base: React.CSSProperties = {
        transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`,
        willChange: 'transform, opacity, filter',
        pointerEvents: transition === 'idle' && !showReveal ? 'auto' : 'none',
      };

      const INSET_X = 48;
      const PENDING_X = 2;

      if (transition === 'exit') {
        return {
          ...base,
          transform: `translateX(${isLeft ? -90 : 90}px)`,
          opacity: 0,
          filter: 'blur(6px)',
        };
      }

      if (transition === 'enter') {
        return {
          ...base,
          transform: `translateX(${isLeft ? -50 : 50}px)`,
          opacity: 0,
          filter: 'blur(6px)',
        };
      }

      const x = showPendingUi ? (isLeft ? -PENDING_X : PENDING_X) : isLeft ? INSET_X : -INSET_X;

      return { ...base, transform: `translateX(${x}px)`, opacity: 1, filter: 'none' };
    },
    [transition, showPendingUi, showReveal]
  );

  useEffect(() => {
    if (pair) return;
    if (didAutoFetchRef.current) return;
    didAutoFetchRef.current = true;
    fetchInitialPair();
  }, [pair, fetchInitialPair]);

  useEffect(() => {
    return () => {
      if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
      if (autoNextStartTimerRef.current) window.clearTimeout(autoNextStartTimerRef.current);
      if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!postVoteRatings) return;

    const next: Record<string, number> = {};
    for (const [id, v] of Object.entries(postVoteRatings)) next[id] = toPct(v.rating_before);
    setBarPct(next);

    requestAnimationFrame(() => {
      const after: Record<string, number> = {};
      for (const [id, v] of Object.entries(postVoteRatings)) after[id] = toPct(v.rating_after);
      setBarPct(after);
    });
  }, [postVoteRatings]);

  const handleVote = useCallback(
    async (winnerId: number) => {
      if (!pair || voting) return;
      if (transition !== 'idle') return;
      if (lastWinner !== null) return;

      clearAutoNext(true);

      setVoting(true);
      setError(null);

      setLastWinner(winnerId);
      setImpactVisible(false);
      setPostVoteRatings(null);
      setDuelVotePct(null);

      setShowPendingUi(false);
      if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
      pendingUiTimerRef.current = window.setTimeout(() => setShowPendingUi(true), 150);

      const attrKey =
        ATTR_MAP[String(pair.attribute ?? 'DRI').toUpperCase()] ?? String(pair.attribute ?? 'dribbling').toLowerCase();

      const body = {
        attribute_key: attrKey,
        player_a_id: pair.left.id,
        player_b_id: pair.right.id,
        winner_id: winnerId,
      };

      try {
        const res = await fetch(`${API_BASE}/api/votes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Vote failed: ${res.status} ${text.slice(0, 200)}`);
        }

        const data = (await res.json()) as VoteApiResponse;
        const anyData = data as any;

        const map: RatingsMap = {};
        for (const pl of (data.players ?? []) as any[]) {
          map[String(pl.id)] = {
            rating: pl.rating,
            rating_before: pl.rating_before,
            rating_after: pl.rating_after,
            delta: pl.delta,
            votes_count: pl.votes_count,
          };
        }

        const pop = anyData?.popularity;
        const votesA = Number(pop?.votes_a);
        const votesB = Number(pop?.votes_b);

        if (Number.isFinite(votesA) && Number.isFinite(votesB) && votesA + votesB > 0) {
          const left = Math.round((votesA / (votesA + votesB)) * 1000) / 10;
          const right = Math.max(0, Math.round((100 - left) * 10) / 10);
          setDuelVotePct({ left, right });
        } else {
          setDuelVotePct(null);
        }

        setPostVoteRatings(map);
        setImpactVisible(true);

        setShowPendingUi(false);
        if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
        pendingUiTimerRef.current = null;

        scheduleAutoNextAfterReveal();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Błąd zapisu głosu';
        setError(msg);
        setShowPendingUi(false);
        if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
        pendingUiTimerRef.current = null;
        clearAutoNext(true);
      } finally {
        setVoting(false);
      }
    },
    [pair, voting, transition, clearAutoNext, scheduleAutoNextAfterReveal, lastWinner]
  );

  const showImpact = impactVisible && !!postVoteRatings;
  const showFullLoader = loadingPair && !pair;
  const showCountdown = showImpact && autoNextRunning && transition === 'idle';

  const nextDisabled = transition !== 'idle' || loadingPair;
  const nextIsHover = nextHover && !nextDisabled;

  const showOverlayLoader = loadingPair && !!pair;

  return (
    <div className="flex flex-col gap-4">
      <DuelCountdownBar show={showCountdown} progress={autoNextProgress} paused={autoNextPaused} height={COUNTDOWN_BAR_H} />

      {showFullLoader ? (
        <div style={{ minHeight: '62vh', display: 'grid', placeItems: 'center' }}>
          <ZLoader />
        </div>
      ) : (
        <div
          style={{
            filter: showOverlayLoader ? 'blur(4px) saturate(0.9)' : 'none',
            opacity: showOverlayLoader ? 0.55 : 1,
            transition: 'filter 180ms ease, opacity 180ms ease',
            pointerEvents: showOverlayLoader ? 'none' : 'auto',
          }}
        >
          <DuelAttributeHeader attribute={String(attribute)} />

          {error && <div className="p-3 rounded bg-red-100 text-red-800 text-sm whitespace-pre-wrap">{error}</div>}

          {pair && (
            <div style={{ position: 'relative' }}>
              <DuelCardsRow
                pair={pair}
                cardStyle={cardStyle}
                showPendingUi={showPendingUi}
                showReveal={showReveal}
                lastWinner={lastWinner}
                glow={glow}
                handleVote={handleVote}
              />

              {showImpact && postVoteRatings && (
                <DuelRevealPanel
                  pair={pair}
                  showImpact={showImpact}
                  onMouseEnter={pauseAutoNext}
                  onMouseLeave={resumeAutoNext}
                  duelVotePct={duelVotePct}
                  lastWinner={lastWinner}
                  glow={glow}
                  barPct={barPct}
                  postVoteRatings={postVoteRatings}
                  nextDisabled={nextDisabled}
                  nextIsHover={nextIsHover}
                  setNextHover={setNextHover}
                  goNext={goNext}
                />
              )}
            </div>
          )}
        </div>
      )}

      {showOverlayLoader && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'radial-gradient(circle at 50% 35%, rgba(0,0,0,0.45), rgba(0,0,0,0.82))',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
          }}
          aria-hidden
        >
          <ZLoader />
        </div>
      )}
    </div>
  );
}
