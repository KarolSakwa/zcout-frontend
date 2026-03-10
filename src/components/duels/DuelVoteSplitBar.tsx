'use client';

import React, { useMemo } from 'react';

type Props = {
  title?: string;
  pctLeft: number | null;
  pctRight: number | null;
  leftPrimary: string;
  rightPrimary: string;
  votedSide?: 'left' | 'right' | null;
  votesA?: number | null;
  votesB?: number | null;
};

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(255,255,255,${a})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

export default function DuelVoteSplitBar({
  title = 'STANDS VERDICT',
  pctLeft,
  pctRight,
  leftPrimary,
  rightPrimary,
  votedSide,
  votesA,
  votesB,
}: Props) {
  const safeLeft = useMemo(() => {
    if (typeof pctLeft !== 'number' || !Number.isFinite(pctLeft)) return null;
    return Math.max(0, Math.min(100, pctLeft));
  }, [pctLeft]);

  const safeRight = useMemo(() => {
    if (typeof pctRight !== 'number' || !Number.isFinite(pctRight)) return null;
    return Math.max(0, Math.min(100, pctRight));
  }, [pctRight]);

  const hasPct = safeLeft != null && safeRight != null;
  const leftW = hasPct ? `${safeLeft}%` : '50%';
  const rightW = hasPct ? `${safeRight}%` : '50%';

  const votedLeft = votedSide === 'left';
  const votedRight = votedSide === 'right';

  const leftFill = hexToRgba(leftPrimary, votedLeft ? 0.92 : 0.55);
  const rightFill = hexToRgba(rightPrimary, votedRight ? 0.92 : 0.55);

  const leftEdge = hexToRgba(leftPrimary, votedLeft ? 0.70 : 0.25);
  const rightEdge = hexToRgba(rightPrimary, votedRight ? 0.70 : 0.25);

  const showVotes = Number.isFinite(votesA as number) && Number.isFinite(votesB as number);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gap: 8,
          justifyItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.70)',
            fontWeight: 950,
          }}
        >
          {title}
        </div>

        {showVotes && (
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.10em',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 900,
            }}
          >
            {Number(votesA)}–{Number(votesB)}
          </div>
        )}

        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: `1px solid ${leftEdge}`,
              background: hexToRgba(leftPrimary, 0.14),
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 950,
              letterSpacing: '0.08em',
              fontSize: 11,
              boxShadow: votedLeft ? `0 0 18px ${hexToRgba(leftPrimary, 0.20)}` : 'none',
              minWidth: 72,
              textAlign: 'center',
            }}
          >
            {hasPct ? `${safeLeft!.toFixed(1)}%` : '—'}
          </div>

          <div
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: `1px solid ${rightEdge}`,
              background: hexToRgba(rightPrimary, 0.14),
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 950,
              letterSpacing: '0.08em',
              fontSize: 11,
              boxShadow: votedRight ? `0 0 18px ${hexToRgba(rightPrimary, 0.20)}` : 'none',
              minWidth: 72,
              textAlign: 'center',
            }}
          >
            {hasPct ? `${safeRight!.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.35)',
          boxShadow: '0 10px 22px rgba(0,0,0,0.32)',
        }}
        aria-hidden
      >
        <div style={{ display: 'flex', height: 16 }}>
          <div
            style={{
              width: leftW,
              background: leftFill,
              boxShadow: `inset 0 0 0 1px ${leftEdge}`,
              transition: 'width 180ms ease',
            }}
          />
          <div
            style={{
              width: rightW,
              background: rightFill,
              boxShadow: `inset 0 0 0 1px ${rightEdge}`,
              transition: 'width 180ms ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
