'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { formatOverall } from '@/lib/ratings';
import { logEvent } from '@/lib/telemetry';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 150;

type SearchPlayer = {
  id: number;
  name: string;
  slug: string | null;
  position: string | null;
  club: string | null;
  overall: number | null;
};

type SearchClub = {
  id: number;
  name: string;
  slug: string;
};

type SearchResponse = {
  query: string;
  players: SearchPlayer[];
  clubs: SearchClub[];
};

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
      <span
        key={`${part}-${index}`}
        style={{
          color: 'var(--ui-accent-primary)',
        }}
      >
        {part}
      </span>
    );
  });
}

export default function GlobalSearch() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [clubs, setClubs] = useState<SearchClub[]>([]);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const hasMinLength = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const hasAnyResults = players.length > 0 || clubs.length > 0;
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

  useEffect(() => {
    if (!hasMinLength) {
      if (abortRef.current) abortRef.current.abort();
      setLoading(false);
      setPlayers([]);
      setClubs([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Search failed: ${res.status} ${text.slice(0, 120)}`);
        }

        const data = (await res.json()) as SearchResponse;

        logEvent('search_used', {
          query: trimmedQuery,
          players_count: Array.isArray(data.players) ? data.players.length : 0,
          clubs_count: Array.isArray(data.clubs) ? data.clubs.length : 0,
        });

        setPlayers(Array.isArray(data.players) ? data.players : []);
        setClubs(Array.isArray(data.clubs) ? data.clubs : []);
      } catch (e) {
        if (controller.signal.aborted) return;
        const message = e instanceof Error ? e.message : 'Search failed';
        setPlayers([]);
        setClubs([]);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, hasMinLength]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        width: '100%',
        margin: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: showDropdown ? '12px 12px 0 0' : '12px',
          border: focused
            ? '1px solid rgba(110, 145, 210, 0.42)'
            : '1px solid rgba(76, 96, 132, 0.28)',
          background: 'linear-gradient(180deg, rgba(15,22,32,0.96), rgba(11,17,26,0.985))',
          boxShadow: focused
            ? '0 0 0 1px rgba(110,145,210,0.08), 0 8px 20px rgba(0,0,0,0.22)'
            : '0 6px 16px rgba(0,0,0,0.16)',
          transition: 'border-color 140ms ease, box-shadow 140ms ease, border-radius 140ms ease',
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '18px 1fr',
            alignItems: 'center',
            gap: 8,
            padding: '7px 11px',
          }}
        >
          <div
            aria-hidden
            style={{
              display: 'grid',
              placeItems: 'center',
              color: 'rgba(178,192,216,0.52)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
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
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ui-text-primary)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.01em',
              lineHeight: 1.2,
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% - 1px)',
            left: 0,
            right: 0,
            zIndex: 1,
            borderRadius: '0 0 12px 12px',
            border: '1px solid rgba(76,96,132,0.28)',
            borderTop: 'none',
            background: 'linear-gradient(180deg, rgba(15,22,32,0.992), rgba(11,17,26,0.998))',
            boxShadow: '0 18px 34px rgba(0,0,0,0.26)',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {!hasMinLength && (
            <div
              style={{
                padding: '10px 12px',
                color: 'var(--ui-text-muted)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Type at least {MIN_QUERY_LENGTH} letters
            </div>
          )}

          {hasMinLength && loading && (
            <div
              style={{
                padding: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--ui-text-muted)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span>Searching</span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '999px',
                      background: 'var(--ui-accent-primary)',
                      opacity: 0.35,
                      animation: 'zcoutSearchDot 1s ease-in-out infinite',
                    }}
                  />

                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '999px',
                      background: 'var(--ui-accent-primary)',
                      opacity: 0.35,
                      animation: 'zcoutSearchDot 1s ease-in-out 0.18s infinite',
                    }}
                  />

                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '999px',
                      background: 'var(--ui-accent-primary)',
                      opacity: 0.35,
                      animation: 'zcoutSearchDot 1s ease-in-out 0.36s infinite',
                    }}
                  />
                </span>
              </div>
            </div>
          )}

          {hasMinLength && !loading && error && (
            <div
              style={{
                padding: '10px 12px',
                color: 'var(--ui-danger)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {hasMinLength && !loading && !error && !hasAnyResults && (
            <div
              style={{
                padding: '10px 12px',
                color: 'var(--ui-text-muted)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              No results
            </div>
          )}

          {hasMinLength && !loading && players.length > 0 && (
            <div style={{ padding: '8px 8px 4px' }}>
              <div
                style={{
                  padding: '0 6px 5px',
                  color: 'var(--ui-text-dim)',
                  fontSize: 8,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                Players
              </div>

              <div style={{ display: 'grid', gap: 4 }}>
                {players.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    onClick={() => setFocused(false)}
                    style={{
                      display: 'block',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      border: '1px solid transparent',
                      background: 'rgba(255,255,255,0.022)',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: 'var(--ui-text-primary)',
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.12,
                        }}
                      >
                        {highlightMatch(player.name, trimmedQuery)}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color: 'var(--ui-text-muted)',
                          fontSize: 10,
                          fontWeight: 600,
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {player.position ? `${player.position} • ` : null}
                        {player.club ? `${player.club}` : null}

                        {formatOverall(player.overall, 'rounded') != null ? (
                          <>
                            {' • '}
                            <span
                              style={{
                                fontFamily: 'var(--font-rating), "Segoe UI", system-ui, sans-serif',
                                fontVariantNumeric: 'tabular-nums lining-nums',
                                fontFeatureSettings: '"tnum" 1, "lnum" 1',
                                fontSize: '1.05em',
                                fontWeight: 700,
                                letterSpacing: '-0.05em',
                                lineHeight: 1,
                                color: 'var(--ui-text-primary)',
                              }}
                            >
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
      )}

      <style jsx>{`
        @keyframes zcoutSearchDot {
          0%,
          80%,
          100% {
            opacity: 0.25;
            transform: scale(1);
          }

          40% {
            opacity: 1;
            transform: scale(1.35);
          }
        }
      `}</style>
    </div>
  );
}