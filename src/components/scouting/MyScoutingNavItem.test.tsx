import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MyScoutingNavItem, {
  getMyScoutingNavState,
} from '@/components/scouting/MyScoutingNavItem';
import type { ScoutingProgressContextValue } from '@/components/scouting/ScoutingProgressProvider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/duels',
}));

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseContext: ScoutingProgressContextValue = {
  status: 'loading',
  progress: null,
  error: null,
  refresh: vi.fn(),
  updateFromResponse: vi.fn(),
  consumeMyScoutingUnlockEvent: vi.fn(() => false),
};

vi.mock('@/components/scouting/ScoutingProgressProvider', () => ({
  useScoutingProgress: vi.fn(() => baseContext),
}));

import { useScoutingProgress } from '@/components/scouting/ScoutingProgressProvider';

function renderNav(context: Partial<ScoutingProgressContextValue>) {
  vi.mocked(useScoutingProgress).mockReturnValue({
    ...baseContext,
    ...context,
  });

  return render(<MyScoutingNavItem />);
}

describe('MyScoutingNavItem', () => {
  it('renders neutral loading state without lock or link', () => {
    renderNav({ status: 'loading', progress: null });

    expect(screen.getByText('MY SCOUTING')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByLabelText('My Scouting')).toHaveAttribute(
      'data-nav-state',
      'loading',
    );
  });

  it('renders locked button with aria-disabled for contributions below 25', () => {
    renderNav({
      status: 'ready',
      progress: {
        contributions: 24,
        my_scouting_unlocked: false,
        progress_target: 25,
        stage_progress: 24,
        stage_target: 25,
        next_unlock: 'my_scouting',
      },
    });

    const button = screen.getByRole('button', { name: 'My Scouting locked' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders unlocked link at 25 contributions', () => {
    renderNav({
      status: 'ready',
      progress: {
        contributions: 25,
        my_scouting_unlocked: true,
        progress_target: 100,
        stage_progress: 0,
        stage_target: 100,
        next_unlock: 'your_impact',
      },
    });

    expect(screen.getByRole('link', { name: 'MY SCOUTING' })).toHaveAttribute(
      'href',
      '/my-scouting',
    );
  });

  it('maps nav state helper consistently', () => {
    expect(getMyScoutingNavState('error', null)).toBe('loading');
    expect(
      getMyScoutingNavState('ready', {
        contributions: 25,
        my_scouting_unlocked: true,
        progress_target: 100,
        stage_progress: 0,
        stage_target: 100,
        next_unlock: 'your_impact',
      }),
    ).toBe('unlocked');
  });
});
