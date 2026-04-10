'use client';

import LiveWidgetAttributeMeta from '@/components/duels/LiveWidgetAttributeMeta';
import Link from 'next/link';

type RecentVoteItem = {
  id: string;
  leftPlayer: string;
  rightPlayer: string;
  leftPlayerId: number;
  rightPlayerId: number;
  winnerPlayerId: number;
  attributeKey: string;
  attributeLabel: string;
};

export default function RecentVotesWidget({
  items,
  latestItemId,
}: {
  items: RecentVoteItem[];
  latestItemId: string | null;
}) {
  return (
    <aside
      className="recentVotesWidget"
      style={{
        position: 'absolute',
        top: 'clamp(210px, 20vh, 300px)',
        transform: 'none',
        left: 'calc(100% + var(--duel-widget-offset, 40px))',
        width: 'var(--duel-widget-width, 318px)',
        height: 'auto',
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
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            minWidth: 0,
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
            Last votes
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--ui-accent-primary)',
            whiteSpace: 'nowrap',
          }}
        >
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
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.map((item) => {
          const isLatest = item.id === latestItemId;
          const leftWon = item.winnerPlayerId === item.leftPlayerId;
          const rightWon = item.winnerPlayerId === item.rightPlayerId;

          return (
            <div
              key={item.id}
              style={{
                padding: '11px 0 10px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                animation: isLatest ? 'recentVoteEnter 420ms ease' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  lineHeight: 1.26,
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
                    fontSize: 13,
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
                    fontSize: 13,
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
                  marginTop: 4,
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

        @media (max-width: 1240px) {
          .recentVotesWidget {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}