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

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const fieldMsg = (key: string) => fieldErrors[key]?.[0] ?? null;

  const stopGlobalLoader = () => {
    window.dispatchEvent(new Event('zcout-route-loading:stop'));
  };

  const startGlobalLoader = () => {
    window.dispatchEvent(new Event('zcout-route-loading:start'));
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

    const res = await fetch(`${BACKEND}/register`, {
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
      body: JSON.stringify({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
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
        (res.status === 422
          ? 'Validation failed'
          : res.status === 419
            ? 'Session expired. Try again.'
            : 'Register failed');

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

  const inputStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.25)',
    color: 'rgba(255,255,255,0.9)',
    outline: 'none',
    width: '100%',
  };

  const errorStyle: React.CSSProperties = {
    marginTop: 6,
    color: '#ff6b6b',
    fontSize: 12,
    lineHeight: 1.2,
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Create account</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name"
            autoComplete="name"
            style={inputStyle}
            disabled={loading}
          />
          {fieldMsg('name') && <div style={errorStyle}>{fieldMsg('name')}</div>}
        </div>

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
            autoComplete="new-password"
            style={inputStyle}
            disabled={loading}
          />
          {fieldMsg('password') && <div style={errorStyle}>{fieldMsg('password')}</div>}
        </div>

        <div>
          <input
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="password confirmation"
            type="password"
            autoComplete="new-password"
            style={inputStyle}
            disabled={loading}
          />
          {fieldMsg('password_confirmation') && <div style={errorStyle}>{fieldMsg('password_confirmation')}</div>}
        </div>

        <button disabled={loading} style={{ padding: 10, cursor: loading ? 'default' : 'pointer' }}>
          Create account
        </button>

        {formError && <div style={{ color: '#ff6b6b' }}>{formError}</div>}
      </form>
    </div>
  );
}