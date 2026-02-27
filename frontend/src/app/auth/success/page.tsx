'use client';

import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

type User = { id: number; name: string; email: string };

export default function AuthSuccessPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams?.next || '/duels';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < 30; i++) {
        const res = await fetch('/api/auth/user', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (res && res.ok) {
          const u = (await res.json()) as User;
          localStorage.setItem('zcout_user', JSON.stringify(u));
          window.dispatchEvent(new Event('zcout-auth'));

          await fetch('/api/auth/claim-anon', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }).catch(() => null);

          window.location.replace(next);
          return;
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled) setFailed(true);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [next]);

  if (failed) {
    return (
      <main style={{ padding: 24 }}>
        <div style={{ opacity: 0.85 }}>Auth sync failed.</div>
        <div style={{ marginTop: 10 }}>
          <a href={next} style={{ color: '#d7b15a' }}>
            Continue
          </a>
        </div>
      </main>
    );
  }

  return <LoadingScreen />;
}