'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './MyScoutingUnlockBubble.module.css';

type BubblePhase = 'idle' | 'visible' | 'exiting';

export default function MyScoutingUnlockBubble({
  open,
  onClose,
  onShown,
}: {
  open: boolean;
  onClose: () => void;
  onShown?: () => void;
}) {
  const [phase, setPhase] = useState<BubblePhase>('idle');

  const startExit = useCallback(() => {
    setPhase((current) => {
      if (current === 'idle' || current === 'exiting') return current;
      window.setTimeout(() => {
        setPhase('idle');
        onClose();
      }, 200);
      return 'exiting';
    });
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      return;
    }

    setPhase('visible');
    onShown?.();
  }, [open, onShown]);

  if (phase === 'idle') return null;

  return (
    <div
      className={`${styles.bubble} ${phase === 'exiting' ? styles.exit : styles.enter}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss My Scouting unlocked message"
        onClick={startExit}
      >
        ×
      </button>
      <p className={styles.title}>My Scouting unlocked</p>
      <p className={styles.body}>
        Your personal scouting dashboard is now available.
      </p>
    </div>
  );
}
