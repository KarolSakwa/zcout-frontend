'use client';

import { useEffect, useState } from 'react';
import Tooltip from '@/components/Tooltip';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import { getRatingColor } from '@/lib/ratings';
import styles from './page.module.css';

type PlayerOverallRatingProps = {
  overall: number | string;
  overallConfidence: number;
  overallExact: string;
  overallDelta7d: number | null;
  shouldAnimate?: boolean;
};

function formatSignedTwoDecimals(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function getDeltaToneClass(delta: number) {
  const absDelta = Math.abs(delta);

  if (absDelta >= 0.9) {
    return styles.attributeDeltaStrong;
  }

  if (absDelta >= 0.45) {
    return styles.attributeDeltaMedium;
  }

  return styles.attributeDeltaSoft;
}

function toNumericOverall(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function AnimatedOverallMetric({
  overall,
  overallConfidence,
  overallExact,
  shouldAnimate = false,
}: {
  overall: number | string;
  overallConfidence: number;
  overallExact: string;
  shouldAnimate?: boolean;
}) {
  const numericOverall = toNumericOverall(overall);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [displayOverall, setDisplayOverall] = useState(numericOverall);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayOverall(numericOverall);
      return;
    }

    if (displayOverall === numericOverall) {
      return;
    }

    setPhase('out');

    const swapTimeoutId = window.setTimeout(() => {
      setDisplayOverall(numericOverall);
      setPhase('in');
    }, 220);

    const resetTimeoutId = window.setTimeout(() => {
      setPhase('idle');
    }, 1120);

    return () => {
      window.clearTimeout(swapTimeoutId);
      window.clearTimeout(resetTimeoutId);
    };
  }, [numericOverall, displayOverall]);

  return (
    <div
      className={styles.overallMetric}
      style={{
        opacity: phase === 'out' ? 0.12 : 1,
        transform:
          phase === 'out'
            ? 'translateY(2px) scale(0.975)'
            : phase === 'in'
              ? 'translateY(-2px) scale(1.045)'
              : 'translateY(0) scale(1)',
        transition:
          phase === 'out'
            ? 'opacity 220ms ease-out, transform 220ms ease-out'
            : 'opacity 900ms ease-out, transform 900ms ease-out',
      }}
    >
      <RatingWithConfidence
        rating={displayOverall}
        confidence={overallConfidence}
        fontSize="clamp(3.3rem, 5.3vw, 4.85rem)"
        scalePx={62}
        decimals={0}
        align="end"
        expand={false}
        ratingColor={getRatingColor(displayOverall)}
        ratingTooltipContent={
          <>
            Crowd rating: <span className="ratingValue">{overallExact}</span>
          </>
        }
      />
    </div>
  );
}

export default function PlayerOverallRating({
  overall,
  overallConfidence,
  overallExact,
  overallDelta7d,
  shouldAnimate = false,
}: PlayerOverallRatingProps) {
  const hasOverallDelta = overallDelta7d != null && Math.abs(overallDelta7d) > 0.001;

  return (
    <div className={styles.overallMetricCluster}>
      <div className={styles.overallDeltaSlot}>
        {hasOverallDelta ? (
          <Tooltip
            content={
              <>
                Last 7 days:{' '}
                <span className="ratingValue">
                  {formatSignedTwoDecimals(overallDelta7d)}
                </span>
              </>
            }
            side="top"
            align="end"
          >
            <span
              className={[
                styles.attributeDelta,
                styles.infoHover,
                overallDelta7d > 0 ? styles.attributeDeltaUp : styles.attributeDeltaDown,
                getDeltaToneClass(overallDelta7d),
              ].join(' ')}
              aria-label={`Last 7 days ${formatSignedTwoDecimals(overallDelta7d)}`}
            >
              {overallDelta7d > 0 ? '↑' : '↓'}
            </span>
          </Tooltip>
        ) : null}
      </div>

      <AnimatedOverallMetric
        overall={overall}
        overallConfidence={overallConfidence}
        overallExact={overallExact}
        shouldAnimate={shouldAnimate}
      />
    </div>
  );
}