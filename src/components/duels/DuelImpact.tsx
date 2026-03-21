import React from 'react';
import ImpactDeltaBar from './ImpactDeltaBar';

type Impact = {
  rating_before: number;
  rating_after: number;
  delta: number;
  rating: number;
  votes_count: number;
};

export default function DuelImpact({
  show,
  impact,
  playerId,
  winner,
  attribute,
  glow,
  barPct,
}: {
  show: boolean;
  impact?: Impact;
  playerId: number;
  winner: boolean;
  attribute: string;
  glow: string;
  barPct: Record<string, number>;
}) {
  if (!show || !impact) return null;

  const before = Number(impact.rating_before);
  const after = Number(impact.rating_after);
  const delta = Number(impact.delta);

  void playerId;
  void winner;
  void attribute;
  void glow;
  void barPct;

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 'var(--ui-radius-lg)',
        background: 'var(--ui-surface-soft)',
        border: '1px solid var(--ui-border-subtle)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.46)',
        padding: '14px 14px 12px',
      }}
    >
      <ImpactDeltaBar before={before} after={after} delta={delta} min={0} max={100} height={14} />
    </div>
  );
}