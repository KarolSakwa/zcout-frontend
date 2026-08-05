import { describe, expect, it } from 'vitest';

import {

  getScoutingProgressAriaLabel,

  getScoutingProgressTooltip,

} from '@/lib/scoutingUiCopy';

import type { ScoutingProgress } from '@/lib/scoutingTypes';

import { getProgressDisplayValue } from '@/lib/scoutingProgressHelpers';

import { shouldRenderScoutingProgressBar } from '@/components/scouting/ScoutingProgressBar';

import { getMyScoutingNavState } from '@/components/scouting/MyScoutingNavItem';



function progress(overrides: Partial<ScoutingProgress> = {}): ScoutingProgress {

  return {

    contributions: 0,

    my_scouting_unlocked: false,

    progress_target: 25,

    stage_progress: 0,

    stage_target: 25,

    next_unlock: 'my_scouting',

    ...overrides,

  };

}



describe('scouting UI helpers', () => {

  it('maps navbar states for loading, locked and unlocked', () => {

    expect(getMyScoutingNavState('loading', null)).toBe('loading');

    expect(getMyScoutingNavState('error', null)).toBe('loading');

    expect(

      getMyScoutingNavState(

        'ready',

        progress({ contributions: 24, stage_progress: 24, stage_target: 25 }),

      ),

    ).toBe('locked');

    expect(

      getMyScoutingNavState(

        'ready',

        progress({

          contributions: 25,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 0,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('unlocked');

  });



  it('renders progress bar only when provider is ready', () => {

    expect(shouldRenderScoutingProgressBar('loading', null)).toBe(false);

    expect(shouldRenderScoutingProgressBar('error', null)).toBe(false);

    expect(shouldRenderScoutingProgressBar('ready', progress())).toBe(true);

    expect(

      shouldRenderScoutingProgressBar(

        'ready',

        progress({ contributions: 1, stage_progress: 1, stage_target: 25 }),

      ),

    ).toBe(true);

  });



  it('formats debug stage values at 0/2 and 1/2', () => {
    expect(
      getProgressDisplayValue(
        progress({
          contributions: 0,
          stage_progress: 0,
          stage_target: 2,
          progress_target: 2,
        }),
      ),
    ).toBe('0/2');

    expect(
      getProgressDisplayValue(
        progress({
          contributions: 1,
          stage_progress: 1,
          stage_target: 2,
          progress_target: 2,
        }),
      ),
    ).toBe('1/2');
  });

  it('formats display values across staged thresholds', () => {

    expect(

      getProgressDisplayValue(

        progress({ contributions: 1, stage_progress: 1, stage_target: 25 }),

      ),

    ).toBe('1/25');

    expect(

      getProgressDisplayValue(

        progress({ contributions: 24, stage_progress: 24, stage_target: 25 }),

      ),

    ).toBe('24/25');

    expect(

      getProgressDisplayValue(

        progress({

          contributions: 25,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 0,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('0/100');

    expect(

      getProgressDisplayValue(

        progress({

          contributions: 26,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 1,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('1/100');

    expect(

      getProgressDisplayValue(

        progress({

          contributions: 75,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 50,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('50/100');

    expect(

      getProgressDisplayValue(

        progress({

          contributions: 134,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 100,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('100/100');

  });



  it('uses correct tooltip copy by stage', () => {

    expect(

      getScoutingProgressTooltip(

        progress({ contributions: 7, stage_progress: 7, stage_target: 25 }),

      ),

    ).toBe('Reach 25 contributions to unlock My Scouting.');

    expect(

      getScoutingProgressTooltip(

        progress({

          contributions: 1,

          stage_progress: 1,

          stage_target: 2,

          progress_target: 2,

        }),

      ),

    ).toBe('Reach 2 contributions to unlock My Scouting.');

    expect(

      getScoutingProgressTooltip(

        progress({

          contributions: 40,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 15,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('Reach 100 contributions in this stage to unlock Your Impact.');

    expect(

      getScoutingProgressTooltip(

        progress({

          contributions: 125,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 100,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('Your Impact is not available yet.');

  });



  it('builds aria labels from stage values', () => {

    expect(

      getScoutingProgressAriaLabel(

        progress({ contributions: 7, stage_progress: 7, stage_target: 25 }),

      ),

    ).toBe('Scouting progress: 7 of 25 contributions');

    expect(

      getScoutingProgressAriaLabel(

        progress({

          contributions: 134,

          my_scouting_unlocked: true,

          progress_target: 100,

          stage_progress: 100,

          stage_target: 100,

          next_unlock: 'your_impact',

        }),

      ),

    ).toBe('Scouting progress: 100 of 100 contributions');

  });

});
