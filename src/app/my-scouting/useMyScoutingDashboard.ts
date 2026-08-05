'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useScoutingProgress } from '@/components/scouting/ScoutingProgressProvider';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';
import { fetchMyScouting } from '@/lib/scoutingApi';
import { isMyScoutingResponse, normalizeRecentContributions } from '@/lib/myScoutingGuards';

export type MyScoutingDashboardStatus = 'idle' | 'loading' | 'ready' | 'error';

export type MyScoutingPageState =
  | 'provider-loading'
  | 'provider-error'
  | 'locked'
  | 'dashboard-loading'
  | 'dashboard-error'
  | 'dashboard-ready';

export function useMyScoutingDashboard() {
  const { user } = useAuth();
  const { status, progress, error, refresh, updateFromResponse } = useScoutingProgress();

  const [dashboard, setDashboard] = useState<MyScoutingResponse | null>(null);
  const [dashboardStatus, setDashboardStatus] =
    useState<MyScoutingDashboardStatus>('idle');
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const fetchGenerationRef = useRef(0);

  const identityKey = useMemo(() => {
    if (user?.id != null) {
      return `user:${user.id}`;
    }

    const anonId = ensureBrowserAnonId();
    return anonId ? `anon:${anonId}` : 'anon:unknown';
  }, [user?.id]);

  const isProviderReady = status === 'ready' && progress != null;
  const isUnlocked = isProviderReady && progress.my_scouting_unlocked;
  const isLocked = isProviderReady && !progress.my_scouting_unlocked;

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async () => {
    abortControllerRef.current?.abort();

    const generation = ++fetchGenerationRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setDashboardStatus('loading');
    setDashboardError(null);

    try {
      const response = await fetchMyScouting(ensureBrowserAnonId(), controller.signal);

      if (generation !== fetchGenerationRef.current) {
        return;
      }

      if (!isMyScoutingResponse(response)) {
        throw new Error('Invalid my scouting response.');
      }

      updateFromResponse(response.scouting_progress);

      if (!response.scouting_progress.my_scouting_unlocked) {
        setDashboard(null);
        setDashboardStatus('idle');
        return;
      }

      setDashboard({
        ...response,
        recent_contributions: normalizeRecentContributions(
          response.recent_contributions,
        ),
      });
      setDashboardStatus('ready');
    } catch (fetchError) {
      if (generation !== fetchGenerationRef.current) {
        return;
      }

      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return;
      }

      setDashboard(null);
      setDashboardStatus('error');
      setDashboardError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load my scouting dashboard.',
      );
    }
  }, [updateFromResponse]);

  useEffect(() => {
    setDashboard(null);
    setDashboardStatus('idle');
    setDashboardError(null);
    fetchGenerationRef.current += 1;
    abortControllerRef.current?.abort();
  }, [identityKey]);

  useEffect(() => {
    if (!isUnlocked) {
      setDashboard(null);
      setDashboardStatus('idle');
      setDashboardError(null);
      abortControllerRef.current?.abort();
      return;
    }

    void loadDashboard();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isUnlocked, identityKey, loadDashboard]);

  const pageState = useMemo<MyScoutingPageState>(() => {
    if (status === 'loading') {
      return 'provider-loading';
    }

    if (status === 'error') {
      return 'provider-error';
    }

    if (isLocked) {
      return 'locked';
    }

    if (!isUnlocked) {
      return 'provider-loading';
    }

    if (dashboardStatus === 'loading' || dashboardStatus === 'idle') {
      return 'dashboard-loading';
    }

    if (dashboardStatus === 'error') {
      return 'dashboard-error';
    }

    return 'dashboard-ready';
  }, [status, isLocked, isUnlocked, dashboardStatus]);

  const retry = useCallback(() => {
    if (status === 'error') {
      void refresh();
      return;
    }

    if (dashboardStatus === 'error') {
      void loadDashboard();
    }
  }, [status, dashboardStatus, refresh, loadDashboard]);

  return {
    user,
    progress,
    providerError: error,
    dashboard,
    pageState,
    retry,
  };
}
