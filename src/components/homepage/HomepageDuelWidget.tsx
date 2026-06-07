'use client';

import DuelCardsRow from '@/components/duels/DuelCardsRow';
import type { PairResponse } from '@/components/duels/duelTypes';

const pair: PairResponse = {
  pair_id: 1,
  attribute: 'strength',
  left: {
    id: 1,
    name: 'Erling Haaland',
    position: 'ST',
    club: 'Manchester City',
    color: '#6cabdd',
    number: 9,
  },
  right: {
    id: 2,
    name: 'William Saliba',
    position: 'CB',
    club: 'Arsenal',
    color: '#ef0107',
    number: 2,
  },
};

export default function HomepageDuelWidget() {
  return (
    <div
      style={{
        width: '100%',
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: 24,
          marginBottom: 24,
        }}
      >
        STRENGTH
      </div>

      <DuelCardsRow
  pair={pair}
  cardStyle={() => ({})}
  showPendingUi={false}
  showReveal={false}
  lastWinner={null}
  glow="var(--ui-accent-primary)"
  handleVote={() => {}}
  showImpact={false}
  postVoteRatings={null}
  barPct={{}}
/>
    </div>
  );
}