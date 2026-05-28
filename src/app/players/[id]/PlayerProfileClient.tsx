'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import PlayerProfileNavigation from './PlayerProfileNavigation';
import PlayerProfileCard from './PlayerProfileCard';

type Props = {
  initialData: any;
};

export default function PlayerProfileClient({
  initialData,
}: Props) {
  const [data, setData] = useState(initialData);

  const [incomingData, setIncomingData] =
    useState<any | null>(null);

  const [trackOffset, setTrackOffset] = useState(0);

  const [isTransitionEnabled, setIsTransitionEnabled] =
    useState(true);

  const [direction, setDirection] =
    useState<'next' | 'previous'>('next');

    const [isAnimating, setIsAnimating] =
  useState(false);

  useEffect(() => {
    const handler = async (event: Event) => {
        if (isAnimating) {
            return;
            }
        console.count('profile-navigation');
      const customEvent = event as CustomEvent;

      const playerId = customEvent.detail?.playerId;

      const nextDirection =
        customEvent.detail?.direction ?? 'next';

      setDirection(nextDirection);

      if (!playerId) {
        return;
      }

        setIsAnimating(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/players/${playerId}`
      );

      const nextData = await res.json();

      setIncomingData(nextData);

      if (nextDirection === 'previous') {
        setIsTransitionEnabled(false);
        setTrackOffset(-100);
      }

      requestAnimationFrame(() => {
        setIsTransitionEnabled(true);

        requestAnimationFrame(() => {
          setTrackOffset(
            nextDirection === 'next'
              ? -100
              : 0
          );
        });
      });

      setTimeout(() => {
        setIsTransitionEnabled(false);

        setData(nextData);

        setIncomingData(null);

        setTrackOffset(0);
        setIsAnimating(false);
      }, 700);
    };

    window.addEventListener(
      'zcout-profile-navigation',
      handler
    );

    return () => {
      window.removeEventListener(
        'zcout-profile-navigation',
        handler
      );
    };
  }, []);

  return (
    <>
      <PlayerProfileNavigation
        previousPlayerId={data.previous_player_id}
        nextPlayerId={data.next_player_id}
      />

      <div className={styles.carouselViewport}>
        <div
          className={styles.carouselTrack}
          style={{
            ['--track-offset' as any]: `${trackOffset}%`,
            transition: isTransitionEnabled
              ? 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
        >
          {direction === 'previous' && incomingData ? (
            <>
              <div className={styles.carouselSlide}>
                <PlayerProfileCard data={incomingData} />
              </div>

              <div className={styles.carouselSlide}>
                <PlayerProfileCard data={data} />
              </div>
            </>
          ) : (
            <>
              <div className={styles.carouselSlide}>
                <PlayerProfileCard data={data} />
              </div>

              <div className={styles.carouselSlide}>
                {incomingData ? (
                  <PlayerProfileCard data={incomingData} />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}