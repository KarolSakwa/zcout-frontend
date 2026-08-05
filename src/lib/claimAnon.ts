import type { ClaimAnonResponse, ScoutingProgress } from '@/lib/scoutingTypes';
import { isScoutingProgress } from '@/lib/scoutingTypes';
import {
  clearBrowserLegacyAnonIdsAfterClaim,
  getBrowserClaimAnonHeaders,
} from '@/lib/anonId/browser';

export async function claimAnonVotes(): Promise<ClaimAnonResponse | null> {
  try {
    const res = await fetch('/api/auth/claim-anon', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...getBrowserClaimAnonHeaders(),
      },
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ClaimAnonResponse;

    if (
      data.scouting_progress !== undefined &&
      !isScoutingProgress(data.scouting_progress)
    ) {
      return { claimed: Number(data.claimed ?? 0) };
    }

    clearBrowserLegacyAnonIdsAfterClaim();

    return {
      claimed: Number(data.claimed ?? 0),
      scouting_progress: data.scouting_progress,
    };
  } catch {
    return null;
  }
}

export async function applyClaimAnonToScoutingProgress(handlers: {
  updateFromResponse: (
    progress: ScoutingProgress,
    source: 'claim',
  ) => void;
  refresh: () => Promise<void>;
}): Promise<void> {
  const result = await claimAnonVotes();

  if (result?.scouting_progress) {
    handlers.updateFromResponse(result.scouting_progress, 'claim');
    return;
  }

  if (result) {
    await handlers.refresh();
  }
}
