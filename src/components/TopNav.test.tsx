import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TopNav from '@/components/TopNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/AuthStatus', () => ({
  default: () => <div data-nav-auth>auth</div>,
}));

vi.mock('@/components/GlobalSearch', () => ({
  default: () => <div data-nav-search>search</div>,
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/components/scouting/ScoutingProgressProvider', () => ({
  useScoutingProgress: () => ({
    status: 'loading',
    progress: null,
    error: null,
    refresh: vi.fn(),
    updateFromResponse: vi.fn(),
    consumeMyScoutingUnlockEvent: vi.fn(() => false),
  }),
}));

vi.mock('@/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TopNav', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders main menu DOM order DUELS → RANKINGS → MY SCOUTING → HOW IT WORKS', () => {
    render(<TopNav />);

    const menu = document.querySelector('nav[aria-label="Main"]');
    expect(menu).toBeTruthy();

    const ids = [...menu!.querySelectorAll('[data-nav-item]')].map((el) =>
      el.getAttribute('data-nav-item'),
    );

    expect(ids).toEqual([
      'duels',
      'rankings',
      'my-scouting',
      'how-it-works',
    ]);
  });

  it('keeps My Scouting entry as a dedicated nav entry wrapper', () => {
    render(<TopNav />);
    expect(
      document.querySelector('[data-my-scouting-nav-entry]'),
    ).toBeTruthy();
  });
});
