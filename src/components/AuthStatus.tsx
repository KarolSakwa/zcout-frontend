'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const ANON_KEY = 'zcout_anon_id';

function readCookie(name: string): string | null {
  const parts = document.cookie.split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.substring(name.length + 1));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function ensureAnonId(): string | null {
  if (typeof window === 'undefined') return null;

  const fromLs = window.localStorage.getItem(ANON_KEY);
  if (fromLs) {
    writeCookie(ANON_KEY, fromLs, 31536000);
    return fromLs;
  }

  const fromCookie = readCookie(ANON_KEY);
  if (fromCookie) {
    window.localStorage.setItem(ANON_KEY, fromCookie);
    return fromCookie;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(ANON_KEY, id);
  writeCookie(ANON_KEY, id, 31536000);
  return id;
}

export default function AuthStatus() {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    (pathname?.startsWith('/auth/') ?? false);

  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    ensureAnonId();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const logout = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.dispatchEvent(new Event('zcout-route-loading:start'));
    window.location.href = `/auth/logout?next=${next}`;
  };

  if (isAuthRoute) return null;

  if (!mounted || !user) {
    return <Link href="/login">Log in</Link>;
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        title={user.email}
        aria-label="Account"
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          border: '1px solid var(--ui-border-subtle)',
          background: 'var(--ui-surface-soft)',
          color: 'var(--ui-accent-primary)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--ui-shadow-panel-soft)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21a8 8 0 0 0 -16 0" />
          <path d="M12 11a4 4 0 1 0 0 -8a4 4 0 0 0 0 8" />
        </svg>
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 220,
            padding: 10,
            borderRadius: 12,
            border: '1px solid var(--ui-border-subtle)',
            background: 'rgba(7, 14, 28, 0.96)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            display: 'grid',
            gap: 10,
            zIndex: 60,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              opacity: 0.8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={user.email}
          >
            {user.email}
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--ui-border-subtle)',
              background: 'var(--ui-surface-soft)',
              color: 'var(--ui-accent-primary)',
              fontSize: 11,
              textTransform: 'uppercase',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}