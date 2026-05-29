'use client';

import { useEffect, useState } from 'react';
import Tooltip from '@/components/Tooltip';
import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import { getRatingColor } from '@/lib/ratings';
import { attributeDescriptions } from '@/lib/attributeDescriptions';
import styles from './page.module.css';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: 'technical' | 'mental' | 'physical' | string;
  rating: number;
  confidence: number;
  rating_weight_sum?: number;
  confidence_weight_sum?: number;
  votes_count: number;
  last_vote_at: string | null;
  your_rating: number | null;
  trend_7d: number | null;
};

type AttributeDisplayItem =
  | {
      type: 'header';
      id: string;
      title: string;
    }
  | {
      type: 'attribute';
      id: string;
      attribute: PlayerProfileAttribute;
    };

type PendingRatingsMap = Record<number, number>;

type ScoutReportSavingDetail = {
  playerId: number;
  ratings: PendingRatingsMap;
};

type ScoutReportSavedDetail = {
  playerId: number;
  ratings: PendingRatingsMap;
};

type ScoutReportFailedDetail = {
  playerId: number;
};

const SAVE_REVEAL_DELAY_MS = 500;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeRating(r: number) {
  const v = Number(r);

  if (!Number.isFinite(v)) return 0;

  return clamp(v, 0, 99);
}

function getUserAttributeRating(attribute: PlayerProfileAttribute): number | null {
  return attribute.your_rating;
}

function getAttributeDelta7d(attribute: PlayerProfileAttribute): number | null {
  return attribute.trend_7d;
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

function formatSignedTwoDecimals(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';

  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatTwoDecimals(value: number) {
  const n = Number(value);

  if (!Number.isFinite(n)) return '0.00';

  return n.toFixed(2);
}

function AnimatedCrowdRating({
  rating,
  confidence,
  shouldAnimate = false,
}: {
  rating: number;
  confidence: number;
  shouldAnimate?: boolean;
}) {
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [displayRating, setDisplayRating] = useState(rating);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayRating(rating);
      return;
    }

    if (displayRating === rating) {
      return;
    }

    setPhase('out');

    const swapTimeoutId = window.setTimeout(() => {
      setDisplayRating(rating);
      setPhase('in');
    }, 220);

    const resetTimeoutId = window.setTimeout(() => {
      setPhase('idle');
    }, 1120);

    return () => {
      window.clearTimeout(swapTimeoutId);
      window.clearTimeout(resetTimeoutId);
    };
  }, [rating, displayRating, shouldAnimate]);

  return (
    <div
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
        rating={Math.round(normalizeRating(displayRating))}
        confidence={confidence}
        fontSize={15}
        scalePx={15}
        decimals={0}
        align="end"
        expand={false}
        ratingColor={getRatingColor(displayRating)}
        ratingTooltipContent={
          <>
            Crowd rating:{' '}
            <span className="ratingValue">
              {formatTwoDecimals(displayRating)}
            </span>
          </>
        }
      />
    </div>
  );
}

