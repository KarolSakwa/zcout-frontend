import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import VoteImpactBadge from '@/components/duels/VoteImpactBadge';

afterEach(() => {
  cleanup();
});

describe('VoteImpactBadge', () => {
  it('renders a positive impact pill', () => {
    render(<VoteImpactBadge delta={0.29} />);

    const badge = screen.getByLabelText(
      'Your vote increased the rating by 0.29',
    );

    expect(badge).toHaveTextContent('+0.29');
    expect(badge).toHaveAttribute('data-tone', 'positive');
    expect(badge).not.toHaveAttribute('data-intensity');
  });

  it('renders a negative impact pill with a typographic minus', () => {
    render(<VoteImpactBadge delta={-0.28} />);

    const badge = screen.getByLabelText(
      'Your vote decreased the rating by 0.28',
    );

    expect(badge.textContent).toBe('−0.28');
    expect(badge).toHaveAttribute('data-tone', 'negative');
    expect(badge).not.toHaveAttribute('data-intensity');
  });

  it('renders a neutral pill without -0.00', () => {
    render(<VoteImpactBadge delta={-0} />);

    const badge = screen.getByLabelText(
      'Your vote did not change the displayed rating',
    );

    expect(badge.textContent).toBe('0.00');
    expect(badge.textContent).not.toContain('-');
    expect(badge).toHaveAttribute('data-tone', 'neutral');
  });
});
