import HeroSection from "@/components/homepage/HeroSection";
import FeaturedPlayerSection from "@/components/homepage/FeaturedPlayerSection";
import DuelWidgetSection from "@/components/homepage/DuelWidgetSection";
import TopRisersSection from "@/components/homepage/TopRisersSection";
import TopFallersSection from "@/components/homepage/TopFallersSection";
import LatestVotesSection from "@/components/homepage/LatestVotesSection";
import NeedsMoreRatingsSection from "@/components/homepage/NeedsMoreRatingsSection";
import FeaturedRankingsSection from "@/components/homepage/FeaturedRankingsSection";
import styles from "./HomePageView.module.css";

export default async function HomePageView() {
  const API_BASE =
    process.env.BACKEND_URL ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:8080";

  const featuredPlayerRes = await fetch(`${API_BASE}/api/players/featured`, {
    cache: "no-store",
  });

  const featuredPlayer = await featuredPlayerRes.json();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.rowHero}>
          <div className={`${styles.gridItem} ${styles.colSpan6}`}>
            <HeroSection />
          </div>
          <div className={`${styles.gridItem} ${styles.colSpan6}`}>
            <FeaturedPlayerSection player={featuredPlayer} />
          </div>
        </section>

        <section className={styles.rowMain}>
          <div className={styles.moversCluster}>
            <div className={styles.moversWidget}>
              <TopRisersSection />
            </div>
            <div className={styles.moversWidget}>
              <TopFallersSection />
            </div>
          </div>
          <div
            className={`${styles.gridItem} ${styles.colSpan5} ${styles.rowSpan2} ${styles.duel}`}
          >
            <DuelWidgetSection />
          </div>
          <div className={styles.secondaryCluster}>
            <div className={styles.recentVotesWidgetSlot}>
              <LatestVotesSection />
            </div>
            <div className={styles.nmrWidgetSlot}>
              <NeedsMoreRatingsSection />
            </div>
          </div>
        </section>

        <section className={styles.rowRankings}>
          <div className={styles.rowRankingsTrack}>
            <FeaturedRankingsSection />
          </div>
        </section>
      </div>
    </main>
  );
}
