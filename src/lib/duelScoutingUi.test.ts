import { describe, expect, it } from 'vitest';
import {
  getDuelCardMotionPhase,
  getDuelLoaderFlags,
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

  it('shows a single center ZLoader after vote, without a homepage stage overlay', () => {
    expect(
      getDuelLoaderFlags({
        homepageMode: true,
        showPendingUi: true,
        showDelayedNextPending: false,
      }),
    ).toEqual({
      showCenterLoader: true,
      showHomepageStageOverlay: false,
    });
  });

  it('shows a single center ZLoader while the next duel loads, without a second homepage overlay', () => {
    expect(
      getDuelLoaderFlags({
        homepageMode: true,
        showPendingUi: false,
        showDelayedNextPending: true,
      }),
    ).toEqual({
      showCenterLoader: true,
      showHomepageStageOverlay: false,
    });
  });

  it('keeps /duels cards on idle geometry while the next-pair request is in flight', () => {
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: false,
      }),
    ).toBe('idle');
  });

  it('keeps exit card motion after the next pair is ready, even if loading flags are still on', () => {
    expect(
      getDuelCardMotionPhase({
        transition: 'exit',
        showPendingUi: false,
      }),
    ).toBe('exit');
  });

  it('uses pending card motion during vote loading', () => {
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: true,
      }),
    ).toBe('pending');
  });

  it('keeps homepage next-fetch on idle geometry even when the center loader is shown', () => {
    const flags = getDuelLoaderFlags({
      homepageMode: true,
      showPendingUi: false,
      showDelayedNextPending: true,
      transition: 'idle',
    });

    expect(flags.showCenterLoader).toBe(true);
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: false,
      }),
    ).toBe('idle');
  });

  it('keeps homepage vote-loading on pending geometry via the real loader→motion chain', () => {
    const flags = getDuelLoaderFlags({
      homepageMode: true,
      showPendingUi: true,
      showDelayedNextPending: false,
      transition: 'idle',
    });

    expect(flags.showCenterLoader).toBe(true);
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: true,
      }),
    ).toBe('pending');
  });

  it('keeps the /duels center loader during next-pair fetch while idle', () => {
    expect(
      getDuelLoaderFlags({
        homepageMode: false,
        showPendingUi: false,
        showDelayedNextPending: true,
        transition: 'idle',
      }),
    ).toEqual({
      showCenterLoader: true,
      showHomepageStageOverlay: false,
    });
  });

  it('keeps /duels idle geometry while the delayed loader outlives loadingPair', () => {
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: false,
      }),
    ).toBe('idle');
  });

  it('shows the /duels center loader without moving the cards off idle geometry', () => {
    const flags = getDuelLoaderFlags({
      homepageMode: false,
      showPendingUi: false,
      showDelayedNextPending: true,
      transition: 'idle',
    });

    expect(flags.showCenterLoader).toBe(true);
    expect(
      getDuelCardMotionPhase({
        transition: 'idle',
        showPendingUi: false,
      }),
    ).toBe('idle');
  });

  it('hides the /duels center loader once exit starts', () => {
    expect(
      getDuelLoaderFlags({
        homepageMode: false,
        showPendingUi: false,
        showDelayedNextPending: true,
        transition: 'exit',
      }),
    ).toEqual({
      showCenterLoader: false,
      showHomepageStageOverlay: false,
    });
  });

  it('does not hide the homepage center loader during exit', () => {
    expect(
      getDuelLoaderFlags({
        homepageMode: true,
        showPendingUi: false,
        showDelayedNextPending: true,
        transition: 'exit',
      }),
    ).toEqual({
      showCenterLoader: true,
      showHomepageStageOverlay: false,
    });
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
