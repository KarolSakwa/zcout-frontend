export const dynamic = 'force-dynamic';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import styles from './page.module.css';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: string;
  rating: number;
  confidence: number;
  weight_sum: number;
  votes_count: number;
  last_vote_at: string | null;
};

type PlayerProfileResponse = {
  id: number;
  name: string;
  slug: string;
  number: number | null;
  date_of_birth: string | null;
  position: string | null;
  club: {
    id: number;
    name: string;
    slug: string;
    color_primary: string | null;
    color_secondary: string | null;
    color_tertiary: string | null;
  } | null;
  country: {
    id: number;
    name: string;
    iso2: string | null;
  } | null;
  overall_confidence: number;
  attributes: PlayerProfileAttribute[];
};

type AttributeSection = {
  title: string;
  items: PlayerProfileAttribute[];
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

const LEFT_COLUMN_ORDER = [
  'ball_control',
  'dribbling',
  'finishing',
  'long_shots',
  'attacking_movement',
  'heading',
  'passing',
  'crossing',
  'creativity',
  'marking',
  'tackling',
  'interceptions',
  'penalties',
  'free_kicks',
] as const;

const MENTAL_ORDER = [
  'leadership',
  'concentration',
  'aggression',
  'composure',
  'work_rate',
] as const;

const PHYSICAL_ORDER = [
  'pace',
  'acceleration',
  'strength',
  'agility',
  'stamina',
] as const;

const MOCK_USER_ATTRIBUTE_RATINGS: Record<string, number> = {
  finishing: 81,
  passing: 76,
  interceptions: 68,
  aggression: 72,
  pace: 84,
  stamina: 79,
};

const MOCK_ATTRIBUTE_DELTAS_7D: Record<string, number> = {
  dribbling: 0.28,
  finishing: 0.98,
  passing: -0.41,
  tackling: 0.63,
  aggression: -1.12,
  pace: 0.54,
};

const MOCK_OVERALL_DELTA_7D = 0.74;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeRating(r: number) {
  const v = Number(r);
  if (!Number.isFinite(v)) return 0;
  return clamp(v, 0, 99);
}

function pctFromConfidence(c: number) {
  return clamp(Math.round(Number(c) || 0), 0, 100);
}

function calcAge(dobIso: string | null) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age < 0 ? null : age;
}

function avgOverall(attrs: PlayerProfileAttribute[]) {
  const nums = attrs.map((a) => normalizeRating(a.rating));
  if (!nums.length) return 0;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / nums.length);
}

function exactOverall(attrs: PlayerProfileAttribute[]) {
  const nums = attrs.map((a) => normalizeRating(a.rating));
  if (!nums.length) return 0;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return sum / nums.length;
}

function orderAttrsByKeys(
  attrs: PlayerProfileAttribute[],
  orderedKeys: readonly string[]
) {
  const byKey = new Map(attrs.map((attr) => [attr.key, attr]));
  return orderedKeys
    .map((key) => byKey.get(key))
    .filter((attr): attr is PlayerProfileAttribute => Boolean(attr));
}

function pickAttrsByKeys(
  attrs: PlayerProfileAttribute[],
  orderedKeys: readonly string[]
) {
  const allowed = new Set(orderedKeys);
  return orderAttrsByKeys(
    attrs.filter((attr) => allowed.has(attr.key)),
    orderedKeys
  );
}

function metricColor(value: number) {
  const rating = normalizeRating(value);

  if (rating < 70) {
    return 'var(--ui-text-primary)';
  }

  if (rating < 80) {
    const t = (rating - 70) / 10;
    const accentPct = Math.round(22 + t * 14);
    return `color-mix(in srgb, var(--ui-accent-primary) ${accentPct}%, var(--ui-text-primary))`;
  }

  if (rating < 90) {
    const t = (rating - 80) / 10;
    const accentPct = Math.round(46 + t * 20);
    return `color-mix(in srgb, var(--ui-accent-primary) ${accentPct}%, var(--ui-text-primary))`;
  }

  if (rating < 95) {
    const t = (rating - 90) / 5;
    const accentPct = Math.round(72 + t * 14);
    return `color-mix(in srgb, var(--ui-accent-primary) ${accentPct}%, white)`;
  }

  const t = (rating - 95) / 4;
  const darkPct = Math.round(10 + t * 18);
  return `color-mix(in srgb, var(--ui-accent-primary) 92%, black ${darkPct}%)`;
}

