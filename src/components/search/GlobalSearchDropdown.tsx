'use client';

import Link from 'next/link';
import React from 'react';
import { MIN_QUERY_LENGTH, type SearchPlayer } from '@/components/search/globalSearchApi';
import { formatOverall } from '@/lib/ratings';
import styles from '../GlobalSearch.module.css';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const regex = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === q.toLowerCase();

    if (!isMatch) {
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    }

    return (
      <span key={`${part}-${index}`} className={styles.matchHighlight}>
        {part}
      </span>
    );
  });
}

export type GlobalSearchDropdownProps = {
  hasMinLength: boolean;
  loading: boolean;
  error: string | null;
  hasAnyResults: boolean;
  players: SearchPlayer[];
  trimmedQuery: string;
  onResultClick: () => void;
};

export default function GlobalSearchDropdown({
  hasMinLength,
  loading,
  error,
  hasAnyResults,
  players,
  trimmedQuery,
  onResultClick,
}: GlobalSearchDropdownProps) {
  return (
    <div className={styles.dropdown}>
      {!hasMinLength && (
        <div className={styles.stateMessage}>
          Type at least {MIN_QUERY_LENGTH} letters
        </div>
      )}

      {hasMinLength && loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingCard}>
            <span>Searching</span>

            <span className={styles.loadingDots}>
              <span className={styles.loadingDot} />
              <span className={`${styles.loadingDot} ${styles.loadingDotDelay1}`} />
              <span className={`${styles.loadingDot} ${styles.loadingDotDelay2}`} />
            </span>
          </div>
        </div>
      )}

      {hasMinLength && !loading && error && (
        <div className={`${styles.stateMessage} ${styles.stateMessageError}`}>
          {error}
        </div>
      )}

      {hasMinLength && !loading && !error && !hasAnyResults && (
        <div className={styles.stateMessage}>No results</div>
      )}

      {hasMinLength && !loading && players.length > 0 && (
        <div className={styles.playersSection}>
          <div className={styles.playersHeading}>Players</div>

          <div className={styles.playersList}>
            {players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                onClick={onResultClick}
                className={styles.playerLink}
              >
                <div className={styles.playerBody}>
                  <div className={styles.playerName}>
                    {highlightMatch(player.name, trimmedQuery)}
                  </div>

                  <div className={styles.playerMeta}>
                    {player.position ? `${player.position} • ` : null}
                    {player.club ? `${player.club}` : null}

                    {formatOverall(player.overall, 'rounded') != null ? (
                      <>
                        {' • '}
                        <span className={styles.playerRating}>
                          {formatOverall(player.overall, 'rounded')}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
