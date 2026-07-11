'use client';

import Link from 'next/link';
import LiveWidgetAttributeMeta from '@/components/duels/LiveWidgetAttributeMeta';
import WidgetPanel from '@/components/ui/WidgetPanel';

export type TopRiserItem = {
  id: string;
  playerId: number;
  player: string;
  attributeKey: string;
  attributeLabel: string;
  delta: string;
};

type WidgetMode = 'risers' | 'fallers';

const sevenDayMetaStyle = {
  fontSize: 9,
  fontWeight: 600,
  color: 'var(--ui-accent-primary)',
  whiteSpace: 'nowrap' as const,
};

const sevenDayMetaFloatingStyle = {
  ...sevenDayMetaStyle,
  fontSize: 10,
};

export default function TopRisersWidget({
  items,
  mode,
  embedded = false,
}: {
  items: TopRiserItem[];
  mode: WidgetMode;
  embedded?: boolean;
}) {
  const title = mode === 'risers' ? 'Top risers' : 'Top fallers';
  const deltaColor = mode === 'risers' ? 'var(--ui-accent-primary)' : 'var(--ui-accent-faller)';

  return (
    <WidgetPanel
      as="aside"
      variant="glass"
      embedded={embedded}
      title={title}
      headerMeta={
        <div style={embedded ? sevenDayMetaStyle : sevenDayMetaFloatingStyle}>
          7d
        </div>
      }
      className={embedded ? 'topRisersWidgetEmbedded' : 'topRisersWidget'}
      style={
        embedded
          ? undefined
          : {
              position: 'absolute',
              top: 'clamp(210px, 20vh, 300px)',
              transform: 'none',
              right: 'calc(100% + var(--duel-widget-offset, 40px))',
              width: 'var(--duel-widget-width, 318px)',
              zIndex: 20,
            }
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: embedded ? '6px 0' : '11px 0 10px',
              borderTop:
                embedded && index === 0
                  ? undefined
                  : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {embedded ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 6fr) minmax(0, 4fr) minmax(0, 2fr)',
                  alignItems: 'center',
                  columnGap: embedded ? 7 : 8,
                }}
              >
                <Link
                  href={`/players/${item.playerId}`}
                  className="topRiserPlayerLink"
                  style={{
                    color: 'rgba(232,240,252,0.95)',
                    fontSize: embedded ? 11 : 13,
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

                <div style={{ minWidth: 0, justifySelf: 'start' }}>
                  <LiveWidgetAttributeMeta
                    attributeKey={item.attributeKey}
                    attributeLabel={item.attributeLabel}
                    variant="inline"
                    compact={embedded}
                  />
                </div>

                <div
                  style={{
                    justifySelf: 'end',
                    color: deltaColor,
                    fontSize: embedded ? 11 : 13,
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  {item.delta}
                </div>
              </div>
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
                    <LiveWidgetAttributeMeta
                      attributeKey={item.attributeKey}
                      attributeLabel={item.attributeLabel}
                    />
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    color: deltaColor,
                    fontSize: embedded ? 11 : 13,
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.delta}
                </div>
              </div>
            )}
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

        @media (max-width: 1240px) {
          .topRisersWidget {
            display: none;
          }
        }
      `}</style>
    </WidgetPanel>
  );
}
