import Link from "next/link";
import styles from "./HomepageSection.module.css";
import PlayerRadarChart from "@/app/players/[id]/PlayerRadarChart";
import FeaturedOverallBlock from "../FeaturedOverallBlock";
import { calcAge } from "@/lib/playerAge";
import PlayerArchetype from "@/app/players/[id]/PlayerArchetype";
import WidgetPanel from "@/components/ui/WidgetPanel";

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
  const nameClassName =
    player.name.length > 18 ? styles.playerNameLong : undefined;

  const metaParts = [
    player.position,
    player.club?.name,
    player.country?.name,
    age != null ? String(age) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <WidgetPanel variant="card" title="Featured Player" noPadding>
      <div className={styles.playerContent} data-fp-panel>
        <div className={styles.playerLeftColumn}>
          <div className={styles.playerHeader} data-fp-header>
            <div data-fp-name>
              {playerId != null ? (
                <Link
                  href={`/players/${playerId}`}
                  className={[styles.playerNameLink, nameClassName]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {player.name}
                </Link>
              ) : (
                <h2
                  className={[styles.playerNameFallback, nameClassName]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {player.name}
                </h2>
              )}
            </div>

            {player.archetype ? (
              <div data-fp-archetype>
                <PlayerArchetype label={player.archetype.label} />
              </div>
            ) : null}

            {metaParts.length > 0 ? (
              <div className={styles.playerMeta} data-fp-meta>
                {metaParts.map((part, index) => (
                  <span key={`${part}-${index}`} className={styles.metaPart}>
                    {index > 0 ? (
                      <span className={styles.metaSep} aria-hidden="true">
                        •
                      </span>
                    ) : null}
                    {part}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.rankBadge} data-fp-rank>
            Rank <span>#{player.rank}</span>
          </div>

          <div className={styles.overallBlock} data-fp-overall>
            <FeaturedOverallBlock
              rating={Math.round(player.overall ?? 0)}
              exactRating={player.overall}
              confidence={player.overall_confidence ?? 0}
              scalePx={51}
            />
          </div>
        </div>

        <div className={styles.playerRightColumn} data-fp-radar>
          <div className={styles.playerRadar}>
            <PlayerRadarChart
              data={radarData}
              variant="homepage"
              shortenLabels
            />
          </div>
        </div>
      </div>
    </WidgetPanel>
  );
}
