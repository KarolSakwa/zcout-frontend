'use client';

import React from 'react';

export default function DuelCountdownBar({
  show,
  progress,
  paused,
  height,
}: {
  show: boolean;
  progress: number;
  paused: boolean;
  height: number;
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        borderBottom: '1px solid rgba(255,214,102,0.25)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
      }}
      aria-hidden
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
          background:
            'linear-gradient(90deg, rgba(255,214,102,0.15), rgba(255,214,102,0.95), rgba(255,214,102,0.65))',
          transition: 'width 50ms linear',
          opacity: paused ? 0.65 : 1,
          boxShadow: '0 0 16px rgba(255,214,102,0.25)',
        }}
      />
    </div>
  );
}
