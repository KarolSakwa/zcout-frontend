'use client';

import React from 'react';

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
}: PlayerCardProps) {
  const state = reveal ? (isWinner ? 'winner' : 'loser') : 'idle';

  const iso = countryIso2 ? String(countryIso2).toUpperCase() : null;
  const flagSrc = iso ? `https://flagsapi.com/${iso}/shiny/64.png` : null;

  return (
    <article
      className="card"
      data-state={state}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      aria-label={`Głosuj na ${name}`}
      style={{
        ['--primary' as any]: color,
        ['--secondary' as any]: secondaryColor ?? color,
        ['--glow' as any]: glowColor ?? '#22c55e',
      }}
    >
      <div className="frame" />

      <div className="inner">
        {/* TOP: nazwa + pozycja + flaga */}
        <div className="top">
          <div className="name">{String(name ?? '').toUpperCase()}</div>

          <div className="posBadge" aria-label="Pozycja">
            <span className="posText">{position ?? '--'}</span>
          </div>

          {flagSrc ? (
            <div className="flag" aria-hidden>
              <img
                src={flagSrc}
                width={28}
                height={18}
                alt=""
                loading="lazy"
                draggable={false}
                style={{
                  display: 'block',
                  borderRadius: 2,
                  border: 0,
                  outline: 0,
                }}
              />
            </div>
          ) : null}
        </div>

        {/* MID: numer */}
        <div className="mid">
          <div className="number">{number ?? '--'}</div>
        </div>

        {/* BOTTOM: klub */}
        <div className="bottom">
          <div className="club">{String(club ?? '—').toUpperCase()}</div>
        </div>

        <div className="texture" />
      </div>

      <style jsx>{`
        .card {
          position: relative;
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 22px;
          cursor: pointer;
          user-select: none;
          transform: translateZ(0);
          transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
        }

        .card:hover {
          transform: translateY(-2px);
          filter: brightness(1.03);
        }

        .card:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.75);
          outline-offset: 4px;
          border-radius: 26px;
        }

        .card[data-state='winner'] {
          transform: translateY(-2px) scale(1.05);
          filter: brightness(1.04);
        }

        .card[data-state='loser'] {
          opacity: 0.68;
          filter: blur(1px) saturate(0.9) brightness(0.96);
          transform: translateY(0px) scale(0.995);
        }

        .card[data-state='winner']:hover {
          transform: translateY(-2px) scale(1.05);
          filter: brightness(1.04);
        }

        .card[data-state='loser']:hover {
          opacity: 0.68;
          filter: blur(1px) saturate(0.9) brightness(0.96);
          transform: translateY(0px) scale(0.995);
        }

        .frame {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background: linear-gradient(
            180deg,
            rgba(255, 214, 102, 0.95),
            rgba(199, 148, 25, 0.95)
          );
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
          transition: box-shadow 160ms ease;
        }

        .card[data-state='winner'] .frame {
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.55),
            0 0 0 2px rgba(255, 214, 102, 0.95),
            0 0 28px 10px color-mix(in srgb, var(--glow) 55%, transparent);
        }

        .card[data-state='loser'] .frame {
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
        }

        .inner {
          position: absolute;
          inset: 4px;
          border-radius: 18px;
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
          padding: 12px 12px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .name {
          font-weight: 900;
          letter-spacing: 0.06em;
          font-size: 22px;
          color: rgba(255, 255, 255, 0.92);
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
        }

        .flag {
          position: absolute;
          left: 12px;
          top: 14px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }

        .posBadge {
          position: absolute;
          right: 12px;
          top: 10px;
          width: 54px;
          height: 44px;
          background: rgba(0, 0, 0, 0.55);
          border: 2px solid rgba(255, 214, 102, 0.95);
          border-radius: 10px;
          display: grid;
          place-items: center;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
        }

        .posText {
          font-weight: 900;
          letter-spacing: 0.06em;
          color: rgba(255, 214, 102, 0.98);
          font-size: 16px;
        }

        .mid {
          position: relative;
          height: 64%;
          display: grid;
          place-items: center;
        }

        .number {
          font-weight: 950;
          font-size: clamp(84px, 9vw, 132px);
          line-height: 1;
          color: rgba(245, 245, 245, 0.95);
          text-shadow:
            0 10px 24px rgba(0, 0, 0, 0.55),
            0 2px 0 rgba(0, 0, 0, 0.35);
          -webkit-text-stroke: 6px rgba(0, 0, 0, 0.55);
          paint-order: stroke fill;
        }

        .bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px 12px;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.30), rgba(0, 0, 0, 0.55));
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: grid;
          place-items: center;
        }

        .club {
          font-weight: 900;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.88);
          font-size: 16px;
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
        }

        .texture {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.22;
          background:
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.55) 0, transparent 2px),
            radial-gradient(1px 1px at 70% 35%, rgba(255,255,255,0.45) 0, transparent 2px),
            radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.40) 0, transparent 2px),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px);
          mix-blend-mode: overlay;
        }

        @media (max-width: 900px) {
          .name { font-size: 20px; }
          .club { font-size: 15px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .card { transition: none; }
          .card:hover { transform: none; filter: none; }
        }
      `}</style>
    </article>
  );
}
