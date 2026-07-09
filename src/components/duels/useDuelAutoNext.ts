"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_NEXT_MS = 5000;
const COUNTDOWN_START_AFTER_REVEAL_MS = 450;
const COUNTDOWN_TICK_MS = 50;

export type UseDuelAutoNextOptions = {
  onComplete: () => void;
};

export function useDuelAutoNext({ onComplete }: UseDuelAutoNextOptions) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const startTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startAtRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopInterval = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const runTick = useCallback(() => {
    const startAt = startAtRef.current;
    const base = elapsedRef.current;
    const now = performance.now();
    const elapsed = startAt == null ? base : base + (now - startAt);
    const p = Math.min(1, elapsed / AUTO_NEXT_MS);
    setProgress(p);

    if (p >= 1) {
      stopInterval();
      startAtRef.current = null;
      elapsedRef.current = 0;
      setRunning(false);
      setPaused(false);
      onCompleteRef.current();
    }
  }, [stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = window.setInterval(runTick, COUNTDOWN_TICK_MS);
  }, [stopInterval, runTick]);

  const clear = useCallback(
    (resetProgress: boolean) => {
      if (startTimerRef.current)
        window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;

      stopInterval();

      startAtRef.current = null;
      elapsedRef.current = 0;

      setRunning(false);
      setPaused(false);
      if (resetProgress) setProgress(0);
    },
    [stopInterval],
  );

  const startNow = useCallback(() => {
    stopInterval();

    elapsedRef.current = 0;
    startAtRef.current = performance.now();

    setProgress(0);
    setRunning(true);
    setPaused(false);

    startInterval();
  }, [stopInterval, startInterval]);

  const scheduleAfterReveal = useCallback(() => {
    if (startTimerRef.current)
      window.clearTimeout(startTimerRef.current);
    startTimerRef.current = window.setTimeout(() => {
      startTimerRef.current = null;
      startNow();
    }, COUNTDOWN_START_AFTER_REVEAL_MS);
  }, [startNow]);

  const pause = useCallback(() => {
    if (!running || paused) return;

    stopInterval();

    const startAt = startAtRef.current;
    if (startAt != null)
      elapsedRef.current += performance.now() - startAt;
    startAtRef.current = null;
    setPaused(true);
  }, [running, paused, stopInterval]);

  const resume = useCallback(() => {
    if (!running || !paused) return;

    startAtRef.current = performance.now();
    setPaused(false);

    startInterval();
  }, [running, paused, startInterval]);

  useEffect(() => {
    return () => {
      if (startTimerRef.current)
        window.clearTimeout(startTimerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  return {
    progress,
    running,
    paused,
    clear,
    scheduleAfterReveal,
    pause,
    resume,
  };
}
