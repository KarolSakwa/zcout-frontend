/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlayerCard from './PlayerCard';
import ZLoader from './ZLoader';

type Player = {
  id: number;
  name: string;
  position: string;
  club?: string | null;
  nation?: string | null;
  seedRating?: number;
  avatarSrc?: string;
  countryIso2?: string | null;
  color?: string;
  secondaryColor?: string;
  number?: number;
};

type PairResponse = {
  pair_id: string | number | null;
  attribute: string;
  left: Player;
  right: Player;
};

type VoteApiResponse = {
  duel_id: number;
  attribute_id: number;
  players: Array<{
    id: number;
    rating: number;
    rating_before: number;
    rating_after: number;
    delta: number;
    votes_count: number;
  }>;
};

type RatingImpact = {
  rating: number;
  rating_before: number;
  rating_after: number;
  delta: number;
  votes_count: number;
};

type RatingsMap = Record<string, RatingImpact>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

const ATTR_MAP: Record<string, string> = {
  DRI: 'dribbling',
};

const SLIDE_MS = 260;
const EXIT_DELAY_MS = 5050;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function toPct(rating: number) {
  const v = clamp(rating, 0, 99);
  return (v / 99) * 100;
}

function glowForAttribute(attr: string) {
  const key = String(attr).toLowerCase();
  if (key.includes('drib')) return '#22c55e';
  if (key.includes('pass')) return '#60a5fa';
  if (key.includes('fin') || key.includes('shot')) return '#f97316';
  if (key.includes('tack') || key.includes('def')) return '#ef4444';
  return '#ffd666';
}

