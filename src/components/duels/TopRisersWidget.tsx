'use client';

import Link from 'next/link';

export type TopRiserItem = {
  id: string;
  playerId: number;
  player: string;
  attributeKey: string;
  attributeLabel: string;
  delta: string;
};

type WidgetMode = 'risers' | 'fallers';

export default function TopRisersWidget({
  items,
  mode,
}: {
  items: TopRiserItem[];
  mode: WidgetMode;
}) {
  const title = mode === 'risers' ? 'Top risers' : 'Top fallers';
  const deltaColor = mode === 'risers' ? 'var(--ui-accent-primary)' : 'var(--ui-accent-faller)';

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
          color: var(--ui-accent-primary) !important;
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