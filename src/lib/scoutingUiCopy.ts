import type { ScoutingProgress } from '@/lib/scoutingTypes';

import { getStageProgress, getStageTarget, isYourImpactStageComplete } from '@/lib/scoutingProgressHelpers';



/** Default product copy when progress is not loaded yet. */

export const MY_SCOUTING_LOCKED_TOOLTIP =

  'Reach 25 contributions to unlock My Scouting.';



export function getScoutingProgressTooltip(progress: ScoutingProgress): string {

  if (!progress.my_scouting_unlocked) {

    return `Reach ${getStageTarget(progress)} contributions to unlock My Scouting.`;

  }



  if (!isYourImpactStageComplete(progress)) {
    return `Reach ${getStageTarget(progress)} contributions in this stage to unlock Your Impact.`;
  }



  return 'Your Impact is not available yet.';

}



export function getScoutingProgressAriaLabel(progress: ScoutingProgress): string {

  const stageProgress = getStageProgress(progress);

  const stageTarget = getStageTarget(progress);

  return `Scouting progress: ${stageProgress} of ${stageTarget} contributions`;

}
