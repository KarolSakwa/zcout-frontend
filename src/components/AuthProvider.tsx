'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthResolved: boolean;
  refreshAuth: () => Promise<void>;
  setAuthUser: (user: AuthUser | null) => void;
};

const KEY = 'zcout_user';
const EVT = 'zcout-auth';

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;

  if (user) {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(KEY);
  }

  window.dispatchEvent(new Event(EVT));
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;

  const [user, setUser] = useState<AuthUser | null>(() => readUser());
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  const setAuthUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    writeUser(nextUser);
    setIsAuthResolved(true);
  }, []);

  const refreshAuth = useCallback(async () => {
    const res = await fetch('/api/auth/user', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = (await res.json()) as AuthUser;
      setUser(data);
      writeUser(data);
      setIsAuthResolved(true);
      return;
    }

    setUser(null);
    writeUser(null);
    setIsAuthResolved(true);
  }, []);

  useEffect(() => {
    if (isAuthRoute) {
      setIsAuthResolved(true);
      return;
    }

    const onEvt = () => {
      setUser(readUser());
      setIsAuthResolved(true);
    };

    window.addEventListener(EVT, onEvt);
    refreshAuth().catch(() => {
      setIsAuthResolved(true);
    });

    return () => {
      window.removeEventListener(EVT, onEvt);
    };
  }, [isAuthRoute, refreshAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthResolved,
      refreshAuth,
      setAuthUser,
    }),
    [user, isAuthResolved, refreshAuth, setAuthUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}