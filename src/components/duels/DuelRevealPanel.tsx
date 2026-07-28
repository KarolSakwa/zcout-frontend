import React, { useState } from "react";
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
      className={`revealPanel${homepageMode ? " revealPanelHomepage" : ""}`}
      style={{ cursor: inspectHover ? "help" : "default" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="revealPanelInner">
        <div
          className="verdictLabel"
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: homepageMode ? 7 : -10,
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
              minHeight: homepageMode ? 40 : 46,
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

      <div className="nextWrap">
        <button
          type="button"
          className="nextBtn"
          data-hp-duel-next
          onClick={goNext}
          disabled={nextDisabled}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          onFocus={() => setNextHover(true)}
          onBlur={() => setNextHover(false)}
          style={{
            border: nextIsHover
              ? "1px solid rgba(156, 192, 248, 0.74)"
              : "1px solid rgba(138, 176, 238, 0.62)",
            background: nextIsHover
              ? "rgba(118, 160, 234, 0.96)"
              : "rgba(104, 146, 222, 0.92)",
            boxShadow: nextIsHover
              ? "0 10px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)"
              : "0 8px 18px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
            opacity: nextDisabled ? 0.55 : 1,
            cursor: nextDisabled ? "not-allowed" : "pointer",
            transform: nextIsHover ? "translateY(-1px)" : "translateY(0px)",
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
          gap: ${homepageMode ? 10 : 12}px;
        }

        .nextWrap {
          display: grid;
          place-items: center;
          margin-top: ${homepageMode ? 8 : 14}px;
        }

        .nextBtn {
          height: 34px;
          padding: 0 14px;
          text-transform: uppercase;
          font-size: 12px;
          border-radius: var(--ui-radius-pill);
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #f4f8ff;
          user-select: none;
          cursor: pointer;
          transition:
            transform 140ms ease,
            background 140ms ease,
            box-shadow 140ms ease,
            border-color 140ms ease,
            opacity 140ms ease;
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

          .revealPanelHomepage {
            margin: 0;
            padding: 0 8px;
          }

          .revealPanelHomepage .revealPanelInner {
            gap: 6px;
          }

          .revealPanelHomepage .verdictLabel {
            margin-bottom: 7px;
            font-size: 9px;
          }

          .revealPanelHomepage .impactGrid {
            min-height: 40px !important;
          }

          .revealPanelHomepage .nextWrap {
            margin-top: 4px;
          }

          .revealPanelHomepage .nextBtn {
            height: 28px;
            padding: 0 10px;
            font-size: 10px;
            letter-spacing: 0.04em;
          }
        }

        @media (max-width: 430px) {
          .revealPanelHomepage .revealPanelInner {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
