'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Link from 'next/link';

type LaravelErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

const BACKEND = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

function getXsrfToken() {
  const xsrfCookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
  return xsrfCookie ? decodeURIComponent(xsrfCookie.split('=')[1] ?? '') : '';
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const nextPath = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/duels';

  const fieldMsg = (key: string) => fieldErrors[key]?.[0] ?? null;

  const startGlobalLoader = () => {
    window.dispatchEvent(new Event('zcout-route-loading:start'));
  };

  const stopGlobalLoader = () => {
    window.dispatchEvent(new Event('zcout-route-loading:stop'));
  };

  const fetchMeAndBroadcast = async () => {
    const me = await fetch(`${BACKEND}/api/user`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Origin: ORIGIN,
        Referer: `${ORIGIN}/`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });

    if (me.ok) {
      const u = await me.json();
      localStorage.setItem('zcout_user', JSON.stringify(u));
      window.dispatchEvent(new Event('zcout-auth'));
    }
  };

  const onGoogle = () => {
    setFormError(null);
    setFieldErrors({});
    setLoading(true);
    startGlobalLoader();

    const url = new URL(`${BACKEND}/auth/google/redirect`);

    if (redirectTo && redirectTo.startsWith('/')) {
      url.searchParams.set('next', redirectTo);
    }

    window.location.href = url.toString();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setLoading(true);
    startGlobalLoader();

    const csrfRes = await fetch(`${BACKEND}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Origin: ORIGIN,
        Referer: `${ORIGIN}/`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!csrfRes.ok) {
      setLoading(false);
      setFormError('CSRF failed');
      stopGlobalLoader();
      return;
    }

    const xsrf = getXsrfToken();

    const res = await fetch(`${BACKEND}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        Referer: `${ORIGIN}/`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': xsrf,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let payload: LaravelErrorPayload | null = null;

      try {
        payload = (await res.json()) as LaravelErrorPayload;
      } catch {
        payload = null;
      }

      if (payload?.errors) setFieldErrors(payload.errors);

      const msg =
        payload?.message ||
        (res.status === 422 ? 'Validation failed' : res.status === 419 ? 'Session expired. Try again.' : 'Login failed');

      setFormError(msg);
      setLoading(false);
      stopGlobalLoader();
      return;
    }

    await fetchMeAndBroadcast().catch(() => {});

    await fetch('/api/auth/claim-anon', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }).catch(() => null);

    router.push(nextPath);
  };

  const pageStyle: React.CSSProperties = {
    width: '100%',
    display: 'grid',
    placeItems: 'start center',
    padding: 'clamp(44px, 10vh, 96px) 16px 40px',
  };

  const shellStyle: React.CSSProperties = {
    width: 'min(100%, 448px)',
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: '18px',
    border: '1px solid rgba(94, 118, 156, 0.26)',
    background: 'linear-gradient(180deg, rgba(18, 26, 40, 0.94) 0%, rgba(10, 16, 28, 0.96) 100%)',
    boxShadow: '0 24px 56px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)',
    padding: 24,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 30,
    lineHeight: 1,
    margin: '0 0 18px',
    color: 'var(--ui-text-primary)',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    textAlign: 'center',
  };

  const formStyle: React.CSSProperties = {
    display: 'grid',
    gap: 14,
    marginTop: 14,
  };

  const fieldWrapStyle: React.CSSProperties = {
    display: 'grid',
    gap: 6,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(165, 183, 210, 0.72)',
  };

  const inputStyle: React.CSSProperties = {
    minHeight: 46,
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 14px',
    borderRadius: 10,
    border: '1px solid rgba(82, 104, 140, 0.32)',
    background: 'linear-gradient(180deg, rgba(9,15,26,0.96), rgba(7,12,22,0.96))',
    color: 'var(--ui-text-primary)',
    outline: 'none',
    fontSize: 14,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  };

  const errorStyle: React.CSSProperties = {
    color: 'var(--ui-danger)',
    fontSize: 11,
    lineHeight: 1.35,
  };

  const formErrorStyle: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid color-mix(in srgb, var(--ui-danger) 28%, transparent)',
    background: 'color-mix(in srgb, var(--ui-danger) 8%, transparent)',
    padding: '10px 12px',
    color: 'var(--ui-danger)',
    fontSize: 12,
    lineHeight: 1.4,
  };

  const footerStyle: React.CSSProperties = {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(181, 197, 221, 0.72)',
  };

  const footerLinkStyle: React.CSSProperties = {
    color: 'var(--ui-accent-primary)',
    textDecoration: 'none',
    fontWeight: 700,
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Log in</h1>

          <form onSubmit={onSubmit} style={formStyle}>
            <div style={fieldWrapStyle}>
              <label style={labelStyle} htmlFor="email">
                Email
              </label>

              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                style={inputStyle}
                disabled={loading}
              />

              {fieldMsg('email') && <div style={errorStyle}>{fieldMsg('email')}</div>}
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle} htmlFor="password">
                Password
              </label>

              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                type="password"
                autoComplete="current-password"
                style={inputStyle}
                disabled={loading}
              />

              {fieldMsg('password') && <div style={errorStyle}>{fieldMsg('password')}</div>}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              Log in
            </Button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                margin: '2px 0',
                color: 'rgba(165, 183, 210, 0.42)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              or
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <Button type="button" variant="secondary" size="lg" fullWidth onClick={onGoogle} disabled={loading}>
              Continue with Google
            </Button>

            {formError && <div style={formErrorStyle}>{formError}</div>}
          </form>

          <div style={footerStyle}>
            No account?{' '}
            <Link href="/register" style={footerLinkStyle}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}