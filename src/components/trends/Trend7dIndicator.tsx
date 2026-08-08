'use client';

import type { ReactNode } from 'react';
import Tooltip from '@/components/Tooltip';
import {
  formatSignedDelta,
  formatTrendMagnitude,
  getTrendDirection,
  getTrendIntensityLevel,
  type TrendDomain,
} from '@/lib/trends';
import styles from './Trend7dIndicator.module.css';

export type Trend7dIndicatorProps = {
  delta: number | null | undefined;
  domain: TrendDomain;
  variant: 'iconOnly' | 'iconAndValue';
  className?: string;
  emptyFallback?: ReactNode;
};

function buildAriaLabel(delta: number, direction: 'up' | 'down'): string {
  const magnitude = formatTrendMagnitude(delta);

  if (direction === 'up') {
    return `Rating increased by ${magnitude} over the last 7 days`;
  }

  return `Rating decreased by ${magnitude} over the last 7 days`;
}

export default function Trend7dIndicator({
  delta,
  domain,
  variant,
  className,
  emptyFallback = null,
}: Trend7dIndicatorProps) {
  if (delta == null || !Number.isFinite(delta)) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  const direction = getTrendDirection(delta);
  const intensity = getTrendIntensityLevel(delta, domain);

  if (direction === 'neutral' || intensity == null) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  const arrow = direction === 'up' ? '↑' : '↓';
  const ariaLabel = buildAriaLabel(delta, direction);
  const tooltipContent = (
    <>
      Last 7 days:{' '}
      <span className="ratingValue">{formatSignedDelta(delta)}</span>
    </>
  );

  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  const content =
    variant === 'iconAndValue' ? (
      <>
        <span className={styles.arrow} aria-hidden="true">
          {arrow}
        </span>
        <span className={styles.value}>{formatTrendMagnitude(delta)}</span>
      </>
    ) : (
      <span className={styles.arrow} aria-hidden="true">
        {arrow}
      </span>
    );

  return (
    <Tooltip content={tooltipContent} side="top" align="end">
      <span
        className={rootClassName}
        data-direction={direction}
        data-intensity={intensity}
        data-variant={variant}
        aria-label={ariaLabel}
      >
        {content}
      </span>
    </Tooltip>
  );
}
