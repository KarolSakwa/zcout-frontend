'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import accent from '@/components/ui/AccentHintBubble.module.css';
import styles from './MyScoutingUnlockBubble.module.css';

type BubblePhase = 'idle' | 'visible' | 'exiting';

const VIEWPORT_PAD_PX = 12;

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
  const anchorRef = useRef<HTMLDivElement | null>(null);

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

  useLayoutEffect(() => {
    if (phase === 'idle') return;

    const el = anchorRef.current;
    if (!el) return;

    const clampToViewport = () => {
      el.style.setProperty('--bubble-shift-x', '0px');
      const rect = el.getBoundingClientRect();
      const minLeft = VIEWPORT_PAD_PX;
      const maxRight = window.innerWidth - VIEWPORT_PAD_PX;
      let shift = 0;
      if (rect.left < minLeft) {
        shift = minLeft - rect.left;
      } else if (rect.right > maxRight) {
        shift = maxRight - rect.right;
      }
      el.style.setProperty('--bubble-shift-x', `${shift}px`);
    };

    const frame = window.requestAnimationFrame(clampToViewport);
    window.addEventListener('resize', clampToViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', clampToViewport);
    };
  }, [phase]);

  if (phase === 'idle') return null;

  return (
    <div
      ref={anchorRef}
      className={styles.anchor}
      data-my-scouting-unlock-bubble
    >
      <div
        className={`${accent.chrome} ${accent.caretTop} ${styles.bubble} ${
          phase === 'exiting' ? accent.exitAnchored : accent.enterAnchored
        }`}
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
    </div>
  );
}
