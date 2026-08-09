'use client';

import styles from './DuelSideRail.module.css';

const MOVER_ROWS = 5;
const TOP_ROWS = 5;
const VOTE_ROWS = 5;

export function MoversSkeletonRows({ count = MOVER_ROWS }: { count?: number }) {
  return (
    <div className={styles.skeletonBlock} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.moverSkeletonRow}>
          <div className={`${styles.skeletonBar} ${styles.skeletonBarName}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarDelta}`} />
        </div>
      ))}
    </div>
  );
}

export function TopFiveSkeletonRows({ count = TOP_ROWS }: { count?: number }) {
  return (
    <div className={styles.skeletonBlock} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.topSkeletonRow}>
          <div className={`${styles.skeletonBar} ${styles.skeletonBarRank}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarName}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarRating}`} />
        </div>
      ))}
    </div>
  );
}

export function RecentVotesSkeletonRows({ count = VOTE_ROWS }: { count?: number }) {
  return (
    <div className={styles.skeletonBlock} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.voteSkeletonRow}>
          <div className={`${styles.skeletonBar} ${styles.skeletonBarVoteMain}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarVoteMeta}`} />
        </div>
      ))}
    </div>
  );
}
