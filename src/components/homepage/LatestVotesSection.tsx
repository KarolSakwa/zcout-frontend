'use client';

import { useEffect, useState } from 'react';
import RecentVotesWidget, { type RecentVoteItem } from '@/components/duels/RecentVotesWidget';
import { fetchRecentVotes } from '@/components/duels/useDuelSideWidgets';

export default function LatestVotesSection() {
  const [items, setItems] = useState<RecentVoteItem[]>([]);
  const [latestItemId, setLatestItemId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchRecentVotes(controller.signal)
      .then((data) => {
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        setLatestItemId(nextItems[0]?.id ?? null);
      })
      .catch(() => {
        setItems([]);
        setLatestItemId(null);
      });

    return () => controller.abort();
  }, []);

  return <RecentVotesWidget items={items} latestItemId={latestItemId} embedded />;
}
