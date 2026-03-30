'use client';

import type { ReactNode } from 'react';
import Tooltip from './Tooltip';

type RatingWithConfidenceProps = {
  rating: number | string | null | undefined;
  confidence: number | null | undefined;
  fontSize?: number | string;
  scalePx?: number;
  decimals?: number;
  align?: 'start' | 'center' | 'end';
  expand?: boolean;
  ratingColor?: string;
  ratingTooltipContent?: ReactNode;
  confidenceTooltipContent?: ReactNode | false;
};

const JUSTIFY_MAP = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
} as const;

export default function RatingWithConfidence({
  rating,
  confidence,
  fontSize = 13,
  scalePx,
  decimals = 2,
  align = 'end',
  expand = true,
  ratingColor = 'var(--ui-text-primary)',
  ratingTooltipContent,
  confidenceTooltipContent,
}: RatingWithConfidenceProps) {
  const resolvedScalePx = Math.max(
    10,
    scalePx ?? (typeof fontSize === 'number' ? fontSize : 13)
  );

  const resolvedFontSize =
    typeof fontSize === 'number' ? `${fontSize}px` : fontSize;

  const gap = Math.max(4, Math.round(resolvedScalePx * 0.32));
  const barWidth = Math.max(6, Math.round(resolvedScalePx * 0.24));
  const barHeight = Math.max(14, Math.round(resolvedScalePx * 1.35));
  const normalizedConfidence = Math.max(0, Math.min(100, Number(confidence ?? 0)));
  const roundedFill = Math.round(normalizedConfidence);

  const displayRating =
    typeof rating === 'number'
      ? rating.toFixed(decimals)
      : rating == null
        ? '—'
        : String(rating);

  const resolvedConfidenceTooltipContent =
    confidenceTooltipContent === undefined
      ? `Confidence: ${normalizedConfidence.toFixed(2)}%`
      : confidenceTooltipContent;

  const ratingNode = (
    <span
      style={{
        fontFamily: 'var(--font-rating), "Segoe UI", system-ui, sans-serif',
        fontSize: resolvedFontSize,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        fontVariantNumeric: 'tabular-nums lining-nums',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        color: ratingColor,
        cursor: ratingTooltipContent ? 'help' : 'default',
      }}
    >
      {displayRating}
    </span>
  );

  const confidenceNode = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          borderRadius: '999px',
          background: 'var(--ui-surface-soft-2)',
          border: '1px solid color-mix(in srgb, white 24%, transparent)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
          cursor: resolvedConfidenceTooltipContent === false ? 'default' : 'help',
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
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: JUSTIFY_MAP[align],
        alignItems: 'center',
        gap: `${gap}px`,
        width: expand ? '100%' : 'auto',
      }}
    >
      {ratingTooltipContent ? (
        <Tooltip content={ratingTooltipContent}>
          {ratingNode}
        </Tooltip>
      ) : (
        ratingNode
      )}

      {resolvedConfidenceTooltipContent !== false ? (
        <Tooltip content={resolvedConfidenceTooltipContent}>
          {confidenceNode}
        </Tooltip>
      ) : (
        confidenceNode
      )}
    </div>
  );
}