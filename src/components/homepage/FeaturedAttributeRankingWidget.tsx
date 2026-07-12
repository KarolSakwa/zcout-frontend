'use client';

import AttributeIcon from '@/components/AttributeIcon';
import RatingWithConfidence from '@/components/RatingWithConfidence';
import Tooltip from '@/components/Tooltip';
import { formatTrend7d, getTrend7dColor } from '@/lib/trends';
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
  trend_7d: number | null;
};

export type FeaturedRankingResponse = {
  attribute: FeaturedRankingAttribute | null;
  players: FeaturedRankingPlayer[];
};

type WidgetState = 'loading' | 'error' | 'empty' | 'ready';

const embeddedRowGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  columnGap: 7,
};

const metricsClusterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 15,
  minWidth: 0,
};

const stateTextStyle = {
  color: 'rgba(170,184,205,0.74)',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.3,
  padding: '6px 0',
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
              justifyContent: 'center',
              gap: 6,
              padding: '2px 0',
              minWidth: 0,
            }}
          >
            <AttributeIcon
              attributeKey={attribute.key}
              label={attribute.label}
              size={12}
            />
            <span
              style={{
                color: 'rgba(232,240,252,0.95)',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {attribute.label}
            </span>
          </div>

          {players.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '5px 0',
                borderTop:
                  index === 0
                    ? undefined
                    : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Link
                href={`/players/${item.playerId}`}
                className="featuredRankingRowLink"
                style={{
                  ...embeddedRowGridStyle,
                  textDecoration: 'none',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: 'rgba(232,240,252,0.95)',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                    lineHeight: 1,
                  }}
                >
                  {item.player}
                </span>

                <div style={metricsClusterStyle}>
                  {item.trend_7d != null ? (
                    <Tooltip content="Last 7 days" side="top" align="end">
                      <span
                        style={{
                          color: getTrend7dColor(item.trend_7d),
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          cursor: 'help',
                        }}
                      >
                        {formatTrend7d(item.trend_7d)}
                      </span>
                    </Tooltip>
                  ) : null}

                  <RatingWithConfidence
                    rating={item.rating}
                    confidence={item.confidence}
                    fontSize={13}
                    scalePx={13}
                    expand={false}
                    align="end"
                  />
                </div>
              </Link>
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
        .featuredRankingRowLink {
          transition: color 140ms ease, text-shadow 140ms ease;
        }

        .featuredRankingRowLink:hover span:first-child {
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

