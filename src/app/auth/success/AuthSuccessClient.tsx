'use client';

import React, { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

type User = { id: number; name: string; email: string };

export default function AuthSuccessClient({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchUser = async () => {
      try {
        return await fetch('/api/auth/user', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
      } catch {
        return null;
      }
    };

    const run = async () => {
      const delays = [0, 500, 1200];

      for (const delay of delays) {
        if (delay > 0) {
          await wait(delay);
        }

        if (cancelled) return;

        const res = await fetchUser();

        if (cancelled) return;

        if (res?.ok) {
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
      }

      if (!cancelled) {
        setFailed(true);
      }
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
          <a href={next} style={{ color: 'var(--ui-accent-primary)' }}>
            Continue
          </a>
        </div>
      </main>
    );
  }

  return <LoadingScreen />;
}