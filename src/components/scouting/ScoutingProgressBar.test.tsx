import { cleanup, render, screen, within } from '@testing-library/react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ScoutingProgressBar, {

  shouldRenderScoutingProgressBar,

} from '@/components/scouting/ScoutingProgressBar';

import type { ScoutingProgress } from '@/lib/scoutingTypes';



vi.mock('@/components/scouting/ScoutingProgressProvider', () => ({

  useScoutingProgress: vi.fn(() => ({

    status: 'loading',

    progress: null,

    error: null,

    refresh: vi.fn(),

    updateFromResponse: vi.fn(),

    consumeMyScoutingUnlockEvent: vi.fn(() => false),

  })),

}));



vi.mock('@/components/Tooltip', () => ({

  default: ({ children, content }: { children: React.ReactNode; content: string }) => (

    <div data-testid="tooltip" data-content={content}>

      {children}

    </div>

  ),

}));



const readyProgress = (overrides: Partial<ScoutingProgress> = {}): ScoutingProgress => ({

  contributions: 0,

  my_scouting_unlocked: false,

  progress_target: 25,

  stage_progress: 0,

  stage_target: 25,

  next_unlock: 'my_scouting',

  ...overrides,

});



describe('ScoutingProgressBar', () => {

  afterEach(() => {

    cleanup();

  });



  it('returns null for loading and error states', () => {

    const { container: loading } = render(

      <ScoutingProgressBar statusOverride="loading" progressOverride={null} />,

    );

    expect(loading.firstChild).toBeNull();

    expect(shouldRenderScoutingProgressBar('error', null)).toBe(false);

  });



  it('renders 0/25 at zero contributions when ready', () => {

    const { container } = render(

      <ScoutingProgressBar statusOverride="ready" progressOverride={readyProgress()} />,

    );



    expect(within(container).getByText('0/25')).toBeInTheDocument();

    expect(shouldRenderScoutingProgressBar('ready', readyProgress())).toBe(true);

  });



  it('renders debug 0/2 and 1/2 stage values when ready', () => {
    const { container: zero } = render(
      <ScoutingProgressBar
        statusOverride="ready"
        progressOverride={readyProgress({
          contributions: 0,
          stage_progress: 0,
          stage_target: 2,
          progress_target: 2,
        })}
      />,
    );
    expect(within(zero).getByText('0/2')).toBeInTheDocument();

    const { container: one } = render(
      <ScoutingProgressBar
        statusOverride="ready"
        progressOverride={readyProgress({
          contributions: 1,
          stage_progress: 1,
          stage_target: 2,
          progress_target: 2,
        })}
      />,
    );
    expect(within(one).getByText('1/2')).toBeInTheDocument();
  });

  it('renders 1/25 with unlock tooltip', () => {

    const { container } = render(

      <ScoutingProgressBar

        statusOverride="ready"

        progressOverride={readyProgress({

          contributions: 1,

          stage_progress: 1,

        })}

      />,

    );



    expect(within(container).getByText('1/25')).toBeInTheDocument();

    expect(within(container).getByTestId('tooltip')).toHaveAttribute(

      'data-content',

      'Reach 25 contributions to unlock My Scouting.',

    );

  });



  it('renders capped 100/100 and impact-unavailable tooltip at 134 contributions', () => {

    const { container } = render(

      <ScoutingProgressBar

        statusOverride="ready"

        progressOverride={readyProgress({

          contributions: 134,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 100,

          stage_target: 100,

          next_unlock: 'your_impact',

        })}

      />,

    );



    expect(within(container).getByText('100/100')).toBeInTheDocument();

    expect(within(container).getByTestId('tooltip')).toHaveAttribute(

      'data-content',

      'Your Impact is not available yet.',

    );

    expect(

      within(container).getByRole('group', {

        name: 'Scouting progress: 100 of 100 contributions',

      }),

    ).toBeInTheDocument();

  });



  it('omits tooltip wrapper in dropdown variant', () => {

    const { container } = render(

      <ScoutingProgressBar

        variant="dropdown"

        statusOverride="ready"

        progressOverride={readyProgress({

          contributions: 30,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 5,

          stage_target: 100,

          next_unlock: 'your_impact',

        })}

      />,

    );



    expect(within(container).queryByTestId('tooltip')).toBeNull();

    expect(within(container).getByText('5/100')).toBeInTheDocument();

  });

});
