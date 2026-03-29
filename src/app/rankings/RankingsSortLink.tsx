'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './rankings.module.css';

export default function RankingsSortLink(props: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  dir?: 'asc' | 'desc';
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const el = document.getElementById('rankingsShell');
    if (!el) {
      return;
    }

    if (isPending) {
      el.classList.add(styles.shellLoading);
    } else {
      el.classList.remove(styles.shellLoading);
    }
  }, [isPending]);

  return (
    <button
      type="button"
      className={`${styles.headerLink}${props.active ? ` ${styles.headerLinkActive}` : ''}${props.className ? ` ${props.className}` : ''}`}
      onClick={() => {
        startTransition(() => {
          router.push(props.href);
        });
      }}
    >
      <span>{props.children}</span>
      {props.active ? <span className={styles.headerSortArrow}>{props.dir === 'desc' ? '↓' : '↑'}</span> : null}
    </button>
  );
}