'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import styles from './ZLoader.module.css';

type Props = {
  label?: string;
  size?: number;
};

export default function ZLoader({ label, size = 46 }: Props) {
  const loaderStyle: CSSProperties & Record<'--size', string> = {
    '--size': `${size}px`,
  };

  return (
    <div className={styles.wrap} style={loaderStyle}>
      <div className={styles.coin} aria-hidden>
        <div className={styles.ring} />
        <div className={styles.z}>Z</div>
      </div>
      {label ? <div className={styles.label}>{label}</div> : null}
    </div>
  );
}