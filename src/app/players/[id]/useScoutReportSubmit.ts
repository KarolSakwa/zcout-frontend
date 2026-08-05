'use client';

import { useCallback, useEffect, useState } from 'react';
import { useScoutingProgress } from '@/components/scouting/ScoutingProgressProvider';
import { logEvent } from '@/lib/telemetry';
import type { ScoutingProgress } from '@/lib/scoutingTypes';
import { isScoutingProgress } from '@/lib/scoutingTypes';
import type { ScoutReportAttribute } from './ScoutReportTrigger';

export type ScoutReportSubmitPayload = {
  player_id: number;
  votes: Array<{ attribute_key: string; value: number }>;
  skipped_attribute_ids: number[];
};

type UseScoutReportSubmitOptions = {
  playerId: number;
  activeAttributes: ScoutReportAttribute[];
  buildSubmitPayload: () => ScoutReportSubmitPayload;
  getJustSubmittedRatingsMap: () => Record<number, number>;
  getJustSubmittedVotedAttributeIds: () => number[];
  resetDrafts: () => void;
  clearDraftStorage: () => void;
  remainingAttributesCount: number | null;
  reloadAttributes: () => void | Promise<void>;
  onSuccessClose: () => void;
  pendingStorageKey: string;
  onUnauthorized: () => void;
  onSubmitSuccess: (optimisticComplete: boolean) => void;
  refreshRouter: () => void;
  submitRequest?: (
    payload: ScoutReportSubmitPayload,
  ) => Promise<Response>;
};

export function parseSubmitValidationMessage(
  data: unknown,
  status: number,
): string {
  const body = data as {
    errors?: {
      payload?: string[];
      votes?: string[];
      skipped_attribute_ids?: string[];
    };
    message?: string;
  } | null;

  return (
    body?.errors?.payload?.[0] ??
    body?.errors?.votes?.[0] ??
    body?.errors?.skipped_attribute_ids?.[0] ??
    body?.message ??
    `Submit failed: ${status}`
  );
}

export function shouldCompleteOptimistically(
  remainingAttributesCount: number | null,
  payload: ScoutReportSubmitPayload,
): boolean {
  const submittedVotesCount = payload.votes.length;

  return (
    remainingAttributesCount !== null &&
    payload.skipped_attribute_ids.length === 0 &&
    submittedVotesCount > 0 &&
    submittedVotesCount === remainingAttributesCount
  );
}

export function dispatchScoutReportSaving(
  playerId: number,
  ratings: Record<number, number>,
  dispatchEvent: (event: Event) => boolean = window.dispatchEvent.bind(window),
) {
  if (Object.keys(ratings).length === 0) {
    return;
  }

  dispatchEvent(
    new CustomEvent('zcout:scout-report-saving', {
      detail: {
        playerId,
        ratings,
      },
    }),
  );
}

export function dispatchScoutReportFailed(
  playerId: number,
  dispatchEvent: (event: Event) => boolean = window.dispatchEvent.bind(window),
) {
  dispatchEvent(
    new CustomEvent('zcout:scout-report-failed', {
      detail: {
        playerId,
      },
    }),
  );
}

export function dispatchScoutReportSaved(
  playerId: number,
  ratings: Record<number, number>,
  dispatchEvent: (event: Event) => boolean = window.dispatchEvent.bind(window),
) {
  if (Object.keys(ratings).length === 0) {
    return;
  }

  dispatchEvent(
    new CustomEvent('zcout:scout-report-saved', {
      detail: {
        playerId,
        ratings,
      },
    }),
  );
}

export function persistPendingSubmittedAttributes(
  pendingStorageKey: string,
  attributeIds: number[],
  sessionStorageRef: Storage = window.sessionStorage,
) {
  if (attributeIds.length > 0) {
    sessionStorageRef.setItem(
      pendingStorageKey,
      JSON.stringify({
        attributeIds,
        createdAt: Date.now(),
      }),
    );
    return;
  }

  sessionStorageRef.removeItem(pendingStorageKey);
}

