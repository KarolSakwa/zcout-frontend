import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import MyScoutingPageView from '@/app/my-scouting/MyScoutingPageView';
import type { MyScoutingResponse, ScoutingProgress } from '@/lib/scoutingTypes';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
  }) => (
    <a href={href} className={className} title={title}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string; className?: string }) => (
    <img alt={props.alt ?? ''} className={props.className} />
  ),
}));

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/AttributeIcon', () => ({
  default: ({ label }: { label: string }) => <span data-testid="attribute-icon">{label}</span>,
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => (
    <div role="status" aria-live="polite" aria-busy="true" data-testid="loading-screen">
      Loading
    </div>
  ),
}));

const authState = {
  user: null as null | { id: number; name: string; email: string },
};

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => authState,
}));

const scoutingState = {
  status: 'loading' as 'loading' | 'ready' | 'error',
  progress: null as ScoutingProgress | null,
  error: null as string | null,
  refresh: vi.fn(),
  updateFromResponse: vi.fn(),
  consumeMyScoutingUnlockEvent: vi.fn(() => false),
};

vi.mock('@/components/scouting/ScoutingProgressProvider', () => ({
  useScoutingProgress: () => scoutingState,
}));

const fetchMyScoutingMock = vi.fn();

vi.mock('@/lib/scoutingApi', () => ({
  fetchMyScouting: (...args: unknown[]) => fetchMyScoutingMock(...args),
}));

vi.mock('@/lib/anonId/browser', () => ({
  ensureBrowserAnonId: vi.fn(() => 'anon-test-id'),
}));

function lockedProgress(contributions = 24): ScoutingProgress {
  return {
    contributions,
    my_scouting_unlocked: false,
    progress_target: 25,
    stage_progress: contributions,
    stage_target: 25,
    next_unlock: 'my_scouting',
  };
}

function unlockedProgress(contributions = 25): ScoutingProgress {
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

function dashboardResponse(
  overrides: Partial<MyScoutingResponse> = {},
): MyScoutingResponse {
  return {
    scouting_progress: unlockedProgress(30),
    stats: {
      duels: 12,
      players_rated: 9,
      scout_reports: 0,
    },
    recent_contributions: [],
    ...overrides,
  };
}

describe('My Scouting page', () => {
  beforeEach(() => {
    authState.user = null;
    scoutingState.status = 'loading';
    scoutingState.progress = null;
    scoutingState.error = null;
    fetchMyScoutingMock.mockReset();
    scoutingState.refresh.mockReset();
    scoutingState.updateFromResponse.mockReset();
    scoutingState.updateFromResponse.mockImplementation((progress: ScoutingProgress) => {
      scoutingState.progress = progress;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state while provider is loading', () => {
    render(<MyScoutingPageView />);
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.queryByText('18 / 25')).toBeNull();
    expect(fetchMyScoutingMock).not.toHaveBeenCalled();
  });

  it('shows provider error with retry', () => {
    scoutingState.status = 'error';
    scoutingState.error = 'network down';

    render(<MyScoutingPageView />);
    expect(screen.getByText("We couldn't load your scouting record.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(scoutingState.refresh).toHaveBeenCalled();
  });

  it('shows locked state at 24 without fetching dashboard', () => {
    scoutingState.status = 'ready';
    scoutingState.progress = lockedProgress(24);

    render(<MyScoutingPageView />);
    expect(screen.getByText('24 / 25')).toBeInTheDocument();
    expect(fetchMyScoutingMock).not.toHaveBeenCalled();
  });

  it('fetches dashboard when unlocked and renders stats', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue(
      dashboardResponse({
        recent_contributions: [
          {
            type: 'duel',
            id: 'd1',
            attribute_key: 'pace',
            created_at: '2026-01-01T12:00:00Z',
            selected_player_id: 102,
            player_a: { id: 101, name: 'Bukayo Saka', delta: 0.01 },
            player_b: { id: 102, name: 'Jérémy Doku', delta: 0.04 },
          },
        ],
      }),
    );

    render(<MyScoutingPageView />);

    await waitFor(() => {
      expect(fetchMyScoutingMock).toHaveBeenCalled();
    });

    expect(await screen.findByText('DUELS')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(scoutingState.updateFromResponse).toHaveBeenCalled();
    expect(scoutingState.updateFromResponse.mock.calls[0]?.[1]).toBeUndefined();
  });

  it('shows dashboard error and retries fetch', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockRejectedValueOnce(new Error('boom'));

    render(<MyScoutingPageView />);

    expect(
      await screen.findByText("We couldn't load your scouting record."),
    ).toBeInTheDocument();

    fetchMyScoutingMock.mockResolvedValueOnce(dashboardResponse());
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(fetchMyScoutingMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows locked state when backend returns unlocked false', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue({
      ...dashboardResponse(),
      scouting_progress: lockedProgress(24),
    });

    render(<MyScoutingPageView />);

    expect(await screen.findByText('24 / 25')).toBeInTheDocument();
  });

  it('shows anon temporary record and log in link', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue(dashboardResponse());

    render(<MyScoutingPageView />);

    expect(await screen.findByText('TEMPORARY SCOUTING RECORD')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('hides temporary record for logged user', async () => {
    authState.user = { id: 1, name: 'Alex', email: 'alex@example.com' };
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue(dashboardResponse());

    render(<MyScoutingPageView />);

    await screen.findByText('PLAYERS RATED');
    expect(screen.queryByText('TEMPORARY SCOUTING RECORD')).toBeNull();
  });

  it('renders selected player star without Your pick text', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue(
      dashboardResponse({
        recent_contributions: [
          {
            type: 'duel',
            id: 'd1',
            attribute_key: 'pace',
            created_at: '2026-01-01T12:00:00Z',
            selected_player_id: 102,
            player_a: { id: 101, name: 'Bukayo Saka', delta: 0.01 },
            player_b: { id: 102, name: 'Jérémy Doku', delta: 0.04 },
          },
        ],
      }),
    );

    render(<MyScoutingPageView />);

    expect(await screen.findByText('★')).toBeInTheDocument();
    expect(screen.queryByText(/Your pick/i)).toBeNull();
    expect(screen.getByText('Jérémy Doku')).toBeInTheDocument();
    expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  });

  it('caps next unlock at 100/100 for contributions above 100', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(134);
    fetchMyScoutingMock.mockResolvedValue(
      dashboardResponse({
        scouting_progress: unlockedProgress(134),
      }),
    );

    render(<MyScoutingPageView />);

    expect(await screen.findByText('100 / 100')).toBeInTheDocument();
    expect(screen.getByText('YOUR IMPACT')).toBeInTheDocument();
    expect(screen.queryByText('Locked')).toBeNull();
  });

  it('shows empty recent contributions state', async () => {
    scoutingState.status = 'ready';
    scoutingState.progress = unlockedProgress(30);
    fetchMyScoutingMock.mockResolvedValue(dashboardResponse());

    render(<MyScoutingPageView />);

    expect(await screen.findByText('No recent contributions yet.')).toBeInTheDocument();
    expect(screen.queryByText('View all activity')).toBeNull();
  });
});
