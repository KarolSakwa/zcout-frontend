export const dynamic = 'force-dynamic';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import styles from './database.module.css';
import { redirect } from 'next/navigation';

type ClubItem = {
  club: string;
  colors: { primary: string | null; secondary: string | null; tertiary: string | null };
  overall: number | null;
  attack: number | null;
  midfield: number | null;
  defence: number | null;
};

type ClubsResponse = {
  filters: { limit: number; league: string };
  items: ClubItem[];
};

function slugifyClubName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hexToRgba(hex: string, alpha: number) {
  const h = String(hex ?? '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);

  if (!Number.isFinite(n)) {
    return `rgba(255,255,255,${alpha})`;
  }

  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  return `rgba(${r},${g},${b},${alpha})`;
}

export default async function DatabasePage() {
  redirect('/duels');

  const limit = '24';

  const url = `http://localhost:8080/api/database/clubs?limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>DATABASE</h1>
        </div>
        <div className={styles.errorText}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as ClubsResponse;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>DATABASE</h1>
      </div>

      <div className={styles.grid}>
        {data.items.map((c) => {
          const primary = c.colors?.primary ?? 'var(--ui-accent-primary)';
          const secondary = c.colors?.secondary ?? 'var(--ui-surface-panel-solid)';
          const slug = slugifyClubName(c.club);

          const cardVars: CSSProperties & Record<'--club-primary' | '--club-secondary' | '--club-accent', string> = {
            '--club-primary': hexToRgba(primary, 0.12),
            '--club-secondary': hexToRgba(secondary, 0.12),
            '--club-accent': primary,
          };

          return (
            <Link
              key={c.club}
              href={`/database/clubs/${slug}`}
              className={styles.card}
              style={cardVars}
            >
              <div className={styles.cardAccent} />

              <div className={styles.cardTitle}>{c.club}</div>

              <div className={styles.statsGrid}>
                {[
                  { k: 'OVERALL', v: c.overall },
                  { k: 'ATTACK', v: c.attack },
                  { k: 'MIDFIELD', v: c.midfield },
                  { k: 'DEFENCE', v: c.defence },
                ].map((row) => (
                  <div key={row.k} className={styles.statRow}>
                    <div className={styles.statKey}>{row.k}</div>
                    <div className={`${styles.statValue} ${row.v == null ? styles.statValueEmpty : ''}`}>
                      {row.v == null ? '—' : row.v}
                    </div>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}