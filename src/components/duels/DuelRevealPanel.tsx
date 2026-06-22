import React, { useMemo, useState } from "react";
import type { PairResponse, RatingsMap } from "./duelTypes";
import CrowdVerdictBar from "./CrowdVerdictBar";
import DuelImpact from "./DuelImpact";

export default function DuelRevealPanel({
  pair,
  onMouseEnter,
  onMouseLeave,
  duelVotePct,
  lastWinner,
  nextDisabled,
  nextIsHover,
  setNextHover,
  goNext,
  showImpact = false,
  postVoteRatings,
  glow = "var(--ui-accent-primary)",
  barPct = {},
  homepageMode = false,
}: {
  pair: PairResponse;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  duelVotePct: { left: number; right: number } | null;
  lastWinner: number | null;
  nextDisabled: boolean;
  nextIsHover: boolean;
  setNextHover: (v: boolean) => void;
  goNext: () => void;
  showImpact?: boolean;
  postVoteRatings?: RatingsMap;
  glow?: string;
  barPct?: Record<string, number>;
  homepageMode?: boolean;
}) {
  const [inspectHover, setInspectHover] = useState(false);

  const leftId = pair.left.id;
  const rightId = pair.right.id;

  const votedLeft = lastWinner === leftId;
  const votedRight = lastWinner === rightId;

  const leftPrimary = pair.left.color ?? "var(--ui-surface-panel-solid)";
  const rightPrimary = pair.right.color ?? "var(--ui-surface-panel-solid)";

  const pctLeft = duelVotePct?.left ?? 50;
  const pctRight = duelVotePct?.right ?? 50;

  const verdictReady =
    duelVotePct != null &&
    Number.isFinite(duelVotePct.left) &&
    Number.isFinite(duelVotePct.right) &&
    duelVotePct.left >= 0 &&
    duelVotePct.right >= 0;

  const label = "Crowd verdict";

  const leftImpact = postVoteRatings
    ? postVoteRatings[String(leftId)]
    : undefined;
  const rightImpact = postVoteRatings
    ? postVoteRatings[String(rightId)]
    : undefined;

  const handleEnter = () => {
    setInspectHover(true);
    onMouseEnter?.();
  };

  const handleLeave = () => {
    setInspectHover(false);
    onMouseLeave?.();
  };

  return (
    <div
      className="revealPanel"
      style={{ cursor: inspectHover ? "help" : "default" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="revealPanelInner">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: -10,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: verdictReady ? "var(--ui-text-muted)" : "var(--ui-text-dim)",
            fontWeight: 900,
          }}
        >
          {label}
        </div>

        <CrowdVerdictBar
          ready={verdictReady}
          leftName={pair.left.name}
          rightName={pair.right.name}
          leftColor={leftPrimary}
          rightColor={rightPrimary}
          leftPct={pctLeft}
          rightPct={pctRight}
          votedLeft={votedLeft}
          votedRight={votedRight}
        />

        {showImpact && postVoteRatings ? (
          <div
            className="impactGrid"
            style={{
              width: "100%",
              minHeight: 46,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 1px minmax(0, 1fr)",
              alignItems: "center",
              borderRadius: "14px",
              background:
                "color-mix(in srgb, var(--ui-surface-soft) 82%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--ui-border-subtle) 82%, transparent)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.22)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              overflow: "hidden",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <DuelImpact
                show={showImpact}
                impact={leftImpact}
                playerId={leftId}
                winner={votedLeft}
                attribute=""
                glow={glow}
                barPct={barPct}
                homepageMode={homepageMode}
              />
            </div>

            <div
              className="impactDivider"
              style={{
                alignSelf: "stretch",
                background:
                  "color-mix(in srgb, var(--ui-border-subtle) 90%, transparent)",
              }}
            />

            <div style={{ minWidth: 0 }}>
              <DuelImpact
                show={showImpact}
                impact={rightImpact}
                playerId={rightId}
                winner={votedRight}
                attribute=""
                glow={glow}
                barPct={barPct}
                homepageMode={homepageMode}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          placeItems: "center",
          marginTop: homepageMode ? 8 : 14,
        }}
      >
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          onFocus={() => setNextHover(true)}
          onBlur={() => setNextHover(false)}
          style={{
            height: 34,
            padding: "0 14px",
            textTransform: "uppercase",
            fontSize: 12,
            borderRadius: "var(--ui-radius-pill)",
            border: nextIsHover
              ? "1px solid rgba(156, 192, 248, 0.74)"
              : "1px solid rgba(138, 176, 238, 0.62)",
            background: nextIsHover
              ? "rgba(118, 160, 234, 0.96)"
              : "rgba(104, 146, 222, 0.92)",
            color: "#f4f8ff",
            fontWeight: 700,
            letterSpacing: "0.01em",
            boxShadow: nextIsHover
              ? "0 10px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)"
              : "0 8px 18px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
            opacity: nextDisabled ? 0.55 : 1,
            cursor: nextDisabled ? "not-allowed" : "pointer",
            userSelect: "none",
            transform: nextIsHover ? "translateY(-1px)" : "translateY(0px)",
            transition:
              "transform 140ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease",
          }}
        >
          Next →
        </button>
      </div>

      <style jsx>{`
        .revealPanel {
          max-width: ${homepageMode ? 520 : 720}px;
          margin: ${homepageMode ? 0 : 26}px auto 0;
        }

        .revealPanelInner {
          width: calc(100% - 96px);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (max-width: 700px) {
          .revealPanel {
            max-width: none;
            width: 100%;
            margin: 22px auto 0;
            padding: 0 12px;
          }

          .revealPanelInner {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
