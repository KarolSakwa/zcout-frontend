'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { logEvent } from '@/lib/telemetry';
import {
  DEBOUNCE_MS,
  fetchGlobalSearch,
  MIN_QUERY_LENGTH,
  type SearchClub,
  type SearchPlayer,
} from './globalSearchApi';

export function useGlobalSearch() {
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [clubs, setClubs] = useState<SearchClub[]>([]);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const hasMinLength = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const hasAnyResults = players.length > 0 || clubs.length > 0;

  useEffect(() => {
    if (!hasMinLength) {
      if (abortRef.current) abortRef.current.abort();
      setLoading(false);
      setPlayers([]);
      setClubs([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchGlobalSearch(trimmedQuery, controller.signal);

        logEvent('search_used', {
          query: trimmedQuery,
          players_count: data.players.length,
          clubs_count: data.clubs.length,
        });

        setPlayers(data.players);
        setClubs(data.clubs);
      } catch (e) {
        if (controller.signal.aborted) return;
        const message = e instanceof Error ? e.message : 'Search failed';
        setPlayers([]);
        setClubs([]);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, hasMinLength]);

  return useMemo(
    () => ({
      query,
      setQuery,
      trimmedQuery,
      hasMinLength,
      hasAnyResults,
      loading,
      error,
      players,
      clubs,
    }),
    [
      clubs,
      error,
      hasAnyResults,
      hasMinLength,
      loading,
      players,
      query,
      trimmedQuery,
    ],
  );
}