function metricStyle(value: number): CSSProperties {
  return {
    color: metricColor(value),
  };
}

function buildAttributeColumns(
  sections: AttributeSection[],
  columnCount: number
): AttributeDisplayItem[][] {
  const flatItems: AttributeDisplayItem[] = [];

  for (const section of sections) {
    flatItems.push({
      type: 'header',
      id: `header-${section.title}`,
      title: section.title,
    });

    for (const attribute of section.items) {
      flatItems.push({
        type: 'attribute',
        id: `attr-${attribute.id}`,
        attribute,
      });
    }
  }

  const totalAttributes = sections.reduce(
    (acc, section) => acc + section.items.length,
    0
  );
  const basePerColumn = Math.floor(totalAttributes / columnCount);
  const remainder = totalAttributes % columnCount;

  const capacities = Array.from({ length: columnCount }, (_, index) => {
    return basePerColumn + (index < remainder ? 1 : 0);
  });

  const columns: AttributeDisplayItem[][] = Array.from(
    { length: columnCount },
    () => []
  );
  let pointer = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const isLastColumn = columnIndex === columnCount - 1;
    const capacity = capacities[columnIndex];
    let usedAttributes = 0;

    while (pointer < flatItems.length) {
      const nextItem = flatItems[pointer];

      if (nextItem.type === 'header') {
        if (
          !isLastColumn &&
          usedAttributes >= capacity &&
          columns[columnIndex].length > 0
        ) {
          break;
        }

        columns[columnIndex].push(nextItem);
        pointer += 1;
        continue;
      }

      if (!isLastColumn && usedAttributes >= capacity) {
        break;
      }

      columns[columnIndex].push(nextItem);
      usedAttributes += 1;
      pointer += 1;
    }
  }

  return columns;
}

function getUserAttributeRating(attribute: PlayerProfileAttribute): number | null {
  return MOCK_USER_ATTRIBUTE_RATINGS[attribute.key] ?? null;
}

