'use client';

import ZLoader from '@/components/ZLoader';
import { useHomepageLoading } from '@/components/homepage/HomepageLoadingContext';
import styles from './HomepageLoadOverlay.module.css';

export default function HomepageLoadOverlay() {
  const { isHomepageReady } = useHomepageLoading();

  if (isHomepageReady) return null;

  return (
    <div
      className={styles.overlay}
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      <ZLoader />
    </div>
  );
}
