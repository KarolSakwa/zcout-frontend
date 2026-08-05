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

  it('uses shared tokens in My Scouting recent contributions', () => {
    const css = readProject('src/app/my-scouting/myScoutingDashboard.module.css');

    expect(css).toContain('color: var(--ui-positive);');
    expect(css).toContain('color: var(--ui-negative);');
    expect(css).not.toMatch(/#7dffb0/i);
    expect(css).not.toMatch(/#ff8f8f/i);
  });

  it('uses shared tokens in duel reveal impact deltas', () => {
    const impact = readProject('src/components/duels/DuelImpact.tsx');

    expect(impact).toContain('var(--ui-positive)');
    expect(impact).toContain('var(--ui-negative)');
    expect(impact).not.toContain('var(--ui-accent-success)');
    expect(impact).not.toContain('var(--ui-danger)');
  });
});
