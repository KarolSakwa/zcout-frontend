import WidgetPanel from '@/components/ui/WidgetPanel';
import type { RecentContribution } from '@/lib/scoutingTypes';
import MyScoutingDuelContributionRow from './MyScoutingDuelContributionRow';
import MyScoutingScoutReportContributionRow from './MyScoutingScoutReportContributionRow';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingRecentContributions({
  items,
}: {
  items: RecentContribution[];
}) {
  return (
    <WidgetPanel
      variant="card"
      title="Recent Contributions"
      className={styles.recentPanel}
    >
      {items.length === 0 ? (
        <p className={styles.emptyFeed}>No recent contributions yet.</p>
      ) : (
        <ul className={styles.contributionList}>
          {items.map((item) =>
            item.type === 'duel' ? (
              <MyScoutingDuelContributionRow key={item.id} item={item} />
            ) : (
              <MyScoutingScoutReportContributionRow key={item.id} item={item} />
            ),
          )}
        </ul>
      )}
    </WidgetPanel>
  );
}
