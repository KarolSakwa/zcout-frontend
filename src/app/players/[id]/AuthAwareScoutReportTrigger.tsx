'use client';

import { useAuth } from '@/components/AuthProvider';
import ScoutReportTrigger from './ScoutReportTrigger';
import GuestScoutReportTrigger from './GuestScoutReportTrigger';

type Props = {
  playerId: number;
  playerName: string;
  playerPosition: string | null;
  clubName: string | null;
  attributes: any[];
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