'use client';

import React from 'react';
import PlayerCard from '../PlayerCard';
import ZLoader from '../ZLoader';
import type { PairResponse } from './duelTypes';

export default function DuelCardsRow({
  pair,
  cardStyle,
  showPendingUi,
  showReveal,
  lastWinner,
  glow,
  handleVote,
}: {
  pair: PairResponse;
  cardStyle: (side: 'left' | 'right') => React.CSSProperties;
  showPendingUi: boolean;
  showReveal: boolean;
  lastWinner: number | null;
  glow: string;
  handleVote: (winnerId: number) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 96px minmax(0, 1fr)',
        alignItems: 'start',
        gap: 64,
        maxWidth: 996,
        margin: '28px auto 0',
      }}
    >
      <div className="flex flex-col gap-2" style={cardStyle('left')}>
        <PlayerCard
          name={pair.left.name}
          position={pair.left.position}
          club={pair.left.club ?? '—'}
          color={pair.left.color ?? 'var(--ui-surface-panel-solid)'}
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
          color={pair.right.color ?? 'var(--ui-surface-panel-solid)'}
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
  );
}