function getAttributeDelta7d(attribute: PlayerProfileAttribute): number | null {
  return MOCK_ATTRIBUTE_DELTAS_7D[attribute.key] ?? null;
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

function AttributeColumn({ items }: { items: AttributeDisplayItem[] }) {
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

        return (
          <div key={item.id} className={styles.attributeRow}>
            <div className={styles.attributeLead}>
              <span className={styles.attributeIcon} aria-hidden="true" />
              <div className={styles.attributeName}>{attr.label}</div>
            </div>

            <div className={styles.attributeStatGroup}>
              <div className={styles.attributeYouSlot}>
                {userRating != null ? (
                  <>
                    <div className={styles.attributeYouValue}>you: {userRating}</div>
                    <div className={styles.attributeYouDivider} aria-hidden="true" />
                  </>
                ) : null}
              </div>

              <div className={styles.attributeMetricCluster}>
                <div className={styles.attributeDeltaSlot}>
                  {hasDelta ? (
                    <Tooltip
                      content={`Weekly change: ${formatSignedTwoDecimals(delta7d)}`}
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
                        aria-label={`Weekly change ${formatSignedTwoDecimals(delta7d)}`}
                      >
                        {delta7d > 0 ? '↑' : '↓'}
                      </span>
                    </Tooltip>
                  ) : null}
                </div>

                <Tooltip
                  content={`Crowd rating: ${formatTwoDecimals(attr.rating)}`}
                  side="top"
                  align="end"
                >
                  <span
                    className={`${styles.attributeValue} ${styles.metricHover}`}
                    style={metricStyle(attr.rating)}
                    aria-label={`Crowd rating ${formatTwoDecimals(attr.rating)}`}
                  >
                    {Math.round(normalizeRating(attr.rating))}
                  </span>
                </Tooltip>

                <div
                  className={styles.attributeConfidence}
                  aria-label={`${attr.label} confidence`}
                >
                  <div
                    className={styles.attributeConfidenceFill}
                    style={{ height: `${pctFromConfidence(attr.confidence)}%` }}
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

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
  const { id } = await params;

  const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return (
      <main className={styles.pageShell}>
        <div className={styles.pageInner}>
          <div className={styles.errorText}>Failed to load: {res.status}</div>
        </div>
      </main>
    );
  }

  const data = (await res.json()) as PlayerProfileResponse;

  const age = calcAge(data.date_of_birth);
  const overall = avgOverall(data.attributes);
  const overallExact = exactOverall(data.attributes);
  const overallDelta7d = MOCK_OVERALL_DELTA_7D;
  const hasOverallDelta = Math.abs(overallDelta7d) > 0.001;

  const technical = pickAttrsByKeys(data.attributes, LEFT_COLUMN_ORDER);
  const mental = pickAttrsByKeys(data.attributes, MENTAL_ORDER);
  const physical = pickAttrsByKeys(data.attributes, PHYSICAL_ORDER);

  const attributeColumns = buildAttributeColumns(
    [
      { title: 'Technical', items: technical },
      { title: 'Mental', items: mental },
      { title: 'Physical', items: physical },
    ],
    3
  );

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageInner}>
        <section className={styles.topCard}>
          <div className={styles.topCardHeader}>
            <Link href="/database" className={styles.topCardBack}>
              ← Back
            </Link>

            <button type="button" className={styles.topCardReport}>
              Scout Report
            </button>
          </div>

          <div className={styles.topCardMain}>
            <button
              type="button"
              className={`${styles.switchRail} ${styles.switchRailLeft}`}
              aria-label="Previous player"
            >
              ‹
            </button>

            <div className={styles.topCardGrid}>
              <div className={styles.topCardLeft}>
                <div className={styles.topCardIdentity}>
                  <h1 className={styles.playerName}>
                    {data.number != null ? (
                      <span className={styles.playerNumberInline}>#{data.number}</span>
                    ) : null}
                    <span>{data.name}</span>
                  </h1>

                  <div className={styles.playerMeta}>
                    <span>{data.club?.name ?? 'No club'}</span>
                    <span className={styles.metaDot}>•</span>
                    <span>{data.position ?? 'Unknown position'}</span>
                    <span className={styles.metaDot}>•</span>
                    <span>{data.country?.name ?? 'Unknown nationality'}</span>
                    {age != null ? (
                      <>
                        <span className={styles.metaDot}>•</span>
                        <span>{age}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={styles.topCardCenter}>
                <div className={styles.overallBlock}>
                  <div className={styles.overallLabel}>OVERALL</div>

                  <div className={styles.overallRow}>
                    <div className={styles.overallMetricCluster}>
                      <div className={styles.overallDeltaSlot}>
                        {hasOverallDelta ? (
                          <Tooltip
                            content={`Weekly change: ${formatSignedTwoDecimals(overallDelta7d)}`}
                            side="top"
                            align="end"
                          >
                            <span
                              className={[
                                styles.attributeDelta,
                                styles.infoHover,
                                overallDelta7d > 0
                                  ? styles.attributeDeltaUp
                                  : styles.attributeDeltaDown,
                                getDeltaToneClass(overallDelta7d),
                              ].join(' ')}
                              aria-label={`Weekly change ${formatSignedTwoDecimals(overallDelta7d)}`}
                            >
                              {overallDelta7d > 0 ? '↑' : '↓'}
                            </span>
                          </Tooltip>
                        ) : null}
                      </div>

                      <Tooltip
                        content={`Crowd rating: ${formatTwoDecimals(overallExact)}`}
                        side="top"
                        align="end"
                      >
                        <span
                          className={`${styles.overallValue} ${styles.metricHover}`}
                          style={metricStyle(overall)}
                          aria-label={`Crowd rating ${formatTwoDecimals(overallExact)}`}
                        >
                          {overall}
                        </span>
                      </Tooltip>

                      <div
                        className={styles.overallConfidence}
                        aria-label="Overall confidence"
                      >
                        <div
                          className={styles.overallConfidenceFill}
                          style={{
                            height: `${pctFromConfidence(data.overall_confidence)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.topCardRight}>
                <div
                  className={styles.radarPlaceholder}
                  aria-label="Radar placeholder"
                >
                  <div className={styles.radarPlaceholderInner}>Radar</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className={`${styles.switchRail} ${styles.switchRailRight}`}
              aria-label="Next player"
            >
              ›
            </button>
          </div>
        </section>

        <section className={styles.attributesCard}>
          <div className={styles.attributesColumns}>
            {attributeColumns.map((columnItems, index) => (
              <AttributeColumn key={`column-${index}`} items={columnItems} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}