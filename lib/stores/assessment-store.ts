import { AgeGroup, AssessmentAnswer, AssessmentDimension, AssessmentQuestion, AssessmentSession, ProductivityEnergy, TemperamentType } from '@/types';
import { create } from 'zustand';
import { supabase } from '../_core/supabase';
import { scoreAssessment } from '../assessment-scoring';
import { PRODUCTIVITY_ENERGY_CONTENT, TEMPERAMENT_CONTENT } from '../result-content';
import { embedContent } from '../services/embed-content';


interface AssessmentState {
  questions: AssessmentQuestion[];
  session: AssessmentSession | null;
  loading: boolean;
  error: string | null;

  fetchQuestions: (
    dimension: AssessmentDimension,
    ageGroup: AgeGroup,
  ) => Promise<AssessmentQuestion[]>;

  fetchActiveSession: (
    memberId: string,
    dimension: AssessmentDimension,
  ) => Promise<AssessmentSession | null>;

  startAssessment: (
    memberId: string,
    familyId: string,
    dimension: AssessmentDimension,
    ageGroup: AgeGroup,
  ) => Promise<AssessmentSession>;

  answerQuestion: (answer: AssessmentAnswer) => Promise<void>;

  completeAssessment: () => Promise<{ resultType: string; bothDimensionsComplete: boolean }>;

    // Brief section 22: after a child sees their result, let them confirm
  // or reject it. Stored as optional context — never overwrites the
  // computed result itself.
  submitChildFeedback: (sessionId: string, feltAccurate: boolean) => Promise<void>;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  questions: [],
  session: null,
  loading: false,
  error: null,

  fetchQuestions: async (dimension, ageGroup) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('assessment_question')
        .select('*')
        .eq('dimension', dimension)
        .eq('age_group', ageGroup)
        .order('order_index', { ascending: true });

      if (error) throw error;

      set({ questions: data || [], error: null });
      return data || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch assessment questions';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Lets a member resume a partially-completed assessment (per brief
  // section 4: "Saved automatically. Re-takeable later if desired.")
  fetchActiveSession: async (memberId, dimension) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('assessment_session')
        .select('*')
        .eq('member_id', memberId)
        .eq('dimension', dimension)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      set({ session: data || null, error: null });
      return data || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch assessment session';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  startAssessment: async (memberId, familyId, dimension, ageGroup) => {
    set({ loading: true });
    try {
      const questions = get().questions.length
        ? get().questions
        : await get().fetchQuestions(dimension, ageGroup);

      const { data, error } = await supabase
        .from('assessment_session')
        .insert({
          member_id: memberId,
          family_id: familyId,
          dimension,
          question_ids: questions.map((q) => q.id),
          answers: [],
          current_index: 0,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;

      set({ session: data, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start assessment';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  answerQuestion: async (answer) => {
    const { session } = get();
    if (!session) throw new Error('No active assessment session');

    const nextAnswers = [
      ...session.answers.filter((a) => a.question_id !== answer.question_id),
      answer,
    ];
    const nextIndex = Math.min(session.current_index + 1, session.question_ids.length);

    try {
      const { data, error } = await supabase
        .from('assessment_session')
        .update({ answers: nextAnswers, current_index: nextIndex })
        .eq('id', session.id)
        .select()
        .single();

      if (error) throw error;

      set({ session: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save answer';
      set({ error: message });
      throw error;
    }
  },

  completeAssessment: async () => {
    const { session, questions } = get();
    if (!session) throw new Error('No active assessment session');

    set({ loading: true });
    try {
      const { resultType } = scoreAssessment(questions, session.answers);

      const { data, error } = await supabase
        .from('assessment_session')
        .update({
          status: 'completed',
          result_type: resultType,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single();

      if (error) throw error;

      // member.assessment_completed is a single boolean covering BOTH
      // dimensions (see the migration) — read the other dimension's
      // current value so we don't flip it true after only one of the
      // two assessments. Flag: confirm this is the semantics you want.
      const { data: currentMember, error: fetchError } = await supabase
        .from('member')
        .select('name, family_id, temperament_type, productivity_energy, sharing_preference')
        .eq('id', session.member_id)
        .single();

      if (fetchError) throw fetchError;

      const dimensionUpdate =
        session.dimension === 'temperament'
          ? { temperament_type: resultType }
          : { productivity_energy: resultType };

      const willHaveTemperament =
        session.dimension === 'temperament' ? resultType : currentMember.temperament_type;
      const willHaveEnergy =
        session.dimension === 'productivity_energy' ? resultType : currentMember.productivity_energy;
      const bothDimensionsComplete = Boolean(willHaveTemperament && willHaveEnergy);

      const { error: memberError } = await supabase
        .from('member')
        .update({
          ...dimensionUpdate,
          assessment_completed: bothDimensionsComplete,
          assessment_version: 1,
          assessment_date: new Date().toISOString(),
        })
        .eq('id', session.member_id);

      if (memberError) throw memberError;

      // Only embed for members who have opted into family-level sharing
      // (brief section 21) — a private member's profile should never
      // surface through the shared family AI's retrieval.
      if (currentMember.sharing_preference === 'family') {
        const parts: string[] = [];
        if (willHaveTemperament) {
          parts.push(TEMPERAMENT_CONTENT[willHaveTemperament as TemperamentType]?.summary ?? '');
        }
        if (willHaveEnergy) {
          parts.push(PRODUCTIVITY_ENERGY_CONTENT[willHaveEnergy as ProductivityEnergy]?.summary ?? '');
        }
        if (parts.length) {
          await embedContent({
            family_id: currentMember.family_id,
            source_type: 'member_profile',
            source_id: session.member_id,
            content: `${currentMember.name}'s Know Your Family profile: ${parts.join(' ')}`,
          });
        }
      }

      set({ session: data, error: null });
      return { resultType, bothDimensionsComplete };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete assessment';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

   submitChildFeedback: async (sessionId, feltAccurate) => {
    try {
      const { error } = await supabase
        .from('assessment_session')
        .update({ felt_accurate: feltAccurate })
        .eq('id', sessionId);
 
      if (error) throw error;
    } catch (error) {
      // Non-fatal — this is optional context, not a blocking step in the
      // flow, so don't surface a loading/error state for it.
      console.error('Failed to save child feedback:', error);
    }
  },
}));