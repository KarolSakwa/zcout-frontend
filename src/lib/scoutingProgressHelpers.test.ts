import { describe, expect, it } from 'vitest';

import {

  getCappedContributions,

  getProgressDisplayValue,

  getProgressRatio,

  isYourImpactStageComplete,

} from '@/lib/scoutingProgressHelpers';

import type { ScoutingProgress } from '@/lib/scoutingTypes';



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



describe('scoutingProgressHelpers', () => {

  it('uses stage fields for display values across both stages', () => {

    expect(getProgressDisplayValue(progress({ stage_progress: 1, stage_target: 25 }))).toBe(

      '1/25',

    );

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



  it('caps stage two ratio at 100 percent', () => {

    const value = progress({

      contributions: 134,

      my_scouting_unlocked: true,

      progress_target: 100,

      stage_progress: 100,

      stage_target: 100,

      next_unlock: 'your_impact',

    });



    expect(getCappedContributions(value)).toBe(100);

    expect(getProgressRatio(value)).toBe(1);

    expect(isYourImpactStageComplete(value)).toBe(true);

    expect(value.contributions).toBe(134);

  });



  it('supports debug override stage one target of 2', () => {

    const value = progress({

      contributions: 1,

      progress_target: 2,

      stage_progress: 1,

      stage_target: 2,

    });



    expect(getProgressDisplayValue(value)).toBe('1/2');

    expect(getProgressRatio(value)).toBe(0.5);

  });

});
