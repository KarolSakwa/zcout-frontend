import React, { useEffect, useMemo, useState } from 'react';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

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

const alphaColor = (color: string, a: number) => {
  const value = String(color ?? '').trim();
  if (!value) return `rgba(255,255,255,${a})`;
  if (value.startsWith('var(')) {
    return `color-mix(in srgb, ${value} ${Math.round(clamp(a, 0, 1) * 100)}%, transparent)`;
  }
  if (value.startsWith('#')) {
    return hexToRgba(value, a);
  }
  if (value.startsWith('rgb(') || value.startsWith('rgba(') || value.startsWith('hsl(') || value.startsWith('hsla(')) {
    return `color-mix(in srgb, ${value} ${Math.round(clamp(a, 0, 1) * 100)}%, transparent)`;
  }
  return `color-mix(in srgb, ${value} ${Math.round(clamp(a, 0, 1) * 100)}%, transparent)`;
};

const intensityForAbsDelta = (absDelta: number) => {
  const d = Math.abs(absDelta);
  if (d < 0.01) return { a: 0.2, glow: 0.06 };
  if (d < 0.02) return { a: 0.28, glow: 0.08 };
  if (d < 0.03) return { a: 0.36, glow: 0.1 };
  if (d < 0.05) return { a: 0.48, glow: 0.14 };
  if (d < 0.08) return { a: 0.62, glow: 0.18 };
  if (d < 0.12) return { a: 0.74, glow: 0.22 };
  if (d < 0.18) return { a: 0.84, glow: 0.28 };
  if (d < 0.24) return { a: 0.92, glow: 0.34 };
  return { a: 0.98, glow: 0.42 };
};

const formatDelta = (d: number) => {
  if (!Number.isFinite(d) || d === 0) return '0.00';
  const sign = d > 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(2)}`;
};

const baseAlphaForScore = (before: number) => {
  const v = clamp(before, 0, 100);
  if (v <= 0) return 0.1;
  if (v >= 100) return 0.28;
  const bucket = clamp(Math.floor(clamp(v, 1, 99) / 10), 0, 9);
  return 0.1 + bucket * 0.02;
};

export default function ImpactDeltaBar({
  before,
  after,
  delta,
  min = 0,
  max = 100,
  goldHex = 'var(--ui-accent-primary)',
  positiveHex = 'var(--ui-accent-success)',
  negativeHex = 'var(--ui-danger)',
  height = 10,
  animMs = 1300,
  delayMs = 333,
  timing = 'linear',
}: {
  before: number;
  after: number;
  delta: number;
  min?: number;
  max?: number;
  goldHex?: string;
  positiveHex?: string;
  negativeHex?: string;
  height?: number;
  animMs?: number;
  delayMs?: number;
  timing?: string;
}) {
  const range = Math.max(1e-9, max - min);

  const beforeClamped = clamp(before, min, max);
  const afterClamped = clamp(after, min, max);

  const pBefore = clamp(((beforeClamped - min) / range) * 100, 0, 100);
  const pAfter = clamp(((afterClamped - min) / range) * 100, 0, 100);

  const isPos = delta >= 0;
  const deltaHex = isPos ? positiveHex : negativeHex;
  const { a, glow } = intensityForAbsDelta(delta);

  const deltaFill = useMemo(() => alphaColor(deltaHex, a), [deltaHex, a]);
  const deltaGlow = useMemo(() => alphaColor(deltaHex, glow), [deltaHex, glow]);
  const deltaTextColor = useMemo(() => alphaColor(deltaHex, Math.min(0.98, a + 0.28)), [deltaHex, a]);

  const baseA = useMemo(() => baseAlphaForScore(beforeClamped), [beforeClamped]);
  const baseFill = useMemo(() => alphaColor(goldHex, baseA), [goldHex, baseA]);
  const baseStroke = useMemo(() => alphaColor(goldHex, Math.min(0.55, baseA + 0.2)), [goldHex, baseA]);

  const deltaStart = Math.min(pBefore, pAfter);
  const deltaTargetWidth = Math.abs(pAfter - pBefore);

  const [deltaWidth, setDeltaWidth] = useState(0);

  useEffect(() => {
    setDeltaWidth(0);
    if (!(deltaTargetWidth > 0)) return;

    const t = window.setTimeout(() => {
      setDeltaWidth(deltaTargetWidth);
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [deltaTargetWidth, delayMs, beforeClamped, afterClamped, delta]);

  const showDelta = deltaTargetWidth > 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 'var(--ui-radius-pill)',
          background: 'rgba(0,0,0,0.28)',
          border: '1px solid var(--ui-border-subtle)',
          overflow: 'hidden',
          boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
        }}
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${pBefore}%`,
            background: baseFill,
            boxShadow: `inset 0 0 0 1px ${baseStroke}`,
          }}
        />

        {showDelta && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${deltaStart}%`,
              width: `${deltaWidth}%`,
              minWidth: 8,
              background: deltaFill,
              boxShadow: `0 0 14px ${deltaGlow}`,
              transitionProperty: 'width',
              transitionDuration: `${animMs}ms`,
              transitionTimingFunction: timing,
              opacity: 0.98,
              animation: `zImpactPulse 900ms ease-in-out ${delayMs}ms 1 both`,
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--ui-radius-pill)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }}
        />

        <style>{`
          @keyframes zImpactPulse {
            0% { filter: saturate(1); }
            40% { filter: saturate(1.45); }
            100% { filter: saturate(1); }
          }
        `}</style>
      </div>

      <div
        style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          fontWeight: 950,
          letterSpacing: '0.01em',
          color: 'var(--ui-text-primary)',
        }}
      >
        <span style={{ color: 'var(--ui-text-muted)' }}>{beforeClamped.toFixed(2)}</span>
        <span style={{ color: 'var(--ui-text-dim)' }}>→</span>
        <span style={{ color: 'var(--ui-text-primary)' }}>{afterClamped.toFixed(2)}</span>

        <span
          style={{
            marginLeft: 4,
            padding: '2px 8px',
            borderRadius: 'var(--ui-radius-pill)',
            border: `1px solid ${alphaColor(deltaHex, 0.38)}`,
            background: alphaColor(deltaHex, 0.12),
            color: deltaTextColor,
            fontSize: 11,
            letterSpacing: '0.04em',
          }}
        >
          {formatDelta(delta)}
        </span>
      </div>

      <div
        style={{
          marginTop: 6,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
          opacity: 0.7,
        }}
        aria-hidden
      />
    </div>
  );
}