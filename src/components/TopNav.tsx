'use client';

import React, { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';
import AuthStatus from './AuthStatus';
import GlobalSearch from './GlobalSearch';
import MyScoutingNavItem from './scouting/MyScoutingNavItem';
import MyScoutingUnlockBubble from './scouting/MyScoutingUnlockBubble';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import {
  myScoutingUnlockBubbleKey,
  readPersistenceFlag,
  resolveScoutingUiIdentity,
  writePersistenceFlag,
} from '@/lib/scoutingUiPersistence';
import { useAuth } from './AuthProvider';
import { useScoutingProgress } from './scouting/ScoutingProgressProvider';

const ITEMS = [
  { href: '/duels', label: 'DUELS' },
  { href: '/rankings', label: 'RANKINGS' },
  { href: '/about', label: 'HOW IT WORKS' },
] as const;

export default function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { status, consumeMyScoutingUnlockEvent } = useScoutingProgress();
  const myScoutingAnchorRef = useRef<HTMLElement | null>(null);
  const [unlockBubbleOpen, setUnlockBubbleOpen] = useState(false);
  const unlockConsumedRef = useRef(false);

  const tryShowUnlockBubble = useCallback(() => {
    if (unlockConsumedRef.current || unlockBubbleOpen) return;
    if (status !== 'ready') return;
    if (!myScoutingAnchorRef.current) return;
    if (!consumeMyScoutingUnlockEvent()) return;

    const identity = resolveScoutingUiIdentity(
      user?.id ?? null,
      ensureBrowserAnonId(),
    );

    if (!identity) return;

    if (readPersistenceFlag(myScoutingUnlockBubbleKey(identity))) {
      unlockConsumedRef.current = true;
      return;
    }

    setUnlockBubbleOpen(true);
  }, [consumeMyScoutingUnlockEvent, status, unlockBubbleOpen, user?.id]);

  React.useEffect(() => {
    tryShowUnlockBubble();
  }, [tryShowUnlockBubble, status]);

  const handleUnlockBubbleShown = useCallback(() => {
    unlockConsumedRef.current = true;
  }, []);

  const handleUnlockBubbleClose = useCallback(() => {
    const identity = resolveScoutingUiIdentity(
      user?.id ?? null,
      ensureBrowserAnonId(),
    );

    if (identity) {
      writePersistenceFlag(myScoutingUnlockBubbleKey(identity));
    }

    unlockConsumedRef.current = true;
    setUnlockBubbleOpen(false);
  }, [user?.id]);

  return (
    <header className={styles.topnav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} data-nav-brand aria-label="Zcout">
          <Image
            src="/logo.png"
            alt="Zcout"
            width={120}
            height={24}
            className={styles.brandLogo}
            priority
          />
        </Link>

        <nav className={styles.menu} aria-label="Main">
          {ITEMS.map((it) => {
            const active =
              pathname === it.href ||
              pathname?.startsWith(`${it.href}/`) === true;

            return (
              <Link
                key={it.href}
                href={it.href}
                className={`${styles.item} ${active ? styles.active : ''}`}
                data-nav-item={it.label.toLowerCase().replace(/\s+/g, '-')}
              >
                {it.label}
              </Link>
            );
          })}

          <div className={styles.myScoutingWrap}>
            <MyScoutingNavItem
              onAnchorRef={(node) => {
                myScoutingAnchorRef.current = node;
                tryShowUnlockBubble();
              }}
            />
            <MyScoutingUnlockBubble
              open={unlockBubbleOpen}
              onClose={handleUnlockBubbleClose}
              onShown={handleUnlockBubbleShown}
            />
          </div>
        </nav>

        <div className={styles.rightTools}>
          <div className={styles.search} data-nav-search>
            <GlobalSearch />
          </div>

          <div className={styles.auth} data-nav-auth>
            <AuthStatus />
          </div>
        </div>
      </div>
    </header>
  );
}
