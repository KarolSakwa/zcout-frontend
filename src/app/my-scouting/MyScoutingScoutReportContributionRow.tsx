import Link from 'next/link';
import ScoutReportIcon from '@/components/scouting/ScoutReportIcon';
import { formatOverallValue, formatSignedDelta } from '@/lib/formatDelta';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { ScoutReportRecentContribution } from '@/lib/scoutingTypes';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingScoutReportContributionRow({
  item,
}: {
  item: ScoutReportRecentContribution;
}) {
  const ratingsLabel = item.ratings_count === 1 ? 'RATING' : 'RATINGS';
  const hasOverall =
    item.overall_before != null && item.overall_after != null;

  return (
    <li className={styles.contributionRow}>
      <div className={styles.contributionTop}>
        <div className={styles.contributionMeta}>
          <span className={styles.scoutReportIconWrap} aria-hidden="true">
            <ScoutReportIcon size={14} />
          </span>
          <span className={styles.contributionType}>
            SCOUT REPORT · {item.ratings_count} {ratingsLabel}
          </span>
        </div>
        <time
          className={styles.contributionTime}
          dateTime={item.created_at}
          title={new Date(item.created_at).toLocaleString()}
        >
          {formatRelativeTime(item.created_at)}
        </time>
      </div>

      <div className={`${styles.duelPlayers} ${styles.scoutReportPlayers}`}>
        <Link
          href={`/players/${item.player.id}`}
          className={`${styles.duelPlayer} ${styles.duelPlayerSelected}`}
          title={item.player.name}
        >
          <span className={styles.duelPlayerName}>{item.player.name}</span>
        </Link>
        {hasOverall ? (
          <>
            <span className={styles.scoutReportOverallText}>
              Overall {formatOverallValue(item.overall_before)} →{' '}
              {formatOverallValue(item.overall_after)}
            </span>
            <span
              className={`${styles.duelDelta} ${
                item.overall_delta != null && item.overall_delta > 0
                  ? styles.deltaPositive
                  : item.overall_delta != null && item.overall_delta < 0
                    ? styles.deltaNegative
                    : styles.deltaNeutral
              }`}
            >
              {formatSignedDelta(item.overall_delta)}
            </span>
          </>
        ) : (
          <span className={styles.scoutReportOverallText}>Overall —</span>
        )}
      </div>
    </li>
  );
}
