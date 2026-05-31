'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './page.module.css';
import PlayerProfileNavigation from './PlayerProfileNavigation';
import PlayerProfileCard from './PlayerProfileCard';
import type { PlayerProfileData } from './PlayerProfileCard';

type Props = {
  initialData: PlayerProfileData;
};

export default function PlayerProfileClient({
  initialData,
}: Props) {
  const [data, setData] = useState(initialData);

  const [incomingData, setIncomingData] =
  useState<PlayerProfileData | null>(null);

  const [trackOffset, setTrackOffset] = useState(0);

  const [isTransitionEnabled, setIsTransitionEnabled] =
    useState(true);

  const [direction, setDirection] =
    useState<'next' | 'previous'>('next');

    const [isAnimating, setIsAnimating] =
  useState(false);

  const [shouldAnimateRatings, setShouldAnimateRatings] =
  useState(false);

  const [isScoutReportOpen, setIsScoutReportOpen] = useState(false);
  const cacheRef = useRef(new Map<number, PlayerProfileData>());
  const pendingFetchesRef = useRef(new Map<number, Promise<PlayerProfileData>>());

  const prefetchPlayer = async (playerId: number | null | undefined) => {
    if (!playerId) {
      return;
    }

    if (cacheRef.current.has(playerId)) {
      return;
    }

    if (pendingFetchesRef.current.has(playerId)) {
      return;
    }

    const promise = fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/players/${playerId}`,
      {
        credentials: 'include',
      }
    )
      .then((res) => res.json())
      .then((playerData) => {
        cacheRef.current.set(playerId, playerData);

        if (cacheRef.current.size > 5) {
          const oldestKey = cacheRef.current.keys().next().value;

          if (oldestKey !== undefined) {
            cacheRef.current.delete(oldestKey);
          }
        }

        return playerData;
      })
      .finally(() => {
        pendingFetchesRef.current.delete(playerId);
      });

    pendingFetchesRef.current.set(playerId, promise);

    return promise;
  };

  useEffect(() => {
    const handler = async (event: Event) => {
        if (isAnimating) {
            return;
            }
      const customEvent = event as CustomEvent;

      const playerId = customEvent.detail?.playerId;

      const nextDirection =
        customEvent.detail?.direction ?? 'next';

      setDirection(nextDirection);

      if (!playerId) {
        return;
      }

        setIsAnimating(true);

      let nextData = cacheRef.current.get(playerId);

        if (!nextData) {
          const pendingPromise =
            pendingFetchesRef.current.get(playerId);

          if (pendingPromise) {
            nextData = await pendingPromise;
          } else {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE}/api/players/${playerId}`,
              {
                credentials: 'include',
              }
            );

            nextData = (await res.json()) as PlayerProfileData;

            cacheRef.current.set(playerId, nextData);
          }
        }

        if (!nextData) {
          return;
        }

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
        prefetchPlayer(nextData.previous_player_id);
        prefetchPlayer(nextData.next_player_id);
        setIncomingData(null);

        setTrackOffset(0);
        setIsAnimating(false);
      }, 700);
    };

    const handleScoutReportSaved = async () => {
      setShouldAnimateRatings(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/players/${data.id}`,
        {
          credentials: 'include',
        }
      );

      const refreshedData = await res.json();

      setData(refreshedData);

      window.setTimeout(() => {
        setShouldAnimateRatings(false);
      }, 1200);
    };

    const handleScoutReportOpened = () => {
      setIsScoutReportOpen(true);
    };

    const handleScoutReportClosed = () => {
      setIsScoutReportOpen(false);
    };

    window.addEventListener(
      'zcout-profile-navigation',
      handler
    );

    window.addEventListener(
      'zcout:scout-report-saved',
      handleScoutReportSaved
    );

    window.addEventListener(
      'zcout:scout-report-opened',
      handleScoutReportOpened
    );

    window.addEventListener(
      'zcout:scout-report-closed',
      handleScoutReportClosed
    );

    return () => {
      window.removeEventListener(
        'zcout-profile-navigation',
        handler
      );

      window.removeEventListener(
        'zcout:scout-report-saved',
        handleScoutReportSaved
      );

      window.removeEventListener(
        'zcout:scout-report-opened',
        handleScoutReportOpened
      );

      window.removeEventListener(
        'zcout:scout-report-closed',
        handleScoutReportClosed
      );
    };
  }, []);

  useEffect(() => {
    prefetchPlayer(data.previous_player_id);
    prefetchPlayer(data.next_player_id);
  }, [data.id]);

  const trackStyle: CSSProperties & {
  '--track-offset': string;
    } = {
      '--track-offset': `${trackOffset}%`,
      transition: isTransitionEnabled
        ? 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
        : 'none',
    };

  return (
    <>
      <PlayerProfileNavigation
        previousPlayerId={data.previous_player_id}
        nextPlayerId={data.next_player_id}
        isHidden={isScoutReportOpen}
      />

      <div className={styles.carouselViewport}>
        <div
          className={styles.carouselTrack}
          style={trackStyle}
        >
          {direction === 'previous' && incomingData ? (
            <>
              <div className={styles.carouselSlide}>
                <PlayerProfileCard
                data={incomingData}
                shouldAnimateRatings={shouldAnimateRatings}
                />
              </div>

              <div className={styles.carouselSlide}>
                <PlayerProfileCard data={data} />
              </div>
            </>
          ) : (
            <>
              <div className={styles.carouselSlide}>
                <PlayerProfileCard
                    data={data}
                    shouldAnimateRatings={shouldAnimateRatings}
                    />
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