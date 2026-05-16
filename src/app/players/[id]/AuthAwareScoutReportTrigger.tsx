'use client';

import { useAuth } from '@/components/AuthProvider';
import ScoutReportTrigger from './ScoutReportTrigger';
import GuestScoutReportTrigger from './GuestScoutReportTrigger';
import type { ScoutReportAttribute } from './ScoutReportTrigger';

type Props = {
  playerId: number;
  playerName: string;
  playerPosition: string | null;
  clubName: string | null;
  attributes: ScoutReportAttribute[];
  className?: string;
};

export default function AuthAwareScoutReportTrigger(props: Props) {
  const { user, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return null;
  }

  if (!user) {
    return (
      <GuestScoutReportTrigger
        playerId={props.playerId}
        className={props.className}
      />
    );
  }

  return <ScoutReportTrigger {...props} />;
}