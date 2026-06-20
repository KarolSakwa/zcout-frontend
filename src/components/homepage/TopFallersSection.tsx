'use client';

import { useEffect, useState } from 'react';
import TopRisersWidget, { type TopRiserItem } from '@/components/duels/TopRisersWidget';
import { fetchTopMoversSummary } from '@/components/duels/useDuelSideWidgets';

export default function TopFallersSection() {
  const [items, setItems] = useState<TopRiserItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchTopMoversSummary(controller.signal)
      .then((summary) => {
        setItems(Array.isArray(summary.fallers) ? summary.fallers : []);
      })
      .catch(() => {
        setItems([]);
      });

    return () => controller.abort();
  }, []);

  return <TopRisersWidget items={items} mode="fallers" embedded />;
}
