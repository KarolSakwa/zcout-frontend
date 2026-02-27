'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

export default function LogoutPage() {
  const sp = useSearchParams();
  const next = sp.get('next') || '/';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await fetch('/api/auth/csrf', { method: 'GET' }).catch(() => {});
      await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } }).catch(() => {});

      if (cancelled) return;

      localStorage.removeItem('zcout_user');
      window.dispatchEvent(new Event('zcout-auth'));

      window.location.replace(next);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [next]);

  return <LoadingScreen />;
}