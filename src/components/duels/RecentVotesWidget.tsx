'use client';

import LiveWidgetAttributeMeta from '@/components/duels/LiveWidgetAttributeMeta';
import Link from 'next/link';
import WidgetPanel from '@/components/ui/WidgetPanel';

export type RecentVoteItem = {
  id: string;
  leftPlayer: string;
  rightPlayer: string;
  leftPlayerId: number;
  rightPlayerId: number;
  winnerPlayerId: number;
  attributeKey: string;
  attributeLabel: string;
};

const liveMetaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 9,
  fontWeight: 600,
  color: 'var(--ui-accent-primary)',
  whiteSpace: 'nowrap' as const,
};

const liveMetaFloatingStyle = {
  ...liveMetaStyle,
  gap: 6,
  fontSize: 10,
};

function LiveMeta({ embedded }: { embedded: boolean }) {
  const style = embedded ? liveMetaStyle : liveMetaFloatingStyle;

  return (
    <div style={style}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '999px',
          background: 'var(--ui-accent-primary)',
          boxShadow: '0 0 8px color-mix(in srgb, var(--ui-accent-primary) 60%, transparent)',
        }}
      />
      <span>Live</span>
    </div>
  );
}

export default function RecentVotesWidget({
  items,
  latestItemId,
  embedded = false,
  /** Parent CSS grid/flex owns placement (used by /duels page layout). */
  docked = false,
}: {
  items: RecentVoteItem[];
  latestItemId: string | null;
  embedded?: boolean;
  docked?: boolean;
}) {
  const useFloatingAbsolute = !embedded && !docked;

  return (
    <WidgetPanel
      as="aside"
      variant="glass"
      embedded={embedded}
      compact={embedded}
      title="Last votes"
      headerMeta={<LiveMeta embedded={embedded} />}
      className={embedded ? 'recentVotesWidgetEmbedded' : 'recentVotesWidget'}
      data-duels-widget={docked || useFloatingAbsolute ? 'votes' : undefined}
      style={
        useFloatingAbsolute
          ? {
              position: 'absolute',
              top: 'clamp(210px, 20vh, 300px)',
              transform: 'none',
              left: 'calc(100% + var(--duel-widget-offset, 40px))',
              width: 'var(--duel-widget-width, 318px)',
              zIndex: 20,
            }
          : undefined
      }
    >
      <div
        className={embedded ? 'homepageSecondaryContent' : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item, index) => {
          const isLatest = item.id === latestItemId;
          const leftWon = item.winnerPlayerId === item.leftPlayerId;
          const rightWon = item.winnerPlayerId === item.rightPlayerId;

          return (
            <div
              key={item.id}
              style={{
                padding: embedded ? '6px 0' : '11px 0 10px',
                borderTop:
                  embedded && index === 0
                    ? undefined
                    : '1px solid rgba(255,255,255,0.05)',
                animation: isLatest ? 'recentVoteEnter 420ms ease' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: embedded ? 6 : 8,
                  flexWrap: 'wrap',
                  lineHeight: embedded ? 1.2 : 1.26,
                  textAlign: 'center',
                }}
              >
                <Link
                  href={`/players/${item.leftPlayerId}`}
                  className="recentVotePlayerLink"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: leftWon ? 'rgba(232,240,252,0.95)' : 'rgba(232,240,252,0.78)',
                    fontSize: embedded ? 12 : 13,
                    fontWeight: leftWon ? 700 : 600,
                    textDecoration: 'none',
                  }}
                >
                  {leftWon && (
                    <span
                      style={{
                        color: 'var(--ui-accent-primary)',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ★
                    </span>
                  )}
                  <span>{item.leftPlayer}</span>
                </Link>

                <span
                  style={{
                    color: 'rgba(170,184,205,0.52)',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  vs
                </span>

                <Link
                  href={`/players/${item.rightPlayerId}`}
                  className="recentVotePlayerLink"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: rightWon ? 'rgba(232,240,252,0.95)' : 'rgba(232,240,252,0.78)',
                    fontSize: embedded ? 12 : 13,
                    fontWeight: rightWon ? 700 : 600,
                    textDecoration: 'none',
                  }}
                >
                  {rightWon && (
                    <span
                      style={{
                        color: 'var(--ui-accent-primary)',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ★
                    </span>
                  )}
                  <span>{item.rightPlayer}</span>
                </Link>
              </div>

              <div
                style={{
                  marginTop: embedded ? 2 : 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <LiveWidgetAttributeMeta
                  attributeKey={item.attributeKey}
                  attributeLabel={item.attributeLabel}
                />
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .homepageSecondaryContent {
          flex: 1;
          min-height: 0;
          justify-content: space-between;
        }

        @keyframes recentVoteEnter {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </WidgetPanel>
  );
}
