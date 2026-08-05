"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  RatingsMap,
  VoteApiResponse,
} from "./duels/duelTypes";
import { ATTR_MAP, SLIDE_MS, toPct } from "./duels/duelUtils";
import { useDuelPairNavigation } from "./duels/useDuelPairNavigation";
import DuelCountdownBar from "./duels/DuelCountdownBar";
import DuelAttributeHeader from "./duels/DuelAttributeHeader";
import DuelCardsRow from "./duels/DuelCardsRow";
import DuelRevealPanel from "./duels/DuelRevealPanel";
import DuelHomepageAttributeLink from "./duels/DuelHomepageAttributeLink";
import DuelLoadingOverlays from "./duels/DuelLoadingOverlays";
import DuelVoteHint from "./duels/DuelVoteHint";
import RecentVotesWidget from "./duels/RecentVotesWidget";
import TopRisersWidget from "./duels/TopRisersWidget";
import { useDuelSideWidgets } from "./duels/useDuelSideWidgets";
import { useDuelAutoNext } from "./duels/useDuelAutoNext";
import { logEvent } from "@/lib/telemetry";
import { ensureCsrfToken } from "@/lib/ensureCsrfToken";
import { useScoutingProgress } from "@/components/scouting/ScoutingProgressProvider";
import ScoutingProgressBar from "@/components/scouting/ScoutingProgressBar";
import ScoutingProgressStartedHint from "@/components/scouting/ScoutingProgressStartedHint";
import { useAuth } from "@/components/AuthProvider";
import {
  readPersistenceFlag,
  scoutingProgressStartedHintKey,
} from "@/lib/scoutingUiPersistence";
import { ensureBrowserAnonId } from "@/lib/anonId/browser";
import {
  shouldShowDuelActions,
  shouldShowScoutingStartedHint,
} from "@/lib/duelScoutingUi";
import type { DuelVoteWithScoutingProgress } from "@/lib/scoutingTypes";
import { isScoutingProgress } from "@/lib/scoutingTypes";
import type { ScoutingProgress } from "@/lib/scoutingTypes";
import { useHomepageSectionLoading, useIsHomepageReady } from "@/components/homepage/HomepageLoadingContext";
import styles from "./Duel.module.css";

const COUNTDOWN_BAR_H = 7;
/** Measured HEAD homepage cards-row width at viewport >1721px. */
const HOMEPAGE_CANONICAL_ROW_PX = 425;
/** Canonical idle inset on that 425px row (pulls cards toward the loader). */
const HOMEPAGE_CANONICAL_INSET_PX = 48;
/** Visual gap between cards at the canonical row (133 track − 2×48 inset). */
const HOMEPAGE_CANONICAL_CARD_GAP_PX = 37;
/** Keep a little air around the ~30px loader when the row shrinks. */
const HOMEPAGE_MIN_CARD_GAP_PX = 36;
const HOMEPAGE_TRACK_RATIO = (31 * 2 + 71) / HOMEPAGE_CANONICAL_ROW_PX;
const HOMEPAGE_GRID_GAP_MAX = 31;
const HOMEPAGE_GRID_GAP_MIN = 8;
const HOMEPAGE_GRID_CENTER_MAX = 71;
const HOMEPAGE_GRID_CENTER_MIN = 36;
const HOMEPAGE_CARD_MAX = 146;

/** Neutral card span: 2 × card width + visual gap (excludes reveal center spacer). */
function computeHomepageNeutralSpanPx(rowWidth: number): number {
  const effectiveRow = Math.max(
    0,
    Math.min(rowWidth, HOMEPAGE_CANONICAL_ROW_PX),
  );
  if (effectiveRow <= 0) return 0;

  const scale = Math.min(1, effectiveRow / HOMEPAGE_CANONICAL_ROW_PX);
  const gridGap = Math.max(
    HOMEPAGE_GRID_GAP_MIN,
    Math.min(HOMEPAGE_GRID_GAP_MAX, effectiveRow * 0.07294),
  );
  const center = Math.max(
    HOMEPAGE_GRID_CENTER_MIN,
    Math.min(HOMEPAGE_GRID_CENTER_MAX, effectiveRow * 0.16706),
  );
  const card = Math.min(
    HOMEPAGE_CARD_MAX,
    (effectiveRow - center - 2 * gridGap) / 2,
  );
  const neutralGap = Math.max(
    HOMEPAGE_MIN_CARD_GAP_PX,
    HOMEPAGE_CANONICAL_CARD_GAP_PX * scale,
  );

  return Math.round(2 * card + neutralGap);
}

