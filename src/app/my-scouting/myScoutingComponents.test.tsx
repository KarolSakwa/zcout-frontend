import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MyScoutingDashboard from '@/app/my-scouting/MyScoutingDashboard';
import MyScoutingNextUnlock from '@/app/my-scouting/MyScoutingNextUnlock';
import MyScoutingScoutReportContributionRow from '@/app/my-scouting/MyScoutingScoutReportContributionRow';
import MyScoutingStatCards from '@/app/my-scouting/MyScoutingStatCards';
import MyScoutingYourImpact from '@/app/my-scouting/MyScoutingYourImpact';
import type { ScoutingProgress } from '@/lib/scoutingTypes';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
  }) => (
    <a href={href} title={title}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: () => <img alt="" />,
}));

vi.mock('@/components/Tooltip', () => ({
  default: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: string;
  }) => <div data-tooltip={content}>{children}</div>,
}));

function unlocked(contributions: number): ScoutingProgress {
  const stageProgress = Math.min(Math.max(0, contributions - 25), 100);

  return {
    contributions,
    my_scouting_unlocked: true,
    progress_target: 100,
    stage_progress: stageProgress,
    stage_target: 100,
    next_unlock: 'your_impact',
  };
}

describe('My Scouting dashboard components', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders three stat cards without extra descriptions', () => {
    render(
      <MyScoutingStatCards
        stats={{ duels: 4, players_rated: 3, scout_reports: 0 }}
        isLoggedIn={false}
      />,
    );

    expect(screen.getByLabelText('DUELS: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('PLAYERS RATED: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('SCOUT REPORTS: 0')).toBeInTheDocument();
    expect(screen.queryByText(/unlock/i)).toBeNull();
  });

  it('uses anon and logged scout report tooltips', () => {
    const { rerender } = render(
      <MyScoutingStatCards
        stats={{ duels: 1, players_rated: 1, scout_reports: 1 }}
        isLoggedIn={false}
      />,
    );

    expect(
      screen.getByLabelText('SCOUT REPORTS: 1').parentElement,
    ).toHaveAttribute('data-tooltip', 'Log in to unlock Scout Reports.');

    rerender(
      <MyScoutingStatCards
        stats={{ duels: 1, players_rated: 1, scout_reports: 1 }}
        isLoggedIn
      />,
    );

    expect(
      screen.getByLabelText('SCOUT REPORTS: 1').parentElement,
    ).toHaveAttribute('data-tooltip', 'Create Scout Reports from player profiles.');
  });

  it.each([
    [25, '0 / 100'],
    [99, '74 / 100'],
    [134, '100 / 100'],
  ] as const)('renders next unlock counter %s as %s', (contributions, label) => {
    render(<MyScoutingNextUnlock progress={unlocked(contributions)} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(/Keep contributing/i)).toBeNull();
  });

  it('renders scout report contribution row with overall snapshot', () => {
    render(
      <ul>
        <MyScoutingScoutReportContributionRow
          item={{
            type: 'scout_report',
            id: 'sr-1',
            ratings_count: 6,
            created_at: '2026-01-01T12:00:00Z',
            player: { id: 1, name: 'Bukayo Saka' },
            overall_before: 83.74,
            overall_after: 83.89,
            overall_delta: 0.15,
          }}
        />
      </ul>,
    );

    expect(screen.getByText('SCOUT REPORT · 6 RATINGS')).toBeInTheDocument();
    expect(screen.getByText('Overall 83.74 → 83.89')).toBeInTheDocument();
    expect(screen.getByText('+0.15')).toBeInTheDocument();
  });

  it('handles null scout report snapshot values', () => {
    render(
      <ul>
        <MyScoutingScoutReportContributionRow
          item={{
            type: 'scout_report',
            id: 'sr-2',
            ratings_count: 3,
            created_at: '2026-01-01T12:00:00Z',
            player: { id: 1, name: 'Bukayo Saka' },
            overall_before: null,
            overall_after: null,
            overall_delta: null,
          }}
        />
      </ul>,
    );

    expect(screen.getByText('Overall —')).toBeInTheDocument();
  });

  it('renders locked your impact panel without unlock copy', () => {
    render(<MyScoutingYourImpact />);
    expect(screen.getByText('YOUR IMPACT')).toBeInTheDocument();
    expect(screen.queryByText('Locked')).toBeNull();
    expect(screen.queryByText(/Players Boosted/i)).toBeNull();
  });

  it('renders primary grid with summary column before recent contributions', () => {
    const { container } = render(
      <MyScoutingDashboard
        user={null}
        progress={unlocked(30)}
        stats={{ duels: 4, players_rated: 3, scout_reports: 0 }}
        recentContributions={[]}
      />,
    );

    const grid = container.querySelector('[data-ms-primary-grid]');
    const summary = container.querySelector('[data-ms-summary-column]');
    const recent = container.querySelector('[data-ms-recent-column]');

    expect(grid?.children).toHaveLength(2);
    expect(grid?.children[0]).toBe(summary);
    expect(grid?.children[1]).toBe(recent);
    expect(summary?.querySelector('h1')).toHaveTextContent('My Scouting');
    expect(summary?.querySelector('[aria-label="Scouting statistics"]')).not.toBeNull();
    expect(summary?.querySelector('[class*="nextUnlockPanel"]')).not.toBeNull();
    expect(recent?.querySelector('[class*="recentPanel"]')).not.toBeNull();
    expect(container.querySelector('[class*="yourImpactPanel"]')).not.toBeNull();
  });
});
