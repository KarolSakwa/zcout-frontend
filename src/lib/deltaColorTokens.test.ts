import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

function readProject(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), 'utf8');
}

describe('delta color tokens', () => {
  it('defines shared positive/negative tokens from reveal accent colors', () => {
    const globals = readProject('src/app/globals.css');

    expect(globals).toContain('--ui-positive: var(--ui-accent-success);');
    expect(globals).toContain('--ui-negative: var(--theme-danger);');
  });

  it('defines weekly trend intensity and vote impact tokens', () => {
    const globals = readProject('src/app/globals.css');

    expect(globals).toContain('--ui-trend-positive-1:');
    expect(globals).toContain('--ui-trend-positive-5:');
    expect(globals).toContain('--ui-trend-negative-1:');
    expect(globals).toContain('--ui-trend-negative-5:');
    expect(globals).toContain('--ui-trend-neutral:');
    expect(globals).toContain('--ui-impact-positive-fg:');
    expect(globals).toContain('--ui-impact-negative-fg:');
    expect(globals).toContain('--ui-impact-neutral-fg:');
  });

  it('uses shared tokens in My Scouting recent contributions', () => {
    const css = readProject('src/app/my-scouting/myScoutingDashboard.module.css');

    expect(css).toContain('color: var(--ui-positive);');
    expect(css).toContain('color: var(--ui-negative);');
    expect(css).not.toMatch(/#7dffb0/i);
    expect(css).not.toMatch(/#ff8f8f/i);
  });

  it('uses dedicated impact tokens in the vote impact badge', () => {
    const badgeCss = readProject('src/components/duels/VoteImpactBadge.module.css');
    const impact = readProject('src/components/duels/DuelImpact.tsx');

    expect(badgeCss).toContain('var(--ui-impact-positive-fg)');
    expect(badgeCss).toContain('var(--ui-impact-negative-fg)');
    expect(impact).toContain('VoteImpactBadge');
    expect(impact).not.toContain('var(--ui-accent-success)');
    expect(impact).not.toContain('var(--ui-danger)');
  });
});
