'use client';

import Tooltip from '@/components/Tooltip';
import {
  getProgressDisplayValue,
  getProgressRatio,
} from '@/lib/scoutingProgressHelpers';
import {
  getScoutingProgressAriaLabel,
  getScoutingProgressTooltip,
} from '@/lib/scoutingUiCopy';
import type { ScoutingProgress } from '@/lib/scoutingTypes';
import ScoutingLockIcon from './ScoutingLockIcon';
import { useScoutingProgress } from './ScoutingProgressProvider';
import styles from './ScoutingProgressBar.module.css';

export type ScoutingProgressBarProps = {
  variant?: 'default' | 'compact' | 'dropdown';
  /** Compact only: fixed caps at 220px; fluid fills the parent slot (homepage cards span). */
  compactLayout?: 'fixed' | 'fluid';
  className?: string;
  progressOverride?: ScoutingProgress | null;
  statusOverride?: 'loading' | 'ready' | 'error';
};

export function shouldRenderScoutingProgressBar(
  status: 'loading' | 'ready' | 'error',
  progress: ScoutingProgress | null,
): boolean {
  return status === 'ready' && progress != null;
}

export default function ScoutingProgressBar({
  variant = 'default',
  compactLayout = 'fixed',
  className,
  progressOverride,
  statusOverride,
}: ScoutingProgressBarProps) {
  const context = useScoutingProgress();
  const status = statusOverride ?? context.status;
  const progress = progressOverride ?? context.progress;

  if (!shouldRenderScoutingProgressBar(status, progress) || !progress) {
    return null;
  }

  const ratio = getProgressRatio(progress);
  const displayValue = getProgressDisplayValue(progress);
  const ariaLabel = getScoutingProgressAriaLabel(progress);
  const tooltip = getScoutingProgressTooltip(progress);

  const compactFluid =
    variant === 'compact' && compactLayout === 'fluid';

  const bar = (
    <div
      className={[
        styles.root,
        variant === 'default' ? styles.rootDefault : '',
        variant === 'compact' ? styles.rootCompact : '',
        compactFluid ? styles.rootCompactFluid : '',
        variant === 'dropdown' ? styles.rootDropdown : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={ariaLabel}
      data-scouting-progress-bar
      data-scouting-progress-variant={variant}
    >
      <span className={styles.lock}>
        <ScoutingLockIcon size={variant === 'dropdown' ? 11 : 12} />
      </span>
      <div className={styles.trackSlot}>
        <div
          className={[
            styles.track,
            variant === 'dropdown' ? styles.trackDropdown : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
          data-scouting-progress-track
        >
          <div
            className={styles.fill}
            style={{ width: `${ratio * 100}%` }}
            data-scouting-progress-fill
          />
        </div>
      </div>
      <span
        className={[
          styles.counter,
          variant === 'dropdown' ? styles.counterDropdown : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        {displayValue}
      </span>
    </div>
  );

  if (variant === 'dropdown') {
    return bar;
  }

  const hostClass = [
    styles.host,
    variant === 'default' ? styles.hostDefault : '',
    variant === 'compact' ? styles.hostCompact : '',
    compactFluid ? styles.hostCompactFluid : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={hostClass}>
      <Tooltip content={tooltip}>{bar}</Tooltip>
    </div>
  );
}
