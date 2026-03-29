export const dynamic = 'force-dynamic';

import Link from 'next/link';
import styles from '../rankings.module.css';
import RankingsControls from '../RankingsControls';
import RankingsSortLink from '../RankingsSortLink';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import ZLoader from '@/components/ZLoader';

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

type RankingResponse = {
  attribute: { id: number; key: string };
  filters: { position: string; limit: number; page: number; sort?: string; dir?: string };
  total: number;
  total_pages: number;
  items: RankingItem[];
};

type RankingMetaResponse = {
  outfield_attributes: Option[];
  gk_attributes: Option[];
  positions: Option[];
};

type SortKey = 'rank' | 'player' | 'club' | 'pos' | 'rating' | 'trend';

function buildBaseHref(params: {
  attributeKey: string;
  position: string;
  search: string;
  sort?: string;
  dir?: string;
  page?: number;
}) {
  const { attributeKey, position, search, sort = '', dir = '', page } = params;

  const qs = new URLSearchParams();

  if (position !== 'ALL') {
    qs.set('position', position);
  }

  if (search.length > 0) {
    qs.set('search', search);
  }

  if (sort.length > 0) {
    qs.set('sort', sort);
  }

  if (dir.length > 0) {
    qs.set('dir', dir);
  }

  if (page && page > 1) {
    qs.set('page', String(page));
  }

  const basePath =
    attributeKey === 'overall'
      ? '/rankings'
      : `/rankings/${encodeURIComponent(attributeKey)}`;

  return qs.toString() ? `${basePath}?${qs.toString()}` : basePath;
}

function buildSortHref(params: {
  attributeKey: string;
  position: string;
  search: string;
  currentSort: string;
  currentDir: string;
  targetSort: SortKey;
}) {
  const { attributeKey, position, search, currentSort, currentDir, targetSort } = params;

  const nextDir =
    currentSort === targetSort
      ? currentDir === 'desc'
        ? 'asc'
        : 'desc'
      : targetSort === 'rank'
        ? 'asc'
        : targetSort === 'rating' || targetSort === 'trend'
          ? 'desc'
          : 'asc';

  return buildBaseHref({
    attributeKey,
    position,
    search,
    sort: targetSort,
    dir: nextDir,
    page: 1,
  });
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return pages;
}

