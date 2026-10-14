
export type TemperamentType = 'sanguine' | 'choleric' | 'melancholic' | 'phlegmatic';
export type ProductivityEnergy = 'achiever' | 'innovator' | 'organizer' | 'unifier';
export type AssessmentDimension = 'temperament' | 'productivity_energy';
export type AgeGroup = 'adult' | 'child';

export interface AssessmentOption {
  text: string;
  maps_to: TemperamentType | ProductivityEnergy;
}

export interface AssessmentQuestion {
  id: string;
  dimension: AssessmentDimension;
  age_group: AgeGroup;
  question: string;
  options: AssessmentOption[];
  order_index: number;
}

export interface AssessmentAnswer {
  question_id: string;
  selected_option_index: number;
}

export interface AssessmentSession {
  id: string;
  member_id: string;
  family_id: string;
  dimension: AssessmentDimension;
  question_ids: string[];
  answers: AssessmentAnswer[];
  current_index: number;
  status: 'in_progress' | 'completed';
  result_type: string | null;
  created_at: string;
  completed_at: string | null;
}

// Spread onto the existing Member interface (fields added by
// 001_family_intelligence_schema.sql)
export interface MemberAssessmentFields {
  temperament_type: TemperamentType | null;
  productivity_energy: ProductivityEnergy | null;
  assessment_completed: boolean;
  assessment_version: number | null;
  assessment_date: string | null;
  sharing_preference: 'private' | 'family';
}


export interface FeudFaceOffAnswer {
  text: string;
  matched_answer_id: string | null;
  points: number;
}

export interface FeudSession {
  id: string;
  family_id: string;
  game_type: 'family_feud';
  mode: 'multiplayer';
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  created_by: string;
  invited_member_ids: string[];
  lobby_deadline: string | null;

  feud_phase: FeudPhase | null;
  feud_round: number;
  feud_total_rounds: number;
  feud_question_id: string | null;
  feud_category: string | null;
  feud_difficulty: 'easy' | 'medium' | 'hard';

  controlling_team_id: TeamId | null;
  current_player_id: string | null;
  face_off_player_ids: string[];
  face_off_answers: Record<string, FeudFaceOffAnswer>;
  strikes: number;
  revealed_answer_ids: string[];
  round_points: number;
  team_scores: Record<TeamId, number>;
  steal_team_id: TeamId | null;
  round_winner_team_id: TeamId | null;
  used_question_ids: string[];

  // When the current face-off/play-or-pass/turn/steal started — drives
  // both the client countdown and the server's own timeout enforcement.
  question_started_at: string | null;

  created_at: string;
  paused_at: string;
  ended_at: string | null;
}

export interface FeudParticipant {
  id: string;
  session_id: string;
  member_id: string;
  team_id: TeamId | null;
  score?: number;
  member?: { name: string };
}

export interface FeudQuestion {
  id: string;
  question: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FeudAnswer {
  id: string;
  question_id: string;
  answer: string;
  rank: number;
  points: number;
}
export type FeudPhase =
  | 'face_off'
  | 'play_or_pass'
  | 'playing'
  | 'steal'
  | 'round_complete'
  | 'game_complete';

export type TeamId = 'A' | 'B';

export interface FeudFaceOffAnswer {
  text: string;
  matched_answer_id: string | null;
  points: number;
}

export interface FeudParticipant {
  id: string;
  session_id: string;
  member_id: string;
  team_id: TeamId | null;
  score?: number;
  member?: { name: string };
}

// Truth and Dare types
export type TdType = 'truth' | 'dare';
export type TdPhase = 'choosing' | 'performing' | 'game_complete';
export type TdIntensity = 'mild' | 'mixed';

/** The turn that just finished, shown to everyone at the start of the next one. */
export interface TdLastTurn {
  participant_id: string;
  type: TdType | null;
  prompt: string | null;
  /** Typed answer for a truth; null for dares, passes and unanswered truths. */
  answer: string | null;
  outcome: 'completed' | 'skipped';
  turn_index: number;
}

export interface TdPlayerStats {
  skips: number;
  rerolls: number;
  truths: number;
  dares: number;
  completed: number;
}

export interface TdSession {
  id: string;
  family_id: string;
  game_type: 'truth_dare';
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | string;
  created_by: string;
  td_phase: TdPhase | null;
  td_turn_order: string[] | null;
  td_turn_index: number;
  invited_member_ids: string[];
  td_current_participant_id: string | null;
  td_prompt_id: string | null;
  td_prompt_type: TdType | null;
  td_prompt_text: string | null;
  td_stats: Record<string, TdPlayerStats>;
  td_rerolled_this_turn: boolean;
  td_max_turns: number | null;
  td_intensity: TdIntensity;
  td_last_turn: TdLastTurn | null;
  lobby_deadline: string | null;

  created_at: string;
  paused_at: string;
  ended_at: string | null;
}

export interface TdParticipant {
  id: string;
  session_id: string;
  member_id: string;
  /** Joined from member for display. */
  member?: { id: string; name: string; avatar_url: string | null } | null;
}

/** Keep in sync with truth-dare-utils.ts on the server (display only; the server enforces). */
export const MAX_SKIPS_PER_PLAYER = 2;
export const MAX_REROLLS_PER_PLAYER = 3;
export const MIN_PLAYERS = 2;

export const EMPTY_STATS: TdPlayerStats = {
  skips: 0,
  rerolls: 0,
  truths: 0,
  dares: 0,
  completed: 0,
};

export type TdAction =
  | { action: 'start_game'; max_turns?: number | null; intensity?: TdIntensity }
  | { action: 'choose_type'; type: TdType }
  | { action: 'reroll_prompt' }
  | { action: 'complete_turn'; answer?: string }
  | { action: 'skip_turn' }
  | { action: 'end_game' };