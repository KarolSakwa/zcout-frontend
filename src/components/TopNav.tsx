'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';
import AuthStatus from './AuthStatus';
import GlobalSearch from './GlobalSearch';

const ITEMS = [
  { href: '/duels', label: 'DUELS' },
  { href: '/rankings', label: 'RANKINGS' },
  { href: '/database', label: 'DATABASE', disabled: true, badge: 'SOON' },
  { href: '/about', label: 'HOW IT WORKS' },
];

export default function TopNav() {
  const pathname = usePathname();

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
            const active = pathname === it.href || pathname?.startsWith(`${it.href}/`) === true;

            if (it.disabled) {
              return (
                <span
                  key={it.href}
                  className={`${styles.item} ${styles.disabledItem} ${styles.itemDatabase}`}
                  data-nav-item="database"
                  aria-disabled="true"
                >
                  {it.label}
                  <span className={styles.soonBadge}>{it.badge}</span>
                </span>
              );
            }

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
        </nav>

        <div className={styles.rightTools}>
          <div className={styles.search} data-nav-search>
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