export default async function RankingsPage({
  params,
  searchParams,
}: {
  params: { attributeKey: string };
  searchParams?: {
    limit?: string;
    page?: string;
    position?: string;
    search?: string;
    sort?: string;
    dir?: string;
  };
}) {
  const attributeKey = params.attributeKey;
  const limit = searchParams?.limit ?? '25';
  const page = searchParams?.page ?? '1';
  const position = searchParams?.position ?? 'ALL';
  const search = (searchParams?.search ?? '').trim();
  const sort = (searchParams?.sort ?? '').trim();
  const dir = (searchParams?.dir ?? '').trim();

  const metaRes = await fetch('http://localhost:8080/api/rankings/meta', { cache: 'no-store' });
  const metaOk = metaRes.ok;
  const meta = metaOk ? ((await metaRes.json()) as RankingMetaResponse) : null;

  const qs = new URLSearchParams();
  qs.set('limit', limit);
  qs.set('page', page);
  qs.set('position', position);
  if (search.length > 0) {
    qs.set('search', search);
  }
  if (sort.length > 0) {
    qs.set('sort', sort);
  }
  if (dir.length > 0) {
    qs.set('dir', dir);
  }

  const url = `http://localhost:8080/api/rankings/${encodeURIComponent(attributeKey)}?${qs.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return (
      <main className={styles.page}>
        <div className={styles.metaRow}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as RankingResponse;

  const attributeOptions: Option[] =
    data.filters.position === 'GK'
      ? meta?.gk_attributes ?? [{ value: attributeKey, label: attributeKey.toUpperCase() }]
      : meta?.outfield_attributes ?? [{ value: attributeKey, label: attributeKey.toUpperCase() }];

  const positionOptions: Option[] = meta?.positions ?? [
    { value: 'ALL', label: 'ALL POSITIONS' },
    { value: data.filters.position, label: data.filters.position },
  ];

  const activeSort = data.filters.sort ?? 'rank';
  const activeDir = (data.filters.dir ?? 'asc') as 'asc' | 'desc';
  const currentPage = data.filters.page;
  const totalPages = data.total_pages;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <main className={styles.page}>
      <div id="rankingsShell" className={styles.shell}>
        <RankingsControls
          attributeKey={attributeKey}
          position={data.filters.position}
          search={search}
          sort={data.filters.sort}
          dir={data.filters.dir}
          attributeOptions={attributeOptions}
          positionOptions={positionOptions}
          outfieldAttributeOptions={meta?.outfield_attributes ?? []}
          gkAttributeOptions={meta?.gk_attributes ?? []}
        />

        <div className={styles.metaRow}>{data.total} players</div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'rank',
                    })}
                    active={activeSort === 'rank'}
                    dir={activeDir}
                  >
                    #
                  </RankingsSortLink>
                </th>

                <th>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'player',
                    })}
                    active={activeSort === 'player'}
                    dir={activeDir}
                  >
                    PLAYER
                  </RankingsSortLink>
                </th>

                <th>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'club',
                    })}
                    active={activeSort === 'club'}
                    dir={activeDir}
                  >
                    CLUB
                  </RankingsSortLink>
                </th>

                <th>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'pos',
                    })}
                    active={activeSort === 'pos'}
                    dir={activeDir}
                  >
                    POS
                  </RankingsSortLink>
                </th>

                <th className={styles.centerHeader}>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'rating',
                    })}
                    active={activeSort === 'rating'}
                    dir={activeDir}
                  >
                    RATING
                  </RankingsSortLink>
                </th>

                <th className={styles.centerHeader}>
                  <RankingsSortLink
                    href={buildSortHref({
                      attributeKey,
                      position: data.filters.position,
                      search,
                      currentSort: activeSort,
                      currentDir: activeDir,
                      targetSort: 'trend',
                    })}
                    active={activeSort === 'trend'}
                    dir={activeDir}
                  >
                    TREND 7D
                  </RankingsSortLink>
                </th>
              </tr>
            </thead>

            <tbody>
              {data.items.map((it) => {
                const trend = it.trend_7d;

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
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <RatingWithConfidence
                          rating={it.rating}
                          confidence={it.confidence}
                          size="md"
                          decimals={2}
                          align="center"
                        />
                      </div>
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

        {totalPages > 1 ? (
          <div className={styles.pagination}>
            {currentPage > 1 ? (
              <RankingsSortLink
                href={buildBaseHref({
                  attributeKey,
                  position: data.filters.position,
                  search,
                  sort: activeSort,
                  dir: activeDir,
                  page: currentPage - 1,
                })}
                className={styles.paginationLink}
              >
                PREV
              </RankingsSortLink>
            ) : null}

            {visiblePages.map((p) => (
              <RankingsSortLink
                key={p}
                href={buildBaseHref({
                  attributeKey,
                  position: data.filters.position,
                  search,
                  sort: activeSort,
                  dir: activeDir,
                  page: p,
                })}
                className={`${styles.paginationLink}${p === currentPage ? ` ${styles.paginationLinkActive}` : ''}`}
              >
                {String(p)}
              </RankingsSortLink>
            ))}

            {currentPage < totalPages ? (
              <RankingsSortLink
                href={buildBaseHref({
                  attributeKey,
                  position: data.filters.position,
                  search,
                  sort: activeSort,
                  dir: activeDir,
                  page: currentPage + 1,
                })}
                className={styles.paginationLink}
              >
                NEXT
              </RankingsSortLink>
            ) : null}
          </div>
        ) : null}

        <div className={styles.pendingOverlay}>
          <ZLoader />
        </div>
      </div>
    </main>
  );
}