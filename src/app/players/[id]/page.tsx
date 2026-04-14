export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import styles from './page.module.css';
import PlayerRadarChart from './PlayerRadarChart';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import { formatOverall, getRatingColor } from '@/lib/ratings';
import ScoutReportTrigger from './ScoutReportTrigger';
import { headers } from 'next/headers';
import PlayerAttributesSection from './PlayerAttributesSection';
import PlayerOverallRating from './PlayerOverallRating';
import PlayerProfileTelemetry from './PlayerProfileTelemetry';

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
  your_rating: number | null;
  trend_7d: number | null;
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
  overall_trend_7d: number | null;
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

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
  const { id } = await params;
  const incomingHeaders = await headers();
  const cookie = incomingHeaders.get('cookie') ?? '';
  const origin = process.env.APP_ORIGIN || 'http://localhost:3000';

  const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: origin,
      Referer: `${origin}/`,
      'X-Requested-With': 'XMLHttpRequest',
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
  const overallDelta7d = data.overall_trend_7d;
  const hasOverallDelta =
    overallDelta7d != null && Math.abs(overallDelta7d) > 0.001;
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

  const scoutReportAttributes = (
    isGoalkeeper
      ? [...goalkeeping, ...gkMental, ...gkPhysical]
      : [...technical, ...mental, ...physical]
  ).slice(0, 6);

  return (
    <main className={styles.pageShell}>
      <PlayerProfileTelemetry playerId={data.id} />

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

                <ScoutReportTrigger
                  playerId={data.id}
                  playerName={data.name}
                  playerPosition={data.position}
                  clubName={data.club?.name ?? null}
                  attributes={scoutReportAttributes}
                  className={styles.topCardReport}
                />
              </div>

              <div className={styles.topCardMain}>
                <div className={styles.topCardGrid}>
                  <div className={styles.topCardLeft}>
                    <div className={styles.topCardIdentity}>
                      <h1 className={styles.playerName}>
                        {data.number != null ? (
                          <span className={styles.playerNumberInline}>
                            #{data.number}
                          </span>
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
                        <PlayerOverallRating
                          overall={overall}
                          overallConfidence={data.overall_confidence}
                          overallExact={overallExact}
                          overallDelta7d={overallDelta7d}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.topCardRight}>
                    <div
                      className={styles.radarPlaceholder}
                      aria-label="Player radar chart"
                    >
                      <PlayerRadarChart data={radarData} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <PlayerAttributesSection
              playerId={data.id}
              attributeColumns={attributeColumns}
              isGoalkeeper={isGoalkeeper}
            />
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