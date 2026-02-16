'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ZLoader from '@/components/ZLoader';

export default function RankingsIndexPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      router.replace('/rankings/dribbling');
    });
  }, [router, startTransition]);

  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
      <ZLoader />
    </div>
  );
}
