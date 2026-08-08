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

  it('defines exactly 10 shared blue intensity primitives on text-primary ↔ accent-primary', () => {
    const globals = readProject('src/app/globals.css');

    for (let level = 1; level <= 10; level += 1) {
      expect(globals).toContain(`--ui-blue-intensity-${level}:`);
    }

    expect(globals).toContain(
      '--ui-blue-intensity-1: color-mix(in srgb, var(--ui-accent-primary) 10%, var(--ui-text-primary));',
    );
    expect(globals).toContain(
      '--ui-blue-intensity-5: color-mix(in srgb, var(--ui-accent-primary) 50%, var(--ui-text-primary));',
    );
    expect(globals).toContain('--ui-blue-intensity-10: var(--ui-accent-primary);');
    expect(globals).not.toMatch(
      /--ui-blue-intensity-\d:\s*color-mix\([^)]*--ui-text-muted/,
    );
    expect(globals).not.toMatch(
      /--ui-blue-intensity-\d:\s*color-mix\([^)]*--ui-accent-success/,
    );
  });

  it('maps weekly trend semantic levels to even blue-intensity samples 2/4/6/8/10', () => {
    const globals = readProject('src/app/globals.css');

    expect(globals).toContain('--ui-trend-positive-1: var(--ui-blue-intensity-2);');
    expect(globals).toContain('--ui-trend-positive-2: var(--ui-blue-intensity-4);');
    expect(globals).toContain('--ui-trend-positive-3: var(--ui-blue-intensity-6);');
    expect(globals).toContain('--ui-trend-positive-4: var(--ui-blue-intensity-8);');
    expect(globals).toContain('--ui-trend-positive-5: var(--ui-blue-intensity-10);');

    expect(globals).toContain('--ui-trend-negative-1: var(--ui-blue-intensity-2);');
    expect(globals).toContain('--ui-trend-negative-2: var(--ui-blue-intensity-4);');
    expect(globals).toContain('--ui-trend-negative-3: var(--ui-blue-intensity-6);');
    expect(globals).toContain('--ui-trend-negative-4: var(--ui-blue-intensity-8);');
    expect(globals).toContain('--ui-trend-negative-5: var(--ui-blue-intensity-10);');

    expect(globals).not.toMatch(
      /--ui-trend-positive-\d:\s*color-mix\([^)]*--ui-accent-success/,
    );
    expect(globals).not.toMatch(
      /--ui-trend-negative-\d:\s*color-mix\([^)]*--ui-accent-faller/,
    );
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
    expect(badgeCss).not.toContain('--ui-blue-intensity-');
  });
});
