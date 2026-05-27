export const dynamic = 'force-dynamic';

import styles from './page.module.css';
import { formatOverall } from '@/lib/ratings';
import { headers } from 'next/headers';
import PlayerProfileTelemetry from './PlayerProfileTelemetry';
import AnimatedProfileContent from './AnimatedProfileContent';
import PlayerProfileContent from './PlayerProfileContent';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: string;
  rating: number;
  confidence: number;
  rating_weight_sum?: number;
  confidence_weight_sum?: number;
  votes_count: number;
  last_vote_at: string | null;
  your_rating: number | null;
  your_rating_updated_at?: string | null;
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
  previous_player_id: number | null;
  next_player_id: number | null;
  overall_trend_7d: number | null;
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const API_BASE =
    process.env.BACKEND_URL ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'http://localhost:8080';

  const { id } = await params;

  const incomingHeaders = await headers();

  const cookie = incomingHeaders.get('cookie') ?? '';

  const origin = process.env.APP_ORIGIN || 'http://localhost:3000';

  const res = await fetch(
    `${API_BASE}/api/players/${encodeURIComponent(id)}`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: origin,
        Referer: `${origin}/`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );

  if (!res.ok) {
    return (
      <main className={styles.pageShell}>
        <div className={styles.pageInner}>
          <div className={styles.errorText}>
            Failed to load: {res.status}
          </div>
        </div>
      </main>
    );
  }

  const data = (await res.json()) as PlayerProfileResponse;

  return (
    <main className={styles.pageShell}>
      <PlayerProfileTelemetry playerId={data.id} />

      <div className={styles.pageInner}>
        <div className={styles.profileFrame}>
          <AnimatedProfileContent profileKey={data.slug}>
            <PlayerProfileContent initialData={data} />
          </AnimatedProfileContent>
        </div>
      </div>
    </main>
  );
}