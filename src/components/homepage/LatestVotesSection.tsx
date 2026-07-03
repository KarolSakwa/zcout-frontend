'use client';

import RecentVotesWidget from '@/components/duels/RecentVotesWidget';
import { useRecentVotesLive } from '@/components/duels/useDuelSideWidgets';
import { useHomepageSectionLoading } from '@/components/homepage/HomepageLoadingContext';

export default function LatestVotesSection() {
  const { recentVotes, latestRecentVoteId, isRecentVotesLoading } =
    useRecentVotesLive();

  useHomepageSectionLoading('recentVotes', isRecentVotesLoading);

  return (
    <RecentVotesWidget
      items={recentVotes}
      latestItemId={latestRecentVoteId}
      embedded
    />
  );
}
