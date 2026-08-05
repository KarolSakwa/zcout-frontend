import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MyScoutingUnlockBubble from '@/components/scouting/MyScoutingUnlockBubble';
import ScoutingProgressStartedHint from '@/components/scouting/ScoutingProgressStartedHint';
import {
  myScoutingUnlockBubbleKey,
  readPersistenceFlag,
  scoutingProgressStartedHintKey,
  writePersistenceFlag,
} from '@/lib/scoutingUiPersistence';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/anonId/browser', () => ({
  ensureBrowserAnonId: vi.fn(() => 'anon-test-id'),
}));

describe('scouting UI overlays', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows and dismisses unlock bubble', () => {
    const onShown = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <MyScoutingUnlockBubble open={false} onClose={onClose} onShown={onShown} />,
    );

    expect(screen.queryByText('My Scouting unlocked')).toBeNull();

    rerender(
      <MyScoutingUnlockBubble open onClose={onClose} onShown={onShown} />,
    );

    expect(screen.getByText('My Scouting unlocked')).toBeInTheDocument();
    expect(onShown).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Dismiss My Scouting unlocked message'));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows first scouting hint once and persists by anon id', () => {
    const onDismiss = vi.fn();

    render(<ScoutingProgressStartedHint canShow onDismiss={onDismiss} />);

    expect(screen.getByText('Your scouting progress has started')).toBeInTheDocument();
    expect(
      readPersistenceFlag(scoutingProgressStartedHintKey('anon-test-id')),
    ).toBe(true);
  });

  it('does not show scouting hint when persistence flag already exists', () => {
    writePersistenceFlag(scoutingProgressStartedHintKey('anon-test-id'));
    const onDismiss = vi.fn();

    render(<ScoutingProgressStartedHint canShow onDismiss={onDismiss} />);

    expect(screen.queryByText('Your scouting progress has started')).toBeNull();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('stores unlock bubble seen state', () => {
    writePersistenceFlag(myScoutingUnlockBubbleKey('anon:anon-test-id'));
    expect(readPersistenceFlag(myScoutingUnlockBubbleKey('anon:anon-test-id'))).toBe(
      true,
    );
  });
});
