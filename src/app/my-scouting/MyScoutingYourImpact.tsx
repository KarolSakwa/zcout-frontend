import ScoutingLockIcon from '@/components/scouting/ScoutingLockIcon';
import WidgetPanel from '@/components/ui/WidgetPanel';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingYourImpact() {
  return (
    <WidgetPanel
      variant="card"
      borderTitle={false}
      className={styles.yourImpactPanel}
      aria-label="Your Impact locked panel"
    >
      <div className={styles.yourImpactBody}>
        <div className={styles.yourImpactLabel}>YOUR IMPACT</div>
        <div className={styles.yourImpactLock} aria-hidden="true">
          <ScoutingLockIcon size={22} />
        </div>
      </div>
    </WidgetPanel>
  );
}
