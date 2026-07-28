import GlobalSearch from '@/components/GlobalSearch';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section>
      <h1 className={styles.heroTitle}>
        The crowd&apos;s view
        <br />
        <span className={styles.heroAccent}>of footballers.</span>
      </h1>

      <p className={styles.heroDescription}>
        Community-built football intelligence.
        <br />
        Real opinions. Live ratings. Always evolving.
      </p>

      <div className={styles.heroSearch} data-hero-search>
        <GlobalSearch />
      </div>
    </section>
  );
}
