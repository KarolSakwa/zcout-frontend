'use client';

import { useEffect } from 'react';
import { logEvent } from '@/lib/telemetry';

type Props = {
  playerId: number;
};

export default function PlayerProfileTelemetry({ playerId }: Props) {
  useEffect(() => {
    if (!playerId) return;

    logEvent('profile_opened', {
      player_id: playerId,
    });
  }, [playerId]);

  return null;
}