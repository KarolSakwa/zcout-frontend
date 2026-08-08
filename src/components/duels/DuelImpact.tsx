import React from "react";
import RatingWithConfidence from "../RatingWithConfidence";
import VoteImpactBadge from "./VoteImpactBadge";
import { getRatingColor } from "@/lib/ratings";

type Impact = {
  rating_before: number;
  rating_after: number;
  delta: number;
  rating: number;
  votes_count: number;
  attribute_rank: number | null;
  is_top_ten: boolean;
};

const roundToDisplay = (value: number) => Number(value.toFixed(2));

export default function DuelImpact({
  show,
  impact,
  playerId,
  winner,
  attribute,
  glow,
  barPct,
  homepageMode = false,
}: {
  show: boolean;
  impact?: Impact;
  playerId: number;
  winner: boolean;
  attribute: string;
  glow: string;
  barPct: Record<string, number>;
  homepageMode?: boolean;
}) {
  if (!show || !impact) return null;

  const before = Number(impact.rating_before);
  const after = Number(impact.rating_after);
  const displayBefore = roundToDisplay(before);
  const displayAfter = roundToDisplay(after);
  // Keep rounded before/after difference so the badge matches visible ratings.
  const displayDelta = roundToDisplay(displayAfter - displayBefore);
  const showBadge = impact.is_top_ten && impact.attribute_rank !== null;

  void playerId;
  void winner;
  void attribute;
  void glow;
  void barPct;

  return (
    <div className="impact">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 7,
          minWidth: 0,
          whiteSpace: "nowrap",
        }}
      >
        {homepageMode ? (
          <>
            <div style={{ display: "inline-flex", alignItems: "baseline" }}>
              <RatingWithConfidence
                rating={displayAfter}
                confidence={0}
                fontSize={homepageMode ? 14 : 15}
                decimals={2}
                align="start"
                expand={false}
                ratingColor={getRatingColor(displayAfter)}
                confidenceTooltipContent={false}
                showConfidence={false}
              />
            </div>

            {showBadge && (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "999px",
                  border:
                    "1px solid color-mix(in srgb, var(--ui-accent-primary) 55%, transparent)",
                  background:
                    "color-mix(in srgb, var(--ui-accent-primary) 18%, transparent)",
                  color: "var(--ui-accent-primary)",
                  fontSize: homepageMode ? 9 : 10,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  transform: "translateY(-1px)",
                }}
              >
                #{impact.attribute_rank}
              </span>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "inline-flex", alignItems: "baseline" }}>
              <RatingWithConfidence
                rating={displayBefore}
                confidence={0}
                fontSize={13}
                decimals={2}
                align="start"
                expand={false}
                ratingColor={getRatingColor(displayBefore)}
                confidenceTooltipContent={false}
                showConfidence={false}
              />
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ui-text-dim)",
                transform: "translateY(-1px)",
              }}
            >
              →
            </span>

            <div style={{ display: "inline-flex", alignItems: "baseline" }}>
              <RatingWithConfidence
                rating={displayAfter}
                confidence={0}
                fontSize={homepageMode ? 14 : 15}
                decimals={2}
                align="start"
                expand={false}
                ratingColor={getRatingColor(displayAfter)}
                confidenceTooltipContent={false}
                showConfidence={false}
              />
            </div>

            {showBadge && (
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: "999px",
                  border:
                    "1px solid color-mix(in srgb, var(--ui-accent-primary) 55%, transparent)",
                  background:
                    "color-mix(in srgb, var(--ui-accent-primary) 18%, transparent)",
                  color: "var(--ui-accent-primary)",
                  fontSize: homepageMode ? 9 : 10,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  transform: "translateY(-1px)",
                }}
              >
                RANK #{impact.attribute_rank}
              </span>
            )}
          </>
        )}
      </div>

      <VoteImpactBadge
        delta={displayDelta}
        className={homepageMode ? "impactBadgeHomepage" : undefined}
      />

      <style jsx>{`
        .impact {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px;
          box-sizing: border-box;
        }

        .impact :global(.impactBadgeHomepage) {
          font-size: 10px;
        }

        @media (max-width: 700px) {
          .impact {
            min-height: ${homepageMode ? 48 : 58}px;
            flex-direction: column;
            justify-content: center;
            gap: ${homepageMode ? 4 : 5}px;
            padding: ${homepageMode ? "5px 5px" : "7px 6px"};
          }
        }
      `}</style>
    </div>
  );
}
