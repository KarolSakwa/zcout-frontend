export const dynamic = 'force-dynamic';

import Link from 'next/link';
import styles from '../rankings.module.css';
import RankingsControls from '../RankingsControls';
import ZLoader from '@/components/ZLoader';

type Option = { value: string; label: string };

type RankingItem = {
  rank: number;
  player: { id: number; name: string; club: string };
  pos: string;
  rating: number;
  confidence: number;
  last_vote_at: string | null;
  trend_7d: number | null;
};

type RankingResponse = {
  attribute: { id: number; key: string };
  filters: { position: string; limit: number };
  total: number;
  items: RankingItem[];
};

type RankingMetaResponse = {
  attributes: Option[];
  positions: Option[];
  limits: Option[];
};

export default async function RankingsPage({
  params,
  searchParams,
}: {
  params: { attributeKey: string };
  searchParams?: { limit?: string; position?: string };
}) {
  const attributeKey = params.attributeKey;
  const limit = searchParams?.limit ?? '50';
  const position = searchParams?.position ?? 'ALL';

  const metaRes = await fetch('http://localhost:8080/api/rankings/meta', { cache: 'no-store' });
  const metaOk = metaRes.ok;
  const meta = metaOk ? ((await metaRes.json()) as RankingMetaResponse) : null;

  const url = `http://localhost:8080/api/rankings/${encodeURIComponent(attributeKey)}?limit=${encodeURIComponent(
    limit
  )}&position=${encodeURIComponent(position)}`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>RANKINGS</h1>
        </div>
        <div className={styles.metaRow}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as RankingResponse;

  const attributeOptions: Option[] = meta?.attributes ?? [{ value: attributeKey, label: attributeKey.toUpperCase() }];
  const positionOptions: Option[] = meta?.positions ?? [
    { value: 'ALL', label: 'ALL POSITIONS' },
    { value: data.filters.position, label: data.filters.position },
  ];
  const limitOptions: Option[] = meta?.limits ?? [
    { value: '25', label: 'TOP 25' },
    { value: '50', label: 'TOP 50' },
    { value: '100', label: 'TOP 100' },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>RANKINGS</h1>
      </div>

      <div id="rankingsShell" className={styles.shell}>
        <RankingsControls
          attributeKey={attributeKey}
          position={data.filters.position}
          limit={data.filters.limit}
          attributeOptions={attributeOptions}
          positionOptions={positionOptions}
          limitOptions={limitOptions}
        />

        <div className={styles.metaRow}>{data.total} players</div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>#</th>
                <th>PLAYER</th>
                <th>CLUB</th>
                <th>POS</th>
                <th>RATING</th>
                <th>CONFIDENCE</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {data.items.map((it) => {
                const pct = Math.max(0, Math.min(100, Math.round(it.confidence)));
                return (
                  <tr key={it.player.id} className={styles.row}>
                    <td className={styles.rankCell}>{it.rank}</td>
                    <td className={styles.playerCell}>{it.player.name}</td>
                    <td className={styles.clubCell}>{it.player.club}</td>
                    <td className={styles.posCell}>{it.pos}</td>
                    <td className={styles.ratingCell}>{it.rating.toFixed(2)}</td>
                    <td className={styles.confCell}>
                      <div className={styles.confGrid}>
                        <div className={styles.confBar}>
                          <div className={styles.confFill} style={{ width: `${pct}%` }} />
                        </div>
                        <div className={styles.confPct}>{pct}%</div>
                      </div>
                    </td>
                    <td className={styles.profileCell}>
                      <Link className={styles.profileBtn} href={`/players/${it.player.id}`}>
                        PROFILE
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.pendingOverlay}>
          <ZLoader />
        </div>
      </div>
    </main>
  );
}
