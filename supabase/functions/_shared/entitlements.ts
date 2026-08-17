import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MONTHLY_AI_QUOTA_PREMIUM = 500; // adjust to whatever "generous" means in practice — start conservative, tune from real usage data
const FREE_INTRO_QUOTA = 1; // the one-time guided intro
const FREE_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500MB — adjust once you know real costs
const FREE_VIDEO_LIMIT = 3;

const FEATURE_TRIAL_COLUMNS: Record<string, string> = {
  meeting_agenda: 'meeting_agenda_trial_used',
  meeting_summary: 'meeting_summary_trial_used',
};

export async function checkAiEntitlement(
  supabase: ReturnType<typeof createClient>,
  familyId: string,
  feature?: string,
): Promise<{ allowed: boolean; reason?: string; isIntro?: boolean; featureTrial?: string }> {
  const trialColumn = feature ? FEATURE_TRIAL_COLUMNS[feature] : undefined;

  const { data: family } = await supabase
    .from('family')
    .select(`subscription_tier, subscription_expires_at, ai_intro_used${trialColumn ? `, ${trialColumn}` : ''}`)
    .eq('id', familyId)
    .single();

  if (!family) return { allowed: false, reason: 'Family not found' };

  const isPremium =
    family.subscription_tier === 'premium' &&
    (!family.subscription_expires_at || new Date(family.subscription_expires_at) > new Date());

  if (!isPremium) {
    // Feature-specific guaranteed trial — checked first, independent of the general intro
    if (trialColumn && !(family as any)[trialColumn]) {
      return { allowed: true, featureTrial: feature };
    }
    if (!family.ai_intro_used) {
      return { allowed: true, isIntro: true };
    }
    return { allowed: false, reason: 'upgrade_required' };
  }

  // Premium — unchanged quota check below
  const month = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('call_count')
    .eq('family_id', familyId)
    .eq('month', month)
    .maybeSingle();

  const currentCount = usage?.call_count ?? 0;
  if (currentCount >= MONTHLY_AI_QUOTA_PREMIUM) {
    return { allowed: false, reason: 'quota_exceeded' };
  }

  return { allowed: true };
}

export async function recordAiUsage(
  supabase: ReturnType<typeof createClient>,
  familyId: string,
  wasIntro = false,
  featureTrial?: string,
) {
  const month = new Date().toISOString().slice(0, 7);
  await supabase.rpc('increment_ai_usage', { p_family_id: familyId, p_month: month });

  if (wasIntro) {
    await supabase.from('family').update({ ai_intro_used: true }).eq('id', familyId);
  }

  const trialColumn = featureTrial ? FEATURE_TRIAL_COLUMNS[featureTrial] : undefined;
  if (trialColumn) {
    await supabase.from('family').update({ [trialColumn]: true }).eq('id', familyId);
  }
}

export async function checkStorageEntitlement(
  supabase: ReturnType<typeof createClient>,
  familyId: string,
  additionalBytes: number
): Promise<{ allowed: boolean; reason?: string; usedBytes?: number; limitBytes?: number }> {
  const { data: family } = await supabase
    .from('family')
    .select('subscription_tier, subscription_expires_at, storage_used_bytes')
    .eq('id', familyId)
    .single();

  if (!family) return { allowed: false, reason: 'Family not found' };

  const isPremium =
    family.subscription_tier === 'premium' &&
    (!family.subscription_expires_at || new Date(family.subscription_expires_at) > new Date());

  if (isPremium) return { allowed: true };

  const projectedUsage = (family.storage_used_bytes ?? 0) + additionalBytes;
  if (projectedUsage > FREE_STORAGE_LIMIT_BYTES) {
    return {
      allowed: false,
      reason: 'storage_limit_exceeded',
      usedBytes: family.storage_used_bytes ?? 0,
      limitBytes: FREE_STORAGE_LIMIT_BYTES,
    };
  }

  return { allowed: true, usedBytes: family.storage_used_bytes ?? 0, limitBytes: FREE_STORAGE_LIMIT_BYTES };
}


export async function checkVideoEntitlement(
  supabase: ReturnType<typeof createClient>,
  familyId: string
): Promise<{ allowed: boolean; reason?: string; videosUsed?: number; videoLimit?: number }> {
  const { data: family } = await supabase
    .from('family')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', familyId)
    .single();

  if (!family) return { allowed: false, reason: 'Family not found' };

  const isPremium =
    family.subscription_tier === 'premium' &&
    (!family.subscription_expires_at || new Date(family.subscription_expires_at) > new Date());

  if (isPremium) return { allowed: true };

  const { count } = await supabase
    .from('memory')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('media_type', 'video');

  const videosUsed = count ?? 0;
  if (videosUsed >= FREE_VIDEO_LIMIT) {
    return { allowed: false, reason: 'video_limit_exceeded', videosUsed, videoLimit: FREE_VIDEO_LIMIT };
  }

  return { allowed: true, videosUsed, videoLimit: FREE_VIDEO_LIMIT };
}