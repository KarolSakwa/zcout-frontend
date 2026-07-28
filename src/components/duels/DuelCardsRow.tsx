'use client';

import React from 'react';
import PlayerCard from '../PlayerCard';
import ZLoader from '../ZLoader';
import type { PairResponse, RatingsMap } from './duelTypes';
import duelStyles from '../Duel.module.css';

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
  const isDuelsLoading = !homepageMode && loading && !pair;

  if (!pair && !isHomepageLoading && !isDuelsLoading) {
    return null;
  }

  if (homepageMode) {
    return (
      <div className={duelStyles.homepageCardsRow} data-hp-duel-row>
        <div
          className={duelStyles.homepageCardSlot}
          style={cardStyle('left')}
          data-hp-duel-slot="left"
        >
          {isHomepageLoading ? (
            <div className={duelStyles.homepageCardPlaceholder} aria-hidden />
          ) : (
            <div
              className={`${duelStyles.homepageHintLiftWrapper}${
                hintLiftActive ? ` ${duelStyles.homepageHintLiftActive}` : ''
              }`}
              style={{ ['--glow' as string]: glow }}
            >
              <PlayerCard
                name={pair!.left.name}
                position={pair!.left.position}
                club={pair!.left.club ?? '—'}
                color={pair!.left.color ?? 'var(--ui-surface-panel-solid)'}
                secondaryColor={pair!.left.secondaryColor}
                avatarSrc={pair!.left.avatarSrc ?? `/players/${pair!.left.id}.png`}
                countryIso2={pair!.left.countryIso2}
                number={pair!.left.number}
                onClick={() => handleVote(pair!.left.id)}
                reveal={showReveal}
                isWinner={lastWinner === pair!.left.id}
                glowColor={glow}
                compact
                homepageMode
              />
            </div>
          )}
        </div>

        <div className={duelStyles.homepageCenterSlot} data-hp-duel-slot="center">
          {showPendingUi ? <ZLoader /> : <div style={{ width: 30, height: 30 }} />}
        </div>

        <div
          className={duelStyles.homepageCardSlot}
          style={cardStyle('right')}
          data-hp-duel-slot="right"
        >
          {isHomepageLoading ? (
            <div className={duelStyles.homepageCardPlaceholder} aria-hidden />
          ) : (
            <div
              className={`${duelStyles.homepageHintLiftWrapper}${
                hintLiftActive ? ` ${duelStyles.homepageHintLiftActive}` : ''
              }`}
              style={{ ['--glow' as string]: glow }}
            >
              <PlayerCard
                name={pair!.right.name}
                position={pair!.right.position}
                club={pair!.right.club ?? '—'}
                color={pair!.right.color ?? 'var(--ui-surface-panel-solid)'}
                secondaryColor={pair!.right.secondaryColor}
                avatarSrc={pair!.right.avatarSrc ?? `/players/${pair!.right.id}.png`}
                countryIso2={pair!.right.countryIso2}
                number={pair!.right.number}
                onClick={() => handleVote(pair!.right.id)}
                reveal={showReveal}
                isWinner={lastWinner === pair!.right.id}
                glowColor={glow}
                compact
                homepageMode
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderDuelsCard = (side: 'left' | 'right') => {
    const player = side === 'left' ? pair?.left : pair?.right;
    if (isDuelsLoading || !player) {
      return <div className={duelStyles.duelPageCardPlaceholder} aria-hidden />;
    }

    return (
      <div
        className={`${duelStyles.duelPageCardHintLiftWrapper}${
          hintLiftActive ? ` ${duelStyles.duelPageCardHintLiftActive}` : ''
        }`}
        style={{ ['--glow' as string]: glow }}
      >
        <PlayerCard
          name={player.name}
          position={player.position}
          club={player.club ?? '—'}
          color={player.color ?? 'var(--ui-surface-panel-solid)'}
          secondaryColor={player.secondaryColor}
          avatarSrc={player.avatarSrc ?? `/players/${player.id}.png`}
          countryIso2={player.countryIso2}
          number={player.number}
          onClick={() => handleVote(player.id)}
          reveal={showReveal}
          isWinner={lastWinner === player.id}
          glowColor={glow}
          duelsPage
        />
      </div>
    );
  };

  return (
    <div className={duelStyles.duelPageCardsRow} data-duels-row>
      <div
        className={duelStyles.duelPageCardSlot}
        style={cardStyle('left')}
        data-duels-slot="left"
      >
        {renderDuelsCard('left')}
      </div>

      <div className={duelStyles.duelPageCenterSlot} data-duels-slot="center">
        {showPendingUi ? (
          <ZLoader />
        ) : (
          <div style={{ width: 30, height: 30 }} data-duels-center-spacer />
        )}
      </div>

      <div
        className={duelStyles.duelPageCardSlot}
        style={cardStyle('right')}
        data-duels-slot="right"
      >
        {renderDuelsCard('right')}
      </div>
    </div>
  );
}
