
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

  created_at: string;
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