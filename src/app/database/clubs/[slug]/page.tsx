export const dynamic = 'force-dynamic';
import type { CSSProperties } from 'react';

import Link from 'next/link';
import styles from './club.module.css';

type ClubStats = {
  overall: number | null;
  attack: number | null;
  midfield: number | null;
  defence: number | null;
};

type ClubTopPlayer = {
  id: number;
  name: string;
  pos: string;
  overall: number | null;
  confidence: number;
} | null;

type ClubResponse = {
  club: {
    name: string;
    slug: string;
    colors: { primary: string | null; secondary: string | null; tertiary: string | null };
    stats: ClubStats;
    top_player: ClubTopPlayer;
  };
  filters: { limit: number };
  items: Array<{
    id: number;
    name: string;
    pos: string;
    overall: number | null;
    confidence: number;
  }>;
};

function clampPct(v: number) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function fmtNum(v: number | null) {
  return v == null ? '—' : String(v);
}

const POS_ORDER: Record<string, number> = {
  GK: 10,
  DEF: 20,
  LB: 30,
  CB: 40,
  RB: 50,
  DM: 60,
  MID: 70,
  CM: 80,
  AM: 90,
  LM: 95,
  RM: 96,
  LW: 100,
  RW: 110,
  ATT: 120,
  ST: 130,
};

function posRank(pos: string) {
  const k = (pos || '').toUpperCase();
  return POS_ORDER[k] ?? 999;
}

type SortKey = 'pos' | 'name' | 'overall' | 'confidence';
type SortDir = 'asc' | 'desc';

function normSortKey(v?: string): SortKey {
  if (v === 'name' || v === 'overall' || v === 'confidence' || v === 'pos') return v;
  return 'pos';
}

function normDir(v?: string): SortDir {
  return v === 'desc' ? 'desc' : 'asc';
}

