export const dynamic = 'force-dynamic';

import Link from 'next/link';

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

export default async function DatabasePage() {
  const limit = '24';

  const url = `http://localhost:8080/api/database/clubs?limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <main style={{ padding: 28 }}>
        <div style={{ fontSize: 40, letterSpacing: 10, color: '#d7b15a', fontWeight: 700 }}>DATABASE</div>
        <div style={{ marginTop: 14, opacity: 0.7 }}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as ClubsResponse;

  return (
    <main style={{ padding: '28px 28px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 18px' }}>
        <h1 style={{ fontSize: 44, letterSpacing: 10, fontWeight: 700, color: '#d7b15a' }}>DATABASE</h1>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {data.items.map((c) => {
          const primary = c.colors?.primary ?? '#d7b15a';
          const secondary = c.colors?.secondary ?? '#000000';
          const slug = slugifyClubName(c.club);

          return (
            <Link
              key={c.club}
              href={`/database/clubs/${slug}`}
              style={{
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: `linear-gradient(135deg, ${primary}1a 0%, rgba(10,10,12,0.55) 55%, ${secondary}12 100%)`,
                boxShadow: '0 12px 60px rgba(0, 0, 0, 0.45)',
                padding: 16,
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: primary,
                  opacity: 0.9,
                }}
              />

              <div style={{ fontWeight: 750, letterSpacing: 1, marginBottom: 12 }}>{c.club}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 10, alignItems: 'center' }}>
                {[
                  { k: 'OVERALL', v: c.overall },
                  { k: 'ATTACK', v: c.attack },
                  { k: 'MIDFIELD', v: c.midfield },
                  { k: 'DEFENCE', v: c.defence },
                ].map((row) => (
                  <div key={row.k} style={{ display: 'contents' }}>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, letterSpacing: 2 }}>{row.k}</div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: row.v == null ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
                        fontWeight: 700,
                      }}
                    >
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
