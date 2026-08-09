'use client';

import Link from 'next/link';
import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import LiveWidgetAttributeMeta from '@/components/duels/LiveWidgetAttributeMeta';
import {
  RecentVotesSkeletonRows,
  TopFiveSkeletonRows,
} from '@/components/duels/DuelRailSkeletons';
import type { RecentVoteItem } from '@/components/duels/RecentVotesWidget';
import type { AttributeTopPlayer } from '@/components/duels/useDuelContextualWidgets';
import styles from './DuelSideRail.module.css';

function RecentVotesSection({
  items,
  latestItemId,
  showSkeleton,
}: {
  items: RecentVoteItem[];
  latestItemId: string | null;
  showSkeleton: boolean;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Recent votes</div>
        <div className={styles.liveMeta}>
          <span className={styles.liveDot} aria-hidden />
          <span>Live</span>
        </div>
      </div>
      {showSkeleton ? (
        <RecentVotesSkeletonRows />
      ) : items.length === 0 ? (
        <div className={styles.stateText}>No recent votes.</div>
      ) : (
        items.map((item) => {
          const isLatest = item.id === latestItemId;
          const leftWon = item.winnerPlayerId === item.leftPlayerId;
          const rightWon = item.winnerPlayerId === item.rightPlayerId;

          return (
            <div
              key={item.id}
              className={styles.voteRow}
              style={{
                animation: isLatest ? 'recentVoteEnter 420ms ease' : 'none',
              }}
            >
              <div className={styles.voteMatchup}>
                <Link
                  href={`/players/${item.leftPlayerId}`}
                  className={styles.moverPlayerLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: leftWon ? 'rgba(232,240,252,0.95)' : 'rgba(232,240,252,0.78)',
                    fontWeight: leftWon ? 700 : 600,
                  }}
                >
                  {leftWon ? (
                    <span style={{ color: 'var(--ui-accent-primary)', fontWeight: 800 }}>★</span>
                  ) : null}
                  <span>{item.leftPlayer}</span>
                </Link>
                <span className={styles.voteVs}>vs</span>
                <Link
                  href={`/players/${item.rightPlayerId}`}
                  className={styles.moverPlayerLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: rightWon ? 'rgba(232,240,252,0.95)' : 'rgba(232,240,252,0.78)',
                    fontWeight: rightWon ? 700 : 600,
                  }}
                >
                  {rightWon ? (
                    <span style={{ color: 'var(--ui-accent-primary)', fontWeight: 800 }}>★</span>
                  ) : null}
                  <span>{item.rightPlayer}</span>
                </Link>
              </div>
              <div className={styles.voteMeta}>
                <LiveWidgetAttributeMeta
                  attributeKey={item.attributeKey}
                  attributeLabel={item.attributeLabel}
                />
              </div>
            </div>
          );
        })
      )}
      <style jsx>{`
        @keyframes recentVoteEnter {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function TopFiveRows({ players }: { players: AttributeTopPlayer[] }) {
  if (players.length === 0) {
    return <div className={styles.stateText}>No ranking data.</div>;
  }

  return (
    <>
      {players.map((item) => (
        <div key={item.id} className={styles.topRow}>
          <span className={styles.topRank}>{item.rank}</span>
          <Link href={`/players/${item.playerId}`} className={styles.topPlayerLink}>
            {item.player}
          </Link>
          <span className={styles.topRating}>
            <RatingWithConfidence
              rating={item.rating}
              confidence={0}
              fontSize={13}
              scalePx={13}
              decimals={0}
              align="end"
              expand={false}
              showConfidence={false}
              confidenceTooltipContent={false}
            />
          </span>
        </div>
      ))}
    </>
  );
}

export default function DuelRightRail({
  attributeKey,
  attributeLabel,
  preRevealPlayers,
  revealedPlayers,
  revealed,
  showTopSkeleton = false,
  topHasError,
  recentVotes,
  latestRecentVoteId,
  showRecentVotesSkeleton = false,
  embedded = false,
}: {
  attributeKey: string;
  attributeLabel: string;
  preRevealPlayers: AttributeTopPlayer[];
  revealedPlayers: AttributeTopPlayer[];
  revealed: boolean;
  showTopSkeleton?: boolean;
  topHasError: boolean;
  recentVotes: RecentVoteItem[];
  latestRecentVoteId: string | null;
  showRecentVotesSkeleton?: boolean;
  embedded?: boolean;
}) {
  return (
    <aside
      className={`${styles.rail} ${styles.railRight}`}
      data-duels-widget="votes"
      data-duels-rail={embedded ? 'stacked' : 'right'}
    >
      <div className={styles.railBody}>
        <div className={styles.railContentStack}>
          <div className={styles.railTopHeader}>
            <div className={styles.railAttributeGroup}>
              <span className={styles.railAttributeIcon} aria-hidden>
                <AttributeIcon
                  attributeKey={attributeKey}
                  label={attributeLabel}
                  size={10}
                />
              </span>
              <span className={styles.railAttributeName}>{attributeLabel}</span>
            </div>
            <span className={styles.railSectionLabel}>Top 5</span>
          </div>

          <div className={styles.section}>
            {!revealed ? (
              <p className={styles.hiddenHint}>Current duelists hidden until reveal</p>
            ) : null}
            {showTopSkeleton ? (
              <TopFiveSkeletonRows />
            ) : topHasError ? (
              <div className={styles.stateText}>Unable to load ranking.</div>
            ) : (
              <div className={styles.topCrossfade}>
                <div
                  className={`${styles.topLayer} ${
                    revealed ? styles.topLayerHidden : styles.topLayerVisible
                  }`}
                  aria-hidden={revealed}
                >
                  <TopFiveRows players={preRevealPlayers} />
                </div>
                <div
                  className={`${styles.topLayer} ${
                    revealed ? styles.topLayerVisible : styles.topLayerHidden
                  }`}
                  aria-hidden={!revealed}
                >
                  <TopFiveRows players={revealedPlayers} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.separator} aria-hidden />

          <RecentVotesSection
            items={recentVotes}
            latestItemId={latestRecentVoteId}
            showSkeleton={showRecentVotesSkeleton}
          />
        </div>
      </div>
    </aside>
  );
}
