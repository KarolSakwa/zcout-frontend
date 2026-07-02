'use client';

import Link from 'next/link';
import {
  type NeedsMoreRatingsItem,
} from '@/components/homepage/useHomepageWidgets';
import { getRatingColor } from '@/lib/ratings';

const confidenceLabelStyle = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(170,184,205,0.74)',
  lineHeight: 1.2,
  whiteSpace: 'nowrap' as const,
};

const rowGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 9fr) minmax(0, 3fr)',
  columnGap: 8,
  alignItems: 'start',
};

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
        borderRadius: embedded ? '19px' : '22px',
        border: '1px solid rgba(140, 170, 210, 0.16)',
        background: 'linear-gradient(180deg, rgba(14,22,36,0.88), rgba(8,14,24,0.82))',
        boxShadow: '0 18px 44px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: embedded ? '12px 12px 8px' : '14px 14px 10px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: embedded ? 10 : 12,
          marginBottom: embedded ? 7 : 8,
        }}
      >
        <div
          style={{
            fontSize: embedded ? 9 : 10,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(214, 226, 244, 0.82)',
            whiteSpace: 'nowrap',
          }}
        >
          Needs more ratings
        </div>

        {embedded ? (
          <span
            style={{
              ...confidenceLabelStyle,
              fontSize: 8,
            }}
          >
            Confidence
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item) => {
          const metaParts = [item.position, item.club].filter(Boolean);

          return (
            <div
              key={item.id}
              style={{
                padding: embedded ? '9px 0 8px' : '11px 0 10px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {embedded ? (
                <>
                  <div style={{ ...rowGridStyle, columnGap: 7 }}>
                    <Link
                      href={`/players/${item.playerId}`}
                      className="needsMoreRatingsPlayerLink"
                      style={{
                        color: 'rgba(232,240,252,0.95)',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}
                    >
                      {item.player}
                    </Link>

                    <div
                      style={{
                        color: 'rgba(214, 226, 244, 0.82)',
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.confidence.toFixed(1)}%
                    </div>
                  </div>

                  {item.overall != null || metaParts.length > 0 ? (
                    <div style={{ ...rowGridStyle, columnGap: 7, marginTop: 3 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          minWidth: 0,
                          color: 'rgba(170,184,205,0.74)',
                          fontSize: 10,
                          fontWeight: 500,
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.overall != null ? (
                          <>
                            <span
                              className="ratingValue"
                              style={{
                                fontSize: 10,
                                lineHeight: 1,
                                color: getRatingColor(Math.round(item.overall)),
                              }}
                            >
                              {Math.round(item.overall)}
                            </span>
                            {(item.position || item.club) ? (
                              <span aria-hidden="true">•</span>
                            ) : null}
                          </>
                        ) : null}
                        {item.position ? <span>{item.position}</span> : null}
                        {item.position && item.club ? (
                          <span aria-hidden="true">•</span>
                        ) : null}
                        {item.club ? <span>{item.club}</span> : null}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
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

                    {metaParts.length > 0 ? (
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
                        {metaParts.join(' · ')}
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
              )}
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
