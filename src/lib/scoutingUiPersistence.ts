const HINT_PREFIX = 'zcout_hint_scouting_progress_started:';
const BUBBLE_PREFIX = 'zcout_bubble_my_scouting_unlocked:';

export function scoutingProgressStartedHintKey(anonId: string): string {
  return `${HINT_PREFIX}${anonId}`;
}

export function myScoutingUnlockBubbleKey(identity: string): string {
  return `${BUBBLE_PREFIX}${identity}`;
}

export function readPersistenceFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
}

export function writePersistenceFlag(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // ignore storage errors
  }
}

export function resolveScoutingUiIdentity(
  userId: number | null | undefined,
  anonId: string | null,
): string | null {
  if (userId != null) {
    return `user:${userId}`;
  }

  if (anonId) {
    return `anon:${anonId}`;
  }

  return null;
}