function defaultDirForKey(key: SortKey): SortDir {
  if (key === 'overall' || key === 'confidence') return 'desc';
  return 'asc';
}

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sort?: string; dir?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const sortKey = normSortKey(resolvedSearchParams.sort);
  const dir = resolvedSearchParams.dir ? normDir(resolvedSearchParams.dir) : defaultDirForKey(sortKey);

  const url = `http://localhost:8080/api/database/clubs/${encodeURIComponent(slug)}?limit=200`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>DATABASE</h1>
        </div>
        <div className={styles.error}>
          <div>Failed to load: {res.status}</div>
          <Link className={styles.backLink} href="/database">
            ← BACK TO DATABASE
          </Link>
        </div>
      </main>
    );
  }

  const data = (await res.json()) as ClubResponse;

  const c1 = data.club.colors.primary ?? 'var(--ui-accent-primary)';
  const c2 = data.club.colors.secondary ?? 'var(--ui-surface-panel-solid)';
  const c3 = data.club.colors.tertiary ?? 'var(--ui-text-primary)';

  const top = data.club.top_player;
  const topPct = clampPct(top?.confidence ?? 0);

  const items = [...data.items];

  items.sort((a, b) => {
    const mul = dir === 'asc' ? 1 : -1;

    if (sortKey === 'pos') {
      const pa = posRank(a.pos);
      const pb = posRank(b.pos);
      if (pa !== pb) return (pa - pb) * mul;
      const na = a.name ?? '';
      const nb = b.name ?? '';
      return na.localeCompare(nb);
    }

    if (sortKey === 'name') {
      const na = a.name ?? '';
      const nb = b.name ?? '';
      return na.localeCompare(nb) * mul;
    }

    if (sortKey === 'overall') {
      const va = a.overall == null ? (dir === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : a.overall;
      const vb = b.overall == null ? (dir === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : b.overall;
      if (va !== vb) return (va - vb) * mul;
      return (a.name ?? '').localeCompare(b.name ?? '');
    }

    const ca = a.confidence ?? 0;
    const cb = b.confidence ?? 0;
    if (ca !== cb) return (ca - cb) * mul;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const basePath = `/database/clubs/${encodeURIComponent(slug)}`;

  function hrefFor(key: SortKey) {
    const nextDir = key === sortKey ? (dir === 'asc' ? 'desc' : 'asc') : defaultDirForKey(key);

    const sp = new URLSearchParams();
    sp.set('sort', key);
    sp.set('dir', nextDir);

    return `${basePath}?${sp.toString()}`;
  }

  function arrowFor(key: SortKey) {
    if (key !== sortKey) return null;
    return dir === 'asc' ? '▲' : '▼';
  }

  function thLabel(key: SortKey, label: string) {
    const active = key === sortKey;
    const arrow = arrowFor(key);

    return (
      <Link className={`${styles.sortLink} ${active ? styles.sortActive : ''}`} href={hrefFor(key)}>
        <span>{label}</span>
        {arrow ? <span className={styles.sortArrow}>{arrow}</span> : null}
      </Link>
    );
  }

  const themeVars: CSSProperties & Record<'--c1' | '--c2' | '--c3', string> = {
    '--c1': c1,
    '--c2': c2,
    '--c3': c3,
  };

  return (
    <main className={styles.page} style={themeVars}>
      <div className={styles.header}>
        <h1 className={styles.title}>{data.club.name}</h1>
        <div className={styles.sub}>Premier League Database</div>
      </div>

      <div className={styles.grid}>
        <aside className={styles.left}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}>CLUB OVERALL</div>

            <div className={styles.clubOverallRow}>
              <div className={styles.clubOverallLabel}>OVERALL</div>
              <div className={styles.clubOverallValue}>{fmtNum(data.club.stats.overall)}</div>
            </div>

            <div className={styles.statRows}>
              <div className={styles.statRow}>
                <div className={styles.statKey}>ATTACK</div>
                <div className={styles.statBar}>
                  <div className={styles.statFill} style={{ width: `${clampPct(data.club.stats.attack ?? 0)}%` }} />
                </div>
                <div className={styles.statVal}>{fmtNum(data.club.stats.attack)}</div>
              </div>

              <div className={styles.statRow}>
                <div className={styles.statKey}>MIDFIELD</div>
                <div className={styles.statBar}>
                  <div className={styles.statFill} style={{ width: `${clampPct(data.club.stats.midfield ?? 0)}%` }} />
                </div>
                <div className={styles.statVal}>{fmtNum(data.club.stats.midfield)}</div>
              </div>

              <div className={styles.statRow}>
                <div className={styles.statKey}>DEFENCE</div>
                <div className={styles.statBar}>
                  <div className={styles.statFill} style={{ width: `${clampPct(data.club.stats.defence ?? 0)}%` }} />
                </div>
                <div className={styles.statVal}>{fmtNum(data.club.stats.defence)}</div>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}>TOP PLAYER</div>

            {top ? (
              <div className={styles.topCard}>
                <div className={styles.topHead}>
                  <div className={styles.topAvatar} aria-hidden>
                    <div className={styles.topAvatarInner} />
                  </div>

                  <div className={styles.topMeta}>
                    <div className={styles.topNameRow}>
                      <span className={styles.posBadge}>{top.pos}</span>
                      <span className={styles.topName}>{top.name}</span>
                    </div>
                  </div>

                  <div className={styles.topOverall}>
                    <div className={styles.topOverallLabel}>OVR</div>
                    <div className={styles.topOverallValue}>{fmtNum(top.overall)}</div>
                  </div>
                </div>

                <div className={styles.topConf}>
                  <div className={styles.topConfLabel}>CONFIDENCE</div>
                  <div className={styles.confGrid}>
                    <div className={styles.confBar}>
                      <div className={styles.confFill} style={{ width: `${topPct}%` }} />
                    </div>
                    <div className={styles.confPct}>{topPct}%</div>
                  </div>
                </div>

                <div className={styles.topActions}>
                  <Link className={styles.profileBtn} href={`/players/${top.id}`}>
                    PROFILE
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.empty}>No top player yet.</div>
            )}
          </section>
        </aside>

        <section className={styles.right}>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>ALL PLAYERS</div>
            <div className={styles.listMeta}>{items.length} players</div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th>#</th>
                  <th>{thLabel('name', 'PLAYER')}</th>
                  <th>{thLabel('pos', 'POS')}</th>
                  <th style={{ textAlign: 'right' }}>{thLabel('overall', 'OVR')}</th>
                  <th>{thLabel('confidence', 'CONFIDENCE')}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {items.map((p, idx) => {
                  const pct = clampPct(p.confidence ?? 0);

                  return (
                    <tr key={p.id} className={styles.row}>
                      <td className={styles.rankCell}>{idx + 1}</td>
                      <td className={styles.playerCell}>
                        <div className={styles.playerName}>{p.name}</div>
                      </td>
                      <td className={styles.posCell}>
                        <span className={styles.posPill}>{p.pos}</span>
                      </td>
                      <td className={styles.ovrCell}>{fmtNum(p.overall)}</td>
                      <td className={styles.confCell}>
                        <div className={styles.confGrid}>
                          <div className={styles.confBar}>
                            <div className={styles.confFill} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles.confPct}>{pct}%</div>
                        </div>
                      </td>
                      <td className={styles.profileCell}>
                        <Link className={styles.profileBtn} href={`/players/${p.id}`}>
                          PROFILE
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Link className={styles.backLink} href="/database">
            ← BACK TO DATABASE
          </Link>
        </section>
      </div>
    </main>
  );
}