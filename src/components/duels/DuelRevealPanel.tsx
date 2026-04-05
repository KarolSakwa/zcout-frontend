import React, { useMemo, useState } from 'react';
import type { PairResponse, RatingsMap } from './duelTypes';
import CrowdVerdictBar from './CrowdVerdictBar';
import DuelImpact from './DuelImpact';

export default function DuelRevealPanel({
  pair,
  onMouseEnter,
  onMouseLeave,
  duelVotePct,
  lastWinner,
  nextDisabled,
  nextIsHover,
  setNextHover,
  goNext,
  showImpact = false,
  postVoteRatings,
  glow = 'var(--ui-accent-primary)',
  barPct = {},
}: {
  pair: PairResponse;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  duelVotePct: { left: number; right: number } | null;
  lastWinner: number | null;
  nextDisabled: boolean;
  nextIsHover: boolean;
  setNextHover: (v: boolean) => void;
  goNext: () => void;
  showImpact?: boolean;
  postVoteRatings?: RatingsMap;
  glow?: string;
  barPct?: Record<string, number>;
}) {
  const [inspectHover, setInspectHover] = useState(false);

  const leftId = pair.left.id;
  const rightId = pair.right.id;

  const votedLeft = lastWinner === leftId;
  const votedRight = lastWinner === rightId;

  const leftPrimary = pair.left.color ?? 'var(--ui-surface-panel-solid)';
  const rightPrimary = pair.right.color ?? 'var(--ui-surface-panel-solid)';

  const pctLeft = duelVotePct?.left ?? 50;
  const pctRight = duelVotePct?.right ?? 50;

  const verdictReady =
    duelVotePct != null &&
    Number.isFinite(duelVotePct.left) &&
    Number.isFinite(duelVotePct.right) &&
    duelVotePct.left >= 0 &&
    duelVotePct.right >= 0;

  const label = useMemo(() => 'Crowd verdict', []);

  const leftImpact = postVoteRatings ? postVoteRatings[String(leftId)] : undefined;
  const rightImpact = postVoteRatings ? postVoteRatings[String(rightId)] : undefined;

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
      style={{ maxWidth: 720, margin: '16px auto 0', cursor: inspectHover ? 'help' : 'default' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        style={{
          width: 'calc(100% - 96px)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: -4,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: verdictReady ? 'var(--ui-text-muted)' : 'var(--ui-text-dim)',
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

        {showImpact && postVoteRatings ? (
  <div
    style={{
      width: '100%',
      minHeight: 46,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)',
      alignItems: 'center',
      borderRadius: '14px',
      background: 'color-mix(in srgb, var(--ui-surface-soft) 82%, transparent)',
      border: '1px solid color-mix(in srgb, var(--ui-border-subtle) 82%, transparent)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      overflow: 'hidden',
    }}
  >
    <div style={{ minWidth: 0 }}>
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

    <div
      style={{
        alignSelf: 'stretch',
        background: 'color-mix(in srgb, var(--ui-border-subtle) 90%, transparent)',
      }}
    />

    <div style={{ minWidth: 0 }}>
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
) : null}
      </div>

      <div style={{ display: 'grid', placeItems: 'center', marginTop: 14 }}>
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          onMouseEnter={() => setNextHover(true)}
          onMouseLeave={() => setNextHover(false)}
          onFocus={() => setNextHover(true)}
          onBlur={() => setNextHover(false)}
          style={{
            height: 30,
            padding: '0 12px',
            fontSize: 11,
            borderRadius: 'var(--ui-radius-pill)',
            border: `1px solid ${nextIsHover ? 'var(--ui-accent-primary)' : 'var(--ui-border-accent)'}`,
            background: nextIsHover
              ? 'var(--ui-accent-primary-soft)'
              : 'color-mix(in srgb, var(--ui-accent-primary) 10%, transparent)',
            color: 'var(--ui-accent-primary)',
            fontWeight: 950,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: nextIsHover
              ? '0 10px 22px rgba(0,0,0,0.36), 0 0 16px var(--ui-accent-primary-soft)'
              : '0 8px 18px rgba(0,0,0,0.32), 0 0 12px color-mix(in srgb, var(--ui-accent-primary) 10%, transparent)',
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