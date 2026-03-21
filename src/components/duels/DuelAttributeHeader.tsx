'use client';

import React from 'react';

export default function DuelAttributeHeader({ attribute }: { attribute: string }) {
  if (!attribute) return null;

  return (
    <div
      style={{
        maxWidth: 996,
        margin: '18px auto 26px',
        display: 'grid',
        placeItems: 'center',
        gap: 'var(--ui-space-md)',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 'var(--ui-radius-pill)',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--ui-accent-primary-soft)',
          border: '1px solid var(--ui-border-accent)',
          color: 'var(--ui-accent-primary)',
          fontWeight: 900,
          boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
        }}
        aria-hidden
      >
        ★
      </div>

      <div
        style={{
          fontWeight: 950,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ui-text-primary)',
          fontSize: 18,
          textShadow: '0 6px 18px rgba(0,0,0,0.55)',
        }}
      >
        {String(attribute)}
      </div>

      <div
        style={{
          width: 180,
          height: 2,
          borderRadius: 'var(--ui-radius-pill)',
          background: 'linear-gradient(90deg, transparent, var(--ui-accent-primary), transparent)',
          opacity: 0.72,
        }}
        aria-hidden
      />
    </div>
  );
}