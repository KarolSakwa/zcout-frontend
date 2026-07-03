'use client';

import { useEffect, useState } from 'react';
import TopRisersWidget, { type TopRiserItem } from '@/components/duels/TopRisersWidget';
import { fetchTopMoversSummary } from '@/components/duels/useDuelSideWidgets';
import { useHomepageSectionLoading } from '@/components/homepage/HomepageLoadingContext';

export default function TopRisersSection() {
  const [items, setItems] = useState<TopRiserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useHomepageSectionLoading('topRisers', isLoading);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);

    fetchTopMoversSummary(controller.signal)
      .then((summary) => {
        setItems(Array.isArray(summary.risers) ? summary.risers : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return <TopRisersWidget items={items} mode="risers" embedded />;
}
