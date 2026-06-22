import Link from "next/link";
import styles from "./HomepageSection.module.css";
import PlayerRadarChart from "@/app/players/[id]/PlayerRadarChart";
import RatingWithConfidence from "@/components/RatingWithConfidence";
import FeaturedOverallBlock from "../FeaturedOverallBlock";
import { calcAge } from "@/lib/playerAge";
import PlayerArchetype from "@/app/players/[id]/PlayerArchetype";

type RadarAxis = {
  key: string;
  label: string;
  value: number;
};

type FeaturedPlayer = {
  id?: number;
  player_id?: number;
  name: string;
  rank: number | null;
  position: string | null;
  overall: number | null;
  overall_confidence: number;
  radar_axes: RadarAxis[];
  club: {
    name: string;
  } | null;
  country: {
    name: string;
  } | null;
  date_of_birth: string | null;
  archetype: {
    label: string;
  } | null;
};

type Props = {
  player: FeaturedPlayer;
};

export default function FeaturedPlayerSection({ player }: Props) {
  const radarData = player.radar_axes;
  const age = calcAge(player.date_of_birth);
  const playerId = player.id ?? player.player_id;
  const nameFontSize = player.name.length > 18 ? 24 : 28;

  return (
    <div className={styles.card}>
      <div className={styles.rankBadge}>
        Rank <span>#{player.rank}</span>
      </div>

      <div className={styles.playerContent}>
        <div className={styles.playerLeftColumn}>
          <div className={styles.playerHeader}>
            {playerId != null ? (
              <Link
                href={`/players/${playerId}`}
                className={styles.playerNameLink}
                style={{
                  fontSize: nameFontSize,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {player.name}
              </Link>
            ) : (
              <h2
                style={{
                  margin: 0,
                  fontSize: nameFontSize,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {player.name}
              </h2>
            )}

            {player.archetype ? (
              <PlayerArchetype label={player.archetype.label} />
            ) : null}

            <div
              className={styles.playerMeta}
              style={{
                marginTop: 12,
                fontSize: 14,
              }}
            >
              {player.club?.name} • {player.position} • {player.country?.name}{" "}
              {age != null ? ` • ${age}` : ""}
            </div>
          </div>

          <FeaturedOverallBlock
            rating={Math.round(player.overall ?? 0)}
            exactRating={player.overall}
            confidence={player.overall_confidence ?? 0}
            scalePx={60}
          />
        </div>

        <div className={styles.playerRightColumn}>
          <div className={styles.playerRadar}>
            <PlayerRadarChart
              data={radarData}
              variant="homepage"
              shortenLabels
            />
          </div>
        </div>
      </div>
    </div>
  );
}
