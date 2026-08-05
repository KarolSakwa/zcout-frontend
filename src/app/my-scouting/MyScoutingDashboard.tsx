import type { AuthUser } from '@/components/AuthProvider';
import type { MyScoutingStats, RecentContribution, ScoutingProgress } from '@/lib/scoutingTypes';
import MyScoutingHeader from './MyScoutingHeader';
import MyScoutingNextUnlock from './MyScoutingNextUnlock';
import MyScoutingRecentContributions from './MyScoutingRecentContributions';
import MyScoutingStatCards from './MyScoutingStatCards';
import MyScoutingYourImpact from './MyScoutingYourImpact';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingDashboard({
  user,
  progress,
  stats,
  recentContributions,
}: {
  user: AuthUser | null;
  progress: ScoutingProgress;
  stats: MyScoutingStats | null;
  recentContributions: RecentContribution[];
}) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.primaryGrid} data-ms-primary-grid>
        <div className={styles.summaryColumn} data-ms-summary-column>
          <MyScoutingHeader user={user} />
          <MyScoutingStatCards stats={stats} isLoggedIn={user != null} />
          <MyScoutingNextUnlock progress={progress} />
        </div>

        <div className={styles.recentColumn} data-ms-recent-column>
          <MyScoutingRecentContributions items={recentContributions} />
        </div>
      </div>

      <MyScoutingYourImpact />
    </div>
  );
}
