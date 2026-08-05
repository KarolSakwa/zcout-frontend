'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import {
  readPersistenceFlag,
  scoutingProgressStartedHintKey,
  writePersistenceFlag,
} from '@/lib/scoutingUiPersistence';
import styles from './ScoutingProgressStartedHint.module.css';

type HintPhase = 'idle' | 'visible' | 'exiting';

export default function ScoutingProgressStartedHint({
  canShow,
  onDismiss,
}: {
  canShow: boolean;
  onDismiss?: () => void;
}) {
  const [phase, setPhase] = useState<HintPhase>('idle');

  const dismiss = useCallback(() => {
    const anonId = ensureBrowserAnonId();
    if (anonId) {
      writePersistenceFlag(scoutingProgressStartedHintKey(anonId));
    }

    setPhase((current) => {
      if (current === 'idle' || current === 'exiting') return current;
      window.setTimeout(() => {
        setPhase('idle');
        onDismiss?.();
      }, 200);
      return 'exiting';
    });
  }, [onDismiss]);

  useEffect(() => {
    if (!canShow) {
      setPhase('idle');
      return;
    }

    const anonId = ensureBrowserAnonId();
    if (!anonId || readPersistenceFlag(scoutingProgressStartedHintKey(anonId))) {
      onDismiss?.();
      return;
    }

    setPhase('visible');
    writePersistenceFlag(scoutingProgressStartedHintKey(anonId));
  }, [canShow, onDismiss]);

  if (phase === 'idle') return null;

  return (
    <div
      className={`${styles.hint} ${phase === 'exiting' ? styles.exit : styles.enter}`}
      role="status"
      aria-live="polite"
    >
      <p className={styles.title}>Your scouting progress has started</p>
      <p className={styles.body}>
        Log in to keep it across devices, increase your influence and unlock
        Scout Reports.
      </p>
      <div className={styles.actions}>
        <Link href="/login" className={styles.link}>
          Log in
        </Link>
        <button
          type="button"
          className={styles.close}
          aria-label="Dismiss scouting progress hint"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
