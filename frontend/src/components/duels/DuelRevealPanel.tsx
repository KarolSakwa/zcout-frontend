import React, { useMemo, useState } from 'react';
import type { PairResponse, RatingsMap } from './duelTypes';
import DuelImpact from './DuelImpact';
import CrowdVerdictBar from './CrowdVerdictBar';

export default function DuelRevealPanel({
  pair,
  showImpact,
  onMouseEnter,
  onMouseLeave,
  duelVotePct,
  lastWinner,
  glow,
  barPct,
  postVoteRatings,
  nextDisabled,
  nextIsHover,
  setNextHover,
  goNext,
}: {
  pair: PairResponse;
  showImpact: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  duelVotePct: { left: number; right: number } | null;
  lastWinner: number | null;
  glow: string;
  barPct: Record<string, number>;
  postVoteRatings: RatingsMap;
  nextDisabled: boolean;
  nextIsHover: boolean;
  setNextHover: (v: boolean) => void;
  goNext: () => void;
}) {
  const [inspectHover, setInspectHover] = useState(false);

  const leftId = pair.left.id;
  const rightId = pair.right.id;

  const leftImpact = postVoteRatings ? postVoteRatings[String(leftId)] : undefined;
  const rightImpact = postVoteRatings ? postVoteRatings[String(rightId)] : undefined;

  const votedLeft = lastWinner === leftId;
  const votedRight = lastWinner === rightId;

  const leftPrimary = pair.left.color ?? '#1f2937';
  const rightPrimary = pair.right.color ?? '#1f2937';

  const pctLeft = duelVotePct?.left ?? 50;
  const pctRight = duelVotePct?.right ?? 50;

  const verdictReady =
    duelVotePct != null &&
    Number.isFinite(duelVotePct.left) &&
    Number.isFinite(duelVotePct.right) &&
    duelVotePct.left >= 0 &&
    duelVotePct.right >= 0;

  const label = useMemo(() => 'Crowd verdict', []);

  const handleEnter = () => {
    setInspectHover(true);
    onMouseEnter?.();
  };

  const handleLeave = () => {
    setInspectHover(false);
    onMouseLeave?.();
  };

  return (
    <div
      style={{ maxWidth: 996, margin: '30px auto 0', cursor: inspectHover ? 'help' : 'default' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 10,
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: verdictReady ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.45)',
          fontWeight: 900,
        }}
      >
        {label}
      </div>

      <CrowdVerdictBar
        ready={verdictReady}
        leftName={pair.left.name}
        rightName={pair.right.name}
        leftColor={leftPrimary}
        rightColor={rightPrimary}
        leftPct={pctLeft}
        rightPct={pctRight}
        votedLeft={votedLeft}
        votedRight={votedRight}
      />

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 96px minmax(0, 1fr)',
          alignItems: 'start',
          gap: 64,
        }}
      >
        <div style={{ marginTop: 8 }}>
          <DuelImpact
            show={showImpact}
            impact={leftImpact}
            playerId={leftId}
            winner={votedLeft}
            attribute=""
            glow={glow}
            barPct={barPct}
          />
        </div>

        <div />

        <div style={{ marginTop: 8 }}>
          <DuelImpact
            show={showImpact}
            impact={rightImpact}
            playerId={rightId}
            winner={votedRight}
            attribute=""
            glow={glow}
            barPct={barPct}
          />
        </div>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', marginTop: 18 }}>
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          onFocus={() => setNextHover(true)}
          onBlur={() => setNextHover(false)}
          style={{
            height: 34,
            padding: '0 16px',
            borderRadius: 999,
            border: `1px solid ${nextIsHover ? 'rgba(255,214,102,0.75)' : 'rgba(255,214,102,0.55)'}`,
            background: nextIsHover ? 'rgba(255,214,102,0.16)' : 'rgba(255,214,102,0.10)',
            color: 'rgba(255,214,102,0.95)',
            fontWeight: 950,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            boxShadow: nextIsHover
              ? '0 14px 30px rgba(0,0,0,0.40), 0 0 22px rgba(255,214,102,0.14)'
              : '0 12px 28px rgba(0,0,0,0.35), 0 0 18px rgba(255,214,102,0.10)',
            opacity: nextDisabled ? 0.55 : 1,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transform: nextIsHover ? 'translateY(-1px)' : 'translateY(0px)',
            transition: 'transform 140ms ease, background 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
