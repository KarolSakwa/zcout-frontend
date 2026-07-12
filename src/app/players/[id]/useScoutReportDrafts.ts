'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScoutReportAttribute } from './ScoutReportTrigger';

export type DraftState = 'untouched' | 'vote' | 'skip';

export type AttributeDraft = {
  attributeId: number;
  state: DraftState;
  value: string;
};

type UseScoutReportDraftsOptions = {
  playerId: number;
  attributes: ScoutReportAttribute[];
  isHydrated: boolean;
};

export function getDraftStorageKey(playerId: number) {
  return `scout-report-draft:${playerId}`;
}

export function createEmptyDrafts(
  attributes: ScoutReportAttribute[],
): Record<number, AttributeDraft> {
  return Object.fromEntries(
    attributes.map((attribute) => [
      attribute.id,
      {
        attributeId: attribute.id,
        state: 'untouched' as DraftState,
        value: '',
      },
    ]),
  );
}

export function normalizeStoredDraft(
  attribute: ScoutReportAttribute,
  draft: AttributeDraft | undefined,
): AttributeDraft {
  if (
    !draft ||
    draft.attributeId !== attribute.id ||
    !['untouched', 'vote', 'skip'].includes(draft.state)
  ) {
    return {
      attributeId: attribute.id,
      state: 'untouched',
      value: '',
    };
  }

  if (draft.state === 'vote') {
    const numeric = Number(draft.value);

    if (!Number.isFinite(numeric)) {
      return {
        attributeId: attribute.id,
        state: 'untouched',
        value: '',
      };
    }

    const clamped = Math.max(1, Math.min(99, numeric));

    return {
      attributeId: attribute.id,
      state: 'vote',
      value: String(clamped),
    };
  }

  return {
    attributeId: attribute.id,
    state: draft.state,
    value: '',
  };
}

export function restoreDraftsFromStorage(
  attributes: ScoutReportAttribute[],
  raw: string | null,
): Record<number, AttributeDraft> {
  const emptyDrafts = createEmptyDrafts(attributes);

  if (!raw) {
    return emptyDrafts;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, AttributeDraft>;

    return Object.fromEntries(
      attributes.map((attribute) => {
        const draft =
          parsed[String(attribute.id)] ??
          parsed[attribute.id as unknown as string];

        return [attribute.id, normalizeStoredDraft(attribute, draft)];
      }),
    ) as Record<number, AttributeDraft>;
  } catch {
    return emptyDrafts;
  }
}

export function draftsHaveActions(drafts: Record<number, AttributeDraft>) {
  return Object.values(drafts).some((draft) => draft.state !== 'untouched');
}

export function buildSubmitPayloadFromDrafts(
  playerId: number,
  attributes: ScoutReportAttribute[],
  drafts: Record<number, AttributeDraft>,
) {
  const votes = attributes
    .map((attribute) => {
      const draft = drafts[attribute.id];

      if (!draft || draft.state !== 'vote' || draft.value === '') {
        return null;
      }

      return {
        attribute_key: attribute.key,
        value: Number(draft.value),
      };
    })
    .filter((value): value is { attribute_key: string; value: number } => value != null);

  const skipped_attribute_ids = attributes
    .map((attribute) => {
      const draft = drafts[attribute.id];
      return draft?.state === 'skip' ? attribute.id : null;
    })
    .filter((value): value is number => value != null);

  return {
    player_id: playerId,
    votes,
    skipped_attribute_ids,
  };
}

export function getJustSubmittedVotedAttributeIdsFromDrafts(
  attributes: ScoutReportAttribute[],
  drafts: Record<number, AttributeDraft>,
) {
  return attributes
    .filter((attribute) => {
      const draft = drafts[attribute.id];
      return draft?.state === 'vote' && draft.value !== '';
    })
    .map((attribute) => attribute.id);
}

export function getJustSubmittedRatingsMapFromDrafts(
  attributes: ScoutReportAttribute[],
  drafts: Record<number, AttributeDraft>,
) {
  return Object.fromEntries(
    attributes
      .map((attribute) => {
        const draft = drafts[attribute.id];

        if (!draft || draft.state !== 'vote' || draft.value === '') {
          return null;
        }

        return [attribute.id, Number(draft.value)] as const;
      })
      .filter((entry): entry is readonly [number, number] => entry != null),
  );
}

export function clampVoteInput(nextValue: string) {
  const digitsOnly = nextValue.replace(/[^\d]/g, '');

  if (digitsOnly === '') {
    return { state: 'untouched' as const, value: '' };
  }

  const numeric = Math.max(1, Math.min(99, Number(digitsOnly)));

  return { state: 'vote' as const, value: String(numeric) };
}

export function useScoutReportDrafts({
  playerId,
  attributes,
  isHydrated,
}: UseScoutReportDraftsOptions) {
  const [drafts, setDrafts] = useState<Record<number, AttributeDraft>>({});
  const storageKey = getDraftStorageKey(playerId);

  const emptyDrafts = useMemo(
    () => createEmptyDrafts(attributes),
    [attributes],
  );

  const hasActions = useMemo(() => draftsHaveActions(drafts), [drafts]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!attributes.length) {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    const nextDrafts = restoreDraftsFromStorage(attributes, raw);

    setDrafts((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(nextDrafts);

      return prevJson === nextJson ? prev : nextDrafts;
    });
  }, [isHydrated, attributes, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!hasActions) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, isHydrated, storageKey, hasActions]);

  const setVoteValue = useCallback((attributeId: number, nextValue: string) => {
    const nextDraft = clampVoteInput(nextValue);

    setDrafts((prev) => ({
      ...prev,
      [attributeId]: {
        attributeId,
        state: nextDraft.state,
        value: nextDraft.value,
      },
    }));
  }, []);

  const setSkip = useCallback((attributeId: number) => {
    setDrafts((prev) => {
      const current = prev[attributeId];
      const nextState: DraftState =
        current?.state === 'skip' ? 'untouched' : 'skip';

      return {
        ...prev,
        [attributeId]: {
          attributeId,
          state: nextState,
          value: '',
        },
      };
    });
  }, []);

  const buildSubmitPayload = useCallback(() => {
    return buildSubmitPayloadFromDrafts(playerId, attributes, drafts);
  }, [playerId, attributes, drafts]);

  const getJustSubmittedVotedAttributeIds = useCallback(() => {
    return getJustSubmittedVotedAttributeIdsFromDrafts(attributes, drafts);
  }, [attributes, drafts]);

  const getJustSubmittedRatingsMap = useCallback(() => {
    return getJustSubmittedRatingsMapFromDrafts(attributes, drafts);
  }, [attributes, drafts]);

  const resetDrafts = useCallback(() => {
    setDrafts(emptyDrafts);
  }, [emptyDrafts]);

  const clearDraftStorage = useCallback(() => {
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    drafts,
    hasActions,
    setVoteValue,
    setSkip,
    buildSubmitPayload,
    getJustSubmittedRatingsMap,
    getJustSubmittedVotedAttributeIds,
    resetDrafts,
    clearDraftStorage,
  };
}
