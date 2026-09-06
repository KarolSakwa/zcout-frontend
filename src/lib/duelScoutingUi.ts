export type DuelActionsVisibilityInput = {
  pair: unknown;
  showImpact: boolean;
  showOverlayLoader: boolean;
  showHomepagePairLoading: boolean;
  transition: string;
  skipping: boolean;
};

export function shouldShowDuelActions(input: DuelActionsVisibilityInput): boolean {
  return (
    !!input.pair &&
    !input.showImpact &&
    !input.showOverlayLoader &&
    !input.showHomepagePairLoading &&
    input.transition === 'idle' &&
    !input.skipping
  );
}

export type ScoutingStartedHintVisibilityInput = DuelActionsVisibilityInput & {
  pendingScoutingHint: boolean;
  isLoggedIn: boolean;
  loadingPair: boolean;
  error: unknown;
  showPendingUi: boolean;
  showCountdown: boolean;
};

export function shouldShowScoutingStartedHint(
  input: ScoutingStartedHintVisibilityInput,
): boolean {
  return (
    input.pendingScoutingHint &&
    !input.isLoggedIn &&
    !!input.pair &&
    !input.loadingPair &&
    !input.error &&
    !input.showReveal &&
    !input.showPendingUi &&
    !input.voting &&
    !input.skipping &&
    input.transition === 'idle' &&
    !input.showCountdown &&
    !input.showImpact &&
    !input.showHomepagePairLoading &&
    !input.showOverlayLoader
  );
}

export type DuelLoaderFlagsInput = {
  homepageMode: boolean;
  showPendingUi: boolean;
  showDelayedNextPending: boolean;
  transition?: string;
};

export type DuelCardMotionPhase = 'idle' | 'pending' | 'exit' | 'enter';

export type DuelCardMotionPhaseInput = {
  transition: string;
  showPendingUi: boolean;
};

/**
 * Vote-loading uses pending on homepage and /duels.
 * Next-pair fetch stays on idle geometry on both surfaces: the center loader
 * fits the idle gap, so the pair swap reads as one slide instead of a spread
 * followed by the exit. Exit/enter always win over pending.
 */
export function getDuelCardMotionPhase(
  input: DuelCardMotionPhaseInput,
): DuelCardMotionPhase {
  if (input.transition === 'exit') return 'exit';
  if (input.transition === 'enter') return 'enter';
  if (input.showPendingUi) return 'pending';
  return 'idle';
}

/**
 * Next-pair loading must reuse the VS-slot ZLoader.
 * A homepage stage overlay on top of it is the double-Z regression.
 * On /duels the loader belongs to the in-flight request, not the exit slide.
 */
export function getDuelLoaderFlags(input: DuelLoaderFlagsInput): {
  showCenterLoader: boolean;
  showHomepageStageOverlay: boolean;
} {
  const loading = input.showPendingUi || input.showDelayedNextPending;
  const showCenterLoader = input.homepageMode
    ? loading
    : loading && (input.transition ?? 'idle') === 'idle';

  return {
    showCenterLoader,
    showHomepageStageOverlay: false,
  };
}
