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
  loading = false,
  hintLiftActive = false,
}: {
  pair?: PairResponse | null;
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
  loading?: boolean;
  hintLiftActive?: boolean;
}) {
  void showImpact;
  void postVoteRatings;
  void barPct;

  const isHomepageLoading = homepageMode && loading && !pair;

  if (!pair && !isHomepageLoading) {
    return null;
  }

  return (
    <>
      <div className={`duelCardsRow${homepageMode ? ' duelCardsRowHomepage' : ''}`}>
        <div className="flex flex-col gap-2" style={cardStyle('left')}>
          {isHomepageLoading ? (
            <div className="cardPlaceholder" aria-hidden />
          ) : (
            <div
              className={`cardHintLiftWrapper${hintLiftActive ? ' cardHintLiftActive' : ''}`}
              style={{ ['--glow' as string]: glow }}
            >
              <PlayerCard
                name={pair!.left.name}
                position={pair!.left.position}
                club={pair!.left.club ?? 'â€”'}
                color={pair!.left.color ?? 'var(--ui-surface-panel-solid)'}
                secondaryColor={pair!.left.secondaryColor}
                avatarSrc={pair!.left.avatarSrc ?? `/players/${pair!.left.id}.png`}
                countryIso2={pair!.left.countryIso2}
                number={pair!.left.number}
                onClick={() => handleVote(pair!.left.id)}
                reveal={showReveal}
                isWinner={lastWinner === pair!.left.id}
                glowColor={glow}
                compact={homepageMode}
                homepageMode={homepageMode}
              />
            </div>
          )}
        </div>

        <div className="cardCenterSlot">
          {showPendingUi ? (
            <ZLoader />
          ) : (
            <div style={{ width: 30, height: 30 }} />
          )}
        </div>

        <div className="flex flex-col gap-2" style={cardStyle('right')}>
          {isHomepageLoading ? (
            <div className="cardPlaceholder" aria-hidden />
          ) : (
            <div
              className={`cardHintLiftWrapper${hintLiftActive ? ' cardHintLiftActive' : ''}`}
              style={{ ['--glow' as string]: glow }}
            >
              <PlayerCard
                name={pair!.right.name}
                position={pair!.right.position}
                club={pair!.right.club ?? 'â€”'}
                color={pair!.right.color ?? 'var(--ui-surface-panel-solid)'}
                secondaryColor={pair!.right.secondaryColor}
                avatarSrc={pair!.right.avatarSrc ?? `/players/${pair!.right.id}.png`}
                countryIso2={pair!.right.countryIso2}
                number={pair!.right.number}
                onClick={() => handleVote(pair!.right.id)}
                reveal={showReveal}
                isWinner={lastWinner === pair!.right.id}
                glowColor={glow}
                compact={homepageMode}
                homepageMode={homepageMode}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .duelCardsRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 84px minmax(0, 1fr);
          align-items: start;
          gap: 36px;
          width: min(100%, ${homepageMode ? 500 : 720}px);
          margin: 20px auto 0;
          position: relative;
        }

        .cardCenterSlot {
          display: grid;
          place-items: center;
          align-self: center;
          pointer-events: none;
        }

        .cardPlaceholder {
          width: 100%;
          aspect-ratio: 2 / 3;
          visibility: hidden;
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

          .duelCardsRow > .cardCenterSlot {
            position: absolute;
            left: 50%;
            top: 42%;
            transform: translate(-50%, -50%);
            z-index: 5;
          }
        }
        .duelCardsRowHomepage {
          grid-template-columns: minmax(0, 1fr) 71px minmax(0, 1fr);
          gap: 31px;
          width: min(100%, 425px);
          margin: 17px auto 0;
        }

        @media (max-width: 1720px) {
          .duelCardsRowHomepage {
            grid-template-columns: minmax(0, 1fr) 54px minmax(0, 1fr);
            gap: 20px;
            width: min(100%, 561px);
          }
        }

        @media (max-width: 1360px) {
          .duelCardsRowHomepage {
            grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
            gap: 17px;
            width: min(100%, 527px);
          }
        }

        @media (max-width: 700px) {
          .duelCardsRowHomepage {
            width: 100%;
            margin: 20px auto 0;
          }
        }

        .cardHintLiftWrapper {
          width: 100%;
          position: relative;
        }

        .cardHintLiftWrapper.cardHintLiftActive {
          animation: duelCardHintLift 620ms ease-out;
        }

        .cardHintLiftWrapper.cardHintLiftActive::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: calc(var(--ui-radius-xl) + 2px);
          pointer-events: none;
          animation: duelCardHintGlow 620ms ease-out;
        }

        @keyframes duelCardHintLift {
          0%,
          100% {
            transform: translateY(0);
          }

          45% {
            transform: translateY(-4px);
          }
        }

        @keyframes duelCardHintGlow {
          0%,
          100% {
            box-shadow: 0 0 0 0 transparent;
          }

          45% {
            box-shadow: 0 0 18px 6px
              color-mix(in srgb, var(--glow) 38%, transparent);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cardHintLiftWrapper.cardHintLiftActive,
          .cardHintLiftWrapper.cardHintLiftActive::after {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
