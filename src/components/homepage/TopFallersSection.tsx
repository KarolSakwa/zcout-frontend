'use client';

import { useEffect, useState } from 'react';
import TopRisersWidget, { type TopRiserItem } from '@/components/duels/TopRisersWidget';
import { fetchTopMoversSummary } from '@/components/duels/useDuelSideWidgets';
import { useHomepageSectionLoading } from '@/components/homepage/HomepageLoadingContext';

export default function TopFallersSection() {
  const [items, setItems] = useState<TopRiserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useHomepageSectionLoading('topFallers', isLoading);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);

    fetchTopMoversSummary(controller.signal)
      .then((summary) => {
        setItems(Array.isArray(summary.fallers) ? summary.fallers : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return <TopRisersWidget items={items} mode="fallers" embedded />;
}
