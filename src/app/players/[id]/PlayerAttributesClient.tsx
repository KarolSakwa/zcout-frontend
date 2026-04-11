'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Tooltip from '@/components/Tooltip';
import AttributeIcon from '@/components/AttributeIcon';
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
  your_rating_updated_at?: string | null;
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

function pctFromConfidence(c: number) {
  return Math.max(0, Math.min(100, Math.round(Number(c) || 0)));
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

function getAttributeSnapshot(attribute: PlayerProfileAttribute) {
  return JSON.stringify({
    rating: Math.round(attribute.rating),
    your_rating: attribute.your_rating,
    trend_7d: attribute.trend_7d,
  });
}

function AttributeColumn({
  items,
  justUpdatedIds,
}: {
  items: AttributeDisplayItem[];
  justUpdatedIds: number[];
}) {
  return (
    <div className={styles.attributeColumn}>
      {items.map((item) => {
        if (item.type === 'header') {
          return (
            <div key={item.id} className={styles.attributePanelHeader}>
              {item.title}
            </div>
          );
        }

        const attr = item.attribute;
        const userRating = getUserAttributeRating(attr);
        const delta7d = getAttributeDelta7d(attr);
        const hasDelta = delta7d != null && Math.abs(delta7d) > 0.001;
        const confidencePct = pctFromConfidence(attr.confidence);

        return (
          <div
            key={item.id}
            className={[
              styles.attributeRow,
              justUpdatedIds.includes(attr.id) ? styles.attributeRowJustUpdated : '',
            ].join(' ')}
          >
            <div className={styles.attributeLead}>
              <AttributeIcon
                attributeKey={attr.key}
                label={attr.label}
                size={18}
                className={styles.attributeIcon}
              />
              <div className={styles.attributeName}>{attr.label}</div>
            </div>

            <div className={styles.attributeStatGroup}>
              <div className={styles.attributeYouSlot}>
                {userRating != null ? (
                  <>
                    <span className={styles.attributeYouValue}>
                      <span className={styles.attributeYouLabel}>you:</span>{' '}
                      <span className={styles.attributeYouRating}>{userRating}</span>
                    </span>
                    <div className={styles.attributeYouDivider} aria-hidden="true" />
                  </>
                ) : null}
              </div>

              <div className={styles.attributeRatingWrap}>
                <span className={styles.attributeRating}>{Math.round(attr.rating)}</span>

                {hasDelta ? (
                  <Tooltip
                    content={
                      <>
                        Last 7 days:{' '}
                        <span className="ratingValue">{formatSignedTwoDecimals(delta7d)}</span>
                      </>
                    }
                    side="top"
                    align="end"
                  >
                    <span
                      className={[
                        styles.attributeDelta,
                        styles.infoHover,
                        delta7d > 0 ? styles.attributeDeltaUp : styles.attributeDeltaDown,
                        getDeltaToneClass(delta7d),
                      ].join(' ')}
                      aria-label={`Last 7 days ${formatSignedTwoDecimals(delta7d)}`}
                    >
                      {delta7d > 0 ? '↑' : '↓'}
                    </span>
                  </Tooltip>
                ) : null}

                <div
                  className={styles.attributeConfidenceBar}
                  aria-label={`Confidence ${confidencePct}%`}
                >
                  <div
                    className={styles.attributeConfidenceFill}
                    style={{ height: `${confidencePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PlayerAttributesClient({
  attributeColumns,
  isGoalkeeper,
}: {
  attributeColumns: AttributeDisplayItem[][];
  isGoalkeeper: boolean;
}) {
  const [justUpdatedIds, setJustUpdatedIds] = useState<number[]>([]);
  const prevSnapshotsRef = useRef<Record<number, string>>({});

  const flatAttributes = useMemo(
    () =>
      attributeColumns
        .flat()
        .filter(
          (item): item is Extract<AttributeDisplayItem, { type: 'attribute' }> =>
            item.type === 'attribute'
        )
        .map((item) => item.attribute),
    [attributeColumns]
  );

  useEffect(() => {
    const nextSnapshots: Record<number, string> = Object.fromEntries(
      flatAttributes.map((attribute) => [attribute.id, getAttributeSnapshot(attribute)])
    );

    const prevSnapshots = prevSnapshotsRef.current;

    if (Object.keys(prevSnapshots).length === 0) {
      prevSnapshotsRef.current = nextSnapshots;
      return;
    }

    const changedIds = flatAttributes
      .filter((attribute) => prevSnapshots[attribute.id] !== nextSnapshots[attribute.id])
      .map((attribute) => attribute.id);

    prevSnapshotsRef.current = nextSnapshots;

    if (changedIds.length === 0) return;

    setJustUpdatedIds(changedIds);

    const timeout = window.setTimeout(() => {
      setJustUpdatedIds([]);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [flatAttributes]);

  return (
    <section className={styles.attributesCard}>
      <div
        className={styles.attributesColumns}
        style={
          isGoalkeeper
            ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
            : undefined
        }
      >
        {attributeColumns.map((columnItems, index) => (
          <AttributeColumn
            key={`column-${index}`}
            items={columnItems}
            justUpdatedIds={justUpdatedIds}
          />
        ))}
      </div>
    </section>
  );
}