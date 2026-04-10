import Link from 'next/link';
import ScoutReportScreen from './ScoutReportScreen';

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
  radar_axes: {
    key: string;
    label: string;
    attribute_keys: string[];
    value: number;
  }[];
  attributes: PlayerProfileAttribute[];
  overall: number | null;
};

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerScoutReportPage({ params }: ReportPageProps) {
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
      <main style={{ padding: '24px', color: '#e7e7e7' }}>
        <Link href={`/players/${id}`} style={{ color: '#d3a84a' }}>
          ← Back to player
        </Link>
        <div style={{ marginTop: '16px' }}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as PlayerProfileResponse;

  return (
    <ScoutReportScreen
      playerId={data.id}
      playerName={data.name}
      playerPosition={data.position}
      clubName={data.club?.name ?? null}
      attributes={data.attributes}
    />
  );
}