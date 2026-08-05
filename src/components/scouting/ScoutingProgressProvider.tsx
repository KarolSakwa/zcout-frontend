'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import { fetchScoutingProgress } from '@/lib/scoutingApi';
import type {
  ScoutingProgress,
  ScoutingProgressUpdateSource,
} from '@/lib/scoutingTypes';

type ScoutingProgressState =
  | {
      status: 'loading';
      progress: null;
      error: null;
    }
  | {
      status: 'ready';
      progress: ScoutingProgress;
      error: null;
    }
  | {
      status: 'error';
      progress: null;
      error: string;
    };

export type ScoutingProgressContextValue = {
  status: ScoutingProgressState['status'];
  progress: ScoutingProgress | null;
  error: string | null;
  refresh: () => Promise<void>;
  updateFromResponse: (
    progress: ScoutingProgress,
    source?: ScoutingProgressUpdateSource,
  ) => void;
  consumeMyScoutingUnlockEvent: () => boolean;
};

const ScoutingProgressContext =
  createContext<ScoutingProgressContextValue | null>(null);

function shouldEmitUnlockEvent(
  previousStatus: ScoutingProgressState['status'],
  previousProgress: ScoutingProgress | null,
  nextProgress: ScoutingProgress,
  source?: ScoutingProgressUpdateSource,
): boolean {
  if (previousStatus !== 'ready' || !previousProgress) return false;
  if (!source) return false;
  if (previousProgress.my_scouting_unlocked) return false;

  return nextProgress.my_scouting_unlocked;
}

export function ScoutingProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScoutingProgressState>({
    status: 'loading',
    progress: null,
    error: null,
  });

  const fetchGenerationRef = useRef(0);
  const unlockEventPendingRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyProgressUpdate = useCallback(
    (
      nextProgress: ScoutingProgress,
      source?: ScoutingProgressUpdateSource,
    ) => {
      const current = stateRef.current;

      if (
        shouldEmitUnlockEvent(
          current.status,
          current.progress,
          nextProgress,
          source,
        )
      ) {
        unlockEventPendingRef.current = true;
      }

      setState({
        status: 'ready',
        progress: nextProgress,
        error: null,
      });
    },
    [],
  );

  const loadProgress = useCallback(
    async (signal?: AbortSignal, options?: { showLoading?: boolean }) => {
      const anonId = ensureBrowserAnonId();

      if (options?.showLoading) {
        setState({
          status: 'loading',
          progress: null,
          error: null,
        });
      }

      try {
        const response = await fetchScoutingProgress(anonId, signal);

        if (signal?.aborted) return;

        setState({
          status: 'ready',
          progress: response.scouting_progress,
          error: null,
        });
      } catch (error) {
        if (signal?.aborted) return;

        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load scouting progress.';

        setState({
          status: 'error',
          progress: null,
          error: message,
        });
      }
    },
    [],
  );

  useEffect(() => {
    const generation = ++fetchGenerationRef.current;
    const controller = new AbortController();

    void (async () => {
      const anonId = ensureBrowserAnonId();

      try {
        const response = await fetchScoutingProgress(
          anonId,
          controller.signal,
        );

        if (controller.signal.aborted || generation !== fetchGenerationRef.current) {
          return;
        }

        setState({
          status: 'ready',
          progress: response.scouting_progress,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || generation !== fetchGenerationRef.current) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load scouting progress.';

        setState({
          status: 'error',
          progress: null,
          error: message,
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const refresh = useCallback(async () => {
    const current = stateRef.current;
    const controller = new AbortController();

    if (current.status === 'error') {
      await loadProgress(controller.signal, { showLoading: true });
      return;
    }

    const anonId = ensureBrowserAnonId();

    try {
      const response = await fetchScoutingProgress(anonId, controller.signal);

      if (controller.signal.aborted) return;

      setState({
        status: 'ready',
        progress: response.scouting_progress,
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load scouting progress.';

      setState({
        status: 'error',
        progress: null,
        error: message,
      });
    }
  }, [loadProgress]);

  const updateFromResponse = useCallback(
    (progress: ScoutingProgress, source?: ScoutingProgressUpdateSource) => {
      applyProgressUpdate(progress, source);
    },
    [applyProgressUpdate],
  );

  const consumeMyScoutingUnlockEvent = useCallback(() => {
    if (!unlockEventPendingRef.current) return false;

    unlockEventPendingRef.current = false;
    return true;
  }, []);

  const value = useMemo<ScoutingProgressContextValue>(
    () => ({
      status: state.status,
      progress: state.progress,
      error: state.error,
      refresh,
      updateFromResponse,
      consumeMyScoutingUnlockEvent,
    }),
    [
      state.status,
      state.progress,
      state.error,
      refresh,
      updateFromResponse,
      consumeMyScoutingUnlockEvent,
    ],
  );

  return (
    <ScoutingProgressContext.Provider value={value}>
      {children}
    </ScoutingProgressContext.Provider>
  );
}

export function useScoutingProgress(): ScoutingProgressContextValue {
  const context = useContext(ScoutingProgressContext);

  if (!context) {
    throw new Error(
      'useScoutingProgress must be used within ScoutingProgressProvider',
    );
  }

  return context;
}
