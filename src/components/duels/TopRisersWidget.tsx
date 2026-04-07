'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TopRiserItem = {
  id: string;
  playerId: number;
  player: string;
  attributeKey: string;
  attributeLabel: string;
  delta: string;
};

type WidgetMode = 'risers' | 'fallers';

const topRisersMock: TopRiserItem[] = [
  { id: 'tr-1', playerId: 101, player: 'Cole Palmer', attributeKey: 'creativity', attributeLabel: 'Creativity', delta: '+0.42' },
  { id: 'tr-2', playerId: 102, player: 'Alexander Isak', attributeKey: 'finishing', attributeLabel: 'Finishing', delta: '+0.37' },
  { id: 'tr-3', playerId: 103, player: 'Milos Kerkez', attributeKey: 'acceleration', attributeLabel: 'Acceleration', delta: '+0.31' },
  { id: 'tr-4', playerId: 104, player: 'Morgan Rogers', attributeKey: 'dribbling', attributeLabel: 'Dribbling', delta: '+0.28' },
  { id: 'tr-5', playerId: 105, player: 'Morgan Gibbs-White', attributeKey: 'passing', attributeLabel: 'Passing', delta: '+0.24' },
];

const topFallersMock: TopRiserItem[] = [
  { id: 'tf-1', playerId: 201, player: 'Casemiro', attributeKey: 'stamina', attributeLabel: 'Stamina', delta: '-0.39' },
  { id: 'tf-2', playerId: 202, player: 'Raheem Sterling', attributeKey: 'acceleration', attributeLabel: 'Acceleration', delta: '-0.34' },
  { id: 'tf-3', playerId: 203, player: 'Kalvin Phillips', attributeKey: 'passing', attributeLabel: 'Passing', delta: '-0.29' },
  { id: 'tf-4', playerId: 204, player: 'Ben Chilwell', attributeKey: 'crossing', attributeLabel: 'Crossing', delta: '-0.23' },
  { id: 'tf-5', playerId: 205, player: 'Jordan Henderson', attributeKey: 'work_rate', attributeLabel: 'Work Rate', delta: '-0.20' },
];

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pickDailyMode(): WidgetMode {
  return Math.random() < 0.6 ? 'risers' : 'fallers';
}

export default function TopRisersWidget() {
  const [mode, setMode] = useState<WidgetMode>('risers');

  useEffect(() => {
    const storageKey = 'zcout-duels-side-widget-mode';
    const today = getTodayKey();

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { day: string; mode: WidgetMode };
        if (parsed.day === today && (parsed.mode === 'risers' || parsed.mode === 'fallers')) {
          setMode(parsed.mode);
          return;
        }
      }
    } catch {}

    const nextMode = pickDailyMode();
    setMode(nextMode);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ day: today, mode: nextMode }));
    } catch {}
  }, []);

  const items = mode === 'risers' ? topRisersMock : topFallersMock;
  const title = mode === 'risers' ? 'Top risers' : 'Top fallers';
  const deltaColor =
  mode === 'risers'
    ? 'var(--ui-accent-primary)'
    : 'var(--ui-accent-faller)';
  const accentColor =
  mode === 'risers'
    ? 'var(--ui-accent-primary)'
    : 'color-mix(in srgb, var(--ui-danger) 72%, var(--ui-accent-primary) 28%)';

  return (
    <aside
      className="topRisersWidget"
      style={{
        position: 'fixed',
        top: '50%',
        left: 40,
        transform: 'translateY(-50%)',
        width: 318,
        borderRadius: '22px',
        border: '1px solid rgba(140, 170, 210, 0.16)',
        background: 'linear-gradient(180deg, rgba(14,22,36,0.88), rgba(8,14,24,0.82))',
        boxShadow: '0 18px 44px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '14px 14px 10px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(214, 226, 244, 0.82)',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--ui-accent-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          7d
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '11px 0 10px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <Link
                  href={`/players/${item.playerId}`}
                  className="topRiserPlayerLink"
                  style={{
                    color: 'rgba(232,240,252,0.95)',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.player}
                </Link>

                <div
                  style={{
                    color: 'rgba(170,184,205,0.74)',
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {item.attributeLabel}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  color: deltaColor,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                {item.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .topRiserPlayerLink {
          transition: color 140ms ease, text-shadow 140ms ease;
        }

        .topRiserPlayerLink:hover {
          color: ${accentColor} !important;
          text-shadow: 0 0 10px rgba(92, 163, 255, 0.18);
        }

        @media (max-width: 1460px) {
          .topRisersWidget {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}