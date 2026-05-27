export const dynamic = 'force-dynamic';

import styles from './page.module.css';
import { headers } from 'next/headers';
import PlayerProfileTelemetry from './PlayerProfileTelemetry';
import PlayerProfileClient from './PlayerProfileClient';

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

  const data = await res.json();

  return (
    <main className={styles.pageShell}>
      <PlayerProfileTelemetry playerId={data.id} />

      <div className={styles.pageInner}>
        <div className={styles.profileFrame}>
          <PlayerProfileClient initialData={data} />
        </div>
      </div>
    </main>
  );
}