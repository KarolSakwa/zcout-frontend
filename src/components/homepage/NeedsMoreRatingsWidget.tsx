'use client';

import Link from 'next/link';
import type { NeedsMoreRatingsItem } from '@/components/homepage/useHomepageWidgets';

export default function NeedsMoreRatingsWidget({
  items,
  embedded = false,
}: {
  items: NeedsMoreRatingsItem[];
  embedded?: boolean;
}) {
  return (
    <aside
      className={embedded ? 'needsMoreRatingsWidgetEmbedded' : 'needsMoreRatingsWidget'}
      style={{
        ...(embedded
          ? {
              position: 'relative',
              width: '100%',
            }
          : {
              position: 'absolute',
              top: 'clamp(210px, 20vh, 300px)',
              transform: 'none',
              right: 'calc(100% + var(--duel-widget-offset, 40px))',
              width: 'var(--duel-widget-width, 318px)',
              zIndex: 20,
            }),
        borderRadius: '22px',
        border: '1px solid rgba(140, 170, 210, 0.16)',
        background: 'linear-gradient(180deg, rgba(14,22,36,0.88), rgba(8,14,24,0.82))',
        boxShadow: '0 18px 44px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '14px 14px 10px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          Needs more ratings
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item) => {
          const meta = [item.position, item.club].filter(Boolean).join(' · ');

          return (
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
                    className="needsMoreRatingsPlayerLink"
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

                  {meta ? (
                    <div
                      style={{
                        color: 'rgba(170,184,205,0.74)',
                        fontSize: 11,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {meta}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    color: 'rgba(214, 226, 244, 0.82)',
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.confidence.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .needsMoreRatingsPlayerLink {
          transition: color 140ms ease, text-shadow 140ms ease;
        }

        .needsMoreRatingsPlayerLink:hover {
          color: var(--ui-accent-primary) !important;
          text-shadow: 0 0 10px rgba(92, 163, 255, 0.18);
        }

        @media (max-width: 1240px) {
          .needsMoreRatingsWidget {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
