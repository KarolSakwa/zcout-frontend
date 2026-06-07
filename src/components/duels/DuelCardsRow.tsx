'use client';

import React from 'react';
import PlayerCard from '../PlayerCard';
import ZLoader from '../ZLoader';
import type { PairResponse, RatingsMap } from './duelTypes';

export default function DuelCardsRow({
  pair,
  cardStyle,
  showPendingUi,
  showReveal,
  lastWinner,
  glow,
  handleVote,
  showImpact,
  postVoteRatings,
  barPct,
  homepageMode = false,
}: {
  pair: PairResponse;
  cardStyle: (side: 'left' | 'right') => React.CSSProperties;
  showPendingUi: boolean;
  showReveal: boolean;
  lastWinner: number | null;
  glow: string;
  handleVote: (winnerId: number) => void;
  showImpact: boolean;
  postVoteRatings?: RatingsMap | null;
  barPct: Record<string, number>;
  homepageMode?: boolean;
}) {
  void showImpact;
  void postVoteRatings;
  void barPct;

  return (
    <>
      <div className="duelCardsRow">
        <div           className="flex flex-col gap-2"           style={cardStyle('left')}        >
          <PlayerCard
            name={pair.left.name}
            position={pair.left.position}
            club={pair.left.club ?? 'â€”'}
            color={pair.left.color ?? 'var(--ui-surface-panel-solid)'}
            secondaryColor={pair.left.secondaryColor}
            avatarSrc={pair.left.avatarSrc ?? `/players/${pair.left.id}.png`}
            countryIso2={pair.left.countryIso2}
            number={pair.left.number}
            onClick={() => handleVote(pair.left.id)}
            reveal={showReveal}
            isWinner={lastWinner === pair.left.id}
            glowColor={glow}
            compact={homepageMode}
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
          {showPendingUi ? <ZLoader /> : <div style={{ width: 30, height: 30 }} />}
        </div>

        <div className="flex flex-col gap-2" style={cardStyle('right')}>
          <PlayerCard
            name={pair.right.name}
            position={pair.right.position}
            club={pair.right.club ?? 'â€”'}
            color={pair.right.color ?? 'var(--ui-surface-panel-solid)'}
            secondaryColor={pair.right.secondaryColor}
            avatarSrc={pair.right.avatarSrc ?? `/players/${pair.right.id}.png`}
            countryIso2={pair.right.countryIso2}
            number={pair.right.number}
            onClick={() => handleVote(pair.right.id)}
            reveal={showReveal}
            isWinner={lastWinner === pair.right.id}
            glowColor={glow}
            compact={homepageMode}
          />
        </div>
      </div>

      <style jsx>{`
        .duelCardsRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 84px minmax(0, 1fr);
          align-items: start;
          gap: 36px;
          width: min(100%, ${homepageMode ? 500 : 720}px);
          margin: 40px auto 0;
          position: relative;
        }

        @media (max-width: 1720px) {
          .duelCardsRow {
            grid-template-columns: minmax(0, 1fr) 64px minmax(0, 1fr);
            gap: 24px;
            width: min(100%, 660px);
          }
        }

        @media (max-width: 1360px) {
          .duelCardsRow {
            grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
            gap: 20px;
            width: min(100%, 620px);
          }
        }

        @media (max-width: 700px) {
          .duelCardsRow {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
            width: 100%;
            margin: 24px auto 0;
            padding: 0;
          }

          .duelCardsRow > div:nth-child(2) {
            position: absolute;
            left: 50%;
            top: 42%;
            transform: translate(-50%, -50%);
            z-index: 5;
          }
        }
      `}</style>
    </>
  );
}