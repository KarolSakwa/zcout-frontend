'use client';

import React from 'react';
import AttributeIcon from '@/components/AttributeIcon';

function formatAttributeLabel(attribute: string) {
  return attribute
    .replace(/^gk_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function DuelAttributeHeader({ attribute }: { attribute: string }) {
  if (!attribute) return null;

    return (
    <div
      style={{
        maxWidth: 720,
        margin: '4px auto 30px',
        gap: 14,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ui-text-muted)',
          opacity: 0.82,
        }}
      >
        Who&apos;s better at...
      </div>

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--ui-radius-pill)',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--ui-accent-primary-soft)',
          border: '1px solid var(--ui-border-accent)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
        }}
      >
        <AttributeIcon attributeKey={attribute} label={attribute} size={20} />
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
        {formatAttributeLabel(String(attribute))}
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