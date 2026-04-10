'use client';

import Link from 'next/link';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: string;
  rating: number;
  confidence: number;
  votes_count: number;
  last_vote_at: string | null;
};

type ScoutReportScreenProps = {
  playerId: number;
  playerName: string;
  playerPosition: string | null;
  clubName: string | null;
  attributes: PlayerProfileAttribute[];
};

export default function ScoutReportScreen({
  playerId,
  playerName,
  playerPosition,
  clubName,
  attributes,
}: ScoutReportScreenProps) {
  return (
    <main style={{ padding: '24px', color: '#e7e7e7' }}>
      <Link href={`/players/${playerId}`} style={{ color: '#d3a84a' }}>
        ← Back to player
      </Link>

      <div style={{ marginTop: '20px' }}>
        <h1 style={{ margin: 0 }}>Scout Report</h1>
        <div style={{ marginTop: '8px', opacity: 0.8 }}>
          {playerName}
          {playerPosition ? ` • ${playerPosition}` : ''}
          {clubName ? ` • ${clubName}` : ''}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <div style={{ opacity: 0.7, marginBottom: '12px' }}>
          Placeholder pack from current player payload
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {attributes.slice(0, 6).map((attribute) => (
            <div
              key={attribute.id}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontWeight: 600 }}>{attribute.label}</div>
              <div style={{ marginTop: '6px', opacity: 0.7 }}>
                key: {attribute.key}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}