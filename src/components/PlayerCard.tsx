"use client";

import React, { type CSSProperties } from "react";
import { getHomepagePlayerNameDisplay } from "@/lib/homepagePlayerName";
import Image from "next/image";

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
  compact?: boolean;
  homepageMode?: boolean;
  /** Full /duels page cards — container-query scaling, isolated from homepage. */
  duelsPage?: boolean;
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
  compact = false,
  homepageMode = false,
  duelsPage = false,
}: PlayerCardProps) {
  const state = reveal ? (isWinner ? "winner" : "loser") : "idle";

  const normalizedName = String(name ?? "").toUpperCase();
  const nameLengthClass =
    normalizedName.length >= 24
      ? "nameVeryLong"
      : normalizedName.length >= 18
        ? "nameLong"
        : "";
  const homepageName = homepageMode
    ? getHomepagePlayerNameDisplay(name, { maxLines: 2, narrowMobile: false })
    : null;

  const iso = countryIso2 ? String(countryIso2).toUpperCase() : null;
  const specialFlags: Record<string, string> = {
    ENG: "gb-eng",
    SCO: "gb-sct",
    WAL: "gb-wls",
    NIR: "gb-nir",
  };

  const flagCode = iso ? (specialFlags[iso] ?? iso.toLowerCase()) : null;

  const flagSrc = flagCode ? `https://flagcdn.com/${flagCode}.svg` : null;

  const cardVars: CSSProperties &
    Record<"--primary" | "--secondary" | "--glow", string> = {
    "--primary": color,
    "--secondary": secondaryColor ?? color,
    "--glow": glowColor ?? "var(--ui-accent-success)",
  };

  return (
    <article
      className="card"
      data-state={state}
      data-compact={compact ? "true" : undefined}
      data-homepage={homepageMode ? "true" : undefined}
      data-duels-page={duelsPage ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      aria-label={`Głosuj na ${name}`}
      style={cardVars}
    >
      <div className="frame" />

      <div className="inner">
        <div className="top">
          {homepageMode || duelsPage ? (
            <>
              <div className="topDesktop">
                {homepageMode && homepageName ? (
                  <div
                    className="name nameHomepage"
                    data-hp-card-name
                    style={
                      {
                        ["--hp-name-base" as string]: String(homepageName.fontSizePx),
                      } as React.CSSProperties
                    }
                  >
                    <span className="nameLine">{homepageName.firstLine}</span>
                    {homepageName.secondLine ? (
                      <span className="nameLine">{homepageName.secondLine}</span>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className={["name", compact ? "nameCompact" : "", nameLengthClass]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {normalizedName}
                  </div>
                )}

                <div className="posBadge" aria-label="Pozycja" data-hp-card-pos>
                  <span className="posText">{position ?? "--"}</span>
                </div>

                {flagSrc ? (
                  <div className="flag" aria-hidden data-hp-card-flag>
                    <Image
                      src={flagSrc}
                      width={22}
                      height={14}
                      alt=""
                      draggable={false}
                      className="flagImg"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mobileCardTopRow topMobile" data-card-top-row>
                <div className="mobileFlagSlot" data-card-flag aria-hidden>
                  {flagSrc ? (
                    <Image
                      src={flagSrc}
                      width={22}
                      height={14}
                      alt=""
                      draggable={false}
                      className="flagImg"
                      unoptimized
                    />
                  ) : (
                    <span className="flagPlaceholder" aria-hidden />
                  )}
                </div>
                <div className="mobileNameSlot" data-card-name>
                  {homepageMode ? (
                    <div className="name nameHomepage">{normalizedName}</div>
                  ) : (
                    <div
                      className={["name", compact ? "nameCompact" : "", nameLengthClass]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {normalizedName}
                    </div>
                  )}
                </div>
                <div className="mobilePositionSlot" data-card-position-badge>
                  <div
                    className="posBadge"
                    aria-label="Pozycja"
                    {...(homepageMode ? { "data-hp-card-pos": true } : {})}
                  >
                    <span className="posText">{position ?? "--"}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={["name", compact ? "nameCompact" : "", nameLengthClass]
                  .filter(Boolean)
                  .join(" ")}
              >
                {normalizedName}
              </div>

              <div className="posBadge" aria-label="Pozycja" data-hp-card-pos>
                <span className="posText">{position ?? "--"}</span>
              </div>

              {flagSrc ? (
                <div className="flag" aria-hidden data-hp-card-flag>
                  <Image
                    src={flagSrc}
                    width={22}
                    height={14}
                    alt=""
                    draggable={false}
                    className="flagImg"
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="mid">
          <div className={compact ? "number numberCompact" : "number"}>
            {number ?? "--"}
          </div>
        </div>

        <div className="bottom">
          <div
            className={compact ? "club clubCompact" : "club"}
            data-card-club
          >
            {String(club ?? "—").toUpperCase()}
          </div>
        </div>

        {revealFooter ? (
          <div className="revealFooter">{revealFooter}</div>
        ) : null}

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
          transition:
            transform 160ms ease,
            filter 160ms ease,
            opacity 160ms ease;
        }

        .card:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
        }

        .card:focus-visible {
          outline: 2px solid
            color-mix(in srgb, var(--ui-text-primary) 82%, transparent);
          outline-offset: 3px;
          border-radius: calc(var(--ui-radius-xl) + 4px);
        }

        .card[data-state="winner"] {
          transform: translateY(-1px) scale(1.03);
          filter: brightness(1.03);
        }

        .card[data-state="loser"] {
          opacity: 0.68;
          filter: blur(1px) saturate(0.9) brightness(0.96);
          transform: translateY(0) scale(0.995);
        }

        .card[data-state="winner"]:hover {
          transform: translateY(-1px) scale(1.03);
          filter: brightness(1.03);
        }

        .card[data-state="loser"]:hover {
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

        .card[data-state="winner"] .frame {
          box-shadow:
            0 14px 38px rgba(0, 0, 0, 0.5),
            0 0 0 var(--ui-border-width-strong) var(--ui-accent-primary),
            0 0 22px 8px color-mix(in srgb, var(--glow) 55%, transparent);
        }

        .card[data-state="loser"] .frame {
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
          min-height: 44px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .name {
          font-weight: 900;
          letter-spacing: 0.03em;
          font-size: 18px;
          line-height: 1.05;
          color: var(--ui-text-primary);
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
          max-width: calc(100% - 84px);
          text-align: center;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: normal;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .name.nameCompact {
          font-size: 12px;
        }

        .card[data-compact="true"] .top {
          padding: 7px 8px 4px;
          min-height: 34px;
        }

        .card[data-compact="true"] .name {
          font-size: 10px;
          max-width: calc(100% - 64px);
          letter-spacing: 0.025em;
        }

        .card[data-compact="true"] .name.nameLong {
          font-size: 9px;
          letter-spacing: 0.02em;
        }

        .card[data-compact="true"] .name.nameVeryLong {
          font-size: 8px;
          letter-spacing: 0.015em;
        }

        .card[data-compact="true"] .posBadge {
          width: 24px;
          height: 17px;
          border-radius: var(--ui-radius-sm);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38);
        }

        .card[data-compact="true"] .posText {
          font-size: 7px;
          letter-spacing: 0.03em;
        }

        .card[data-compact="true"] .mid {
          transform: translateY(-10px);
        }

        /*
         * Homepage card content scales from the pre-responsive desktop card
         * width of 146px (see Duel.module.css homepageCardsRow math).
         */
        .card[data-homepage="true"] {
          container-type: inline-size;
          container-name: homepage-card;
        }

        .card[data-homepage="true"] .top {
          padding: clamp(4px, 4.8cqw, 7px) clamp(5px, 5.5cqw, 8px)
            clamp(2px, 2.7cqw, 4px);
          min-height: clamp(22px, 23cqw, 34px);
        }

        .card[data-homepage="true"] .name.nameHomepage {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          max-width: calc(100% - 40cqw);
          line-height: 1.05;
          letter-spacing: 0.02em;
          white-space: normal;
          overflow: hidden;
          font-size: clamp(
            5.5px,
            calc(var(--hp-name-base, 10) * 1cqw / 1.46),
            calc(var(--hp-name-base, 10) * 1px)
          );
        }

        .card[data-homepage="true"] .number.numberCompact {
          /* Old desktop: clamp(36px, 3.4vw, 53px) → 53px on 146px card ≈ 36.3cqw */
          font-size: clamp(18px, 36.3cqw, 53px);
          -webkit-text-stroke: clamp(1px, 1.4cqw, 2px) rgba(0, 0, 0, 0.52);
        }

        .card[data-homepage="true"] .mid {
          transform: translateY(clamp(-8px, -6.8cqw, -4px));
        }

        .card[data-homepage="true"] .nameLine {
          display: block;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card[data-homepage="true"] .flag {
          left: clamp(4px, 4.8cqw, 7px);
          top: clamp(5px, 6.2cqw, 9px);
        }

        .card[data-homepage="true"] .flagImg {
          width: clamp(11px, 12.3cqw, 18px);
          height: clamp(7px, 8.2cqw, 12px);
        }

        .card[data-homepage="true"] .posBadge {
          right: clamp(4px, 4.8cqw, 7px);
          top: clamp(3px, 4.1cqw, 6px);
          width: clamp(14px, 15.1cqw, 22px);
          height: clamp(10px, 10.3cqw, 15px);
          border-radius: var(--ui-radius-sm);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38);
        }

        .card[data-homepage="true"] .posText {
          font-size: clamp(4.5px, 4.5cqw, 6.5px);
          letter-spacing: 0.03em;
        }

        .card[data-homepage="true"] .bottom {
          padding: clamp(4px, 5.5cqw, 8px) clamp(5px, 6.8cqw, 10px);
        }

        .card[data-homepage="true"] .club.clubCompact {
          font-size: clamp(5px, 5.5cqw, 8px);
          letter-spacing: 0.03em;
        }

        .nameLong {
          font-size: 15px;
          letter-spacing: 0.02em;
        }

        .nameVeryLong {
          font-size: 13px;
          letter-spacing: 0.01em;
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

        .mobileCardTopRow {
          display: none;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 3px;
          width: 100%;
          box-sizing: border-box;
        }

        .topDesktop {
          display: contents;
        }

        .mobileFlagSlot,
        .mobilePositionSlot {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mobileNameSlot {
          min-width: 0;
          width: 100%;
        }

        .mobileCardTopRow .flag,
        .mobileCardTopRow .posBadge {
          position: static;
          left: auto;
          right: auto;
          top: auto;
          margin: 0;
        }

        .mobileCardTopRow .flagImg {
          height: var(--mobile-card-meta-height);
          width: auto !important;
        }

        .mobileCardTopRow .posBadge {
          height: var(--mobile-card-meta-height);
          min-height: var(--mobile-card-meta-height);
          width: auto;
          min-width: 0;
          padding: 0 3px;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ui-radius-sm);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38);
        }

        .flagPlaceholder {
          display: block;
          width: calc(var(--mobile-card-meta-height) * 1.5);
          height: var(--mobile-card-meta-height);
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

        .number.numberCompact {
          font-size: clamp(36px, 3.4vw, 53px);
        }

        .bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 8px 10px;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.3),
            rgba(0, 0, 0, 0.55)
          );
          border-top: var(--ui-border-width-thin) solid
            color-mix(in srgb, var(--ui-text-primary) 12%, transparent);
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

        .club.clubCompact {
          font-size: 8px;
          letter-spacing: 0.03em;
        }

        .revealFooter {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 3;
        }

        .card[data-state="winner"] .revealFooter,
        .card[data-state="loser"] .revealFooter {
          opacity: 1;
        }

        .texture {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;
          background:
            radial-gradient(
              1px 1px at 10% 20%,
              rgba(255, 255, 255, 0.55) 0,
              transparent 2px
            ),
            radial-gradient(
              1px 1px at 70% 35%,
              rgba(255, 255, 255, 0.45) 0,
              transparent 2px
            ),
            radial-gradient(
              1px 1px at 40% 75%,
              rgba(255, 255, 255, 0.4) 0,
              transparent 2px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.06),
              rgba(255, 255, 255, 0.06) 1px,
              transparent 1px,
              transparent 4px
            );
          mix-blend-mode: overlay;
        }

        @media (max-width: 1360px) {
          .name {
            font-size: 13px;
            max-width: calc(100% - 76px);
          }

          .card[data-compact="true"] .name {
            font-size: 11px;
            max-width: calc(100% - 72px);
          }

          .card[data-compact="true"] .name.nameLong {
            font-size: 10px;
          }

          .card[data-compact="true"] .name.nameVeryLong {
            font-size: 9px;
          }

          .card[data-compact="true"] .posBadge {
            width: 28px;
            height: 16px;
          }

          .card[data-compact="true"] .posText {
            font-size: 8px;
          }

          .club {
            font-size: 10px;
          }

          .number {
            font-size: clamp(50px, 5vw, 78px);
          }

          .posBadge {
            width: 34px;
            height: 29px;
          }

          .posText {
            font-size: 10px;
          }

          .flag {
            left: 8px;
            top: 10px;
          }

          .flagImg {
            width: 20px;
            height: 13px;
          }
        }

        @media (max-width: 900px) {
          .name {
            font-size: 14px;
          }

          .card[data-compact="true"] .name {
            font-size: 11px;
          }

          .card[data-compact="true"] .name.nameLong {
            font-size: 10px;
          }

          .card[data-compact="true"] .name.nameVeryLong {
            font-size: 9px;
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

          .card[data-homepage="true"] .posBadge {
            width: clamp(14px, 15.1cqw, 22px);
            height: clamp(10px, 10.3cqw, 15px);
          }

          .posText {
            font-size: 10px;
          }

          .card[data-homepage="true"] .posText {
            font-size: clamp(4.5px, 4.5cqw, 6.5px);
          }
        }

        @media (max-width: 700px) {
          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .top {
            padding: 8px 7px 4px;
            min-height: 48px;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .name {
            font-size: 13px;
            max-width: calc(100% - 58px);
            line-height: 1.02;
            -webkit-line-clamp: 2;
          }

          .card[data-compact="true"]:not([data-homepage="true"]):not([data-duels-page="true"]) .name {
            font-size: 11px;
            max-width: calc(100% - 64px);
          }

          .card[data-compact="true"]:not([data-homepage="true"]):not([data-duels-page="true"]) .name.nameLong {
            font-size: 10px;
          }

          .card[data-compact="true"]:not([data-homepage="true"]):not([data-duels-page="true"]) .name.nameVeryLong {
            font-size: 9px;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .posBadge {
            right: 6px;
            top: 7px;
            width: 32px;
            height: 28px;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .flag {
            left: 7px;
            top: 10px;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .flagImg {
            width: 18px;
            height: 12px;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .club {
            font-size: 10px;
            max-width: 96%;
          }

          .card:not([data-homepage="true"]):not([data-duels-page="true"]) .mid {
            height: 58%;
            transform: translateY(-8px);
          }

          .card[data-compact="true"]:not([data-homepage="true"]):not([data-duels-page="true"]) .mid {
            transform: translateY(-12px);
          }
        }

        /* Shared mobile skin — homepage + /duels (≤700px) */
        @media (max-width: 700px) {
          .card[data-homepage="true"],
          .card[data-duels-page="true"] {
            --mobile-club-size: clamp(5px, 5.5cqw, 8px);
            --mobile-card-meta-height: 8.4px;
          }

          .card[data-duels-page="true"] {
            container-type: inline-size;
          }

          .card[data-homepage="true"] .topDesktop,
          .card[data-duels-page="true"] .topDesktop {
            display: none;
          }

          .card[data-homepage="true"] .topMobile,
          .card[data-duels-page="true"] .topMobile {
            display: grid;
          }

          .card[data-homepage="true"] .top,
          .card[data-duels-page="true"] .top {
            padding: 2px 6px 2px;
            min-height: 0;
            display: block;
            position: relative;
            z-index: 1;
          }

          .card[data-homepage="true"] .mobileNameSlot .name,
          .card[data-homepage="true"] .mobileNameSlot .name.nameLong,
          .card[data-homepage="true"] .mobileNameSlot .name.nameVeryLong,
          .card[data-duels-page="true"] .mobileNameSlot .name,
          .card[data-duels-page="true"] .mobileNameSlot .name.nameLong,
          .card[data-duels-page="true"] .mobileNameSlot .name.nameVeryLong {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            text-align: center;
            font-size: 7px !important;
            line-height: 1.08;
            letter-spacing: 0.025em;
            white-space: normal;
            word-break: normal;
            overflow-wrap: break-word;
            overflow: hidden;
          }

          .card[data-homepage="true"] .mobileCardTopRow .posBadge,
          .card[data-duels-page="true"] .mobileCardTopRow .posBadge {
            height: var(--mobile-card-meta-height) !important;
            min-height: var(--mobile-card-meta-height) !important;
            max-height: var(--mobile-card-meta-height) !important;
            width: auto !important;
            min-width: 0 !important;
            padding: 0 4px !important;
            border-width: var(--ui-border-width-thin) !important;
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            right: auto !important;
            top: auto !important;
          }

          .card[data-homepage="true"] .mobileCardTopRow img,
          .card[data-homepage="true"] .mobileCardTopRow :global(.flagImg),
          .card[data-duels-page="true"] .mobileCardTopRow img,
          .card[data-duels-page="true"] .mobileCardTopRow :global(.flagImg) {
            height: var(--mobile-card-meta-height) !important;
            width: auto !important;
            max-width: none !important;
            display: block !important;
          }

          .card[data-homepage="true"] .mobileCardTopRow .flagPlaceholder,
          .card[data-duels-page="true"] .mobileCardTopRow .flagPlaceholder {
            width: calc(var(--mobile-card-meta-height) * 1.57) !important;
            height: var(--mobile-card-meta-height) !important;
          }

          .card[data-homepage="true"] .mobilePositionSlot .posText,
          .card[data-duels-page="true"] .mobilePositionSlot .posText {
            font-size: 5.5px;
            line-height: 1;
            letter-spacing: 0.02em;
          }

          .card[data-homepage="true"] .club.clubCompact,
          .card[data-duels-page="true"] .club {
            font-size: var(--mobile-club-size, clamp(5px, 5.5cqw, 8px));
          }

          .card[data-homepage="true"] .number.numberCompact,
          .card[data-duels-page="true"] .number {
            font-size: clamp(16px, 34cqw, 50px);
          }

          .card[data-homepage="true"] .mid,
          .card[data-duels-page="true"] .mid {
            position: absolute;
            inset: 0;
            height: auto;
            display: grid;
            place-items: center;
            transform: none;
            z-index: 0;
            pointer-events: none;
          }

          .card[data-homepage="true"] .mid .number,
          .card[data-duels-page="true"] .mid .number {
            pointer-events: auto;
          }

          .card[data-homepage="true"] .bottom,
          .card[data-duels-page="true"] .bottom {
            z-index: 1;
          }
        }

        /* /duels desktop ≥1201 — baseline absolute top row (e9cd773) */
        @media (min-width: 701px) {
          .card[data-duels-page="true"] .topDesktop {
            display: contents;
          }

          .card[data-duels-page="true"] .topMobile {
            display: none;
          }

          .card[data-duels-page="true"] .top {
            padding: 9px 9px 6px;
            min-height: 44px;
            display: flex;
            align-items: flex-start;
            justify-content: center;
          }
        }

        @media (min-width: 701px) and (max-width: 1200px) {
          .card[data-duels-page="true"] .topDesktop .name,
          .card[data-duels-page="true"] .topDesktop .name.nameLong,
          .card[data-duels-page="true"] .topDesktop .name.nameVeryLong {
            max-width: calc(100% - 64px);
            font-size: clamp(11px, 4.6cqw, 13px);
            line-height: 1.05;
            -webkit-line-clamp: 2;
          }
        }

        @media (min-width: 1201px) and (max-width: 1360px) {
          .card[data-duels-page="true"] .flag {
            left: 8px;
            top: 10px;
          }

          .card[data-duels-page="true"] .flag :global(.flagImg) {
            width: 20px !important;
            height: 13px !important;
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
