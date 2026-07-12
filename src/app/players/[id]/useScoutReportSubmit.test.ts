import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}));

import type { ScoutReportAttribute } from './ScoutReportTrigger';
import {
  dispatchScoutReportFailed,
  dispatchScoutReportSaved,
  persistPendingSubmittedAttributes,
  runScoutReportSubmit,
  useScoutReportSubmit,
} from './useScoutReportSubmit';

const attributes: ScoutReportAttribute[] = [
  { id: 1, key: 'pace', label: 'Pace' },
  { id: 2, key: 'shooting', label: 'Shooting' },
];

function createDeps(overrides: Partial<Parameters<typeof runScoutReportSubmit>[0]> = {}) {
  const clearDraftStorage = vi.fn();
  const resetDrafts = vi.fn();
  const onUnauthorized = vi.fn();
  const onSubmitSuccess = vi.fn();
  const onSuccessClose = vi.fn();
  const refreshRouter = vi.fn();
  const setSubmitError = vi.fn();
  const setSuccessToast = vi.fn();
  const dispatchEvent = vi.fn(() => true);
  const sessionStorageRef = {
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
  } as Storage;

  return {
    playerId: 42,
    activeAttributes: attributes,
    payload: {
      player_id: 42,
      votes: [{ attribute_key: 'pace', value: 80 }],
      skipped_attribute_ids: [] as number[],
    },
    justSubmittedRatings: { 1: 80 },
    justSubmittedVotedAttributeIds: [1],
    remainingAttributesCount: 1,
    pendingStorageKey: 'scout-report-pending:42',
    submitRequest: vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ),
    dispatchEvent,
    sessionStorageRef,
    clearDraftStorage,
    resetDrafts,
    onUnauthorized,
    onSubmitSuccess,
    onSuccessClose,
    refreshRouter,
    setSubmitError,
    setSuccessToast,
    ...overrides,
  };
}

describe('runScoutReportSubmit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits votes successfully, clears drafts, and dispatches saved', async () => {
    const deps = createDeps();

    const result = await runScoutReportSubmit(deps);

    expect(result).toEqual({ ok: true, optimisticComplete: true });
    expect(deps.submitRequest).toHaveBeenCalledWith(deps.payload);
    expect(deps.clearDraftStorage).toHaveBeenCalledTimes(1);
    expect(deps.resetDrafts).toHaveBeenCalledTimes(1);
    expect(deps.onSubmitSuccess).toHaveBeenCalledWith(true);
    expect(deps.onSuccessClose).toHaveBeenCalledTimes(1);
    expect(deps.setSuccessToast).toHaveBeenCalledWith('Scout Report saved.');
    expect(deps.refreshRouter).toHaveBeenCalledTimes(1);
    expect(deps.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zcout:scout-report-saved' }),
    );
    expect(deps.sessionStorageRef.getItem('scout-report-pending:42')).toContain('"attributeIds":[1]');
  });

  it('submits only skips without saved event when there are no vote ratings', async () => {
    const deps = createDeps({
      payload: {
        player_id: 42,
        votes: [],
        skipped_attribute_ids: [2],
      },
      justSubmittedRatings: {},
      justSubmittedVotedAttributeIds: [],
      remainingAttributesCount: 2,
    });

    const result = await runScoutReportSubmit(deps);

    expect(result).toEqual({ ok: true, optimisticComplete: false });
    expect(deps.clearDraftStorage).toHaveBeenCalledTimes(1);
    expect(deps.resetDrafts).toHaveBeenCalledTimes(1);
    expect(deps.dispatchEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zcout:scout-report-saved' }),
    );
    expect(deps.sessionStorageRef.getItem('scout-report-pending:42')).toBeNull();
  });

  it('returns validation error for failed HTTP responses without clearing drafts', async () => {
    const deps = createDeps({
      submitRequest: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: { votes: ['Invalid vote value'] },
          }),
          { status: 422 },
        ),
      ),
    });

    const result = await runScoutReportSubmit(deps);

    expect(result).toEqual({
      ok: false,
      kind: 'validation',
      message: 'Invalid vote value',
    });
    expect(deps.setSubmitError).toHaveBeenCalledWith('Invalid vote value');
    expect(deps.clearDraftStorage).not.toHaveBeenCalled();
    expect(deps.resetDrafts).not.toHaveBeenCalled();
    expect(deps.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zcout:scout-report-failed' }),
    );
  });

  it('handles 401 by calling onUnauthorized and dispatching failed', async () => {
    const deps = createDeps({
      submitRequest: vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    });

    const result = await runScoutReportSubmit(deps);

    expect(result).toEqual({ ok: false, kind: 'unauthorized' });
    expect(deps.onUnauthorized).toHaveBeenCalledTimes(1);
    expect(deps.clearDraftStorage).not.toHaveBeenCalled();
    expect(deps.resetDrafts).not.toHaveBeenCalled();
    expect(deps.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zcout:scout-report-failed' }),
    );
  });
});

describe('scout report submit helpers', () => {
  it('persists pending voted attribute ids in sessionStorage', () => {
    const storage = {
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
    } as Storage;

    persistPendingSubmittedAttributes('scout-report-pending:42', [1, 2], storage);

    expect(storage.getItem('scout-report-pending:42')).toContain('"attributeIds":[1,2]');
  });

  it('dispatches saved and failed events with expected detail', () => {
    const dispatchEvent = vi.fn(() => true);

    dispatchScoutReportSaved(42, { 1: 70 }, dispatchEvent);
    dispatchScoutReportFailed(42, dispatchEvent);

    expect(dispatchEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'zcout:scout-report-saved',
        detail: { playerId: 42, ratings: { 1: 70 } },
      }),
    );
    expect(dispatchEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'zcout:scout-report-failed',
        detail: { playerId: 42 },
      }),
    );
  });
});

describe('useScoutReportSubmit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not clear drafts when submitRequest throws', async () => {
    const clearDraftStorage = vi.fn();
    const resetDrafts = vi.fn();
    const dispatchEvent = vi.fn(() => true);

    const { result } = renderHook(() =>
      useScoutReportSubmit({
        playerId: 42,
        activeAttributes: attributes,
        buildSubmitPayload: () => ({
          player_id: 42,
          votes: [{ attribute_key: 'pace', value: 55 }],
          skipped_attribute_ids: [],
        }),
        getJustSubmittedRatingsMap: () => ({ 1: 55 }),
        getJustSubmittedVotedAttributeIds: () => [1],
        resetDrafts,
        clearDraftStorage,
        remainingAttributesCount: 1,
        reloadAttributes: vi.fn(),
        onSuccessClose: vi.fn(),
        pendingStorageKey: 'scout-report-pending:42',
        onUnauthorized: vi.fn(),
        onSubmitSuccess: vi.fn(),
        refreshRouter: vi.fn(),
        submitRequest: vi.fn().mockRejectedValue(new Error('network down')),
      }),
    );

    vi.spyOn(window, 'dispatchEvent').mockImplementation(dispatchEvent);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(clearDraftStorage).not.toHaveBeenCalled();
    expect(resetDrafts).not.toHaveBeenCalled();
    expect(result.current.submitError).toBe('Failed to submit Scout Report.');
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'zcout:scout-report-failed' }),
    );
  });
});