export default function Duel() {
  const [pair, setPair] = useState<PairResponse | null>(null);
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

  const attribute = pair?.attribute ?? '';
  const glow = useMemo(() => glowForAttribute(attribute), [attribute]);

  const timerRef = useRef<number | null>(null);

  const cardStyle = useCallback(
  (side: 'left' | 'right'): React.CSSProperties => {
    const isLeft = side === 'left';

    const base: React.CSSProperties = {
      transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`,
      willChange: 'transform, opacity, filter',
      pointerEvents: transition === 'idle' ? 'auto' : 'none',
    };

    const INSET_X = 48; // 96px middle column / 2 -> dociśnięcie na starcie
    const PENDING_X = 52; // ile mają się rozsunąć po pending

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

    // transition === 'idle'
    const x = showPendingUi
      ? isLeft
        ? -PENDING_X
        : PENDING_X
      : isLeft
        ? INSET_X
        : -INSET_X;

    return { ...base, transform: `translateX(${x}px)`, opacity: 1, filter: 'none' };
  },
  [transition, showPendingUi]
);


  const fetchPair = useCallback(async () => {
    setError(null);
    setLoadingPair(true);

    // reset UI for next duel
    setPair(null);
    setPostVoteRatings(null);
    setLastWinner(null);
    setImpactVisible(false);
    setBarPct({});
    setShowPendingUi(false);
    setTransition('idle');

    if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);

    try {
      const res = await fetch(`${API_BASE}/api/duels/next`, { cache: 'no-store' });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Pair fetch failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      const data = await res.json();

      if (!Array.isArray(data.players) || data.players.length < 2) {
        throw new Error('Brak dwóch graczy w odpowiedzi /api/duels/next');
      }

      const [p1, p2] = data.players;

      console.log('[P1 keys]', Object.keys(p1));
console.log('[P1 country]', p1.country);
console.log('[P1 country_id]', p1.country_id);
console.log('[P1 countryIso2]', p1.countryIso2);
console.log('[P1 country_iso2]', p1.country_iso2);


      const mkPlayer = (p: any): Player => ({
        id: Number(p.id),
        name: p.name,
        position: p.position ?? 'ST',
        nation: p.country?.name ?? null,
        countryIso2: p.country?.iso2 ?? null,
        seedRating: 70,
        avatarSrc: `/players/${p.id}.png`,
        club: p.club?.name,
        color: p.club?.color_primary ?? '#1f2937',
        secondaryColor: p.club?.color_secondary ?? '#111827',
        number: p.number ?? undefined,
      });

      setTransition('enter');
      setPair({
        pair_id: data.duel_id ?? 'next',
        attribute: data.attribute?.key ?? 'dribbling',
        left: mkPlayer(p1),
        right: mkPlayer(p2),
      });

      requestAnimationFrame(() => setTransition('idle'));
    } catch (e: any) {
      setError(e?.message ?? 'Błąd pobierania pary');
      setTransition('idle');
    } finally {
      setLoadingPair(false);
    }
  }, []);

  useEffect(() => {
    fetchPair();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
    };
  }, [fetchPair]);

  useEffect(() => {
    if (!postVoteRatings) return;

    const next: Record<string, number> = {};
    for (const [id, v] of Object.entries(postVoteRatings)) {
      next[id] = toPct(v.rating_before);
    }
    setBarPct(next);

    requestAnimationFrame(() => {
      const after: Record<string, number> = {};
      for (const [id, v] of Object.entries(postVoteRatings)) {
        after[id] = toPct(v.rating_after);
      }
      setBarPct(after);
    });
  }, [postVoteRatings]);

  const handleVote = useCallback(
    async (winnerId: number) => {
      if (!pair || voting) return;
      if (transition !== 'idle') return;

      setVoting(true);
      setError(null);

      setLastWinner(winnerId);
      setImpactVisible(false);
      setPostVoteRatings(null);

      // pending UI after small delay (avoid flicker on fast responses)
      setShowPendingUi(false);
      if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
      pendingUiTimerRef.current = window.setTimeout(() => setShowPendingUi(true), 150);

      const attrKey =
        ATTR_MAP[(pair.attribute ?? 'DRI').toUpperCase()] ?? (pair.attribute ?? 'dribbling').toLowerCase();

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

        const data: VoteApiResponse = await res.json();

        const map: RatingsMap = {};
        for (const p of data.players ?? []) {
          map[String(p.id)] = {
            rating: p.rating,
            rating_before: p.rating_before,
            rating_after: p.rating_after,
            delta: p.delta,
            votes_count: p.votes_count,
          };
        }

        setPostVoteRatings(map);
        setImpactVisible(true);

        // stop pending UI
        setShowPendingUi(false);
        if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);

        // schedule exit -> fetch next
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          setTransition('exit');
          window.setTimeout(() => {
            fetchPair();
          }, SLIDE_MS);
        }, EXIT_DELAY_MS);
      } catch (e: any) {
        setError(e?.message ?? 'Błąd zapisu głosu');
        setShowPendingUi(false);
        if (pendingUiTimerRef.current) window.clearTimeout(pendingUiTimerRef.current);
      } finally {
        setVoting(false);
      }
    },
    [pair, voting, fetchPair, transition]
  );

  const leftId = pair?.left.id;
  const rightId = pair?.right.id;

  const leftImpact = postVoteRatings && leftId != null ? postVoteRatings[String(leftId)] : undefined;
  const rightImpact = postVoteRatings && rightId != null ? postVoteRatings[String(rightId)] : undefined;

  const showReveal = lastWinner !== null;
  const showImpact = impactVisible && !!postVoteRatings;

  const Impact = ({
    impact,
    playerId,
    winner,
  }: {
    impact?: RatingImpact;
    playerId?: number;
    winner: boolean;
  }) => {
    if (!showImpact || !impact || playerId == null) return null;

    const before = impact.rating_before;
    const after = impact.rating_after;
    const delta = impact.delta;

    const sign = delta >= 0 ? '+' : '';
    const pctBefore = toPct(before);
    const current = barPct[String(playerId)] ?? pctBefore;

    const deltaStart = Math.min(pctBefore, current);
    const deltaWidth = Math.abs(current - pctBefore);

    const deltaColor = delta >= 0 ? glow : '#ef4444';

    return (
      <div className="impact">
        <div className="impactTop">
          <div className="impactKey">{String(attribute).toUpperCase()}</div>
          <div className="impactNums">
            {before.toFixed(2)} → {after.toFixed(2)}
          </div>
        </div>

        <div className="bar">
          <div className="base" style={{ width: `${pctBefore}%` }} />
          <div
            className="delta"
            style={{
              left: `${deltaStart}%`,
              width: `${deltaWidth}%`,
              background: deltaColor,
              opacity: winner ? 1 : 0.65,
            }}
          />
        </div>

        <div className="impactDelta">
          <span className="deltaText" style={{ color: deltaColor }}>
            {sign}
            {delta.toFixed(2)}
          </span>
        </div>

        <style jsx>{`
          .impact {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
          }
          .impactTop {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .impactKey {
            font-weight: 900;
            letter-spacing: 0.1em;
            color: rgba(255, 255, 255, 0.92);
            font-size: 12px;
          }
          .impactNums {
            font-weight: 800;
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }
          .bar {
            position: relative;
            height: 10px;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
          }
          .base {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.18);
          }
          .delta {
            position: absolute;
            top: 0;
            bottom: 0;
            border-radius: 999px;
            transition: left 520ms ease, width 520ms ease;
          }
          .impactDelta {
            margin-top: 8px;
            display: flex;
            justify-content: center;
          }
          .deltaText {
            font-weight: 900;
            font-size: 12px;
          }
        `}</style>
      </div>
    );
  };

  const showFullLoader = loadingPair && !pair;

  return (
    <div className="flex flex-col gap-4">
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
                  <Impact impact={leftImpact} playerId={pair.left.id} winner={lastWinner === pair.left.id} />
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
                  <Impact impact={rightImpact} playerId={pair.right.id} winner={lastWinner === pair.right.id} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
