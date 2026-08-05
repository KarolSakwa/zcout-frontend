export type ScoutingProgress = {

  contributions: number;

  my_scouting_unlocked: boolean;

  progress_target: number;

  stage_progress: number;

  stage_target: number;

  next_unlock: 'my_scouting' | 'your_impact';

};



export type ScoutingProgressResponse = {

  scouting_progress: ScoutingProgress;

};



export type MyScoutingStats = {

  duels: number;

  players_rated: number;

  scout_reports: number;

};



export type DuelRecentContribution = {

  type: 'duel';

  id: string;

  attribute_key: string;

  created_at: string;

  selected_player_id: number;

  player_a: {

    id: number;

    name: string;

    delta: number | null;

  };

  player_b: {

    id: number;

    name: string;

    delta: number | null;

  };

};



export type ScoutReportRecentContribution = {

  type: 'scout_report';

  id: string;

  ratings_count: number;

  created_at: string;

  player: {

    id: number;

    name: string;

  };

  overall_before: number | null;

  overall_after: number | null;

  overall_delta: number | null;

};



export type RecentContribution =

  | DuelRecentContribution

  | ScoutReportRecentContribution;



export type MyScoutingResponse = {

  scouting_progress: ScoutingProgress;

  stats: MyScoutingStats | null;

  recent_contributions: RecentContribution[];

};



export type ScoutingProgressUpdateSource = 'duel_vote' | 'scout_report' | 'claim';



export type ClaimAnonResponse = {

  claimed: number;

  scouting_progress?: ScoutingProgress;

};



export type DuelVoteWithScoutingProgress = {

  scouting_progress?: ScoutingProgress;

};



export type ScoutReportSubmitResponse = {

  submission_id?: string | null;

  votes_created?: number;

  scouting_progress?: ScoutingProgress;

};



export function isScoutingProgress(value: unknown): value is ScoutingProgress {

  if (!value || typeof value !== 'object') return false;



  const record = value as Record<string, unknown>;



  return (

    typeof record.contributions === 'number' &&

    typeof record.my_scouting_unlocked === 'boolean' &&

    typeof record.progress_target === 'number' &&

    typeof record.stage_progress === 'number' &&

    typeof record.stage_target === 'number' &&

    record.stage_target > 0 &&

    (record.next_unlock === 'my_scouting' || record.next_unlock === 'your_impact')

  );

}
