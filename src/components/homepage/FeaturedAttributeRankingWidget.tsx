'use client';

import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import WidgetPanel from '@/components/ui/WidgetPanel';
import Link from 'next/link';

export type FeaturedRankingAttribute = {
  key: string;
  label: string;
  icon: string;
};

export type FeaturedRankingPlayer = {
  id: string;
  playerId: number;
  player: string;
  rating: number;
  confidence: number | null;
};

export type FeaturedRankingResponse = {
  attribute: FeaturedRankingAttribute | null;
  players: FeaturedRankingPlayer[];
};

type WidgetState = 'loading' | 'error' | 'empty' | 'ready';

const rowGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  columnGap: 7,
  alignItems: 'center',
};

const stateTextStyle = {
  color: 'rgba(170,184,205,0.74)',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.3,
  padding: '9px 0 8px',
};

function resolveWidgetState(
  isLoading: boolean,
  hasError: boolean,
  attribute: FeaturedRankingAttribute | null,
  players: FeaturedRankingPlayer[],
): WidgetState {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (!attribute || players.length === 0) return 'empty';
  return 'ready';
}

export default function FeaturedAttributeRankingWidget({
  attribute,
  players,
  isLoading,
  hasError,
  embedded = false,
}: {
  attribute: FeaturedRankingAttribute | null;
  players: FeaturedRankingPlayer[];
  isLoading: boolean;
  hasError: boolean;
  embedded?: boolean;
}) {
  const state = resolveWidgetState(isLoading, hasError, attribute, players);

  return (
    <WidgetPanel
      as="aside"
      variant="glass"
      embedded={embedded}
      title="Featured ranking"
      className={embedded ? 'featuredRankingWidgetEmbedded' : 'featuredRankingWidget'}
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
      {state === 'ready' && attribute ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 0 8px',
              minWidth: 0,
            }}
          >
            <AttributeIcon
              attributeKey={attribute.key}
              label={attribute.label}
              size={14}
            />
            <span
              style={{
                color: 'rgba(232,240,252,0.95)',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {attribute.label}
            </span>
          </div>

          {players.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '9px 0 8px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={rowGridStyle}>
                <Link
                  href={`/players/${item.playerId}`}
                  className="featuredRankingPlayerLink"
                  style={{
                    color: 'rgba(232,240,252,0.95)',
                    fontSize: 11,
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

                <RatingWithConfidence
                  rating={item.rating}
                  confidence={item.confidence}
                  fontSize={11}
                  scalePx={11}
                  expand={false}
                  align="end"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={stateTextStyle}>
          {state === 'loading' && 'Loading featured ranking…'}
          {state === 'error' && 'Unable to load featured ranking.'}
          {state === 'empty' && 'No featured ranking available.'}
        </div>
      )}

      <style jsx>{`
        .featuredRankingPlayerLink {
          transition: color 140ms ease, text-shadow 140ms ease;
        }

        .featuredRankingPlayerLink:hover {
          color: var(--ui-accent-primary) !important;
          text-shadow: 0 0 10px rgba(92, 163, 255, 0.18);
        }

        @media (max-width: 1240px) {
          .featuredRankingWidget {
            display: none;
          }
        }
      `}</style>
    </WidgetPanel>
  );
}
