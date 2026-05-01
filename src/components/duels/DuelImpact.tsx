import React from 'react';
import RatingWithConfidence from '../RatingWithConfidence';
import { getRatingColor } from '@/lib/ratings';

type Impact = {
  rating_before: number;
  rating_after: number;
  delta: number;
  rating: number;
  votes_count: number;
};

const roundToDisplay = (value: number) => Number(value.toFixed(2));

const formatDelta = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0.00';
  return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}`;
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
  const displayBefore = roundToDisplay(before);
  const displayAfter = roundToDisplay(after);
  const displayDelta = roundToDisplay(displayAfter - displayBefore);
  const isPositive = displayDelta >= 0;

  void playerId;
  void winner;
  void attribute;
  void glow;
  void barPct;

  return (
    <div className="impact">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 7,
          minWidth: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <RatingWithConfidence
            rating={displayBefore}
            confidence={0}
            fontSize={13}
            decimals={2}
            align="start"
            expand={false}
            ratingColor={getRatingColor(displayBefore)}
            confidenceTooltipContent={false}
            showConfidence={false}
          />
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ui-text-dim)',
            transform: 'translateY(-1px)',
          }}
        >
          →
        </span>

        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <RatingWithConfidence
            rating={displayAfter}
            confidence={0}
            fontSize={15}
            decimals={2}
            align="start"
            expand={false}
            ratingColor={getRatingColor(displayAfter)}
            confidenceTooltipContent={false}
            showConfidence={false}
          />
        </div>
      </div>

      <span
        style={{
          flexShrink: 0,
          minWidth: 58,
          padding: '4px 9px',
          borderRadius: '999px',
          textAlign: 'center',
          border: isPositive
            ? '1px solid color-mix(in srgb, var(--ui-accent-success) 32%, transparent)'
            : '1px solid color-mix(in srgb, var(--ui-danger) 34%, transparent)',
          background: isPositive
            ? 'color-mix(in srgb, var(--ui-accent-success) 9%, transparent)'
            : 'color-mix(in srgb, var(--ui-danger) 9%, transparent)',
          color: isPositive
            ? 'color-mix(in srgb, var(--ui-accent-success) 82%, white)'
            : 'color-mix(in srgb, var(--ui-danger) 82%, white)',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.03em',
          lineHeight: 1,
        }}
      >
        {formatDelta(displayDelta)}
      </span>

      <style jsx>{`
        .impact {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px;
          box-sizing: border-box;
        }

        @media (max-width: 700px) {
          .impact {
            min-height: 58px;
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            padding: 7px 6px;
          }
        }
      `}</style>
    </div>
  );
}