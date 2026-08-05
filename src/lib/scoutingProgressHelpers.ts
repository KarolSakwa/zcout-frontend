import type { ScoutingProgress } from '@/lib/scoutingTypes';



export function getStageProgress(progress: ScoutingProgress): number {

  return progress.stage_progress;

}



export function getStageTarget(progress: ScoutingProgress): number {

  return progress.stage_target;

}



export function getCappedContributions(progress: ScoutingProgress): number {

  return getStageProgress(progress);

}



export function getProgressRatio(progress: ScoutingProgress): number {

  const target = getStageTarget(progress);

  if (target <= 0) return 0;



  return getStageProgress(progress) / target;

}



export function getProgressDisplayValue(progress: ScoutingProgress): string {

  const stageProgress = getStageProgress(progress);

  const stageTarget = getStageTarget(progress);

  return `${stageProgress}/${stageTarget}`;

}



export function isYourImpactStageComplete(progress: ScoutingProgress): boolean {

  return (

    progress.my_scouting_unlocked &&

    progress.stage_progress >= progress.stage_target

  );

}
