'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type User = {
  id: number;
  name: string;
  email: string;
};

const KEY = 'zcout_user';
const EVT = 'zcout-auth';

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

function readUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeUser(u: User | null) {
  if (typeof window === 'undefined') return;
  if (u) localStorage.setItem(KEY, JSON.stringify(u));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export default function AuthStatus() {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;

  const [user, setUser] = useState<User | null>(() => readUser());

  useEffect(() => {
    ensureAnonId();
  }, []);

  const refreshFromServer = async () => {
    const res = await fetch('/api/auth/user', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = (await res.json()) as User;
      setUser(data);
      writeUser(data);
      return;
    }

    setUser(null);
    writeUser(null);
  };

  useEffect(() => {
    if (isAuthRoute) return;

    const onEvt = () => setUser(readUser());
    window.addEventListener(EVT, onEvt);
    refreshFromServer().catch(() => {});
    return () => window.removeEventListener(EVT, onEvt);
  }, [isAuthRoute]);

  const logout = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.dispatchEvent(new Event('zcout-route-loading:start'));
    window.location.href = `/auth/logout?next=${next}`;
  };

  if (isAuthRoute) return null;

  if (!user) {
    return <Link href="/login">Log in</Link>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ opacity: 0.85 }}>{user.email}</span>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}