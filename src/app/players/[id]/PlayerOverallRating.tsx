'use client';

import { useEffect, useState } from 'react';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import Trend7dIndicator from '@/components/trends/Trend7dIndicator';
import { getRatingColor } from '@/lib/ratings';
import styles from './page.module.css';

type PlayerOverallRatingProps = {
  overall: number | string;
  overallConfidence: number;
  overallExact: string;
  overallDelta7d: number | null;
  shouldAnimate?: boolean;
};

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
  return (
    <div className={styles.overallMetricCluster}>
      <div className={styles.overallDeltaSlot}>
        <Trend7dIndicator
          delta={overallDelta7d}
          domain="overall"
          variant="iconOnly"
          className={styles.attributeDelta}
        />
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
