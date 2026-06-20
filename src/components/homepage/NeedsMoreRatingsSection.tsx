'use client';

import { useEffect, useState } from 'react';
import NeedsMoreRatingsWidget from '@/components/homepage/NeedsMoreRatingsWidget';
import {
  fetchNeedsMoreRatings,
  type NeedsMoreRatingsItem,
} from '@/components/homepage/useHomepageWidgets';

export default function NeedsMoreRatingsSection() {
  const [items, setItems] = useState<NeedsMoreRatingsItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchNeedsMoreRatings(controller.signal)
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        setItems([]);
      });

    return () => controller.abort();
  }, []);

  return <NeedsMoreRatingsWidget items={items} embedded />;
}
