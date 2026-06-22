'use client';

import RecentVotesWidget from '@/components/duels/RecentVotesWidget';
import { useRecentVotesLive } from '@/components/duels/useDuelSideWidgets';

export default function LatestVotesSection() {
  const { recentVotes, latestRecentVoteId } = useRecentVotesLive();

  return (
    <RecentVotesWidget
      items={recentVotes}
      latestItemId={latestRecentVoteId}
      embedded
    />
  );
}
