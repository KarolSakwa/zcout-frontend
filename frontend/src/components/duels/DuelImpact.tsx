'use client';

import React from 'react';
import type { RatingImpact } from './duelTypes';
import { toPct } from './duelUtils';

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
  impact?: RatingImpact;
  playerId?: number;
  winner: boolean;
  attribute: string;
  glow: string;
  barPct: Record<string, number>;
}) {
  if (!show || !impact || playerId == null) return null;

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
}
