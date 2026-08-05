'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Tooltip from '@/components/Tooltip';
import { getScoutingProgressTooltip } from '@/lib/scoutingUiCopy';
import navStyles from '@/components/TopNav.module.css';
import ScoutingLockIcon from './ScoutingLockIcon';
import { useScoutingProgress } from './ScoutingProgressProvider';

export type MyScoutingNavItemProps = {
  className?: string;
  itemClassName?: string;
  onAnchorRef?: (node: HTMLElement | null) => void;
};

export function getMyScoutingNavState(
  status: 'loading' | 'ready' | 'error',
  progress: { my_scouting_unlocked: boolean } | null,
): 'loading' | 'locked' | 'unlocked' {
  if (status !== 'ready' || !progress) {
    return 'loading';
  }

  return progress.my_scouting_unlocked ? 'unlocked' : 'locked';
}

export default function MyScoutingNavItem({
  className,
  itemClassName,
  onAnchorRef,
}: MyScoutingNavItemProps) {
  const pathname = usePathname();
  const { status, progress } = useScoutingProgress();
  const navState = getMyScoutingNavState(status, progress);
  const active =
    pathname === '/my-scouting' ||
    (pathname?.startsWith('/my-scouting/') ?? false);

  const baseClass = [
    navStyles.item,
    itemClassName,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (navState === 'loading') {
    return (
      <span
        ref={onAnchorRef}
        className={`${baseClass} ${navStyles.myScoutingNeutral}`}
        data-nav-item="my-scouting"
        data-nav-state="loading"
        aria-label="My Scouting"
      >
        MY SCOUTING
      </span>
    );
  }

  if (navState === 'locked') {
    const locked = (
      <button
        ref={onAnchorRef}
        type="button"
        className={`${baseClass} ${navStyles.itemButton} ${navStyles.myScoutingLocked}`}
        data-nav-item="my-scouting"
        data-nav-state="locked"
        aria-disabled="true"
        aria-label="My Scouting locked"
      >
        <span className={navStyles.myScoutingLabel}>MY SCOUTING</span>
        <ScoutingLockIcon className={navStyles.myScoutingLockIcon} />
      </button>
    );

    return (
      <Tooltip content={getScoutingProgressTooltip(progress!)}>
        {locked}
      </Tooltip>
    );
  }

  return (
    <Link
      ref={onAnchorRef}
      href="/my-scouting"
      className={`${baseClass} ${active ? navStyles.active : ''}`}
      data-nav-item="my-scouting"
      data-nav-state="unlocked"
    >
      MY SCOUTING
    </Link>
  );
}
