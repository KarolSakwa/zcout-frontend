import { useEffect, useState } from "react";
import styles from "./page.module.css";
import PlayerRadarChart from "./PlayerRadarChart";
import PlayerAttributesSection from "./PlayerAttributesSection";
import PlayerOverallRating from "./PlayerOverallRating";
import AuthAwareScoutReportTrigger from "./AuthAwareScoutReportTrigger";
import { formatOverall } from "@/lib/ratings";
import { calcAge } from "@/lib/playerAge";
import Image from "next/image";
import Tooltip from "@/components/Tooltip";

export type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: string;
  rating: number;
  confidence: number;
  rating_weight_sum?: number;
  confidence_weight_sum?: number;
  votes_count: number;
  last_vote_at: string | null;
  your_rating: number | null;
  your_rating_updated_at?: string | null;
  trend_7d: number | null;
};

export type PlayerRadarAxis = {
  key: string;
  label: string;
  value: number;
};

export type PlayerProfileData = {
  id: number;
  name: string;
  archetype: {
    label: string;
  } | null;
  date_of_birth: string | null;
  position: string | null;
  overall: number | null;
  overall_confidence: number;
  overall_trend_7d: number | null;
  previous_player_id: number | null;
  next_player_id: number | null;
  radar_axes: PlayerRadarAxis[];
  attributes: PlayerProfileAttribute[];
  number: number | null;
  club: {
    name: string;
  } | null;
  country: {
    name: string;
  } | null;
};

type AttributeSection = {
  title: string;
  items: PlayerProfileAttribute[];
};

type AttributeDisplayItem =
  | {
      type: "header";
      id: string;
      title: string;
    }
  | {
      type: "attribute";
      id: string;
      attribute: PlayerProfileAttribute;
    };

function pickAttrsByGroups(
  attrs: PlayerProfileAttribute[],
  allowedGroups: readonly string[],
) {
  const allowed = new Set(allowedGroups);

  return attrs.filter((attr) => allowed.has(String(attr.group)));
}

function buildAttributeColumns(
  sections: AttributeSection[],
  columnCount: number,
): AttributeDisplayItem[][] {
  const flatItems: AttributeDisplayItem[] = [];

  for (const section of sections) {
    flatItems.push({
      type: "header",
      id: `header-${section.title}`,
      title: section.title,
    });

    for (const attribute of section.items) {
      flatItems.push({
        type: "attribute",
        id: `attr-${attribute.id}`,
        attribute,
      });
    }
  }

  const totalAttributes = sections.reduce(
    (acc, section) => acc + section.items.length,
    0,
  );

  const basePerColumn = Math.floor(totalAttributes / columnCount);

  const remainder = totalAttributes % columnCount;

  const capacities = Array.from({ length: columnCount }, (_, index) => {
    return basePerColumn + (index < remainder ? 1 : 0);
  });

  const columns: AttributeDisplayItem[][] = Array.from(
    { length: columnCount },
    () => [],
  );

  let pointer = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const isLastColumn = columnIndex === columnCount - 1;

    const capacity = capacities[columnIndex];

    let usedAttributes = 0;

    while (pointer < flatItems.length) {
      const nextItem = flatItems[pointer];

      if (nextItem.type === "header") {
        if (
          !isLastColumn &&
          usedAttributes >= capacity &&
          columns[columnIndex].length > 0
        ) {
          break;
        }

        columns[columnIndex].push(nextItem);

        pointer += 1;

        continue;
      }

      if (!isLastColumn && usedAttributes >= capacity) {
        break;
      }

      columns[columnIndex].push(nextItem);

      usedAttributes += 1;

      pointer += 1;
    }
  }

  return columns;
}

