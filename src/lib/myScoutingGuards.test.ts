import { describe, expect, it } from 'vitest';
import { normalizeRecentContributions } from '@/lib/myScoutingGuards';
import type { RecentContribution } from '@/lib/scoutingTypes';

const duel = (id: string, createdAt: string): RecentContribution => ({
  type: 'duel',
  id,
  attribute_key: 'pace',
  created_at: createdAt,
  selected_player_id: 1,
  player_a: { id: 1, name: 'A', delta: 0.1 },
  player_b: { id: 2, name: 'B', delta: -0.1 },
});

describe('normalizeRecentContributions', () => {
  it('sorts by created_at desc and caps at five items', () => {
    const items = [
      duel('1', '2026-01-01T10:00:00Z'),
      duel('2', '2026-01-03T10:00:00Z'),
      duel('3', '2026-01-02T10:00:00Z'),
      duel('4', '2026-01-05T10:00:00Z'),
      duel('5', '2026-01-04T10:00:00Z'),
      duel('6', '2026-01-06T10:00:00Z'),
    ];

    const normalized = normalizeRecentContributions(items);
    expect(normalized).toHaveLength(5);
    expect(normalized.map((item) => item.id)).toEqual(['6', '4', '5', '2', '3']);
  });
});
