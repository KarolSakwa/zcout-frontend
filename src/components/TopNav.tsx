'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';
import AuthStatus from './AuthStatus';
import GlobalSearch from './GlobalSearch';

const ITEMS = [
  { href: '/duels', label: 'DUEL' },
  { href: '/rankings', label: 'RANKINGS' },
  { href: '/database', label: 'DATABASE' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.topnav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Zcout">
          <img src="/logo.png" alt="Zcout" className={styles.brandLogo} />
        </Link>

        <nav className={styles.menu} aria-label="Main">
          {ITEMS.map((it) => {
            const active =
              it.href === '/duels'
                ? pathname === '/' || pathname.startsWith('/duels')
                : pathname === it.href || pathname.startsWith(`${it.href}/`);

            return (
              <Link
                key={it.href}
                href={it.href}
                className={`${styles.item} ${active ? styles.active : ''}`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.rightTools}>
          <div className={styles.search}>
            <GlobalSearch />
          </div>

          <div className={styles.auth}>
            <AuthStatus />
          </div>
        </div>
      </div>
    </header>
  );
}