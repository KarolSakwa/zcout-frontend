'use client';

import { useEffect, useState } from 'react';
import NeedsMoreRatingsWidget from '@/components/homepage/NeedsMoreRatingsWidget';
import {
  fetchNeedsMoreRatings,
  type NeedsMoreRatingsItem,
} from '@/components/homepage/useHomepageWidgets';
import { useHomepageSectionLoading } from '@/components/homepage/HomepageLoadingContext';

export default function NeedsMoreRatingsSection() {
  const [items, setItems] = useState<NeedsMoreRatingsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useHomepageSectionLoading('needsMoreRatings', isLoading);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);

    fetchNeedsMoreRatings(controller.signal)
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return <NeedsMoreRatingsWidget items={items} embedded />;
}
