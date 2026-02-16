export const dynamic = 'force-dynamic';

import Duel from '@/components/Duel';

type PairResponse = any;

export default async function DuelsPage() {
  const res = await fetch('http://localhost:8080/api/duels/next', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return (
      <main style={{ padding: 28 }}>
        <div style={{ fontSize: 40, letterSpacing: 10, color: '#d7b15a', fontWeight: 700 }}>
          DUEL
        </div>
        <div style={{ marginTop: 14, opacity: 0.7 }}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const pair = (await res.json()) as PairResponse;

  return (
    <main style={{ padding: 16 }}>
      <Duel initialPair={pair} />
    </main>
  );
}
