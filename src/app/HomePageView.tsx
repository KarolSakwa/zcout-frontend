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
          <HeroSection />
          <FeaturedPlayerSection player={featuredPlayer} />
        </section>

        <section className={styles.rowMain}>
          <TopRisersSection />
          <TopFallersSection />

          <div className={styles.duel}>
            <DuelWidgetSection />
          </div>

          <LatestVotesSection />
          <NeedsMoreRatingsSection />
        </section>

        <section className={styles.rowRankings}>
          <FeaturedRankingsSection />
        </section>
      </div>
    </main>
  );
}
