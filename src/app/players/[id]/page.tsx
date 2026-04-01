export const dynamic = 'force-dynamic';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import styles from './page.module.css';
import PlayerRadarChart from './PlayerRadarChart';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import { formatOverall, getRatingColor } from '@/lib/ratings';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: 'technical' | 'mental' | 'physical' | string;
  rating: number;
  confidence: number;
  weight_sum: number;
  votes_count: number;
  last_vote_at: string | null;
};

type PlayerRadarAxis = {
  key: string;
  label: string;
  attribute_keys: string[];
  value: number;
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
  radar_axes: PlayerRadarAxis[];
  attributes: PlayerProfileAttribute[];
  overall: number | null;
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

const GK_GOALKEEPING_ORDER = [
  'gk_reflexes',
  'gk_one_on_ones',
  'gk_handling',
  'gk_command_of_area',
  'passing',
  'gk_throwing',
  'gk_rushing_out',
  'gk_eccentricity',
] as const;

const GK_MENTAL_ORDER = [
  'leadership',
  'concentration',
  'composure',
] as const;

const GK_PHYSICAL_ORDER = [
  'pace',
  'acceleration',
  'strength',
  'agility',
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
        const confidencePct = pctFromConfidence(attr.confidence);

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
                    <span className={styles.attributeYouValue}>
                      <span className={styles.attributeYouLabel}>you:</span>{' '}
                      <span className={styles.attributeYouRating}>{userRating}</span>
                    </span>
                    <div className={styles.attributeYouDivider} aria-hidden="true" />
                  </>
                ) : null}
              </div>

              <div className={styles.attributeMetricCluster}>
                <div className={styles.attributeDeltaSlot}>
                  {hasDelta ? (
                    <Tooltip
                      content={<>Last 7 days: <span className="ratingValue">{formatSignedTwoDecimals(delta7d)}</span></>}
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
                        aria-label={`Last 7 days ${formatSignedTwoDecimals(delta7d)}`}
                      >
                        {delta7d > 0 ? '↑' : '↓'}
                      </span>
                    </Tooltip>
                  ) : null}
                </div>

                <RatingWithConfidence
                  rating={Math.round(normalizeRating(attr.rating))}
                  confidence={attr.confidence}
                  fontSize={15}
                  scalePx={15}
                  decimals={0}
                  align="end"
                  expand={false}
                  ratingColor={getRatingColor(attr.rating)}
                  ratingTooltipContent={
                    <>
                      Crowd rating: <span className="ratingValue">{formatTwoDecimals(attr.rating)}</span>
                    </>
                  }
                />
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

  const radarData = data.radar_axes.map((axis) => ({
    key: axis.key,
    label: axis.label,
    value: axis.value,
  }));

  const age = calcAge(data.date_of_birth);
  const overall = formatOverall(data.overall, 'rounded');
  const overallExact = formatOverall(data.overall, 'exact');
  const overallDelta7d = MOCK_OVERALL_DELTA_7D;
  const hasOverallDelta = Math.abs(overallDelta7d) > 0.001;
  const overallConfidencePct = pctFromConfidence(data.overall_confidence);
  const isGoalkeeper = data.position?.toUpperCase() === 'GK';

  const goalkeeping = pickAttrsByKeys(data.attributes, GK_GOALKEEPING_ORDER);
  const gkMental = pickAttrsByKeys(data.attributes, GK_MENTAL_ORDER);
  const gkPhysical = pickAttrsByKeys(data.attributes, GK_PHYSICAL_ORDER);

  const technical = pickAttrsByKeys(data.attributes, LEFT_COLUMN_ORDER);
  const mental = pickAttrsByKeys(data.attributes, MENTAL_ORDER);
  const physical = pickAttrsByKeys(data.attributes, PHYSICAL_ORDER);

  const attributeSections = isGoalkeeper
    ? [
        { title: 'Goalkeeping', items: goalkeeping },
        { title: 'Mental', items: gkMental },
        { title: 'Physical', items: gkPhysical },
      ]
    : [
        { title: 'Technical', items: technical },
        { title: 'Mental', items: mental },
        { title: 'Physical', items: physical },
      ];

  const attributeColumns = buildAttributeColumns(
    attributeSections,
    isGoalkeeper ? 2 : 3
  );

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageInner}>
        <div className={styles.profileFrame}>
          <button
            type="button"
            className={`${styles.profileNav} ${styles.profileNavLeft}`}
            aria-label="Previous player"
          >
            ‹
          </button>

          <div className={styles.profileContent}>
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
                                content={<>Last 7 days: <span className="ratingValue">{formatSignedTwoDecimals(overallDelta7d)}</span></>}
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
                                  aria-label={`Last 7 days ${formatSignedTwoDecimals(overallDelta7d)}`}
                                >
                                  {overallDelta7d > 0 ? '↑' : '↓'}
                                </span>
                              </Tooltip>
                            ) : null}
                          </div>

                          <RatingWithConfidence
                            rating={overall}
                            confidence={data.overall_confidence}
                            fontSize="clamp(3.3rem, 5.3vw, 4.85rem)"
                            scalePx={62}
                            decimals={0}
                            align="end"
                            expand={false}
                            ratingColor={getRatingColor(data.overall)}
                            ratingTooltipContent={
                              <>
                                Crowd rating: <span className="ratingValue">{overallExact}</span>
                              </>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.topCardRight}>
                    <div className={styles.radarPlaceholder} aria-label="Player radar chart">
                      <PlayerRadarChart data={radarData} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

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
                  <AttributeColumn key={`column-${index}`} items={columnItems} />
                ))}
              </div>
            </section>
          </div>

          <button
            type="button"
            className={`${styles.profileNav} ${styles.profileNavRight}`}
            aria-label="Next player"
          >
            ›
          </button>
        </div>
      </div>
    </main>
  );
}