export async function runScoutReportSubmit({
  playerId,
  activeAttributes,
  payload,
  justSubmittedRatings,
  justSubmittedVotedAttributeIds,
  remainingAttributesCount,
  pendingStorageKey,
  submitRequest,
  dispatchEvent = window.dispatchEvent.bind(window),
  sessionStorageRef = window.sessionStorage,
  clearDraftStorage,
  resetDrafts,
  onUnauthorized,
  onSubmitSuccess,
  onSuccessClose,
  refreshRouter,
  setSubmitError,
  setSuccessToast,
  onScoutingProgressUpdate,
}: {
  playerId: number;
  activeAttributes: ScoutReportAttribute[];
  payload: ScoutReportSubmitPayload;
  justSubmittedRatings: Record<number, number>;
  justSubmittedVotedAttributeIds: number[];
  remainingAttributesCount: number | null;
  pendingStorageKey: string;
  submitRequest: (payload: ScoutReportSubmitPayload) => Promise<Response>;
  dispatchEvent?: (event: Event) => boolean;
  sessionStorageRef?: Storage;
  clearDraftStorage: () => void;
  resetDrafts: () => void;
  onUnauthorized: () => void;
  onSubmitSuccess: (optimisticComplete: boolean) => void;
  onSuccessClose: () => void;
  refreshRouter: () => void;
  setSubmitError: (message: string) => void;
  setSuccessToast: (message: string) => void;
  onScoutingProgressUpdate?: (progress: ScoutingProgress) => void;
}) {
  const res = await submitRequest(payload);

  if (res.status === 401) {
    if (Object.keys(justSubmittedRatings).length > 0) {
      dispatchScoutReportFailed(playerId, dispatchEvent);
    }

    onUnauthorized();
    return { ok: false as const, kind: 'unauthorized' as const };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (Object.keys(justSubmittedRatings).length > 0) {
      dispatchScoutReportFailed(playerId, dispatchEvent);
    }

    setSubmitError(parseSubmitValidationMessage(data, res.status));
    return {
      ok: false as const,
      kind: 'validation' as const,
      message: parseSubmitValidationMessage(data, res.status),
    };
  }

  if (isScoutingProgress(data?.scouting_progress)) {
    onScoutingProgressUpdate?.(data.scouting_progress);
  }

  logEvent('scout_report_submitted', {
    player_id: playerId,
    voted_attribute_ids: payload.votes
      .map((vote) => {
        const attribute = activeAttributes.find((item) => item.key === vote.attribute_key);
        return attribute?.id ?? null;
      })
      .filter((value): value is number => value !== null),
    skipped_attribute_ids: payload.skipped_attribute_ids,
    votes_count: payload.votes.length,
    skips_count: payload.skipped_attribute_ids.length,
  });

  clearDraftStorage();
  persistPendingSubmittedAttributes(
    pendingStorageKey,
    justSubmittedVotedAttributeIds,
    sessionStorageRef,
  );
  dispatchScoutReportSaved(playerId, justSubmittedRatings, dispatchEvent);

  resetDrafts();

  const optimisticComplete = shouldCompleteOptimistically(
    remainingAttributesCount,
    payload,
  );

  onSubmitSuccess(optimisticComplete);
  onSuccessClose();
  setSuccessToast('Scout Report saved.');
  refreshRouter();

  return { ok: true as const, optimisticComplete };
}

export function useScoutReportSubmit({
  playerId,
  activeAttributes,
  buildSubmitPayload,
  getJustSubmittedRatingsMap,
  getJustSubmittedVotedAttributeIds,
  resetDrafts,
  clearDraftStorage,
  remainingAttributesCount,
  reloadAttributes,
  onSuccessClose,
  pendingStorageKey,
  onUnauthorized,
  onSubmitSuccess,
  refreshRouter,
  submitRequest = (payload) =>
    fetch('/api/scout-report', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }),
}: UseScoutReportSubmitOptions) {
  const { updateFromResponse } = useScoutingProgress();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');

  useEffect(() => {
    if (!showSuccessToast) return;

    const timeout = window.setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [showSuccessToast]);

  const clearSubmitError = useCallback(() => {
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const justSubmittedRatings = getJustSubmittedRatingsMap();

    dispatchScoutReportSaving(playerId, justSubmittedRatings);

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildSubmitPayload();
      const justSubmittedVotedAttributeIds = getJustSubmittedVotedAttributeIds();

      await runScoutReportSubmit({
        playerId,
        activeAttributes,
        payload,
        justSubmittedRatings,
        justSubmittedVotedAttributeIds,
        remainingAttributesCount,
        pendingStorageKey,
        submitRequest,
        clearDraftStorage,
        resetDrafts,
        onUnauthorized,
        onSubmitSuccess: (optimisticComplete) => {
          setSubmitError(null);
          onSubmitSuccess(optimisticComplete);

          if (!optimisticComplete) {
            void reloadAttributes();
          }
        },
        onSuccessClose,
        refreshRouter,
        setSubmitError,
        setSuccessToast: (message) => {
          setSuccessToastMessage(message);
          setShowSuccessToast(true);
        },
        onScoutingProgressUpdate: (progress) => {
          updateFromResponse(progress, 'scout_report');
        },
      });
    } catch {
      if (Object.keys(justSubmittedRatings).length > 0) {
        dispatchScoutReportFailed(playerId);
      }

      setSubmitError('Failed to submit Scout Report.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeAttributes,
    buildSubmitPayload,
    clearDraftStorage,
    getJustSubmittedRatingsMap,
    getJustSubmittedVotedAttributeIds,
    onUnauthorized,
    onSuccessClose,
    onSubmitSuccess,
    pendingStorageKey,
    playerId,
    refreshRouter,
    reloadAttributes,
    remainingAttributesCount,
    resetDrafts,
    submitRequest,
    updateFromResponse,
  ]);

  return {
    isSubmitting,
    submitError,
    showSuccessToast,
    successToastMessage,
    handleSubmit,
    clearSubmitError,
  };
}
