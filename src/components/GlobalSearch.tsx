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
          borderRadius: showDropdown ? 'var(--ui-radius-xl) var(--ui-radius-xl) 0 0' : 'var(--ui-radius-xl)',
          border: focused
            ? '1px solid var(--ui-border-accent)'
            : '1px solid var(--ui-border-subtle)',
          background: 'linear-gradient(180deg, rgba(19,29,41,0.92), rgba(15,23,33,0.96))',
          boxShadow: focused
            ? '0 0 0 1px rgba(143,183,255,0.10), 0 10px 24px rgba(0,0,0,0.28)'
            : 'var(--ui-shadow-panel-soft)',
          transition: 'border-color 140ms ease, box-shadow 140ms ease, border-radius 140ms ease',
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '26px 1fr',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
          }}
        >
          <div
            aria-hidden
            style={{
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ui-text-dim)',
            }}
          >
            <svg
              width="16"
              height="16"
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
            placeholder="Search..."
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ui-text-primary)',
              fontSize: 13,
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
            borderRadius: '0 0 var(--ui-radius-xl) var(--ui-radius-xl)',
            border: '1px solid var(--ui-border-subtle)',
            borderTop: 'none',
            background: 'linear-gradient(180deg, rgba(19,29,41,0.985), rgba(15,23,33,0.995))',
            boxShadow: '0 18px 36px rgba(0,0,0,0.34)',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {!hasMinLength && (
            <div
              style={{
                padding: '12px 14px',
                color: 'var(--ui-text-muted)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Type at least {MIN_QUERY_LENGTH} letters
            </div>
          )}

          {hasMinLength && loading && (
            <div
              style={{
                padding: '10px 10px 10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--ui-radius-lg)',
                  background: 'rgba(255,255,255,0.028)',
                  color: 'var(--ui-text-muted)',
                  fontSize: 12,
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
                padding: '12px 14px',
                color: 'var(--ui-danger)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {hasMinLength && !loading && !error && !hasAnyResults && (
            <div
              style={{
                padding: '12px 14px',
                color: 'var(--ui-text-muted)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              No results
            </div>
          )}

          {hasMinLength && !loading && players.length > 0 && (
            <div style={{ padding: '10px 10px 4px' }}>
              <div
                style={{
                  padding: '0 8px 6px',
                  color: 'var(--ui-text-dim)',
                  fontSize: 9,
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
                      padding: '10px 12px',
                      borderRadius: 'var(--ui-radius-lg)',
                      border: '1px solid transparent',
                      background: 'rgba(255,255,255,0.028)',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: 'var(--ui-text-primary)',
                          fontSize: 13,
                          fontWeight: 800,
                          lineHeight: 1.15,
                        }}
                      >
                        {highlightMatch(player.name, trimmedQuery)}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color: 'var(--ui-text-muted)',
                          fontSize: 11,
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
                                fontSize: '1.08em',
                                fontWeight: 700,
                                letterSpacing: '-0.055em',
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

          {/* {hasMinLength && !loading && clubs.length > 0 && (
            <div style={{ padding: players.length > 0 ? '6px 10px 10px' : '10px 10px 10px' }}>
              <div
                style={{
                  padding: '0 8px 6px',
                  color: 'var(--ui-text-dim)',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                Clubs
              </div>

              <div style={{ display: 'grid', gap: 4 }}>
                {clubs.map((club) => (
                  <Link
                    key={club.id}
                    href={`/database/clubs/${encodeURIComponent(club.slug)}`}
                    onClick={() => setFocused(false)}
                    style={{
                      display: 'block',
                      padding: '10px 12px',
                      borderRadius: 'var(--ui-radius-lg)',
                      border: '1px solid transparent',
                      background: 'rgba(255,255,255,0.028)',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        color: 'var(--ui-text-primary)',
                        fontSize: 13,
                        fontWeight: 800,
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {highlightMatch(club.name, trimmedQuery)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )} */}
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