'use client';

import Link from 'next/link';
import AttributeIcon from '@/components/AttributeIcon';
import Trend7dIndicator from '@/components/trends/Trend7dIndicator';
import { MoversSkeletonRows } from '@/components/duels/DuelRailSkeletons';
import type { TopRiserItem } from '@/components/duels/useDuelSideWidgets';
import styles from './DuelSideRail.module.css';

function MoversSection({
  title,
  items,
  showSkeleton,
}: {
  title: string;
  items: TopRiserItem[];
  showSkeleton: boolean;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{title}</div>
      </div>
      {showSkeleton ? (
        <MoversSkeletonRows />
      ) : items.length === 0 ? (
        <div className={styles.stateText}>No movers yet.</div>
      ) : (
        items.map((item) => (
          <div key={item.id} className={styles.moverRow}>
            <Link href={`/players/${item.playerId}`} className={styles.moverPlayerLink}>
              {item.player}
            </Link>
            <Trend7dIndicator
              delta={item.delta}
              domain="attribute"
              variant="iconAndValue"
              emptyFallback="—"
            />
          </div>
        ))
      )}
    </div>
  );
}

export default function DuelLeftRail({
  attributeKey,
  attributeLabel,
  riserItems,
  fallerItems,
  showMoversSkeleton = false,
  embedded = false,
}: {
  attributeKey: string;
  attributeLabel: string;
  riserItems: TopRiserItem[];
  fallerItems: TopRiserItem[];
  showMoversSkeleton?: boolean;
  embedded?: boolean;
}) {
  return (
    <aside
      className={`${styles.rail} ${styles.railLeft}`}
      data-duels-widget="risers"
      data-duels-rail={embedded ? 'stacked' : 'left'}
    >
      <div className={styles.railBody}>
        <div className={styles.railContentStack}>
          <div className={styles.railAttributeHeader}>
            <span className={styles.railAttributeIcon} aria-hidden>
              <AttributeIcon
                attributeKey={attributeKey}
                label={attributeLabel}
                size={10}
              />
            </span>
            <span className={styles.railAttributeName}>{attributeLabel}</span>
            <span className={styles.railAttributeMeta}>7d</span>
          </div>

          <MoversSection
            title="Top risers"
            items={riserItems}
            showSkeleton={showMoversSkeleton}
          />

          <div className={styles.separator} aria-hidden />

          <MoversSection
            title="Top fallers"
            items={fallerItems}
            showSkeleton={showMoversSkeleton}
          />
        </div>
      </div>
    </aside>
  );
}
