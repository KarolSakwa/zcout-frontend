export const dynamic = 'force-dynamic';

import Link from 'next/link';
import styles from './page.module.css';

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

function sortAttrs(list: PlayerProfileAttribute[]) {
  return [...list].sort((a, b) => a.label.localeCompare(b.label));
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

  const technical = sortAttrs(
    data.attributes.filter((attr) => String(attr.group).toLowerCase() === 'technical')
  );
  const mental = sortAttrs(
    data.attributes.filter((attr) => String(attr.group).toLowerCase() === 'mental')
  );
  const physical = sortAttrs(
    data.attributes.filter((attr) => String(attr.group).toLowerCase() === 'physical')
  );

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageInner}>
        <div className={styles.topCard}>
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
                <div className={styles.overallRow}>
                  <div className={styles.overallValue}>{overall}</div>

                  <div
                    className={styles.overallConfidencePlaceholder}
                    aria-label="Overall confidence"
                  >
                    <div
                      className={styles.overallConfidenceFill}
                      style={{ height: `${pctFromConfidence(data.overall_confidence)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.topCardRight}>
              <div className={styles.radarPlaceholder} aria-label="Radar placeholder">
                <div className={styles.radarPlaceholderInner}>Radar</div>
              </div>

              <div className={styles.topCardActions}>
                <button type="button" className={styles.primaryAction}>
                  Scout Report
                </button>

                <Link href="/database" className={styles.secondaryAction}>
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className={styles.attributesCard}>
          <div className={styles.attributesGrid}>
            <section className={styles.attributePanel}>
              <div className={styles.attributePanelHeader}>Technical</div>

              <div className={styles.attributeList}>
                {technical.map((attr) => (
                  <div key={attr.id} className={styles.attributeRow}>
                    <div className={styles.attributeName}>{attr.label}</div>
                    <div className={styles.attributeValue}>
                      {Math.round(normalizeRating(attr.rating))}
                    </div>
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
                ))}
              </div>
            </section>

            <div className={styles.attributesRightColumn}>
              <section className={styles.attributePanel}>
                <div className={styles.attributePanelHeader}>Mental</div>

                <div className={styles.attributeList}>
                  {mental.map((attr) => (
                    <div key={attr.id} className={styles.attributeRow}>
                      <div className={styles.attributeName}>{attr.label}</div>
                      <div className={styles.attributeValue}>
                        {Math.round(normalizeRating(attr.rating))}
                      </div>
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
                  ))}
                </div>
              </section>

              <section className={styles.attributePanel}>
                <div className={styles.attributePanelHeader}>Physical</div>

                <div className={styles.attributeList}>
                  {physical.map((attr) => (
                    <div key={attr.id} className={styles.attributeRow}>
                      <div className={styles.attributeName}>{attr.label}</div>
                      <div className={styles.attributeValue}>
                        {Math.round(normalizeRating(attr.rating))}
                      </div>
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
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}