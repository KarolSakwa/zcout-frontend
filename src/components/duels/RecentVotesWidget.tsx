'use client';

import AttributeIcon from '@/components/AttributeIcon';

export type RecentVoteItem = {
  id: string;
  winner: string;
  loser: string;
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
        position: 'fixed',
        top: '50%',
        right: 40,
        transform: 'translateY(-50%)',
        width: 318,
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
                <span
                  style={{
                    color: 'var(--ui-accent-primary)',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  ★
                </span>

                <span
                  style={{
                    color: 'rgba(232,240,252,0.95)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {item.winner}
                </span>

                <span
                  style={{
                    color: 'rgba(170,184,205,0.68)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  vs
                </span>

                <span
                  style={{
                    color: 'rgba(232,240,252,0.78)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item.loser}
                </span>
              </div>

              <div
                style={{
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'rgba(170,184,205,0.74)',
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    display: 'inline-grid',
                    placeItems: 'center',
                    color: 'var(--ui-accent-primary)',
                    opacity: 0.92,
                  }}
                >
                  <AttributeIcon attributeKey={item.attributeKey} label={item.attributeLabel} size={10} />
                </span>
                <span>{item.attributeLabel}</span>
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

        @media (max-width: 1460px) {
          .recentVotesWidget {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}