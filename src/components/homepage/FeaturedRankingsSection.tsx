import Link from "next/link";
import AttributeIcon from "@/components/AttributeIcon";
import { FEATURED_RANKING_TILES } from "@/components/homepage/featuredRankingsTiles";
import WidgetPanel from "@/components/ui/WidgetPanel";
import styles from "./FeaturedRankingsSection.module.css";

function FeaturedRankingTileIcon({
  icon,
}: {
  icon: (typeof FEATURED_RANKING_TILES)[number]["icon"];
}) {
  if (icon.type === "star") {
    return <span className={styles.starIcon} aria-hidden="true">★</span>;
  }

  return <AttributeIcon attributeKey={icon.key} size={22} />;
}

export default function FeaturedRankingsSection() {
  return (
    <WidgetPanel
      as="section"
      variant="card"
      id="featured-rankings"
      title="Featured Rankings"
    >
      <div className={styles.tiles}>
        {FEATURED_RANKING_TILES.map((tile) => (
          <Link key={tile.id} href={tile.href} className={styles.tile}>
            <div className={styles.icon}>
              <FeaturedRankingTileIcon icon={tile.icon} />
            </div>
            <div className={styles.text}>
              <span className={styles.titleLine1}>{tile.titleLine1}</span>
              <span className={styles.titleLine2}>{tile.titleLine2}</span>
            </div>
          </Link>
        ))}
      </div>
    </WidgetPanel>
  );
}
