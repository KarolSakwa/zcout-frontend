'use client';

import { useEffect, useState } from 'react';
import TopRisersWidget, { type TopRiserItem } from '@/components/duels/TopRisersWidget';
import { fetchTopMoversSummary } from '@/components/duels/useDuelSideWidgets';

export default function TopRisersSection() {
  const [items, setItems] = useState<TopRiserItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchTopMoversSummary(controller.signal)
      .then((summary) => {
        setItems(Array.isArray(summary.risers) ? summary.risers : []);
      })
      .catch(() => {
        setItems([]);
      });

    return () => controller.abort();
  }, []);

  return <TopRisersWidget items={items} mode="risers" embedded />;
}
