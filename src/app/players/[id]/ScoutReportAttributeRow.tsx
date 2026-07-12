'use client';

import type { CSSProperties } from 'react';
import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import Tooltip from '@/components/Tooltip';
import { getRatingColor } from '@/lib/ratings';
import { attributeDescriptions } from '@/lib/attributeDescriptions';
import type { ScoutReportAttribute } from './ScoutReportTrigger';
import styles from './ScoutReportTrigger.module.css';
import type { AttributeDraft, DraftState } from './useScoutReportDrafts';

type ScoutReportAttributeRowProps = {
  attribute: ScoutReportAttribute;
  draft: AttributeDraft;
  onVoteChange: (value: string) => void;
  onSkipToggle: () => void;
};

export default function ScoutReportAttributeRow({
  attribute,
  draft,
  onVoteChange,
  onSkipToggle,
}: ScoutReportAttributeRowProps) {
  const isSkipped = draft.state === 'skip';
  const isVoted = draft.state === 'vote' && draft.value !== '';
  const rangeValue = isVoted ? Number(draft.value) : 50;
  const sliderPercent = `${((rangeValue - 1) / 98) * 100}%`;

  const sliderStyle = {
    '--sr-slider-percent': sliderPercent,
    '--sr-slider-fill': isVoted
      ? 'var(--ui-accent-primary)'
      : 'rgba(255, 255, 255, 0.12)',
  } as CSSProperties;

  return (
    <div
      className={[
        styles.attributeCard,
        isSkipped ? styles.attributeCardSkipped : '',
      ].join(' ')}
    >
      <div className={styles.attributeRow}>
        <Tooltip content={attributeDescriptions[attribute.key] ?? ''}>
          <div className={styles.attributeLead} style={{ cursor: 'help' }}>
            <AttributeIcon
              attributeKey={attribute.key}
              label={attribute.label}
              size={18}
              className={styles.attributeIcon}
            />
            <div className={styles.attributeLabel}>{attribute.label}</div>
          </div>
        </Tooltip>

        <div className={styles.attributeSliderWrap}>
          <input
            type="range"
            min="1"
            max="99"
            value={rangeValue}
            onChange={(event) => onVoteChange(event.target.value)}
            disabled={isSkipped}
            className={styles.slider}
            style={sliderStyle}
          />

          <input
            type="number"
            min="1"
            max="99"
            inputMode="numeric"
            value={draft.state === 'vote' ? draft.value : ''}
            onChange={(event) => onVoteChange(event.target.value)}
            disabled={isSkipped}
            placeholder="1–99"
            className={styles.numberInput}
          />
        </div>

        <div className={styles.attributeScoreWrap}>
          <RatingWithConfidence
            rating={isVoted ? Number(draft.value) : null}
            confidence={null}
            showConfidence={false}
            fontSize={26}
            scalePx={26}
            decimals={0}
            align="center"
            expand={false}
            ratingColor={
              isVoted
                ? getRatingColor(Number(draft.value))
                : 'rgba(231, 231, 231, 0.66)'
            }
          />
        </div>

        <button
          type="button"
          className={[
            styles.skipButton,
            isSkipped ? styles.skipButtonActive : '',
          ].join(' ')}
          onClick={onSkipToggle}
        >
          {isSkipped ? 'Skipped' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

export function createFallbackDraft(attributeId: number): AttributeDraft {
  return {
    attributeId,
    state: 'untouched' as DraftState,
    value: '',
  };
}
