'use client';

import React from 'react';

export default function DuelAttributeHeader({ attribute }: { attribute: string }) {
  if (!attribute) return null;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '12px auto 18px',
        display: 'grid',
        placeItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--ui-radius-pill)',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--ui-accent-primary-soft)',
          border: '1px solid var(--ui-border-accent)',
          color: 'var(--ui-accent-primary)',
          fontWeight: 900,
          boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
          fontSize: 16,
        }}
        aria-hidden
      >
        ★
      </div>

      <div
        style={{
          fontWeight: 950,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ui-text-primary)',
          fontSize: 16,
          textShadow: '0 6px 18px rgba(0,0,0,0.55)',
        }}
      >
        {String(attribute)}
      </div>

      <div
        style={{
          width: 160,
          height: 2,
          borderRadius: 'var(--ui-radius-pill)',
          background: 'linear-gradient(90deg, transparent, var(--ui-accent-primary), transparent)',
          opacity: 0.68,
        }}
        aria-hidden
      />
    </div>
  );
}