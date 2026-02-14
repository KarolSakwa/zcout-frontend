'use client';

import React from 'react';
import styles from './ZLoader.module.css';

type Props = {
  label?: string;
  size?: number;
};

export default function ZLoader({ label, size = 46 }: Props) {
  return (
    <div className={styles.wrap} style={{ ['--size' as any]: `${size}px` }}>
      <div className={styles.coin} aria-hidden>
        <div className={styles.ring} />
        <div className={styles.z}>Z</div>
      </div>
      {label ? <div className={styles.label}>{label}</div> : null}
    </div>
  );
}
