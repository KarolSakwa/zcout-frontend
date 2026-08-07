'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';
import AuthStatus from './AuthStatus';
import GlobalSearch from './GlobalSearch';
import MyScoutingNavEntry from './scouting/MyScoutingNavEntry';

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string | null;
}) {
  const active =
    pathname === href ||
    pathname?.startsWith(`${href}/`) === true;

  return (
    <Link
      href={href}
      className={`${styles.item} ${active ? styles.active : ''}`}
      data-nav-item={label.toLowerCase().replace(/\s+/g, '-')}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.topnav}>
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.brand}
          data-nav-brand
          aria-label="Zcout"
        >
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
          <NavLink href="/duels" label="DUELS" pathname={pathname} />
          <NavLink href="/rankings" label="RANKINGS" pathname={pathname} />

          <MyScoutingNavEntry className={styles.myScoutingWrap} />

          <NavLink
            href="/about"
            label="HOW IT WORKS"
            pathname={pathname}
          />
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