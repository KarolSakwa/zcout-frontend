'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './rankings.module.css';
import RankingsControls from './RankingsControls';
import ZLoader from '@/components/ZLoader';
import RatingWithConfidence from '@/components/RatingWithConfidence';

type Option = { value: string; label: string };

type RankingItem = {
  rank: number;
  player: {
    id: number;
    name: string;
    club: { name: string; slug: string | null };
  };
  pos: string;
  rating: number;
  confidence: number;
  last_vote_at: string | null;
  trend_7d: number | null;
};

export default function RankingsClient(props: {
  attributeKey: string;
  position: string;
  initialSearch: string;
  items: RankingItem[];
  total: number;
  attributeOptions: Option[];
  positionOptions: Option[];
  outfieldAttributeOptions: Option[];
  gkAttributeOptions: Option[];
}) {
  const [localSearch, setLocalSearch] = useState(props.initialSearch);

  useEffect(() => {
    setLocalSearch(props.initialSearch);
  }, [props.initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedSearch = localSearch.trim();
      const qs = new URLSearchParams();

      if (props.position && props.position !== 'ALL') {
        qs.set('position', props.position);
      }

      if (normalizedSearch.length > 0) {
        qs.set('search', normalizedSearch);
      }

      const basePath =
        props.attributeKey === 'overall'
          ? '/rankings'
          : `/rankings/${encodeURIComponent(props.attributeKey)}`;

      const nextUrl = `${basePath}${qs.toString() ? `?${qs.toString()}` : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [localSearch, props.attributeKey, props.position]);

  const visibleItems = useMemo(() => {
    const q = localSearch.trim().toLowerCase();

    if (q.length === 0) {
      return props.items;
    }

    return props.items.filter((it) => it.player.name.toLowerCase().includes(q));
  }, [props.items, localSearch]);

  return (
    <div id="rankingsShell" className={styles.shell}>
      <RankingsControls
        attributeKey={props.attributeKey}
        position={props.position}
        search={props.initialSearch}
        localSearch={localSearch}
        onLocalSearchChange={setLocalSearch}
        attributeOptions={props.attributeOptions}
        positionOptions={props.positionOptions}
        outfieldAttributeOptions={props.outfieldAttributeOptions}
        gkAttributeOptions={props.gkAttributeOptions}
      />

      <div className={styles.metaRow}>
        {localSearch.trim().length > 0 ? `${visibleItems.length} players` : `${props.total} players`}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>#</th>
              <th>PLAYER</th>
              <th>CLUB</th>
              <th>POS</th>
              <th>RATING</th>
              <th>TREND 7D</th>
            </tr>
          </thead>

          <tbody>
            {visibleItems.map((it) => {
              const trend = it.trend_7d;
              const pct = Math.max(0, Math.min(100, Math.round(it.confidence)));

              return (
                <tr key={it.player.id} className={styles.row}>
                  <td className={styles.rankCell}>{it.rank}</td>

                  <td className={styles.playerCell}>
                    <Link className={styles.playerLink} href={`/players/${it.player.id}`}>
                      {it.player.name}
                    </Link>
                  </td>

                  <td className={styles.clubCell}>
                    {it.player.club.slug ? (
                      <Link className={styles.clubLink} href={`/database/clubs/${it.player.club.slug}`}>
                        {it.player.club.name}
                      </Link>
                    ) : (
                      <span className={styles.clubText}>{it.player.club.name}</span>
                    )}
                  </td>

                  <td className={styles.posCell}>{it.pos}</td>

                  <td className={styles.ratingCell}>
                    <RatingWithConfidence rating={it.rating} confidence={it.confidence} size="md" decimals={2} />
                    </td>

                  <td className={styles.trendCell}>
                    {trend === null ? '—' : trend > 0 ? `+${trend.toFixed(2)}` : trend.toFixed(2)}
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
  );
}