export default function PlayerProfileCard({
  data,
  shouldAnimateRatings = false,
}: {
  data: PlayerProfileData;
  shouldAnimateRatings?: boolean;
}) {
  const radarData = data.radar_axes.map((axis: PlayerRadarAxis) => ({
    key: axis.key,
    label: axis.label,
    value: axis.value,
  }));

  const age = calcAge(data.date_of_birth);

  const overall = formatOverall(data.overall, "rounded");

  const overallExact = formatOverall(data.overall, "exact");

  const overallDelta7d = data.overall_trend_7d;

  const isGoalkeeper = data.position?.toUpperCase() === "GK";

  const goalkeeping = pickAttrsByGroups(data.attributes, [
    "SHOT_STOPPING",
    "AERIAL",
    "DISTRIBUTION",
    "RUSHING_OUT",
    "ECCENTRICITY",
  ]);

  const gkMental = pickAttrsByGroups(data.attributes, ["MENTALITY"]);

  const gkPhysical = pickAttrsByGroups(data.attributes, [
    "PACE",
    "PHYSICALITY",
  ]);

  const technical = pickAttrsByGroups(data.attributes, [
    "TECHNIQUE",
    "ATTACK",
    "PASSING",
    "DEFENCE",
    "SET_PIECES",
  ]);

  const mental = pickAttrsByGroups(data.attributes, ["MENTALITY"]);

  const physical = pickAttrsByGroups(data.attributes, ["PACE", "PHYSICALITY"]);

  const attributeSections = isGoalkeeper
    ? [
        {
          title: "Goalkeeping",
          items: goalkeeping,
        },
        {
          title: "Mental",
          items: gkMental,
        },
        {
          title: "Physical",
          items: gkPhysical,
        },
      ]
    : [
        {
          title: "Technical",
          items: technical,
        },
        {
          title: "Mental",
          items: mental,
        },
        {
          title: "Physical",
          items: physical,
        },
      ];

  const attributeColumns = buildAttributeColumns(
    attributeSections,
    isGoalkeeper ? 2 : 3,
  );

  const scoutReportAttributes = attributeSections
    .flatMap((section) => section.items)
    .slice(0, 6);

  return (
    <div className={styles.profileContent}>
      <section className={styles.topCard}>
        <div className={styles.topCardHeader}>
          <AuthAwareScoutReportTrigger
            playerId={data.id}
            playerName={data.name}
            playerPosition={data.position}
            clubName={data.club?.name ?? null}
            attributes={scoutReportAttributes}
            className={styles.topCardReport}
          />
        </div>

        <div className={styles.topCardMain}>
          <div className={styles.topCardGrid}>
            <div className={styles.topCardLeft}>
              <div className={styles.topCardIdentity}>
                <h1 className={styles.playerName}>
                  {data.number != null ? (
                    <span className={styles.playerNumberInline}>
                      #{data.number}
                    </span>
                  ) : null}

                  <span>{data.name}</span>
                </h1>
                {data.archetype ? (
                  <Tooltip
                    content="Player archetype"
                    side="bottom"
                    align="start"
                  >
                    <div className={styles.playerArchetype}>
                      <Image
                        src="/icons/clipboard-text.svg"
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                        style={{
                          width: 16,
                          height: 16,
                          flex: "0 0 16px",
                          objectFit: "contain",
                          filter:
                            "brightness(0) saturate(100%) invert(72%) sepia(55%) saturate(5111%) hue-rotate(193deg) brightness(101%) contrast(103%)",
                        }}
                      />
                      <span>{data.archetype.label}</span>
                    </div>
                  </Tooltip>
                ) : null}

                <div className={styles.playerMeta}>
                  <span>{data.club?.name ?? "No club"}</span>

                  <span className={styles.metaDot}>•</span>

                  <span>{data.position ?? "Unknown position"}</span>

                  <span className={styles.metaDot}>•</span>

                  <span>{data.country?.name ?? "Unknown nationality"}</span>

                  {age != null ? (
                    <>
                      <span className={styles.metaDot}>•</span>

                      <span>{age}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.topCardCenter}>
              <div className={styles.overallBlock}>
                <div className={styles.overallLabel}>OVERALL</div>

                <div className={styles.overallRow}>
                  <PlayerOverallRating
                    overall={overall}
                    overallConfidence={data.overall_confidence}
                    overallExact={overallExact}
                    overallDelta7d={overallDelta7d}
                    shouldAnimate={shouldAnimateRatings}
                  />
                </div>
              </div>
            </div>

            <div className={styles.topCardRight}>
              <div
                className={styles.radarPlaceholder}
                aria-label="Player radar chart"
              >
                <PlayerRadarChart data={radarData} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PlayerAttributesSection
        playerId={data.id}
        attributeColumns={attributeColumns}
        isGoalkeeper={isGoalkeeper}
        shouldAnimateRatings={shouldAnimateRatings}
      />
    </div>
  );
}
