'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import accent from '@/components/ui/AccentHintBubble.module.css';
import styles from './DuelVoteHint.module.css';

const SESSION_KEY = 'zcout_duel_vote_hint_seen_v1';
const SHOW_DELAY_MS = 1050;
const VISIBLE_DURATION_MS = 16500;
const EXIT_MS = 220;

type HintPhase = 'idle' | 'visible' | 'exiting';

function readHintSeen(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function markHintSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export default function DuelVoteHint({
  canShow,
  onHintVisible,
}: {
  canShow: boolean;
  onHintVisible?: () => void;
}) {
  const [phase, setPhase] = useState<HintPhase>('idle');
  const showDelayRef = useRef<number | null>(null);
  const hideDelayRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const onHintVisibleRef = useRef(onHintVisible);

  onHintVisibleRef.current = onHintVisible;

  const clearTimers = useCallback(() => {
    if (showDelayRef.current !== null) {
      window.clearTimeout(showDelayRef.current);
      showDelayRef.current = null;
    }
    if (hideDelayRef.current !== null) {
      window.clearTimeout(hideDelayRef.current);
      hideDelayRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const startExit = useCallback(() => {
    setPhase((current) => {
      if (current === 'idle' || current === 'exiting') return current;
      exitTimerRef.current = window.setTimeout(() => {
        setPhase('idle');
        exitTimerRef.current = null;
      }, EXIT_MS);
      return 'exiting';
    });
  }, []);

  useEffect(() => {
    if (!canShow) {
      clearTimers();
      setPhase('idle');
      return;
    }

    if (readHintSeen()) return;

    showDelayRef.current = window.setTimeout(() => {
      showDelayRef.current = null;
      markHintSeen();
      setPhase('visible');
      onHintVisibleRef.current?.();

      hideDelayRef.current = window.setTimeout(() => {
        hideDelayRef.current = null;
        startExit();
      }, VISIBLE_DURATION_MS);
    }, SHOW_DELAY_MS);

    return clearTimers;
  }, [canShow, clearTimers, startExit]);

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === 'idle') return null;

  return (
    <div
      className={`${accent.chrome} ${accent.caretTop} ${styles.hint} ${
        phase === 'exiting' ? accent.exitCentered : accent.enterCentered
      }`}
      role="status"
      aria-live="polite"
    >
      Pick your winner and reveal the crowd verdict
    </div>
  );
}
