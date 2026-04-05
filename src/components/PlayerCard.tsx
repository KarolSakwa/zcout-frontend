'use client';

import React, { type CSSProperties } from 'react';

type PlayerCardProps = {
  name: string;
  position: string;
  club: string;
  color: string;
  avatarSrc: string;
  countryIso2?: string | null;
  number?: number | string;
  secondaryColor?: string;
  onClick?: () => void;
  reveal?: boolean;
  isWinner?: boolean;
  glowColor?: string;
  revealFooter?: React.ReactNode;
};

export default function PlayerCard({
  name,
  position,
  club,
  color,
  secondaryColor,
  countryIso2,
  number,
  onClick,
  reveal,
  isWinner,
  glowColor,
  revealFooter,
}: PlayerCardProps) {
  const state = reveal ? (isWinner ? 'winner' : 'loser') : 'idle';

  const iso = countryIso2 ? String(countryIso2).toUpperCase() : null;
  const flagSrc = iso ? `https://flagsapi.com/${iso}/shiny/64.png` : null;

  const cardVars: CSSProperties & Record<'--primary' | '--secondary' | '--glow', string> = {
    '--primary': color,
    '--secondary': secondaryColor ?? color,
    '--glow': glowColor ?? 'var(--ui-accent-success)',
  };

  return (
    <article
      className="card"
      data-state={state}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      aria-label={`Głosuj na ${name}`}
      style={cardVars}
    >
      <div className="frame" />

      <div className="inner">
        <div className="top">
          <div className="name">{String(name ?? '').toUpperCase()}</div>

          <div className="posBadge" aria-label="Pozycja">
            <span className="posText">{position ?? '--'}</span>
          </div>

          {flagSrc ? (
            <div className="flag" aria-hidden>
              <img
                src={flagSrc}
                width={22}
                height={14}
                alt=""
                loading="lazy"
                draggable={false}
                className="flagImg"
              />
            </div>
          ) : null}
        </div>

        <div className="mid">
          <div className="number">{number ?? '--'}</div>
        </div>

        <div className="bottom">
          <div className="club">{String(club ?? '—').toUpperCase()}</div>
        </div>

        {revealFooter ? <div className="revealFooter">{revealFooter}</div> : null}

        <div className="texture" />
      </div>

      <style jsx>{`
        .card {
          position: relative;
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: calc(var(--ui-radius-xl) + 2px);
          cursor: pointer;
          user-select: none;
          transform: translateZ(0);
          transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
        }

        .card:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
        }

        .card:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--ui-text-primary) 82%, transparent);
          outline-offset: 3px;
          border-radius: calc(var(--ui-radius-xl) + 4px);
        }

        .card[data-state='winner'] {
          transform: translateY(-1px) scale(1.03);
          filter: brightness(1.03);
        }

        .card[data-state='loser'] {
          opacity: 0.68;
          filter: blur(1px) saturate(0.9) brightness(0.96);
          transform: translateY(0) scale(0.995);
        }

        .card[data-state='winner']:hover {
          transform: translateY(-1px) scale(1.03);
          filter: brightness(1.03);
        }

        .card[data-state='loser']:hover {
          opacity: 0.68;
          filter: blur(1px) saturate(0.9) brightness(0.96);
          transform: translateY(0) scale(0.995);
        }

        .frame {
          position: absolute;
          inset: 0;
          border-radius: calc(var(--ui-radius-xl) + 2px);
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--ui-accent-primary) 100%, white) 0%,
            color-mix(in srgb, var(--ui-accent-primary) 72%, black) 100%
          );
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.5);
          transition: box-shadow 160ms ease;
        }

        .card[data-state='winner'] .frame {
          box-shadow:
            0 14px 38px rgba(0, 0, 0, 0.5),
            0 0 0 var(--ui-border-width-strong) var(--ui-accent-primary),
            0 0 22px 8px color-mix(in srgb, var(--glow) 55%, transparent);
        }

        .card[data-state='loser'] .frame {
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
        }

        .inner {
          position: absolute;
          inset: 3px;
          border-radius: calc(var(--ui-radius-xl) - 1px);
          overflow: hidden;
          background: linear-gradient(
            135deg,
            var(--primary) 0%,
            var(--primary) 52%,
            var(--secondary) 52%,
            var(--secondary) 74%,
            var(--primary) 74%,
            var(--primary) 100%
          );
        }

        .top {
          position: relative;
          padding: 9px 9px 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .name {
          font-weight: 900;
          letter-spacing: 0.03em;
          font-size: 15px;
          color: var(--ui-text-primary);
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
          max-width: calc(100% - 84px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .flag {
          position: absolute;
          left: 9px;
          top: 11px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }

        .flagImg {
          display: block;
          border-radius: var(--ui-radius-xs);
          border: 0;
          outline: 0;
        }

        .posBadge {
          position: absolute;
          right: 9px;
          top: 7px;
          width: 38px;
          height: 32px;
          background: rgba(0, 0, 0, 0.55);
          border: var(--ui-border-width-thin) solid var(--ui-accent-primary);
          border-radius: var(--ui-radius-md);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.42);
        }

        .posText {
          font-weight: 900;
          letter-spacing: 0.04em;
          color: color-mix(in srgb, var(--ui-accent-primary) 100%, white);
          font-size: 11px;
        }

        .mid {
          position: relative;
          height: 63%;
          display: grid;
          place-items: center;
        }

        .number {
          font-weight: 950;
          font-size: clamp(58px, 6vw, 94px);
          line-height: 1;
          color: color-mix(in srgb, var(--ui-text-primary) 96%, white);
          text-shadow:
            0 8px 20px rgba(0, 0, 0, 0.5),
            0 2px 0 rgba(0, 0, 0, 0.32);
          -webkit-text-stroke: 3px rgba(0, 0, 0, 0.52);
          paint-order: stroke fill;
        }

        .bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 8px 10px;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.55));
          border-top: var(--ui-border-width-thin) solid color-mix(in srgb, var(--ui-text-primary) 12%, transparent);
          display: grid;
          place-items: center;
        }

        .club {
          font-weight: 900;
          letter-spacing: 0.045em;
          color: color-mix(in srgb, var(--ui-text-primary) 92%, transparent);
          font-size: 12px;
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .revealFooter {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 3;
        }

        .card[data-state='winner'] .revealFooter,
        .card[data-state='loser'] .revealFooter {
          opacity: 1;
        }

        .texture {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;
          background:
            radial-gradient(1px 1px at 10% 20%, rgba(255, 255, 255, 0.55) 0, transparent 2px),
            radial-gradient(1px 1px at 70% 35%, rgba(255, 255, 255, 0.45) 0, transparent 2px),
            radial-gradient(1px 1px at 40% 75%, rgba(255, 255, 255, 0.4) 0, transparent 2px),
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.06),
              rgba(255, 255, 255, 0.06) 1px,
              transparent 1px,
              transparent 4px
            );
          mix-blend-mode: overlay;
        }

        @media (max-width: 900px) {
          .name {
            font-size: 14px;
          }

          .club {
            font-size: 11px;
          }

          .number {
            font-size: clamp(52px, 5.8vw, 82px);
          }

          .posBadge {
            width: 34px;
            height: 29px;
          }

          .posText {
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card {
            transition: none;
          }

          .card:hover {
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </article>
  );
}