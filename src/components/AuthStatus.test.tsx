import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthStatus from '@/components/AuthStatus';

vi.mock('next/navigation', () => ({
  usePathname: () => '/duels',
}));

vi.mock('@/lib/anonId/browser', () => ({
  ensureBrowserAnonId: vi.fn(() => 'anon-test-id'),
}));

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/scouting/ScoutingProgressBar', () => ({
  default: () => <div data-testid="dropdown-progress-bar">progress</div>,
}));

const authState = {
  user: null as null | { id: number; name: string; email: string },
  isAuthResolved: true,
};

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => authState,
}));

const scoutingState = {
  status: 'ready' as 'loading' | 'ready' | 'error',
  progress: null as null | {
    contributions: number;
    my_scouting_unlocked: boolean;
    progress_target: number;
    stage_progress: number;
    stage_target: number;
    next_unlock: 'my_scouting' | 'your_impact';
  },
};

vi.mock('@/components/scouting/ScoutingProgressProvider', () => ({
  useScoutingProgress: () => ({
    status: scoutingState.status,
    progress: scoutingState.progress,
    error: null,
    refresh: vi.fn(),
    updateFromResponse: vi.fn(),
    consumeMyScoutingUnlockEvent: vi.fn(() => false),
  }),
}));

describe('AuthStatus scouting dropdown', () => {
  beforeEach(() => {
    authState.user = null;
    scoutingState.status = 'ready';
    scoutingState.progress = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Log in for anonymous users', () => {
    render(<AuthStatus />);
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows user name, progress and locked My Scouting for logged user below 25', () => {
    authState.user = {
      id: 1,
      name: 'Alex Scout',
      email: 'alex@example.com',
    };
    scoutingState.progress = {
      contributions: 12,
      my_scouting_unlocked: false,
      progress_target: 25,
      stage_progress: 12,
      stage_target: 25,
      next_unlock: 'my_scouting',
    };

    render(<AuthStatus />);
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-progress-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Scouting locked' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('shows My Scouting link when unlocked', () => {
    authState.user = {
      id: 1,
      name: 'Alex Scout',
      email: 'alex@example.com',
    };
    scoutingState.progress = {
      contributions: 30,
      my_scouting_unlocked: true,
      progress_target: 100,
      stage_progress: 5,
      stage_target: 100,
      next_unlock: 'your_impact',
    };

    render(<AuthStatus />);
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByRole('link', { name: 'My Scouting' })).toHaveAttribute(
      'href',
      '/my-scouting',
    );
  });

  it('shows progress slot for zero contributions when ready', () => {
    authState.user = {
      id: 1,
      name: 'Alex Scout',
      email: 'alex@example.com',
    };
    scoutingState.progress = {
      contributions: 0,
      my_scouting_unlocked: false,
      progress_target: 25,
      stage_progress: 0,
      stage_target: 25,
      next_unlock: 'my_scouting',
    };

    render(<AuthStatus />);
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByTestId('dropdown-progress-bar')).toBeInTheDocument();
  });
});
