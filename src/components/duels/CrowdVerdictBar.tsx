import React, { useEffect, useMemo, useRef, useState } from 'react';

const HOLD_5050_MS = 260;
const ANIM_MS = 260;
const EDGE_HIT_PX = 10;

const ANIMATE_WIDTH = true;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const formatPct = (n: number) => {
  const x = clamp(n);
  if (x === 0 || x === 100) return `${x}%`;
  return `${Math.round(x * 10) / 10}%`;
};

const hexToRgba = (hex: string, a: number) => {
  const h = String(hex ?? '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(255,255,255,${a})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

export default function CrowdVerdictBar({
  ready,
  leftName,
  rightName,
  leftColor,
  rightColor,
  leftPct,
  rightPct,
  votedLeft,
  votedRight,
}: {
  ready: boolean;
  leftName: string;
  rightName: string;
  leftColor: string;
  rightColor: string;
  leftPct: number;
  rightPct: number;
  votedLeft: boolean;
  votedRight: boolean;
}) {
  const [displayLeft, setDisplayLeft] = useState(50);
  const [displayRight, setDisplayRight] = useState(50);

  const holdTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) {
      setDisplayLeft(50);
      setDisplayRight(50);
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      return;
    }

    setDisplayLeft(50);
    setDisplayRight(50);

    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      const l = clamp(leftPct);
      const r = clamp(100 - l);
      setDisplayLeft(l);
      setDisplayRight(r);
      holdTimerRef.current = null;
    }, HOLD_5050_MS);

    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    };
  }, [ready, leftPct]);

  const [tip, setTip] = useState<null | { text: string; x: number }>(null);

  const leftText = useMemo(() => `${leftName} — ${formatPct(leftPct)}`, [leftName, leftPct]);
  const rightText = useMemo(() => `${rightName} — ${formatPct(rightPct)}`, [rightName, rightPct]);

  const timing = 'cubic-bezier(0.4, 0, 0.2, 1)';

  const onMoveBar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width || 1;

    const l = clamp(displayLeft);
    const r = clamp(100 - l);

    let side: 'left' | 'right' = 'left';

    if (l <= 0.01) {
      side = x <= EDGE_HIT_PX ? 'left' : 'right';
    } else if (r <= 0.01) {
      side = x >= w - EDGE_HIT_PX ? 'right' : 'left';
    } else {
      const boundary = (l / 100) * w;
      side = x < boundary ? 'left' : 'right';
    }

    setTip({ text: side === 'left' ? leftText : rightText, x: Math.max(0, Math.min(w, x)) });
  };

  const onLeave = () => setTip(null);

  return (
    <div style={{ position: 'relative' }} onMouseLeave={onLeave}>
      {tip && (
        <div
          style={{
            position: 'absolute',
            top: -34,
            left: tip.x,
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.86)',
            border: '1px solid rgba(255,214,102,0.35)',
            boxShadow: '0 14px 28px rgba(0,0,0,0.55)',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {tip.text}
        </div>
      )}

      <div
        onMouseMove={onMoveBar}
        style={{
          width: '100%',
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.35)',
          boxShadow: '0 10px 22px rgba(0,0,0,0.32)',
          position: 'relative',
          cursor: ready ? 'default' : 'default',
        }}
        aria-hidden
      >
        <div style={{ display: 'flex', height: 22 }}>
          <div
            style={{
              width: `${displayLeft}%`,
              background: hexToRgba(leftColor, votedLeft ? 0.82 : 0.42),
              boxShadow: `inset 0 0 0 1px ${hexToRgba(leftColor, votedLeft ? 0.55 : 0.22)}`,
              transitionProperty: 'width, background',
              transitionDuration: `${ANIMATE_WIDTH ? ANIM_MS : 0}ms, 160ms`,
              transitionTimingFunction: `${timing}, ${timing}`,
            }}
          />
          <div
            style={{
              width: `${displayRight}%`,
              background: hexToRgba(rightColor, votedRight ? 0.82 : 0.42),
              boxShadow: `inset 0 0 0 1px ${hexToRgba(rightColor, votedRight ? 0.55 : 0.22)}`,
              transitionProperty: 'width, background',
              transitionDuration: `${ANIMATE_WIDTH ? ANIM_MS : 0}ms, 160ms`,
              transitionTimingFunction: `${timing}, ${timing}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
