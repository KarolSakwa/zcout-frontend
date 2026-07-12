'use client';

import { useEffect, useRef, useState } from 'react';
import GlobalSearchDropdown from '@/components/search/GlobalSearchDropdown';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import styles from './GlobalSearch.module.css';

export default function GlobalSearch() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [focused, setFocused] = useState(false);

  const {
    query,
    setQuery,
    trimmedQuery,
    hasMinLength,
    hasAnyResults,
    loading,
    error,
    players,
  } = useGlobalSearch();

  const showDropdown = focused && trimmedQuery.length > 0;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setFocused(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        className={[
          styles.inputShell,
          focused ? styles.inputShellFocused : '',
          showDropdown ? styles.inputShellDropdownOpen : '',
        ].join(' ')}
      >
        <div className={styles.inputRow}>
          <div aria-hidden className={styles.searchIcon}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.searchIconSvg}
            >
              <path
                d="M11.25 11.25L14 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle
                cx="7"
                cy="7"
                r="4.25"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search players..."
            autoComplete="off"
            spellCheck={false}
            className={styles.input}
          />
        </div>
      </div>

      {showDropdown ? (
        <GlobalSearchDropdown
          hasMinLength={hasMinLength}
          loading={loading}
          error={error}
          hasAnyResults={hasAnyResults}
          players={players}
          trimmedQuery={trimmedQuery}
          onResultClick={() => setFocused(false)}
        />
      ) : null}
    </div>
  );
}
