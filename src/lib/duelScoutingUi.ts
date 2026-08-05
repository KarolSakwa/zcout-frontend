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
