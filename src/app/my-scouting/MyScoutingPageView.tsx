'use client';

import LoadingScreen from '@/components/LoadingScreen';
import MyScoutingDashboard from './MyScoutingDashboard';
import MyScoutingErrorView from './MyScoutingErrorView';
import MyScoutingLockedView from './MyScoutingLockedView';
import { useMyScoutingDashboard } from './useMyScoutingDashboard';

export default function MyScoutingPageView() {
  const { user, progress, pageState, dashboard, retry } = useMyScoutingDashboard();

  if (pageState === 'provider-loading' || pageState === 'dashboard-loading') {
    return <LoadingScreen />;
  }

  if (pageState === 'provider-error') {
    return <MyScoutingErrorView onRetry={retry} />;
  }

  if (pageState === 'dashboard-error') {
    return <MyScoutingErrorView onRetry={retry} />;
  }

  if (pageState === 'locked' && progress) {
    return <MyScoutingLockedView progress={progress} />;
  }

  if (pageState === 'dashboard-ready' && dashboard && progress) {
    return (
      <MyScoutingDashboard
        user={user}
        progress={progress}
        stats={dashboard.stats}
        recentContributions={dashboard.recent_contributions}
      />
    );
  }

  return <LoadingScreen />;
}
