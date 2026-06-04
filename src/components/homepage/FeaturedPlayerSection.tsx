import styles from './HomepageSection.module.css';
import PlayerRadarChart from '@/app/players/[id]/PlayerRadarChart';

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
      <div className={styles.playerCard}>
        <div>
          <div>#12</div>

          <h2 className={styles.cardTitle}>Bukayo Saka</h2>

          <div className={styles.playerMeta}>
            Arsenal FC • RW • England • 23
          </div>

          <div className={styles.playerOverall}>
            Overall: 87
          </div>

          <div style={{ marginTop: 12 }}>
            Confidence Bar
          </div>

          <div style={{ marginTop: 24 }}>
            View Profile
          </div>
        </div>

        <div className={styles.playerRadar}>
          <PlayerRadarChart
            data={radarData}
            variant="homepage"
          />
        </div>
      </div>
    </div>
  );
}