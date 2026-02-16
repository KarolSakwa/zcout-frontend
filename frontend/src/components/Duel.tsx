'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlayerCard from './PlayerCard';
import ZLoader from './ZLoader';
import DuelImpact from './duels/DuelImpact';
import type { PairResponse, RatingsMap, VoteApiResponse } from './duels/duelTypes';
import { API_BASE, ATTR_MAP, SLIDE_MS, glowForAttribute, normalizePair, toPct } from './duels/duelUtils';

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

  const attribute = pair?.attribute ?? '';
  const glow = useMemo(() => glowForAttribute(attribute), [attribute]);

  const didAutoFetchRef = useRef(false);

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

  const fetchPair = useCallback(async () => {
    clearAutoNext(true);

    setError(null);
    setLoadingPair(true);

    setPair(null);
    setPostVoteRatings(null);
    setLastWinner(null);
    setImpactVisible(false);
    setBarPct({});
    setShowPendingUi(false);
    setTransition('idle');
    setDuelVotePct(null);

    if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;

    try {
      const res = await fetch(`${API_BASE}/api/duels/next`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Pair fetch failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      const raw = (await res.json()) as unknown;

      setTransition('enter');
      setPair(normalizePair(raw));
      requestAnimationFrame(() => setTransition('idle'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd pobierania pary';
      setError(msg);
      setTransition('idle');
    } finally {
      setLoadingPair(false);
    }
  }, [clearAutoNext]);

  const goNext = useCallback(() => {
    clearAutoNext(true);

    if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;
    setShowPendingUi(false);

    setTransition('exit');
    window.setTimeout(() => {
      fetchPair();
    }, SLIDE_MS);
  }, [clearAutoNext, fetchPair]);

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

  const cardStyle = useCallback(
    (side: 'left' | 'right'): React.CSSProperties => {
      const isLeft = side === 'left';

      const base: React.CSSProperties = {
        transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`,
        willChange: 'transform, opacity, filter',
        pointerEvents: transition === 'idle' ? 'auto' : 'none',
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
    [transition, showPendingUi]
  );

  useEffect(() => {
    if (pair) return;
    if (didAutoFetchRef.current) return;
    didAutoFetchRef.current = true;
    fetchPair();
  }, [pair, fetchPair]);

  useEffect(() => {
    return () => {
      if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
      if (autoNextStartTimerRef.current) window.clearTimeout(autoNextStartTimerRef.current);
      if (autoNextIntervalRef.current) window.clearInterval(autoNextIntervalRef.current);
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
        ATTR_MAP[String(pair.attribute ?? 'DRI').toUpperCase()] ??
        String(pair.attribute ?? 'dribbling').toLowerCase();

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

        const map: RatingsMap = {};
        for (const p of (data.players ?? []) as any[]) {
          map[String(p.id)] = {
            rating: p.rating,
            rating_before: p.rating_before,
            rating_after: p.rating_after,
            delta: p.delta,
            votes_count: p.votes_count,
          };
        }

        const anyData = data as any;
        const votesA = Number(
          anyData?.duel?.votes_a ??
            anyData?.duel?.votesA ??
            anyData?.duel?.votes_left ??
            anyData?.duelVotesA ??
            anyData?.votes_a ??
            anyData?.votesA ??
            anyData?.votes_left
        );
        const votesB = Number(
          anyData?.duel?.votes_b ??
            anyData?.duel?.votesB ??
            anyData?.duel?.votes_right ??
            anyData?.duelVotesB ??
            anyData?.votes_b ??
            anyData?.votesB ??
            anyData?.votes_right
        );

        if (Number.isFinite(votesA) && Number.isFinite(votesB) && votesA + votesB > 0) {
          const left = Math.round((votesA / (votesA + votesB)) * 1000) / 10;
          const right = Math.max(0, Math.round((100 - left) * 10) / 10);
          setDuelVotePct({ left, right });
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
    [pair, voting, transition, clearAutoNext, scheduleAutoNextAfterReveal]
  );

  const leftId = pair?.left.id;
  const rightId = pair?.right.id;

  const leftImpact = postVoteRatings && leftId != null ? postVoteRatings[String(leftId)] : undefined;
  const rightImpact = postVoteRatings && rightId != null ? postVoteRatings[String(rightId)] : undefined;

  const showReveal = lastWinner !== null;
  const showImpact = impactVisible && !!postVoteRatings;

  const showFullLoader = loadingPair && !pair;
  const showCountdown = showImpact && autoNextRunning && transition === 'idle';

  const nextDisabled = transition !== 'idle' || loadingPair;
  const nextIsHover = nextHover && !nextDisabled;

  const votedLeft = showImpact && leftId != null && lastWinner === leftId;
  const votedRight = showImpact && rightId != null && lastWinner === rightId;

  const pctLeft = duelVotePct?.left ?? 50;
  const pctRight = duelVotePct?.right ?? 50;

  return (
    <div className="flex flex-col gap-4">
      {showCountdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: COUNTDOWN_BAR_H,
            zIndex: 60,
            background: 'rgba(0,0,0,0.55)',
            borderBottom: '1px solid rgba(255,214,102,0.25)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
          }}
          aria-hidden
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(1, autoNextProgress)) * 100}%`,
              background:
                'linear-gradient(90deg, rgba(255,214,102,0.15), rgba(255,214,102,0.95), rgba(255,214,102,0.65))',
              transition: 'width 50ms linear',
              opacity: autoNextPaused ? 0.65 : 1,
              boxShadow: '0 0 16px rgba(255,214,102,0.25)',
            }}
          />
        </div>
      )}

      {showFullLoader ? (
        <div style={{ minHeight: '62vh', display: 'grid', placeItems: 'center' }}>
          <ZLoader />
        </div>
      ) : (
        <>
          {pair && (
            <div
              style={{
                maxWidth: 996,
                margin: '18px auto 26px',
                display: 'grid',
                placeItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(255,214,102,0.16)',
                  border: '1px solid rgba(255,214,102,0.45)',
                  color: 'rgba(255,214,102,0.95)',
                  fontWeight: 900,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                }}
                aria-hidden
              >
                ★
              </div>

              <div
                style={{
                  fontWeight: 950,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 18,
                  textShadow: '0 6px 18px rgba(0,0,0,0.55)',
                }}
              >
                {String(attribute)}
              </div>

              <div
                style={{
                  width: 180,
                  height: 2,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, transparent, rgba(255,214,102,0.75), transparent)',
                  opacity: 0.9,
                }}
                aria-hidden
              />
            </div>
          )}

          {error && <div className="p-3 rounded bg-red-100 text-red-800 text-sm whitespace-pre-wrap">{error}</div>}

          {pair && (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 96px minmax(0, 1fr)',
                  alignItems: 'start',
                  gap: 64,
                  maxWidth: 996,
                  margin: '0 auto',
                }}
              >
                <div className="flex flex-col gap-2" style={cardStyle('left')}>
                  <PlayerCard
                    name={pair.left.name}
                    position={pair.left.position}
                    club={pair.left.club ?? '—'}
                    color={pair.left.color ?? '#1f2937'}
                    secondaryColor={pair.left.secondaryColor}
                    avatarSrc={pair.left.avatarSrc ?? `/players/${pair.left.id}.png`}
                    countryIso2={pair.left.countryIso2}
                    number={pair.left.number}
                    onClick={() => handleVote(pair.left.id)}
                    reveal={showReveal}
                    isWinner={lastWinner === pair.left.id}
                    glowColor={glow}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    alignSelf: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  {showPendingUi ? <ZLoader /> : <div style={{ width: 46, height: 46 }} />}
                </div>

                <div className="flex flex-col gap-2" style={cardStyle('right')}>
                  <PlayerCard
                    name={pair.right.name}
                    position={pair.right.position}
                    club={pair.right.club ?? '—'}
                    color={pair.right.color ?? '#1f2937'}
                    secondaryColor={pair.right.secondaryColor}
                    avatarSrc={pair.right.avatarSrc ?? `/players/${pair.right.id}.png`}
                    countryIso2={pair.right.countryIso2}
                    number={pair.right.number}
                    onClick={() => handleVote(pair.right.id)}
                    reveal={showReveal}
                    isWinner={lastWinner === pair.right.id}
                    glowColor={glow}
                  />
                </div>
              </div>

              {showImpact && (
                <div
                  style={{ maxWidth: 996, margin: '18px auto 0' }}
                  onMouseEnter={pauseAutoNext}
                  onMouseLeave={resumeAutoNext}
                >
                  <div
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.35)',
                      boxShadow: '0 10px 22px rgba(0,0,0,0.32)',
                    }}
                    aria-hidden
                  >
                    <div style={{ display: 'flex', height: 18 }}>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, pctLeft))}%`,
                          background: votedLeft
                            ? 'linear-gradient(90deg, rgba(255,214,102,0.22), rgba(255,214,102,0.85))'
                            : 'linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.22))',
                          boxShadow: votedLeft ? 'inset 0 0 0 1px rgba(255,214,102,0.55)' : 'none',
                          display: 'grid',
                          placeItems: 'center',
                          color: votedLeft ? 'rgba(255,214,102,0.98)' : 'rgba(255,255,255,0.70)',
                          fontWeight: 950,
                          letterSpacing: '0.08em',
                          fontSize: 11,
                        }}
                      >
                        {duelVotePct ? `${pctLeft}%` : '—'}
                      </div>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, pctRight))}%`,
                          background: votedRight
                            ? 'linear-gradient(90deg, rgba(255,214,102,0.85), rgba(255,214,102,0.22))'
                            : 'linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.10))',
                          boxShadow: votedRight ? 'inset 0 0 0 1px rgba(255,214,102,0.55)' : 'none',
                          display: 'grid',
                          placeItems: 'center',
                          color: votedRight ? 'rgba(255,214,102,0.98)' : 'rgba(255,255,255,0.70)',
                          fontWeight: 950,
                          letterSpacing: '0.08em',
                          fontSize: 11,
                        }}
                      >
                        {duelVotePct ? `${pctRight}%` : '—'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 96px minmax(0, 1fr)',
                      alignItems: 'start',
                      gap: 64,
                    }}
                  >
                    <div style={{ marginTop: 8 }}>
                      <DuelImpact
                        show={showImpact}
                        impact={leftImpact}
                        playerId={pair.left.id}
                        winner={lastWinner === pair.left.id}
                        attribute=""
                        glow={glow}
                        barPct={barPct}
                      />
                    </div>

                    <div />

                    <div style={{ marginTop: 8 }}>
                      <DuelImpact
                        show={showImpact}
                        impact={rightImpact}
                        playerId={pair.right.id}
                        winner={lastWinner === pair.right.id}
                        attribute=""
                        glow={glow}
                        barPct={barPct}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', placeItems: 'center', marginTop: 18 }}>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={nextDisabled}
                      onMouseEnter={() => setNextHover(true)}
                      onMouseLeave={() => setNextHover(false)}
                      onFocus={() => setNextHover(true)}
                      onBlur={() => setNextHover(false)}
                      style={{
                        height: 34,
                        padding: '0 16px',
                        borderRadius: 999,
                        border: `1px solid ${nextIsHover ? 'rgba(255,214,102,0.75)' : 'rgba(255,214,102,0.55)'}`,
                        background: nextIsHover ? 'rgba(255,214,102,0.16)' : 'rgba(255,214,102,0.10)',
                        color: 'rgba(255,214,102,0.95)',
                        fontWeight: 950,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        boxShadow: nextIsHover
                          ? '0 14px 30px rgba(0,0,0,0.40), 0 0 22px rgba(255,214,102,0.14)'
                          : '0 12px 28px rgba(0,0,0,0.35), 0 0 18px rgba(255,214,102,0.10)',
                        opacity: nextDisabled ? 0.55 : 1,
                        cursor: nextDisabled ? 'not-allowed' : 'pointer',
                        userSelect: 'none',
                        transform: nextIsHover ? 'translateY(-1px)' : 'translateY(0px)',
                        transition:
                          'transform 140ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
