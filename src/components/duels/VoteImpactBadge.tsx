import {
  formatSignedDelta,
  getTrendDirection,
  TREND_ZERO_EPSILON,
} from '@/lib/trends';
import styles from './VoteImpactBadge.module.css';

export type VoteImpactBadgeProps = {
  delta: number;
  playerName?: string;
  className?: string;
};

function buildAriaLabel(delta: number): string {
  const magnitude = Math.abs(delta).toFixed(2);
  const direction = getTrendDirection(delta);

  if (direction === 'up') {
    return `Your vote increased the rating by ${magnitude}`;
  }

  if (direction === 'down') {
    return `Your vote decreased the rating by ${magnitude}`;
  }

  return 'Your vote did not change the displayed rating';
}

export default function VoteImpactBadge({
  delta,
  playerName,
  className,
}: VoteImpactBadgeProps) {
  const finiteDelta = Number.isFinite(delta) ? delta : 0;
  const abs = Math.abs(finiteDelta);
  const tone =
    abs <= TREND_ZERO_EPSILON
      ? 'neutral'
      : finiteDelta > 0
        ? 'positive'
        : 'negative';

  const rootClassName = [styles.root, className].filter(Boolean).join(' ');
  const ariaLabel = playerName
    ? buildAriaLabel(finiteDelta).replace(
        'the rating',
        `${playerName}'s rating`,
      )
    : buildAriaLabel(finiteDelta);

  return (
    <span
      className={rootClassName}
      data-tone={tone}
      aria-label={ariaLabel}
    >
      {formatSignedDelta(finiteDelta)}
    </span>
  );
}
