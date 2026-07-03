'use client';

import type { ReactNode } from 'react';
import { HomepageLoadingProvider } from '@/components/homepage/HomepageLoadingContext';
import HomepageLoadOverlay from '@/components/homepage/HomepageLoadOverlay';
import styles from './HomePageClientShell.module.css';

export default function HomePageClientShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <HomepageLoadingProvider>
      <div className={styles.shell}>
        {children}
        <HomepageLoadOverlay />
      </div>
    </HomepageLoadingProvider>
  );
}
