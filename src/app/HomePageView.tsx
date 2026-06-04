import HeroSection from '@/components/homepage/HeroSection';
import FeaturedPlayerSection from '@/components/homepage/FeaturedPlayerSection';
import DuelWidgetSection from '@/components/homepage/DuelWidgetSection';
import TopRisersSection from '@/components/homepage/TopRisersSection';
import TopFallersSection from '@/components/homepage/TopFallersSection';
import LatestVotesSection from '@/components/homepage/LatestVotesSection';
import NeedsMoreRatingsSection from '@/components/homepage/NeedsMoreRatingsSection';
import FeaturedRankingsSection from '@/components/homepage/FeaturedRankingsSection';
import styles from './HomePageView.module.css';

export default function HomePageView() {
  return (
    <main className={styles.page}>
  <div className={styles.container}>
    <section className={styles.rowHero}>
      <HeroSection />
      <FeaturedPlayerSection />
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