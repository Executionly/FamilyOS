import { supabase } from '@/lib/_core/supabase';
import { embedContent } from './embed-content';
import { notifyFamily } from './notify';

export type ChallengeCategory =
  | 'health' | 'connection' | 'gratitude' | 'service' | 'growth' | 'fun' | 'communication'
  | 'tradition' | 'teamwork' | 'faith' | 'creativity' | 'responsibility' | 'celebration';

export type ChallengeCandidate = {
  title: string;
  description: string;
  category: ChallengeCategory;
  estimated_minutes: number | null;
  template_id: string | null;
};

export type FamilyChallenge = {
  id: string;
  family_id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  estimated_minutes: number | null;
  source: 'template' | 'ai';
  status: 'accepted' | 'completed' | 'abandoned';
  participant_ids: string[];
  source_template_id: string | null;
  start_date: string | null;
  end_date: string | null;
  reflection: string | null;
  reflection_summary: string | null;
  accepted_at: string;
  completed_at: string | null;
  created_at: string;
};

const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  bimonthly: 60,
  quarterly: 90,
  yearly: 365,
  surprise: 2, // "surprise me" just means eligible again a few days after completion
};

/**
 * Determines what the dashboard card should show right now:
 * - an in-progress challenge to complete
 * - nothing yet (still within the cadence window)
 * - eligible for a fresh suggestion
 */
export async function getChallengeState(familyId: string): Promise<
  | { state: 'active'; challenge: FamilyChallenge }
  | { state: 'eligible' }
  | { state: 'waiting'; nextEligibleAt: Date }
> {
  const { data: latest, error } = await supabase
    .from('family_challenge')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!latest) return { state: 'eligible' };

  if (latest.status === 'accepted') {
    return { state: 'active', challenge: latest as FamilyChallenge };
  }

  if (latest.status === 'abandoned') {
    return { state: 'eligible' }; // skipping an active challenge means try again right away
  }

  // status === 'completed'
  const { data: family } = await supabase
    .from('family')
    .select('challenge_cadence')
    .eq('id', familyId)
    .single();

  const cadence = family?.challenge_cadence ?? 'surprise';
  const days = CADENCE_DAYS[cadence] ?? CADENCE_DAYS.surprise;
  const completedAt = new Date(latest.completed_at ?? latest.created_at);
  const nextEligibleAt = new Date(completedAt.getTime() + days * 24 * 60 * 60 * 1000);

  if (new Date() >= nextEligibleAt) {
    return { state: 'eligible' };
  }
  return { state: 'waiting', nextEligibleAt };
}

/** Free tier: random pick from the static library, filtered to family composition. */
export async function getFreeSuggestions(familyId: string): Promise<ChallengeCandidate[]> {
  const { data: members } = await supabase
    .from('member')
    .select('role, age_band')
    .eq('family_id', familyId);

  const { data: family } = await supabase
    .from('family')
    .select('include_faith_challenges')
    .eq('id', familyId)
    .single();

  const hasChildren = (members ?? []).some(
    (m) => m.role === 'child' || ['toddler', 'child', 'preteen'].includes(m.age_band ?? '')
  );

  let query = supabase
    .from('challenge_template')
    .select('id, title, description, category, estimated_minutes');

  if (!hasChildren) query = query.eq('requires_children', false);
  if (!family?.include_faith_challenges) query = query.neq('category', 'faith');

  const { data, error } = await query.limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((t) => ({
    title: t.title,
    description: t.description,
    category: t.category,
    estimated_minutes: t.estimated_minutes,
    template_id: t.id,
  }));
}

