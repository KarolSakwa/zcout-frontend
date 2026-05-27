'use client';

import styles from './page.module.css';

type Props = {
  previousPlayerId: number | null;
  nextPlayerId: number | null;
};

export default function PlayerProfileNavigation({
  previousPlayerId,
  nextPlayerId,
}: Props) {
  const goToPlayer = (
    playerId: number,
    direction: 'next' | 'previous'
  ) => {
    window.history.pushState({}, '', `/players/${playerId}`);

    window.dispatchEvent(
      new CustomEvent('zcout-profile-navigation', {
        detail: {
          playerId,
          direction,
        },
      })
    );
  };

  return (
    <>
      {previousPlayerId ? (
        <button
          onClick={() =>
            goToPlayer(previousPlayerId, 'previous')
          }
          type="button"
          className={`${styles.profileNav} ${styles.profileNavLeft}`}
          aria-label="Previous player"
        >
          ‹
        </button>
      ) : null}

      {nextPlayerId ? (
        <button
          onClick={() =>
            goToPlayer(nextPlayerId, 'next')
          }
          type="button"
          className={`${styles.profileNav} ${styles.profileNavRight}`}
          aria-label="Next player"
        >
          ›
        </button>
      ) : null}
    </>
  );
}