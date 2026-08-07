'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import {
  myScoutingUnlockBubbleKey,
  readPersistenceFlag,
  resolveScoutingUiIdentity,
  writePersistenceFlag,
} from '@/lib/scoutingUiPersistence';
import { useAuth } from '@/components/AuthProvider';
import MyScoutingNavItem from './MyScoutingNavItem';
import MyScoutingUnlockBubble from './MyScoutingUnlockBubble';
import { useScoutingProgress } from './ScoutingProgressProvider';

export default function MyScoutingNavEntry({
  className,
}: {
  className?: string;
}) {
  const { user } = useAuth();
  const { status, consumeMyScoutingUnlockEvent } = useScoutingProgress();
  const myScoutingAnchorRef = useRef<HTMLElement | null>(null);
  const [unlockBubbleOpen, setUnlockBubbleOpen] = useState(false);
  const unlockConsumedRef = useRef(false);

  const tryShowUnlockBubble = useCallback(() => {
    if (unlockConsumedRef.current || unlockBubbleOpen) return;
    if (status !== 'ready') return;
    if (!myScoutingAnchorRef.current) return;
    if (!consumeMyScoutingUnlockEvent()) return;

    const identity = resolveScoutingUiIdentity(
      user?.id ?? null,
      ensureBrowserAnonId(),
    );

    if (!identity) return;

    if (readPersistenceFlag(myScoutingUnlockBubbleKey(identity))) {
      unlockConsumedRef.current = true;
      return;
    }

    setUnlockBubbleOpen(true);
  }, [consumeMyScoutingUnlockEvent, status, unlockBubbleOpen, user?.id]);

  useEffect(() => {
    tryShowUnlockBubble();
  }, [tryShowUnlockBubble, status]);

  const handleUnlockBubbleShown = useCallback(() => {
    unlockConsumedRef.current = true;
  }, []);

  const handleUnlockBubbleClose = useCallback(() => {
    const identity = resolveScoutingUiIdentity(
      user?.id ?? null,
      ensureBrowserAnonId(),
    );

    if (identity) {
      writePersistenceFlag(myScoutingUnlockBubbleKey(identity));
    }

    unlockConsumedRef.current = true;
    setUnlockBubbleOpen(false);
  }, [user?.id]);

  return (
    <div className={className} data-my-scouting-nav-entry>
      <MyScoutingNavItem
        onAnchorRef={(node) => {
          myScoutingAnchorRef.current = node;
          tryShowUnlockBubble();
        }}
      />
      <MyScoutingUnlockBubble
        open={unlockBubbleOpen}
        onClose={handleUnlockBubbleClose}
        onShown={handleUnlockBubbleShown}
      />
    </div>
  );
}
