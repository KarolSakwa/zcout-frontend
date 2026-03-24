'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    window.location.href = `${BACKEND}/auth/google/redirect`;
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

    router.push('/duels');
  };

  const shellStyle: React.CSSProperties = {
    maxWidth: 360,
    margin: '24px auto',
    padding: 12,
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 'var(--ui-radius-lg)',
    border: '1px solid var(--ui-border-subtle)',
    background: 'var(--ui-surface-elevated)',
    boxShadow: 'var(--ui-shadow-panel-soft)',
    padding: 14,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    margin: '0 0 12px',
    color: 'var(--ui-text-primary)',
    fontWeight: 800,
    letterSpacing: '0.01em',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 'var(--ui-radius-md)',
    border: '1px solid var(--ui-border-subtle)',
    background: 'color-mix(in srgb, var(--ui-surface-panel-solid) 72%, transparent)',
    color: 'var(--ui-text-primary)',
    outline: 'none',
    width: '100%',
    fontSize: 13,
  };

  const primaryButtonStyle: React.CSSProperties = {
    minHeight: 34,
    padding: '0 12px',
    borderRadius: 'var(--ui-radius-md)',
    border: '1px solid var(--ui-action-primary-border)',
    background: 'linear-gradient(180deg, var(--ui-action-primary-bg-1) 0%, var(--ui-action-primary-bg-2) 100%)',
    color: 'var(--ui-action-primary-text)',
    cursor: loading ? 'default' : 'pointer',
    width: '100%',
    fontWeight: 800,
    fontSize: 13,
    boxShadow: 'var(--ui-shadow-button)',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    minHeight: 34,
    padding: '0 12px',
    borderRadius: 'var(--ui-radius-md)',
    border: '1px solid var(--ui-action-secondary-border)',
    background: 'linear-gradient(180deg, var(--ui-action-secondary-bg-1) 0%, var(--ui-action-secondary-bg-2) 100%)',
    color: 'var(--ui-action-secondary-text)',
    cursor: loading ? 'default' : 'pointer',
    width: '100%',
    fontWeight: 800,
    fontSize: 13,
    boxShadow: 'var(--ui-shadow-button)',
    marginBottom: 10,
  };

  const errorStyle: React.CSSProperties = {
    marginTop: 4,
    color: 'var(--ui-danger)',
    fontSize: 11,
    lineHeight: 1.2,
  };

  const formErrorStyle: React.CSSProperties = {
    color: 'var(--ui-danger)',
    fontSize: 12,
    lineHeight: 1.3,
  };

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Log in</h1>

        <button type="button" onClick={onGoogle} disabled={loading} style={secondaryButtonStyle}>
          Zaloguj się przez Google
        </button>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              autoComplete="email"
              style={inputStyle}
              disabled={loading}
            />
            {fieldMsg('email') && <div style={errorStyle}>{fieldMsg('email')}</div>}
          </div>

          <div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              autoComplete="current-password"
              style={inputStyle}
              disabled={loading}
            />
            {fieldMsg('password') && <div style={errorStyle}>{fieldMsg('password')}</div>}
          </div>

          <button disabled={loading} style={primaryButtonStyle}>
            Log in
          </button>

          {formError && <div style={formErrorStyle}>{formError}</div>}
        </form>
      </div>
    </div>
  );
}