/** Premium tier: calls the AI edge function for 3 personalized candidates. */
export async function getPremiumSuggestions(familyId: string): Promise<ChallengeCandidate[]> {
  const { data, error } = await supabase.functions.invoke('family-challenge-ai', {
    body: { action: 'suggest', family_id: familyId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.challenges as ChallengeCandidate[];
}

export async function acceptChallenge(
  familyId: string,
  candidate: ChallengeCandidate,
  source: 'template' | 'ai',
  acceptedByMemberId: string
): Promise<FamilyChallenge> {
  const { data: family } = await supabase
    .from('family')
    .select('challenge_cadence')
    .eq('id', familyId)
    .single();

  const startDate = new Date();
  const days = CADENCE_DAYS[family?.challenge_cadence ?? 'surprise'] ?? CADENCE_DAYS.surprise;
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('family_challenge')
    .insert({
      family_id: familyId,
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
      estimated_minutes: candidate.estimated_minutes,
      source,
      status: 'accepted',
      source_template_id: candidate.template_id,
      participant_ids: [acceptedByMemberId],
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;

  try {
    const { } = await supabase
    .from('calendar_event')
    .insert([{ 
      family_id: familyId, 
      created_by: acceptedByMemberId, 
      title: candidate.title,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      category: 'challenge', 
      recurrence: 'none',
      related_member_ids: [acceptedByMemberId],
    }])
    .select()
    .single();
  } catch (error) {
    console.error('Failed to create calendar event for accepted challenge:', error);
  }

  await notifyFamily({
    familyId,
    type: 'family_update',
    priority: 'informational',
    title: 'New family challenge',
    body: `"${candidate.title}" has been accepted! ${candidate.description}`,
    actionLabel: 'View Challenge',
    actionRoute: '/(stack)/challenge?id=' + data.id,
  });

  embedContent({
    family_id: familyId,
    source_type: 'challenge',
    source_id: data.id,
    content: `Family Challenge: ${data.title}. ${data.description}`,
  });

  return data as FamilyChallenge;
}

export async function completeChallenge(
  challengeId: string,
  familyId: string,
  isPremium: boolean,
  reflection?: string
): Promise<FamilyChallenge> {
  let reflectionSummary: string | null = null;

  if (isPremium && reflection?.trim()) {
    try {
      const { data } = await supabase.functions.invoke('family-challenge-ai', {
        body: { action: 'summarize_reflection', family_id: familyId, reflection },
      });
      reflectionSummary = data?.summary ?? null;
    } catch {
      // Non-fatal — completion still succeeds without a summary
    }
  }

  const { data, error } = await supabase
    .from('family_challenge')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      reflection: reflection?.trim() || null,
      reflection_summary: reflectionSummary,
    })
    .eq('id', challengeId)
    .select()
    .single();

  if (error) throw error;

  await notifyFamily({
    familyId,
    type: 'family_update',
    priority: 'informational',
    title: `Family challenge completed`,
    body: `"${data.title}" has been completed! ${data.description}${reflection ? `. Family reflection: ${reflection}` : ''}`,
    actionLabel: 'View Challenge',
    actionRoute: '/(stack)/challenge?id=' + data.id,
  });

  embedContent({
    family_id: familyId,
    source_type: 'challenge',
    source_id: data.id,
    content: `Family Challenge completed: ${data.title}. ${data.description}${reflection ? `. Family reflection: ${reflection}` : ''}`,
  });

  return data as FamilyChallenge;
}

export async function setChallengeCadence(familyId: string, cadence: string): Promise<void> {
  const { error } = await supabase
    .from('family')
    .update({ challenge_cadence: cadence })
    .eq('id', familyId);

  if (error) throw error;
}

export async function participateInChallenge(
  challengeId: string,
  memberId: string,
  memberName: string,
  familyId: string
): Promise<FamilyChallenge> {
  const { data: current, error: fetchError } = await supabase
    .from('family_challenge')
    .select('participant_ids')
    .eq('id', challengeId)
    .single();
  if (fetchError) throw fetchError;

  const updated = Array.from(new Set([...(current.participant_ids ?? []), memberId]));

  const { data, error } = await supabase
    .from('family_challenge')
    .update({ participant_ids: updated })
    .eq('id', challengeId)
    .select()
    .single();

  if (error) throw error;

  await notifyFamily({
    familyId,
    type: 'family_update',
    priority: 'informational',
    title: `New participant in family challenge`,
    body: `"${data.title}" has a new participant: ${memberName}. ${data.description}`,
    actionLabel: 'View Challenge',
    actionRoute: '/(stack)/challenge?id=' + data.id,
  });

  return data as FamilyChallenge;
}

export async function abandonChallenge(challengeId: string): Promise<void> {
  const { error, data } = await supabase
    .from('family_challenge')
    .update({ status: 'abandoned' })
    .eq('id', challengeId);

    
  if (error) throw error;

  if(data){
    const { data: challenge } = await supabase
      .from('family_challenge')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) throw new Error('Challenge not found');

    await notifyFamily({
      familyId: challenge.family_id,
      type: 'family_update',
      priority: 'informational',
      title: `Family challenge abandoned`,
      body: `"${challenge.title}" has been abandoned. ${challenge.description}`,
      actionLabel: 'View Challenge',
      actionRoute: '/(stack)/challenge?id=' + challenge.id,
    });
  }
  
}

export async function getAllChallenges(familyId: string): Promise<FamilyChallenge[]> {
  const { data, error } = await supabase
    .from('family_challenge')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as FamilyChallenge[];
}