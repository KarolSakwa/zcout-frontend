'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Tooltip from '@/components/Tooltip';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import {
  getScoutingProgressTooltip,
  MY_SCOUTING_LOCKED_TOOLTIP,
} from '@/lib/scoutingUiCopy';
import ScoutingLockIcon from '@/components/scouting/ScoutingLockIcon';
import ScoutingProgressBar from '@/components/scouting/ScoutingProgressBar';
import { useScoutingProgress } from '@/components/scouting/ScoutingProgressProvider';
import { useAuth } from './AuthProvider';
import styles from './AuthStatus.module.css';

function getDisplayName(user: { name?: string; email: string }): string {
  const trimmed = user.name?.trim();
  return trimmed || user.email;
}

export default function AuthStatus() {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    (pathname?.startsWith('/auth/') ?? false);

  const { user } = useAuth();
  const { status, progress } = useScoutingProgress();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    ensureBrowserAnonId();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const logout = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.dispatchEvent(new Event('zcout-route-loading:start'));
    window.location.href = `/auth/logout?next=${next}`;
  };

  if (isAuthRoute) return null;

  if (!mounted || !user) {
    return (
      <Link href="/login" className={styles.loginLink}>
        Log in
      </Link>
    );
  }

  const showProgress = status === 'ready' && progress != null;
  const myScoutingUnlocked = progress?.my_scouting_unlocked === true;

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        title={user.email}
        aria-label="Account"
        className={styles.accountButton}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21a8 8 0 0 0 -16 0" />
          <path d="M12 11a4 4 0 1 0 0 -8a4 4 0 0 0 0 8" />
        </svg>
      </button>

      {menuOpen && (
        <div className={styles.dropdown}>
          <div>
            <div className={styles.userName} title={getDisplayName(user)}>
              {getDisplayName(user)}
            </div>
            {user.name?.trim() ? (
              <div className={styles.userEmail} title={user.email}>
                {user.email}
              </div>
            ) : null}
          </div>

          {showProgress ? (
            <div className={styles.progressSlot}>
              <ScoutingProgressBar variant="dropdown" />
            </div>
          ) : null}

          {status === 'ready' ? (
            myScoutingUnlocked ? (
              <Link href="/my-scouting" className={styles.menuLink}>
                My Scouting
              </Link>
            ) : (
              <Tooltip
                content={
                  progress
                    ? getScoutingProgressTooltip(progress)
                    : MY_SCOUTING_LOCKED_TOOLTIP
                }
              >
                <button
                  type="button"
                  className={`${styles.menuButton} ${styles.menuButtonLocked}`}
                  aria-disabled="true"
                  aria-label="My Scouting locked"
                >
                  <span>My Scouting</span>
                  <ScoutingLockIcon size={11} />
                </button>
              </Tooltip>
            )
          ) : null}

          <button type="button" onClick={logout} className={styles.menuButton}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
