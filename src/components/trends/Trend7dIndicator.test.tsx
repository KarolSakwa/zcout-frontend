import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Trend7dIndicator from '@/components/trends/Trend7dIndicator';

vi.mock('@/components/Tooltip', () => ({
  default: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => (
    <span data-testid="tooltip">
      <span data-testid="tooltip-content">{content}</span>
      {children}
    </span>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('Trend7dIndicator', () => {
  it('renders iconOnly up trend with intensity and aria-label', () => {
    render(
      <Trend7dIndicator delta={0.07} domain="overall" variant="iconOnly" />,
    );

    const indicator = screen.getByLabelText(
      'Rating increased by 0.07 over the last 7 days',
    );

    expect(indicator).toHaveAttribute('data-direction', 'up');
    expect(indicator).toHaveAttribute('data-intensity', '3');
    expect(indicator.textContent).toBe('↑');
    expect(indicator.textContent).not.toContain('+');
  });

  it('renders iconOnly down trend', () => {
    render(
      <Trend7dIndicator delta={-0.29} domain="overall" variant="iconOnly" />,
    );

    const indicator = screen.getByLabelText(
      'Rating decreased by 0.29 over the last 7 days',
    );

    expect(indicator).toHaveAttribute('data-direction', 'down');
    expect(indicator.textContent).toBe('↓');
  });

  it('renders iconAndValue up without a mathematical plus sign', () => {
    render(
      <Trend7dIndicator
        delta={8.26}
        domain="attribute"
        variant="iconAndValue"
      />,
    );

    const indicator = screen.getByLabelText(
      'Rating increased by 8.26 over the last 7 days',
    );

    expect(indicator).toHaveAttribute('data-direction', 'up');
    expect(indicator).toHaveAttribute('data-intensity', '5');
    expect(indicator.textContent).toBe('↑8.26');
    expect(indicator.textContent).not.toContain('+');
  });

  it('renders iconAndValue down without a mathematical minus sign', () => {
    render(
      <Trend7dIndicator
        delta={-4.74}
        domain="attribute"
        variant="iconAndValue"
      />,
    );

    const indicator = screen.getByLabelText(
      'Rating decreased by 4.74 over the last 7 days',
    );

    expect(indicator).toHaveAttribute('data-direction', 'down');
    expect(indicator.textContent).toBe('↓4.74');
    expect(indicator.textContent).not.toContain('−');
    expect(indicator.textContent).not.toContain('-');
  });

  it('returns null for null delta', () => {
    const { container } = render(
      <Trend7dIndicator delta={null} domain="attribute" variant="iconOnly" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders emptyFallback for near-zero deltas', () => {
    render(
      <Trend7dIndicator
        delta={0.001}
        domain="attribute"
        variant="iconAndValue"
        emptyFallback="—"
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
