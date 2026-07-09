"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PairResponse } from "./duelTypes";
import { SLIDE_MS, normalizePair } from "./duelUtils";
import { fetchDuelPair } from "./duelApi";
import { logEvent } from "@/lib/telemetry";

export type DuelTransition = "idle" | "exit" | "enter";

export type UseDuelPairNavigationOptions = {
  initialPair?: unknown;
  clearAutoNext: (resetProgress: boolean) => void;
  resetRevealState: () => void;
  clearPendingUi: () => void;
  voting: boolean;
  lastWinner: number | null;
};

export function useDuelPairNavigation({
  initialPair,
  clearAutoNext,
  resetRevealState,
  clearPendingUi,
  voting,
  lastWinner,
}: UseDuelPairNavigationOptions) {
  const [pair, setPair] = useState<PairResponse | null>(() => {
    try {
      return initialPair ? normalizePair(initialPair) : null;
    } catch {
      return null;
    }
  });

  const [loadingPair, setLoadingPair] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transition, setTransition] = useState<DuelTransition>("idle");
  const [showDelayedNextPending, setShowDelayedNextPending] = useState(false);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef(0);

  const fetchInitialPair = useCallback(async () => {
    clearAutoNext(true);

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const seq = ++fetchSeqRef.current;

    setError(null);
    setLoadingPair(true);

    setPair(null);
    resetRevealState();
    setTransition("idle");

    try {
      const next = await fetchDuelPair(controller.signal);

      if (fetchSeqRef.current !== seq) return;

      setTransition("enter");
      setPair(next);
      requestAnimationFrame(() => setTransition("idle"));
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      if (fetchSeqRef.current !== seq) return;
      const msg = e instanceof Error ? e.message : "Błąd pobierania pary";
      setError(msg);
      setTransition("idle");
    } finally {
      if (fetchSeqRef.current !== seq) return;
      setLoadingPair(false);
    }
  }, [clearAutoNext, resetRevealState]);

  const fetchNextPair = useCallback(async () => {
    if (loadingPair) return;

    clearAutoNext(true);

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const seq = ++fetchSeqRef.current;

    setError(null);
    setLoadingPair(true);

    try {
      const next = await fetchDuelPair(controller.signal);

      if (fetchSeqRef.current !== seq) return;

      setTransition("exit");
      window.setTimeout(() => {
        if (fetchSeqRef.current !== seq) return;

        setPair(next);
        resetRevealState();

        setTransition("enter");
        requestAnimationFrame(() => setTransition("idle"));

        setLoadingPair(false);
      }, SLIDE_MS);
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      if (fetchSeqRef.current !== seq) return;
      const msg = e instanceof Error ? e.message : "Błąd pobierania pary";
      setError(msg);
      setTransition("idle");
      setLoadingPair(false);
    }
  }, [loadingPair, clearAutoNext, resetRevealState]);

  const goNext = useCallback(() => {
    clearPendingUi();
    fetchNextPair();
  }, [clearPendingUi, fetchNextPair]);

  const handleSkip = useCallback(async () => {
    if (!pair) return;
    if (voting || skipping) return;
    if (transition !== "idle" || loadingPair) return;
    if (lastWinner !== null) return;

    clearAutoNext(true);
    setError(null);
    setSkipping(true);

    clearPendingUi();
    setShowDelayedNextPending(true);

    try {
      const duelId = Number(pair.pair_id);
      if (!Number.isFinite(duelId) || duelId <= 0) {
        throw new Error("Invalid duel_id");
      }

      const res = await fetch("/api/duels/skip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ duel_id: duelId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Skip failed: ${res.status} ${txt.slice(0, 160)}`);
      }

      logEvent("skip_clicked", {
        pair_id: pair.pair_id ?? null,
        duel_id: duelId,
        attribute_key: pair.attribute,
        player_a_id: pair.left.id,
        player_b_id: pair.right.id,
      });

      goNext();
    } catch (e: unknown) {
      setShowDelayedNextPending(false);
      const msg = e instanceof Error ? e.message : "Błąd pomijania pojedynku";
      setError(msg);
    } finally {
      setSkipping(false);
    }
  }, [
    pair,
    voting,
    skipping,
    transition,
    loadingPair,
    lastWinner,
    clearAutoNext,
    clearPendingUi,
    goNext,
  ]);

  useEffect(() => {
    if (pair) return;
    if (loadingPair) return;
    if (error) return;
    fetchInitialPair();
  }, [pair, loadingPair, error, fetchInitialPair]);

  useEffect(() => {
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!pair || !loadingPair) {
      setShowDelayedNextPending(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowDelayedNextPending(true);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [pair, loadingPair]);

  useEffect(() => {
    if (!pair?.pair_id) return;

    logEvent("duel_loaded", {
      pair_id: pair.pair_id,
      attribute_key: pair.attribute,
      attribute_label: pair.attributeLabel ?? null,
      player_a_id: pair.left.id,
      player_b_id: pair.right.id,
    });
  }, [pair?.pair_id]);

  return {
    pair,
    loadingPair,
    error,
    setError,
    transition,
    skipping,
    showDelayedNextPending,
    goNext,
    handleSkip,
  };
}
