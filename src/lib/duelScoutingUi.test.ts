import { describe, expect, it } from 'vitest';
import {
  shouldShowDuelActions,
  shouldShowScoutingStartedHint,
} from '@/lib/duelScoutingUi';

const base = {
  pair: { id: 1 },
  showImpact: false,
  showOverlayLoader: false,
  showHomepagePairLoading: false,
  transition: 'idle',
  skipping: false,
};

describe('duel scouting UI lifecycle', () => {
  it('shows duel actions for an active idle duel', () => {
    expect(shouldShowDuelActions(base)).toBe(true);
  });

  it.each([
    ['impact', { showImpact: true }],
    ['skipping', { skipping: true }],
    ['loading overlay', { showOverlayLoader: true }],
    ['homepage pair loading', { showHomepagePairLoading: true }],
    ['transition', { transition: 'out' }],
    ['no pair', { pair: null }],
  ] as const)('hides duel actions during %s', (_label, overrides) => {
    expect(shouldShowDuelActions({ ...base, ...overrides })).toBe(false);
  });

  it('keeps duel actions visible while vote request is pending before reveal', () => {
    expect(shouldShowDuelActions(base)).toBe(true);
  });

  it('shows scouting started hint only after reveal in stable duel state', () => {
    expect(
      shouldShowScoutingStartedHint({
        ...base,
        pendingScoutingHint: true,
        isLoggedIn: false,
        loadingPair: false,
        error: null,
        showPendingUi: false,
        showCountdown: false,
      }),
    ).toBe(true);

    expect(
      shouldShowScoutingStartedHint({
        ...base,
        pendingScoutingHint: true,
        isLoggedIn: false,
        loadingPair: false,
        error: null,
        showPendingUi: false,
        showCountdown: false,
        showReveal: true,
      }),
    ).toBe(false);
  });

  it('does not show scouting started hint for logged-in users', () => {
    expect(
      shouldShowScoutingStartedHint({
        ...base,
        pendingScoutingHint: true,
        isLoggedIn: true,
        loadingPair: false,
        error: null,
        showPendingUi: false,
        showCountdown: false,
      }),
    ).toBe(false);
  });
});
