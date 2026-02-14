'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import styles from './TopNav.module.css';

const ITEMS = [
  { href: '/', label: 'DUEL' },
  { href: '/rankings', label: 'RANKINGS' },
  { href: '/players', label: 'PLAYERS' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.topnav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Zcout">
          <Image src="/logo.png" alt="Zcout" width={92} height={28} priority quality={100} />
        </Link>

        <nav className={styles.menu} aria-label="Main">
          {ITEMS.map((it) => {
            const active = pathname === it.href;
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

        <div className={styles.spacer} />
      </div>
    </header>
  );
}
