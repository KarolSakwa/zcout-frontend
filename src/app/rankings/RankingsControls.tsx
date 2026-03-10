'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './rankings.module.css';

type Option = { value: string; label: string };

export default function RankingsControls(props: {
  attributeKey: string;
  position: string;
  limit: number;
  attributeOptions: Option[];
  positionOptions: Option[];
  limitOptions: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const el = document.getElementById('rankingsShell');
    if (!el) return;
    if (isPending) el.classList.add(styles.shellLoading);
    else el.classList.remove(styles.shellLoading);
  }, [isPending]);

  const go = (next: { attributeKey?: string; position?: string; limit?: string }) => {
    const attributeKey = next.attributeKey ?? props.attributeKey;
    const position = next.position ?? props.position;
    const limit = next.limit ?? String(props.limit);

    const qs = new URLSearchParams();
    if (position) qs.set('position', position);
    if (limit) qs.set('limit', limit);

    startTransition(() => {
      router.push(`/rankings/${encodeURIComponent(attributeKey)}?${qs.toString()}`);
    });
  };

  return (
    <div className={styles.controlsRow}>
      <div className={styles.control}>
        <select
          className={styles.select}
          value={props.attributeKey}
          disabled={isPending}
          onChange={(e) => go({ attributeKey: e.target.value })}
        >
          {props.attributeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.control}>
        <select
          className={styles.select}
          value={props.position}
          disabled={isPending}
          onChange={(e) => go({ position: e.target.value })}
        >
          {props.positionOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.control}>
        <select
          className={styles.select}
          value={String(props.limit)}
          disabled={isPending}
          onChange={(e) => go({ limit: e.target.value })}
        >
          {props.limitOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
