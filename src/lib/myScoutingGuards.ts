import type {
  MyScoutingResponse,
  MyScoutingStats,
  RecentContribution,
} from '@/lib/scoutingTypes';
import { isScoutingProgress } from '@/lib/scoutingTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMyScoutingStats(value: unknown): value is MyScoutingStats {
  if (!isRecord(value)) return false;

  return (
    typeof value.duels === 'number' &&
    typeof value.players_rated === 'number' &&
    typeof value.scout_reports === 'number'
  );
}

function isDuelContribution(value: unknown): value is RecentContribution {
  if (!isRecord(value) || value.type !== 'duel') return false;

  const playerShape = (player: unknown) =>
    isRecord(player) &&
    typeof player.id === 'number' &&
    typeof player.name === 'string' &&
    (player.delta === null || typeof player.delta === 'number');

  return (
    typeof value.id === 'string' &&
    typeof value.attribute_key === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.selected_player_id === 'number' &&
    playerShape(value.player_a) &&
    playerShape(value.player_b)
  );
}

function isScoutReportContribution(value: unknown): value is RecentContribution {
  if (!isRecord(value) || value.type !== 'scout_report') return false;

  return (
    typeof value.id === 'string' &&
    typeof value.ratings_count === 'number' &&
    typeof value.created_at === 'string' &&
    isRecord(value.player) &&
    typeof value.player.id === 'number' &&
    typeof value.player.name === 'string' &&
    (value.overall_before === null || typeof value.overall_before === 'number') &&
    (value.overall_after === null || typeof value.overall_after === 'number') &&
    (value.overall_delta === null || typeof value.overall_delta === 'number')
  );
}

function isRecentContribution(value: unknown): value is RecentContribution {
  if (!isRecord(value)) return false;

  if (value.type === 'duel') {
    return isDuelContribution(value);
  }

  if (value.type === 'scout_report') {
    return isScoutReportContribution(value);
  }

  return false;
}

export function isMyScoutingResponse(value: unknown): value is MyScoutingResponse {
  if (!isRecord(value)) return false;

  if (!isScoutingProgress(value.scouting_progress)) {
    return false;
  }

  if (value.stats !== null && !isMyScoutingStats(value.stats)) {
    return false;
  }

  if (!Array.isArray(value.recent_contributions)) {
    return false;
  }

  return value.recent_contributions.every(isRecentContribution);
}

export function normalizeRecentContributions(
  contributions: RecentContribution[],
): RecentContribution[] {
  return [...contributions]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )
    .slice(0, 5);
}
