import styles from './HomepageSection.module.css';
import PlayerRadarChart from '@/app/players/[id]/PlayerRadarChart';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import FeaturedOverallBlock from '../FeaturedOverallBlock';

export default function FeaturedPlayerSection() {
  const radarData = [
    { key: 'technical', label: 'Technical', value: 88 },
    { key: 'mental', label: 'Mental', value: 86 },
    { key: 'physical', label: 'Physical', value: 82 },
    { key: 'attacking', label: 'Attacking', value: 90 },
    { key: 'defending', label: 'Defending', value: 61 },
    { key: 'pace', label: 'Pace', value: 89 },
  ];

  return (
  <div className={styles.card}>
    <div className={styles.rankBadge}>
      Rank <span>#12</span>
    </div>

    <div className={styles.playerContent}>
      <div className={styles.playerLeftColumn}>
        <div className={styles.playerHeader}>
          <h2
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            Bukayo Saka
          </h2>

          <div
            className={styles.playerMeta}
            style={{
              marginTop: 12,
              fontSize: 14,
            }}
          >
            Arsenal FC • RW • England • 23
          </div>
        </div>

        <FeaturedOverallBlock
          rating={87}
          confidence={82}
          scalePx={60}
        />
      </div>

      <div className={styles.playerRightColumn}>
        <div className={styles.playerRadar}>
          <PlayerRadarChart
            data={radarData}
            variant="homepage"
          />
        </div>
      </div>
    </div>
  </div>
);
}