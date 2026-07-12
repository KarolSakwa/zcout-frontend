import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScoutReportAttribute } from './ScoutReportTrigger';
import {
  buildSubmitPayloadFromDrafts,
  clampVoteInput,
  createEmptyDrafts,
  draftsHaveActions,
  getDraftStorageKey,
  getJustSubmittedRatingsMapFromDrafts,
  getJustSubmittedVotedAttributeIdsFromDrafts,
  normalizeStoredDraft,
  restoreDraftsFromStorage,
  useScoutReportDrafts,
} from './useScoutReportDrafts';

const attributes: ScoutReportAttribute[] = [
  { id: 1, key: 'pace', label: 'Pace' },
  { id: 2, key: 'shooting', label: 'Shooting' },
];

describe('scout report draft helpers', () => {
  it('creates untouched drafts for each attribute', () => {
    expect(createEmptyDrafts(attributes)).toEqual({
      1: { attributeId: 1, state: 'untouched', value: '' },
      2: { attributeId: 2, state: 'untouched', value: '' },
    });
  });

  it('restores valid vote and skip drafts from localStorage', () => {
    const raw = JSON.stringify({
      1: { attributeId: 1, state: 'vote', value: '77' },
      2: { attributeId: 2, state: 'skip', value: '' },
    });

    expect(restoreDraftsFromStorage(attributes, raw)).toEqual({
      1: { attributeId: 1, state: 'vote', value: '77' },
      2: { attributeId: 2, state: 'skip', value: '' },
    });
  });

  it('rejects invalid stored drafts and falls back to untouched', () => {
    const raw = JSON.stringify({
      1: { attributeId: 99, state: 'vote', value: '50' },
      2: { attributeId: 2, state: 'invalid', value: '' },
    });

    expect(restoreDraftsFromStorage(attributes, raw)).toEqual(createEmptyDrafts(attributes));
  });

  it('clamps restored vote values to 1-99', () => {
    expect(
      normalizeStoredDraft(attributes[0], {
        attributeId: 1,
        state: 'vote',
        value: '150',
      }),
    ).toEqual({
      attributeId: 1,
      state: 'vote',
      value: '99',
    });

    expect(
      normalizeStoredDraft(attributes[0], {
        attributeId: 1,
        state: 'vote',
        value: '0',
      }),
    ).toEqual({
      attributeId: 1,
      state: 'vote',
      value: '1',
    });
  });

  it('clamps live vote input to 1-99 and clears empty input', () => {
    expect(clampVoteInput('')).toEqual({ state: 'untouched', value: '' });
    expect(clampVoteInput('12abc')).toEqual({ state: 'vote', value: '12' });
    expect(clampVoteInput('150')).toEqual({ state: 'vote', value: '99' });
  });

  it('distinguishes vote, skip and untouched when building submit payload', () => {
    const drafts = {
      1: { attributeId: 1, state: 'vote' as const, value: '80' },
      2: { attributeId: 2, state: 'skip' as const, value: '' },
    };

    expect(buildSubmitPayloadFromDrafts(42, attributes, drafts)).toEqual({
      player_id: 42,
      votes: [{ attribute_key: 'pace', value: 80 }],
      skipped_attribute_ids: [2],
    });
  });

  it('tracks whether drafts contain any action', () => {
    expect(draftsHaveActions(createEmptyDrafts(attributes))).toBe(false);
    expect(
      draftsHaveActions({
        1: { attributeId: 1, state: 'skip', value: '' },
        2: { attributeId: 2, state: 'untouched', value: '' },
      }),
    ).toBe(true);
  });

  it('builds just-submitted maps from vote drafts only', () => {
    const drafts = {
      1: { attributeId: 1, state: 'vote' as const, value: '66' },
      2: { attributeId: 2, state: 'skip' as const, value: '' },
    };

    expect(getJustSubmittedVotedAttributeIdsFromDrafts(attributes, drafts)).toEqual([1]);
    expect(getJustSubmittedRatingsMapFromDrafts(attributes, drafts)).toEqual({ 1: 66 });
  });
});

describe('useScoutReportDrafts', () => {
  const storageKey = getDraftStorageKey(42);

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores drafts from storage after hydration', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        1: { attributeId: 1, state: 'vote', value: '55' },
      }),
    );

    const { result } = renderHook(() =>
      useScoutReportDrafts({
        playerId: 42,
        attributes,
        isHydrated: true,
      }),
    );

    expect(result.current.drafts[1]).toEqual({
      attributeId: 1,
      state: 'vote',
      value: '55',
    });
    expect(result.current.hasActions).toBe(true);
  });

  it('persists drafts to storage when actions exist', () => {
    const { result } = renderHook(() =>
      useScoutReportDrafts({
        playerId: 42,
        attributes,
        isHydrated: true,
      }),
    );

    act(() => {
      result.current.setVoteValue(1, '44');
    });

    expect(window.localStorage.getItem(storageKey)).toContain('"value":"44"');
  });

  it('clears storage when drafts are reset to untouched', () => {
    const { result } = renderHook(() =>
      useScoutReportDrafts({
        playerId: 42,
        attributes,
        isHydrated: true,
      }),
    );

    act(() => {
      result.current.setSkip(2);
    });

    expect(window.localStorage.getItem(storageKey)).not.toBeNull();

    act(() => {
      result.current.resetDrafts();
    });

    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(result.current.hasActions).toBe(false);
  });

  it('exposes clearDraftStorage together with resetDrafts like submit cleanup', () => {
    const { result } = renderHook(() =>
      useScoutReportDrafts({
        playerId: 42,
        attributes,
        isHydrated: true,
      }),
    );

    act(() => {
      result.current.setVoteValue(1, '70');
    });

    expect(window.localStorage.getItem(storageKey)).not.toBeNull();

    act(() => {
      result.current.clearDraftStorage();
      result.current.resetDrafts();
    });

    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(result.current.hasActions).toBe(false);
  });
});