type VotePlayerResult = {
  id: number | string;
  rating: number;
  rating_before: number | null;
  rating_after: number | null;
  delta: number;
  votes_count?: number;
};

type VotePopularity = {
  votes_a?: number | null;
  votes_b?: number | null;
};

type DuelProps = {
  initialPair?: unknown;
  homepageMode?: boolean;
};

export default function Duel({ initialPair, homepageMode = false }: DuelProps) {
  const { updateFromResponse, progress: scoutingProgress } = useScoutingProgress();
  const { user } = useAuth();
  const [frozenScoutingProgress, setFrozenScoutingProgress] =
    useState<ScoutingProgress | null>(null);
  const scoutingProgressRef = useRef(scoutingProgress);
  scoutingProgressRef.current = scoutingProgress;
  const [pendingScoutingHint, setPendingScoutingHint] = useState(false);
  const [voting, setVoting] = useState(false);
  const [duelBootstrapped, setDuelBootstrapped] = useState(false);

  const [showPendingUi, setShowPendingUi] = useState(false);
  const pendingUiTimerRef = useRef<number | null>(null);

  const [postVoteRatings, setPostVoteRatings] = useState<RatingsMap | null>(
    null,
  );
  const [lastWinner, setLastWinner] = useState<number | null>(null);

  const [impactVisible, setImpactVisible] = useState(false);
  const [barPct, setBarPct] = useState<Record<string, number>>({});

  const [nextHover, setNextHover] = useState(false);
  const [duelVotePct, setDuelVotePct] = useState<{
    left: number;
    right: number;
  } | null>(null);
  const [isCompactDuelLayout, setIsCompactDuelLayout] = useState(false);
  const [widgetsStacked, setWidgetsStacked] = useState(false);
  const [homepageRowWidth, setHomepageRowWidth] = useState(
    HOMEPAGE_CANONICAL_ROW_PX,
  );
  const [cardHintLift, setCardHintLift] = useState(false);
  const cardHintLiftTimerRef = useRef<number | null>(null);
  const [homepageNeutralSpanPx, setHomepageNeutralSpanPx] = useState<number | null>(
    null,
  );
  const shellRef = useRef<HTMLDivElement | null>(null);

  const goNextRef = useRef<() => void>(() => {});

  const glow = "var(--ui-accent-primary)";

  const { recentVotes, latestRecentVoteId, topMoversMode, topMoverItems } =
    useDuelSideWidgets();

  const resetRevealState = useCallback(() => {
    setPostVoteRatings(null);
    setLastWinner(null);
    setImpactVisible(false);
    setBarPct({});
    setDuelVotePct(null);
    setFrozenScoutingProgress(null);

    setShowPendingUi(false);
    if (pendingUiTimerRef.current)
      window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;
  }, []);

  const clearPendingUi = useCallback(() => {
    setShowPendingUi(false);
    if (pendingUiTimerRef.current)
      window.clearTimeout(pendingUiTimerRef.current);
    pendingUiTimerRef.current = null;
  }, []);

  const {
    progress: autoNextProgress,
    running: autoNextRunning,
    paused: autoNextPaused,
    clear: clearAutoNext,
    scheduleAfterReveal: scheduleAutoNextAfterReveal,
    pause: pauseAutoNext,
    resume: resumeAutoNext,
  } = useDuelAutoNext({ onComplete: () => goNextRef.current() });

  const {
    pair,
    loadingPair,
    error,
    setError,
    transition,
    skipping,
    showDelayedNextPending,
    goNext,
    handleSkip,
  } = useDuelPairNavigation({
    initialPair,
    clearAutoNext,
    resetRevealState,
    clearPendingUi,
    voting,
    lastWinner,
  });

  goNextRef.current = goNext;

  const attribute = pair?.attribute ?? "";

  useEffect(() => {
    if (!homepageMode) return;
    if (pair || error) {
      setDuelBootstrapped(true);
    }
  }, [homepageMode, pair, error]);

  useHomepageSectionLoading("duel", !duelBootstrapped, homepageMode);

  const isHomepageReady = useIsHomepageReady();

  useEffect(() => {
    if (homepageMode) {
      const el = shellRef.current;
      if (!el) return;

      const updateFromWidth = (width: number) => {
        if (width <= 0) return;
        // Row is capped at the canonical 425px; track its effective width so
        // the desktop inset can scale on narrow containers instead of dropping to 0.
        setHomepageRowWidth(Math.min(width, HOMEPAGE_CANONICAL_ROW_PX));
      };

      const measure = () => {
        const row = el.querySelector('[data-hp-duel-row]');
        const width =
          row?.getBoundingClientRect().width ?? el.getBoundingClientRect().width;
        updateFromWidth(width);
      };
      measure();
      const raf = window.requestAnimationFrame(measure);

      if (typeof ResizeObserver === "undefined") {
        return () => window.cancelAnimationFrame(raf);
      }

      const observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(el);
      const row = el.querySelector('[data-hp-duel-row]');
      if (row) {
        observer.observe(row);
      }
      return () => {
        window.cancelAnimationFrame(raf);
        observer.disconnect();
      };
    }

    const mqCompact = window.matchMedia("(max-width: 700px)");
    const mqStacked = window.matchMedia("(max-width: 1200px)");
    const updateCompact = () => setIsCompactDuelLayout(mqCompact.matches);
    const updateStacked = () => setWidgetsStacked(mqStacked.matches);

    updateCompact();
    updateStacked();
    mqCompact.addEventListener("change", updateCompact);
    mqStacked.addEventListener("change", updateStacked);

    return () => {
      mqCompact.removeEventListener("change", updateCompact);
      mqStacked.removeEventListener("change", updateStacked);
    };
  }, [homepageMode]);

  useEffect(() => {
    if (!homepageMode) return;
    setHomepageNeutralSpanPx(null);
  }, [homepageMode, pair?.pair_id]);

  useLayoutEffect(() => {
    if (!homepageMode || !shellRef.current) return;
    if (lastWinner !== null || transition !== "idle" || showPendingUi) return;

    const leftSlot = shellRef.current.querySelector('[data-hp-duel-slot="left"]');
    const slotTransform = leftSlot ? getComputedStyle(leftSlot).transform : "none";
    const insetMatch = slotTransform.match(
      /matrix\([^,]+,[^,]+,[^,]+,[^,]+,([^,]+),/,
    );
    const insetX = insetMatch ? Math.abs(parseFloat(insetMatch[1])) : 0;
    if (insetX < 1) return;

    const leftCard = shellRef.current.querySelector(
      '[data-hp-duel-slot="left"] [data-homepage="true"]',
    );
    const rightCard = shellRef.current.querySelector(
      '[data-hp-duel-slot="right"] [data-homepage="true"]',
    );
    if (!leftCard || !rightCard) return;

    const row = shellRef.current.querySelector('[data-hp-duel-row]');
    const rowWidth = row?.getBoundingClientRect().width ?? 0;

    const span =
      rightCard.getBoundingClientRect().right -
      leftCard.getBoundingClientRect().left;

    if (rowWidth > 0 && span > rowWidth * 0.88) return;

    if (span > 0) {
      setHomepageNeutralSpanPx(span);
    }
  }, [
    homepageMode,
    homepageRowWidth,
    lastWinner,
    transition,
    showPendingUi,
    pair,
  ]);

  const homepageProgressWidth = homepageMode
    ? homepageNeutralSpanPx ??
      computeHomepageNeutralSpanPx(
        homepageRowWidth > 0 ? homepageRowWidth : HOMEPAGE_CANONICAL_ROW_PX,
      )
    : undefined;

  const showReveal = lastWinner !== null;

  const cardStyle = useCallback(
    (side: "left" | "right"): React.CSSProperties => {
      const isLeft = side === "left";

      const base: React.CSSProperties = {
        transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`,
        willChange: "transform, opacity, filter",
        pointerEvents: transition === "idle" && !showReveal ? "auto" : "none",
      };

      const homepageScale = Math.min(
        1,
        homepageRowWidth / HOMEPAGE_CANONICAL_ROW_PX,
      );
      const homepageTrack = homepageRowWidth * HOMEPAGE_TRACK_RATIO;
      const homepageCardGap = Math.max(
        HOMEPAGE_CANONICAL_CARD_GAP_PX * homepageScale,
        HOMEPAGE_MIN_CARD_GAP_PX,
      );
      const isDuelsMobile = !homepageMode && isCompactDuelLayout;
      const isDuelsDesktopWide =
        !homepageMode && !isCompactDuelLayout && !widgetsStacked;
      const INSET_X = homepageMode
        ? Math.max(
            0,
            Math.round((homepageTrack - homepageCardGap) / 2),
          )
        : isDuelsDesktopWide
          ? HOMEPAGE_CANONICAL_INSET_PX
          : isDuelsMobile
            ? 10
            : isCompactDuelLayout || widgetsStacked
              ? 0
              : HOMEPAGE_CANONICAL_INSET_PX;
      const PENDING_X = homepageMode
        ? Math.round(2 * homepageScale)
        : isDuelsDesktopWide
          ? 2
          : isDuelsMobile
            ? 8
            : isCompactDuelLayout || widgetsStacked
              ? 0
              : 2;
      const EXIT_X = homepageMode
        ? Math.round(90 * homepageScale)
        : isDuelsDesktopWide
          ? 90
          : isCompactDuelLayout || widgetsStacked
            ? 40
            : 90;
      const ENTER_X = homepageMode
        ? Math.round(50 * homepageScale)
        : isDuelsDesktopWide
          ? 50
          : isCompactDuelLayout || widgetsStacked
            ? 24
            : 50;

      if (transition === "exit") {
        return {
          ...base,
          transform: `translateX(${isLeft ? -EXIT_X : EXIT_X}px)`,
          opacity: 0,
          filter: "blur(6px)",
        };
      }

      if (transition === "enter") {
        return {
          ...base,
          transform: `translateX(${isLeft ? -ENTER_X : ENTER_X}px)`,
          opacity: 0,
          filter: "blur(6px)",
        };
      }

      const x = showPendingUi
        ? isLeft
          ? -PENDING_X
          : PENDING_X
        : isLeft
          ? INSET_X
          : -INSET_X;

      return {
        ...base,
        transform: `translateX(${x}px)`,
        opacity: 1,
        filter: "none",
      };
    },
    [
      transition,
      showPendingUi,
      showReveal,
      isCompactDuelLayout,
      widgetsStacked,
      homepageMode,
      homepageRowWidth,
    ],
  );

  useEffect(() => {
    return () => {
      if (pendingUiTimerRef.current)
        window.clearTimeout(pendingUiTimerRef.current);
      if (cardHintLiftTimerRef.current)
        window.clearTimeout(cardHintLiftTimerRef.current);
    };
  }, []);

  const handleVoteHintVisible = useCallback(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    if (cardHintLiftTimerRef.current) {
      window.clearTimeout(cardHintLiftTimerRef.current);
    }

    setCardHintLift(true);
    cardHintLiftTimerRef.current = window.setTimeout(() => {
      setCardHintLift(false);
      cardHintLiftTimerRef.current = null;
    }, 650);
  }, []);

  useEffect(() => {
    if (!postVoteRatings) return;

    const next: Record<string, number> = {};
    for (const [id, v] of Object.entries(postVoteRatings))
      next[id] = toPct(v.rating_before);
    setBarPct(next);

    requestAnimationFrame(() => {
      const after: Record<string, number> = {};
      for (const [id, v] of Object.entries(postVoteRatings))
        after[id] = toPct(v.rating_after);
      setBarPct(after);
    });
  }, [postVoteRatings]);

  const handleVote = useCallback(
    async (winnerId: number) => {
      if (!pair || voting) return;
      if (transition !== "idle") return;
      if (lastWinner !== null) return;

      clearAutoNext(true);

      setVoting(true);
      setError(null);

      if (scoutingProgressRef.current) {
        setFrozenScoutingProgress(scoutingProgressRef.current);
      }

      setLastWinner(winnerId);
      setImpactVisible(false);
      setPostVoteRatings(null);
      setDuelVotePct(null);

      setShowPendingUi(false);
      if (pendingUiTimerRef.current)
        window.clearTimeout(pendingUiTimerRef.current);
      pendingUiTimerRef.current = window.setTimeout(
        () => setShowPendingUi(true),
        150,
      );

      const attrKey =
        ATTR_MAP[String(pair.attribute ?? "DRI").toUpperCase()] ??
        String(pair.attribute ?? "dribbling").toLowerCase();

      const body = {
        duel_id: pair.pair_id,
        attribute_key: attrKey,
        player_a_id: pair.left.id,
        player_b_id: pair.right.id,
        winner_id: winnerId,
      };

      try {
        const xsrf = await ensureCsrfToken();

        const res = await fetch("/api/vote", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": xsrf,
          },
          body: JSON.stringify(body),
        });

        if (res.status === 409) {
          setShowPendingUi(false);
          if (pendingUiTimerRef.current)
            window.clearTimeout(pendingUiTimerRef.current);
          pendingUiTimerRef.current = null;
          setLastWinner(null);
          clearAutoNext(true);
          goNext();
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Vote failed: ${res.status} ${text.slice(0, 200)}`);
        }

        const data = (await res.json()) as VoteApiResponse &
          DuelVoteWithScoutingProgress & {
          players?: VotePlayerResult[];
          popularity?: VotePopularity | null;
        };

        if (isScoutingProgress(data.scouting_progress)) {
          updateFromResponse(data.scouting_progress, 'duel_vote');

          if (
            !user &&
            data.scouting_progress.contributions === 1
          ) {
            const anonId = ensureBrowserAnonId();
            if (
              anonId &&
              !readPersistenceFlag(scoutingProgressStartedHintKey(anonId))
            ) {
              setPendingScoutingHint(true);
            }
          }
        }

        logEvent("vote_submitted", {
          duel_id: data.duel_id ?? null,
          pair_id: pair.pair_id ?? null,
          attribute_key: pair.attribute,
          winner_id: winnerId,
          player_a_id: pair.left.id,
          player_b_id: pair.right.id,
        });

        const map: RatingsMap = {};
        for (const pl of data.players ?? []) {
          map[String(pl.id)] = {
            rating: pl.rating,
            rating_before: pl.rating_before,
            rating_after: pl.rating_after,
            delta: pl.delta,
            votes_count: pl.votes_count,
            attribute_rank: pl.attribute_rank,
            is_top_ten: pl.is_top_ten,
          };
        }

        const pop = data.popularity;
        const votesA = Number(pop?.votes_a);
        const votesB = Number(pop?.votes_b);

        if (
          Number.isFinite(votesA) &&
          Number.isFinite(votesB) &&
          votesA + votesB > 0
        ) {
          const left = Math.round((votesA / (votesA + votesB)) * 1000) / 10;
          const right = Math.max(0, Math.round((100 - left) * 10) / 10);
          setDuelVotePct({ left, right });
        } else {
          setDuelVotePct(null);
        }

        setPostVoteRatings(map);
        setImpactVisible(true);

        setShowPendingUi(false);
        if (pendingUiTimerRef.current)
          window.clearTimeout(pendingUiTimerRef.current);
        pendingUiTimerRef.current = null;

        scheduleAutoNextAfterReveal();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Błąd zapisu głosu";
        setError(msg);
        setLastWinner(null);
        setFrozenScoutingProgress(null);
        setShowPendingUi(false);
        if (pendingUiTimerRef.current)
          window.clearTimeout(pendingUiTimerRef.current);
        pendingUiTimerRef.current = null;
        clearAutoNext(true);
      } finally {
        setVoting(false);
      }
    },
    [
      pair,
      voting,
      transition,
      clearAutoNext,
      scheduleAutoNextAfterReveal,
      lastWinner,
      goNext,
      setError,
      updateFromResponse,
      user,
    ],
  );

  const showImpact = impactVisible && !!postVoteRatings;
  const showHomepagePairLoading =
    homepageMode && duelBootstrapped && loadingPair && !pair;
  const showCountdown = showImpact && autoNextRunning && transition === "idle";

  const nextDisabled = transition !== "idle" || loadingPair;
  const nextIsHover = nextHover && !nextDisabled;

  const showOverlayLoader = !pair && (loadingPair || skipping);
  const overlayBlur = showOverlayLoader && !!pair;
  const skipDisabled =
    !pair ||
    skipping ||
    voting ||
    loadingPair ||
    transition !== "idle" ||
    showReveal;

  const canShowVoteHint =
    homepageMode &&
    isHomepageReady &&
    !!pair &&
    !loadingPair &&
    !error &&
    !showReveal &&
    !showPendingUi &&
    !voting &&
    !skipping &&
    transition === "idle" &&
    !showCountdown &&
    !showImpact &&
    !showHomepagePairLoading &&
    !showOverlayLoader;

  const showDuelActions = shouldShowDuelActions({
    pair,
    showImpact,
    showOverlayLoader,
    showHomepagePairLoading,
    transition,
    skipping,
  });

  const progressBarOverride = frozenScoutingProgress ?? undefined;

  const canShowScoutingStartedHint = shouldShowScoutingStartedHint({
    pair,
    showImpact,
    showReveal,
    showOverlayLoader,
    showHomepagePairLoading,
    transition,
    voting,
    skipping,
    pendingScoutingHint,
    isLoggedIn: !!user,
    loadingPair,
    error,
    showPendingUi,
    showCountdown,
  });

  const sideWidgets = !homepageMode ? (
    <>
      <TopRisersWidget
        items={topMoverItems}
        mode={topMoversMode}
        docked={widgetsStacked}
        embedded={widgetsStacked}
      />
      <RecentVotesWidget
        items={recentVotes}
        latestItemId={latestRecentVoteId}
        docked={widgetsStacked}
        embedded={widgetsStacked}
      />
    </>
  ) : null;

  const duelMain = (
    <>
      <div
        style={{
          filter: overlayBlur ? "blur(4px) saturate(0.9)" : "none",
          opacity: overlayBlur ? 0.55 : 1,
          transition: "filter 180ms ease, opacity 180ms ease",
          pointerEvents: overlayBlur ? "none" : "auto",
        }}
      >
        <div className={styles.duelStageOuter}>
          <div className={styles.duelStageCenter}>
            {!homepageMode && !widgetsStacked ? sideWidgets : null}

            <div
              style={{
                filter: showDelayedNextPending ? "blur(2px)" : "none",
                opacity: showDelayedNextPending ? 0.5 : 1,
                transition: "filter 180ms ease, opacity 180ms ease",
              }}
            >
              {homepageMode ? (
                <DuelHomepageAttributeLink
                  attribute={String(pair?.attribute ?? attribute)}
                />
              ) : (
                <div>
                  <DuelAttributeHeader
                    attribute={String(pair?.attribute ?? attribute)}
                  />
                </div>
              )}

              {error && (
                <div
                  style={{
                    maxWidth: 996,
                    margin: "0 auto 12px",
                    padding: "12px 14px",
                    borderRadius: "var(--ui-radius-md)",
                    border: "1px solid var(--ui-border-subtle)",
                    background: "var(--ui-surface-soft)",
                    color: "var(--ui-text-primary)",
                    whiteSpace: "pre-wrap",
                    boxShadow: "var(--ui-shadow-panel-soft)",
                  }}
                >
                  {error}
                </div>
              )}

              {(pair ||
                showHomepagePairLoading ||
                (!homepageMode && loadingPair)) && (
                <div style={{ position: "relative" }}>
                  <DuelCardsRow
                    pair={pair}
                    loading={
                      homepageMode ? showHomepagePairLoading : loadingPair
                    }
                    cardStyle={cardStyle}
                    showPendingUi={showPendingUi}
                    showReveal={showReveal}
                    lastWinner={lastWinner}
                    glow={glow}
                    handleVote={handleVote}
                    showImpact={showImpact}
                    postVoteRatings={postVoteRatings}
                    barPct={barPct}
                    homepageMode={homepageMode}
                    hintLiftActive={homepageMode && cardHintLift}
                  />
                </div>
              )}
            </div>

            <DuelLoadingOverlays
              placement="stage"
              homepageMode={homepageMode}
              showDelayedNextPending={showDelayedNextPending}
            />
          </div>
        </div>
      </div>

      <div
        className={
          homepageMode
            ? `${styles.duelSkipArea} ${styles.duelSkipAreaHomepage}`
            : undefined
        }
        style={
          homepageMode
            ? {
                display: "flex",
                flexDirection: "column",
                alignItems:
                  !(showImpact && postVoteRatings) ? "center" : undefined,
                justifyContent:
                  !(showImpact && postVoteRatings) ? "center" : "center",
                pointerEvents: showOverlayLoader ? "none" : "auto",
              }
            : {
                height: 160,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: showOverlayLoader ? "none" : "auto",
              }
        }
        data-duels-skip={!homepageMode ? true : undefined}
        data-hp-reveal={homepageMode && showImpact && postVoteRatings ? "true" : undefined}
      >
        {homepageMode && (
          <DuelVoteHint
            canShow={canShowVoteHint}
            onHintVisible={handleVoteHintVisible}
          />
        )}
        <ScoutingProgressStartedHint
          canShow={canShowScoutingStartedHint}
          onDismiss={() => setPendingScoutingHint(false)}
        />
        {homepageMode && showDuelActions ? (
          <div
            className={styles.homepageProgressOverlay}
            style={{ width: homepageProgressWidth }}
          >
            <ScoutingProgressBar
              variant="compact"
              compactLayout="fluid"
              progressOverride={progressBarOverride}
            />
          </div>
        ) : null}
        {showDuelActions && !homepageMode ? (
          <div className={styles.duelPageActionsProgress}>
            <ScoutingProgressBar
              variant="default"
              progressOverride={progressBarOverride}
            />
          </div>
        ) : null}
        {showImpact && postVoteRatings ? (
          <div style={{ width: "100%" }}>
            <DuelRevealPanel
              pair={pair!}
              onMouseEnter={pauseAutoNext}
              onMouseLeave={resumeAutoNext}
              duelVotePct={duelVotePct}
              lastWinner={lastWinner}
              nextDisabled={nextDisabled}
              nextIsHover={nextIsHover}
              setNextHover={setNextHover}
              goNext={goNext}
              showImpact={showImpact}
              postVoteRatings={postVoteRatings}
              glow={glow}
              barPct={barPct}
              homepageMode={homepageMode}
            />
          </div>
        ) : (
          showDuelActions && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipDisabled}
              style={{
                minWidth: 190,
                padding: "10px 22px",
                borderRadius: "var(--ui-radius-md)",
                border: "1px solid var(--ui-border-accent)",
                color: "var(--ui-accent-primary)",
                background:
                  "linear-gradient(180deg, rgba(26,26,26,0.72), rgba(12,12,12,0.38))",
                boxShadow:
                  "0 14px 38px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.40)",
                backdropFilter: "blur(7px)",
                WebkitBackdropFilter: "blur(7px)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                cursor: skipDisabled ? "default" : "pointer",
                opacity: skipDisabled ? 0.45 : 1,
              }}
            >
              Skip
            </button>
          )
        )}
      </div>

      {!homepageMode && widgetsStacked ? (
        <div className={styles.duelPageStackedWidgets}>{sideWidgets}</div>
      ) : null}
    </>
  );

  return (
    <div
      ref={shellRef}
      className={`${styles.duelShell}${homepageMode ? ` ${styles.duelHomepageShell}` : ""}`}
      data-duels-page={!homepageMode ? "true" : undefined}
    >
      <DuelCountdownBar
        show={showCountdown}
        progress={autoNextProgress}
        paused={autoNextPaused}
        height={COUNTDOWN_BAR_H}
      />

      {duelMain}

      <DuelLoadingOverlays
        placement="shell"
        homepageMode={homepageMode}
        showHomepagePairLoading={showHomepagePairLoading}
        showOverlayLoader={showOverlayLoader}
      />
    </div>
  );
}
