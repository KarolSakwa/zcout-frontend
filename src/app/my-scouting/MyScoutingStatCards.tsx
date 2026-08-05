import Tooltip from '@/components/Tooltip';
import ScoutReportIcon from '@/components/scouting/ScoutReportIcon';
import type { MyScoutingStats } from '@/lib/scoutingTypes';
import styles from './myScoutingDashboard.module.css';

const DEFAULT_STATS: MyScoutingStats = {
  duels: 0,
  players_rated: 0,
  scout_reports: 0,
};

function DuelsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.statIconSvg}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 4l3 3l-3 3" />
      <path d="M18 20l3 -3l-3 -3" />
      <path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5" />
      <path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3" />
    </svg>
  );
}

function PlayersRatedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.statIconSvg}
    >
      <path d="M20 21a8 8 0 0 0 -16 0" />
      <path d="M12 11a4 4 0 1 0 0 -8a4 4 0 0 0 0 8" />
    </svg>
  );
}

export default function MyScoutingStatCards({
  stats,
  isLoggedIn,
}: {
  stats: MyScoutingStats | null;
  isLoggedIn: boolean;
}) {
  const values = stats ?? DEFAULT_STATS;
  const scoutReportsTooltip = isLoggedIn
    ? 'Create Scout Reports from player profiles.'
    : 'Log in to unlock Scout Reports.';

  const cards = [
    {
      key: 'duels',
      label: 'DUELS',
      value: values.duels,
      icon: <DuelsIcon />,
      tooltip: null,
    },
    {
      key: 'players-rated',
      label: 'PLAYERS RATED',
      value: values.players_rated,
      icon: <PlayersRatedIcon />,
      tooltip: null,
    },
    {
      key: 'scout-reports',
      label: 'SCOUT REPORTS',
      value: values.scout_reports,
      icon: <ScoutReportIcon size={18} />,
      tooltip: scoutReportsTooltip,
    },
  ] as const;

  return (
    <div className={styles.statCards} aria-label="Scouting statistics">
      {cards.map((card) => {
        const content = (
          <article
            className={styles.statCard}
            aria-label={`${card.label}: ${card.value}`}
          >
            <div className={styles.statIcon}>{card.icon}</div>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statValue}>{card.value}</div>
          </article>
        );

        return (
          <span className={styles.statCardSlot} key={card.key}>
            {card.tooltip ? (
              <Tooltip content={card.tooltip}>{content}</Tooltip>
            ) : (
              content
            )}
          </span>
        );
      })}
    </div>
  );
}
