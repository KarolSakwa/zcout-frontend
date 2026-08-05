import Link from 'next/link';
import AttributeIcon from '@/components/AttributeIcon';
import { formatAttributeLabel } from '@/lib/attributeDescriptions';
import { formatSignedDelta } from '@/lib/formatDelta';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { DuelRecentContribution } from '@/lib/scoutingTypes';
import styles from './myScoutingDashboard.module.css';

export default function MyScoutingDuelContributionRow({
  item,
}: {
  item: DuelRecentContribution;
}) {
  const attributeLabel = formatAttributeLabel(item.attribute_key).toUpperCase();
  const leftSelected = item.selected_player_id === item.player_a.id;
  const rightSelected = item.selected_player_id === item.player_b.id;

  return (
    <li className={styles.contributionRow}>
      <div className={styles.contributionTop}>
        <div className={styles.contributionMeta}>
          <AttributeIcon
            attributeKey={item.attribute_key}
            label={attributeLabel}
            size={14}
          />
          <span className={styles.contributionType}>
            DUEL · {attributeLabel}
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

      <div className={styles.duelPlayers}>
        <span className={styles.duelPlayerGroup}>
          <Link
            href={`/players/${item.player_a.id}`}
            className={`${styles.duelPlayer} ${leftSelected ? styles.duelPlayerSelected : ''}`}
            title={item.player_a.name}
          >
            {leftSelected ? <span className={styles.duelStar}>★</span> : null}
            <span className={styles.duelPlayerName}>{item.player_a.name}</span>
          </Link>
          <span
            className={`${styles.duelDelta} ${
              item.player_a.delta != null && item.player_a.delta > 0
                ? styles.deltaPositive
                : item.player_a.delta != null && item.player_a.delta < 0
                  ? styles.deltaNegative
                  : styles.deltaNeutral
            }`}
          >
            {formatSignedDelta(item.player_a.delta)}
          </span>
        </span>

        <span className={styles.duelVs}>vs</span>

        <span className={styles.duelPlayerGroup}>
          <Link
            href={`/players/${item.player_b.id}`}
            className={`${styles.duelPlayer} ${rightSelected ? styles.duelPlayerSelected : ''}`}
            title={item.player_b.name}
          >
            {rightSelected ? <span className={styles.duelStar}>★</span> : null}
            <span className={styles.duelPlayerName}>{item.player_b.name}</span>
          </Link>
          <span
            className={`${styles.duelDelta} ${
              item.player_b.delta != null && item.player_b.delta > 0
                ? styles.deltaPositive
                : item.player_b.delta != null && item.player_b.delta < 0
                  ? styles.deltaNegative
                  : styles.deltaNeutral
            }`}
          >
            {formatSignedDelta(item.player_b.delta)}
          </span>
        </span>
      </div>
    </li>
  );
}
