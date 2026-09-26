
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