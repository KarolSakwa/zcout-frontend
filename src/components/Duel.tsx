'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ZLoader from './ZLoader';
import type { PairResponse, RatingsMap, VoteApiResponse } from './duels/duelTypes';
import { ATTR_MAP, SLIDE_MS, normalizePair, toPct } from './duels/duelUtils';
import DuelCountdownBar from './duels/DuelCountdownBar';
import DuelAttributeHeader from './duels/DuelAttributeHeader';
import DuelCardsRow from './duels/DuelCardsRow';
import DuelRevealPanel from './duels/DuelRevealPanel';
import RecentVotesWidget, { type RecentVoteItem } from './duels/RecentVotesWidget';

const AUTO_NEXT_MS = 5000;
const COUNTDOWN_BAR_H = 7;
const COUNTDOWN_START_AFTER_REVEAL_MS = 450;
const COUNTDOWN_TICK_MS = 50;

type VotePlayerResult = {
  id: number | string;
  rating: number;
  rating_before: number | null;
  rating_after: number | null;
  delta: number;
  votes_count?: number;
};

type VotePopularity = {
  votes_a?: number | null;
  votes_b?: number | null;
};

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
  const [skipping, setSkipping] = useState(false);
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
  const [showDelayedNextPending, setShowDelayedNextPending] = useState(false);

  const autoNextStartTimerRef = useRef<number | null>(null);
  const autoNextIntervalRef = useRef<number | null>(null);
  const autoNextStartAtRef = useRef<number | null>(null);
  const autoNextElapsedRef = useRef(0);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef(0);

  const attribute = pair?.attribute ?? '';
  const glow = 'var(--ui-accent-success)';

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
      const res = await fetch(`/api/duels/next`, {
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
      const res = await fetch(`/api/duels/next`, {
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

  const handleSkip = useCallback(async () => {
    if (!pair) return;
    if (voting || skipping) return;
    if (transition !== 'idle' || loadingPair) return;
    if (lastWinner !== null) return;

    clearAutoNext(true);
    setError(null);
    setSkipping(true);

    try {
      const duelId = Number(pair.pair_id);
      if (!Number.isFinite(duelId) || duelId <= 0) {
        throw new Error('Invalid duel_id');
      }

      const res = await fetch('/api/duels/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ duel_id: duelId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Skip failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      goNext();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd pomijania pojedynku';
      setError(msg);
    } finally {
      setSkipping(false);
    }
  }, [pair, voting, skipping, transition, loadingPair, lastWinner, clearAutoNext, goNext]);

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
    if (loadingPair) return;
    if (error) return;
    fetchInitialPair();
  }, [pair, loadingPair, error, fetchInitialPair]);

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

  

    const pushRecentVoteMock = useCallback((winnerId: number) => {
      if (!pair) return;

      const winner = winnerId === pair.left.id ? pair.left : pair.right;
      const loser = winnerId === pair.left.id ? pair.right : pair.left;

      const attributeKey =
        ATTR_MAP[String(pair.attribute ?? 'DRI').toUpperCase()] ?? String(pair.attribute ?? 'dribbling').toLowerCase();

      const attributeLabel = String(pair.attribute ?? 'Dribbling')
        .replace(/^gk_/i, '')
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      const item: RecentVoteItem = {
        id: `local-${winner.id}-${loser.id}-${attributeKey}`,
        winner: winner.name,
        loser: loser.name,
        attributeKey,
        attributeLabel,
      };

      setLatestRecentVoteId(item.id);
      setRecentVotesMock((prev) =>
        [
          item,
          ...prev.filter(
            (entry) =>
              !(
                entry.winner === item.winner &&
                entry.loser === item.loser &&
                entry.attributeKey === item.attributeKey
              )
          ),
        ].slice(0, 5)
      );
    }, [pair]);

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
        await fetch('/api/auth/csrf', { method: 'GET' });

        const xsrfCookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
        const xsrf = xsrfCookie ? decodeURIComponent(xsrfCookie.split('=')[1] ?? '') : '';

        const res = await fetch(`/api/vote`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrf,
          },
          body: JSON.stringify(body),
        });

        if (res.status === 409) {
          setShowPendingUi(false);
          if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
          pendingUiTimerRef.current = null;
          setLastWinner(null);
          clearAutoNext(true);
          goNext();
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Vote failed: ${res.status} ${text.slice(0, 200)}`);
        }

        const data = (await res.json()) as VoteApiResponse & {
          players?: VotePlayerResult[];
          popularity?: VotePopularity | null;
        };

        const map: RatingsMap = {};
        for (const pl of data.players ?? []) {
          map[String(pl.id)] = {
            rating: pl.rating,
            rating_before: pl.rating_before,
            rating_after: pl.rating_after,
            delta: pl.delta,
            votes_count: pl.votes_count,
          };
        }

        const pop = data.popularity;
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
        pushRecentVoteMock(winnerId);
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
    [pair, voting, transition, clearAutoNext, scheduleAutoNextAfterReveal, lastWinner, goNext, pushRecentVoteMock]
  );

  const showImpact = impactVisible && !!postVoteRatings;
  const showCountdown = showImpact && autoNextRunning && transition === 'idle';

  const nextDisabled = transition !== 'idle' || loadingPair;
  const nextIsHover = nextHover && !nextDisabled;

  const showOverlayLoader = !pair && (loadingPair || skipping);
  const overlayBlur = showOverlayLoader && !!pair;

  const skipDisabled = !pair || skipping || voting || loadingPair || transition !== 'idle' || showReveal;
  const showLocalNextLoader = !!pair && loadingPair;

const recentVotesPool: RecentVoteItem[] = [
  { id: 'rv-1', winner: 'Bukayo Saka', loser: 'Phil Foden', attributeKey: 'dribbling', attributeLabel: 'Dribbling' },
  { id: 'rv-2', winner: 'Rodri', loser: 'Declan Rice', attributeKey: 'passing', attributeLabel: 'Passing' },
  { id: 'rv-3', winner: 'Virgil van Dijk', loser: 'William Saliba', attributeKey: 'marking', attributeLabel: 'Marking' },
  { id: 'rv-4', winner: 'Cole Palmer', loser: 'Martin Odegaard', attributeKey: 'creativity', attributeLabel: 'Creativity' },
  { id: 'rv-5', winner: 'Erling Haaland', loser: 'Alexander Isak', attributeKey: 'finishing', attributeLabel: 'Finishing' },
  { id: 'rv-6', winner: 'Bruno Fernandes', loser: 'James Maddison', attributeKey: 'long_shots', attributeLabel: 'Long Shots' },
  { id: 'rv-7', winner: 'Mohamed Salah', loser: 'Jarrod Bowen', attributeKey: 'acceleration', attributeLabel: 'Acceleration' },
  { id: 'rv-8', winner: 'Gabriel Magalhaes', loser: 'Cristian Romero', attributeKey: 'heading', attributeLabel: 'Heading' },
];

const [recentVotesMock, setRecentVotesMock] = useState<RecentVoteItem[]>(() => recentVotesPool.slice(0, 5));

const [latestRecentVoteId, setLatestRecentVoteId] = useState<string | null>(null);


  useEffect(() => {
    let index = 5;

    const interval = window.setInterval(() => {
      const nextItem = recentVotesPool[index % recentVotesPool.length];
      index += 1;

      setLatestRecentVoteId(nextItem.id);
      setRecentVotesMock((prev) => [nextItem, ...prev.filter((entry) => entry.id !== nextItem.id)].slice(0, 5));
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pair || !loadingPair) {
      setShowDelayedNextPending(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowDelayedNextPending(true);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [pair, loadingPair]);

  return (
    <div className="flex flex-col gap-4">
      <DuelCountdownBar show={showCountdown} progress={autoNextProgress} paused={autoNextPaused} height={COUNTDOWN_BAR_H} />

      <div
        style={{
          filter: overlayBlur ? 'blur(4px) saturate(0.9)' : 'none',
          opacity: overlayBlur ? 0.55 : 1,
          transition: 'filter 180ms ease, opacity 180ms ease',
          pointerEvents: overlayBlur ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1600,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              maxWidth: 996,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                filter: showDelayedNextPending ? 'blur(2px)' : 'none',
                opacity: showDelayedNextPending ? 0.5 : 1,
                transition: 'filter 180ms ease, opacity 180ms ease',
              }}
            >
              <DuelAttributeHeader attribute={String(pair?.attribute ?? attribute)} />

              {error && (
                <div
                  style={{
                    maxWidth: 996,
                    margin: '0 auto 12px',
                    padding: '12px 14px',
                    borderRadius: 'var(--ui-radius-md)',
                    border: '1px solid var(--ui-border-subtle)',
                    background: 'var(--ui-surface-soft)',
                    color: 'var(--ui-text-primary)',
                    whiteSpace: 'pre-wrap',
                    boxShadow: 'var(--ui-shadow-panel-soft)',
                  }}
                >
                  {error}
                </div>
              )}

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
                    showImpact={showImpact}
                    postVoteRatings={postVoteRatings}
                    barPct={barPct}
                  />

                  {showImpact && postVoteRatings && (
                    <DuelRevealPanel
                      pair={pair}
                      onMouseEnter={pauseAutoNext}
                      onMouseLeave={resumeAutoNext}
                      duelVotePct={duelVotePct}
                      lastWinner={lastWinner}
                      nextDisabled={nextDisabled}
                      nextIsHover={nextIsHover}
                      setNextHover={setNextHover}
                      goNext={goNext}
                      showImpact={showImpact}
                      postVoteRatings={postVoteRatings}
                      glow={glow}
                      barPct={barPct}
                    />
                  )}
                </div>
              )}
            </div>

            {showDelayedNextPending && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 15,
                  display: 'grid',
                  placeItems: 'center',
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <ZLoader />
              </div>
            )}
          </div>
          <RecentVotesWidget items={recentVotesMock} latestItemId={latestRecentVoteId} />
        </div>
      </div>

      {!showReveal && pair && (
         <div
            style={{
              display: 'grid',
              placeItems: 'center',
              marginTop: 28,
              pointerEvents: showOverlayLoader ? 'none' : 'auto',
            }}
          >
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipDisabled}
            style={{
              minWidth: 190,
              padding: '10px 22px',
              borderRadius: 'var(--ui-radius-md)',
              border: '1px solid var(--ui-border-accent)',
              color: 'var(--ui-accent-primary)',
              background: 'linear-gradient(180deg, rgba(26,26,26,0.72), rgba(12,12,12,0.38))',
              boxShadow:
                '0 14px 38px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.40)',
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              cursor: skipDisabled ? 'default' : 'pointer',
              opacity: skipDisabled ? 0.45 : 1,
              transition: 'transform 120ms ease, background 160ms ease, opacity 120ms ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)';
            }}
            onMouseEnter={(e) => {
              if (skipDisabled) return;
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(180deg, rgba(34,34,34,0.78), rgba(12,12,12,0.44))';
            }}
          >
            Skip
          </button>
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