import HeroSection from '@/components/homepage/HeroSection';
import FeaturedPlayerSection from '@/components/homepage/FeaturedPlayerSection';
import DuelWidgetSection from '@/components/homepage/DuelWidgetSection';
import TopRisersSection from '@/components/homepage/TopRisersSection';
import TopFallersSection from '@/components/homepage/TopFallersSection';
import LatestVotesSection from '@/components/homepage/LatestVotesSection';
import NeedsMoreRatingsSection from '@/components/homepage/NeedsMoreRatingsSection';
import FeaturedRankingsSection from '@/components/homepage/FeaturedRankingsSection';

export default function HomePageView() {
  return (
    <main>
      <section>
        <HeroSection />
        <FeaturedPlayerSection />
      </section>

      <section>
        <TopRisersSection />
        <TopFallersSection />
        <DuelWidgetSection />
      </section>

      <section>
        <LatestVotesSection />
        <NeedsMoreRatingsSection />
      </section>

      <section>
        <FeaturedRankingsSection />
      </section>
    </main>
  );
}