import Link from 'next/link';
import type { AuthUser } from '@/components/AuthProvider';
import ScoutingLockIcon from '@/components/scouting/ScoutingLockIcon';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingHeader({
  user,
}: {
  user: AuthUser | null;
}) {
  return (
    <header className={styles.header}>
      <h1 className="visuallyHidden">My Scouting</h1>

      {!user ? (
        <div className={styles.anonMeta}>
          <div className={styles.tempLabel}>
            <ScoutingLockIcon size={11} />
            <span>TEMPORARY SCOUTING RECORD</span>
          </div>
          <p className={styles.anonCopy}>
            <Link href="/login" className={styles.signInLink}>
              Log in
            </Link>{' '}
            to keep it across devices, increase your influence and unlock Scout Reports.
          </p>
        </div>
      ) : null}
    </header>
  );
}