function AttributeColumn({
  items,
  savingRatings,
  shouldAnimateRatings,
}: {
  items: AttributeDisplayItem[];
  savingRatings: PendingRatingsMap;
  shouldAnimateRatings: boolean;
}) {
  return (
    <div className={styles.attributeColumn}>
      {items.map((item) => {
        if (item.type === 'header') {
          return (
            <div
              key={item.id}
              className={styles.attributePanelHeader}
            >
              {item.title}
            </div>
          );
        }

        const attr = item.attribute;

        const pendingUserRating = savingRatings[attr.id];

        const userRating = pendingUserRating ?? getUserAttributeRating(attr);

        const isSaving = Object.prototype.hasOwnProperty.call(
          savingRatings,
          attr.id
        );

        const delta7d = getAttributeDelta7d(attr);

        const hasDelta =
          delta7d != null && Math.abs(delta7d) > 0.001;

        return (
          <div
            key={item.id}
            className={styles.attributeRow}
          >
            <Tooltip
              content={attributeDescriptions[attr.key] ?? ''}
            >
              <div
                className={styles.attributeLead}
                style={{ cursor: 'help' }}
              >
                <AttributeIcon
                  attributeKey={attr.key}
                  label={attr.label}
                  size={18}
                  className={styles.attributeIcon}
                />

                <div className={styles.attributeName}>
                  {attr.label}
                </div>
              </div>
            </Tooltip>

            <div className={styles.attributeStatGroup}>
              <div className={styles.attributeYouSlot}>
                {userRating != null ? (
                  <>
                    <span className={styles.attributeYouValue}>
                      <span className={styles.attributeYouLabel}>
                        you:
                      </span>{' '}

                      <span
                        className={styles.attributeYouRating}
                        style={
                          !isSaving && userRating != null
                            ? {
                                color: getRatingColor(userRating),
                              }
                            : undefined
                        }
                      >
                        {isSaving ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            aria-label="Saving your rating"
                          >
                            <span
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '999px',
                                background:
                                  'var(--ui-accent-primary)',
                                opacity: 0.35,
                                animation:
                                  'zcoutSearchDot 1s ease-in-out infinite',
                              }}
                            />

                            <span
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '999px',
                                background:
                                  'var(--ui-accent-primary)',
                                opacity: 0.35,
                                animation:
                                  'zcoutSearchDot 1s ease-in-out 0.18s infinite',
                              }}
                            />

                            <span
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: '999px',
                                background:
                                  'var(--ui-accent-primary)',
                                opacity: 0.35,
                                animation:
                                  'zcoutSearchDot 1s ease-in-out 0.36s infinite',
                              }}
                            />
                          </span>
                        ) : (
                          userRating
                        )}
                      </span>
                    </span>

                    <div
                      className={styles.attributeYouDivider}
                      aria-hidden="true"
                    />
                  </>
                ) : null}
              </div>

              <div className={styles.attributeMetricCluster}>
                <div className={styles.attributeDeltaSlot}>
                  {hasDelta ? (
                    <Tooltip
                      content={
                        <>
                          Last 7 days:{' '}
                          <span className="ratingValue">
                            {formatSignedTwoDecimals(delta7d)}
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
                          delta7d > 0
                            ? styles.attributeDeltaUp
                            : styles.attributeDeltaDown,
                          getDeltaToneClass(delta7d),
                        ].join(' ')}
                        aria-label={`Last 7 days ${formatSignedTwoDecimals(
                          delta7d
                        )}`}
                      >
                        {delta7d > 0 ? '↑' : '↓'}
                      </span>
                    </Tooltip>
                  ) : null}
                </div>

                <AnimatedCrowdRating
                  rating={attr.rating}
                  confidence={attr.confidence}
                  shouldAnimate={shouldAnimateRatings}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PlayerAttributesSectionProps = {
  playerId: number;
  attributeColumns: AttributeDisplayItem[][];
  isGoalkeeper: boolean;
  shouldAnimateRatings?: boolean;
};

export default function PlayerAttributesSection({
  playerId,
  attributeColumns,
  isGoalkeeper,
  shouldAnimateRatings = false,
}: PlayerAttributesSectionProps) {
  const [savingRatings, setSavingRatings] =
    useState<PendingRatingsMap>({});

  useEffect(() => {
    setSavingRatings({});
  }, [playerId]);

  useEffect(() => {
    const handleSaving = (event: Event) => {
      const detail =
        (event as CustomEvent<ScoutReportSavingDetail>).detail;

      if (!detail || detail.playerId !== playerId) {
        return;
      }

      setSavingRatings(detail.ratings ?? {});
    };

    const handleSaved = (event: Event) => {
      const detail =
        (event as CustomEvent<ScoutReportSavedDetail>).detail;

      if (!detail || detail.playerId !== playerId) {
        return;
      }

      window.setTimeout(() => {
        setSavingRatings({});
      }, SAVE_REVEAL_DELAY_MS);
    };

    const handleFailed = (event: Event) => {
      const detail =
        (event as CustomEvent<ScoutReportFailedDetail>).detail;

      if (!detail || detail.playerId !== playerId) {
        return;
      }

      setSavingRatings({});
    };

    window.addEventListener(
      'zcout:scout-report-saving',
      handleSaving as EventListener
    );

    window.addEventListener(
      'zcout:scout-report-saved',
      handleSaved as EventListener
    );

    window.addEventListener(
      'zcout:scout-report-failed',
      handleFailed as EventListener
    );

    return () => {
      window.removeEventListener(
        'zcout:scout-report-saving',
        handleSaving as EventListener
      );

      window.removeEventListener(
        'zcout:scout-report-saved',
        handleSaved as EventListener
      );

      window.removeEventListener(
        'zcout:scout-report-failed',
        handleFailed as EventListener
      );
    };
  }, [playerId]);

  return (
    <section className={styles.attributesCard}>
      <div
        className={styles.attributesColumns}
        style={
          isGoalkeeper
            ? {
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
              }
            : undefined
        }
      >
        {attributeColumns.map((columnItems, index) => (
          <AttributeColumn
            key={`column-${index}`}
            items={columnItems}
            savingRatings={savingRatings}
            shouldAnimateRatings={shouldAnimateRatings}
          />
        ))}
      </div>
    </section>
  );
}