'use client';

import Tooltip from './Tooltip';

type RatingWithConfidenceProps = {
  rating: number | string;
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  decimals?: number;
  align?: 'start' | 'center' | 'end';
};

const SIZE_MAP = {
  sm: {
    gap: '5px',
    fontSize: '11px',
    barWidth: '4px',
    barHeight: '14px',
  },
  md: {
    gap: '6px',
    fontSize: '13px',
    barWidth: '4px',
    barHeight: '18px',
  },
  lg: {
    gap: '8px',
    fontSize: '17px',
    barWidth: '5px',
    barHeight: '24px',
  },
} as const;

const JUSTIFY_MAP = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
} as const;

export default function RatingWithConfidence({
  rating,
  confidence,
  size = 'md',
  decimals = 2,
  align = 'end',
}: RatingWithConfidenceProps) {
  const cfg = SIZE_MAP[size];
  const normalizedConfidence = Math.max(0, Math.min(100, confidence));
  const roundedFill = Math.round(normalizedConfidence);

  const displayRating =
    typeof rating === 'number' ? rating.toFixed(decimals) : rating;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: JUSTIFY_MAP[align],
        alignItems: 'center',
        gap: cfg.gap,
        width: '100%',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-rating), "Segoe UI", system-ui, sans-serif',
          fontSize: cfg.fontSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums lining-nums',
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
        }}
      >
        {displayRating}
      </span>

      <Tooltip content={`Confidence: ${normalizedConfidence.toFixed(2)}%`}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              width: cfg.barWidth,
              height: cfg.barHeight,
              borderRadius: '999px',
              background: 'var(--ui-surface-soft-2)',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
              cursor: 'help',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: `${roundedFill}%`,
                borderRadius: '999px',
                background: 'var(--ui-accent-primary)',
              }}
            />
          </span>
        </span>
      </Tooltip>
    </div>
  );
}