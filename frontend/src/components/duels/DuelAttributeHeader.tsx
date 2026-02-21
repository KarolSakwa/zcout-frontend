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
        gap: 10,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,214,102,0.16)',
          border: '1px solid rgba(255,214,102,0.45)',
          color: 'rgba(255,214,102,0.95)',
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
          color: 'rgba(255,255,255,0.92)',
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
          borderRadius: 999,
          background: 'linear-gradient(90deg, transparent, rgba(255,214,102,0.75), transparent)',
          opacity: 0.9,
        }}
        aria-hidden
      />
    </div>
  );
}
