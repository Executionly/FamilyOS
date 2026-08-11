import { supabase } from '@/lib/_core/supabase';

export type UpgradeReason = 'ai_feature' | 'quota_exceeded' | null;

export interface AiInvokeResult<T> {
  data: T | null;
  upgradeReason: UpgradeReason;
  error: string | null;
}

export async function invokeAiFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<AiInvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      const status = (error as any)?.context?.status;
      if (status === 402) {
        // Try to read the structured reason from the response body if available
        let reason: UpgradeReason = 'ai_feature';
        try {
          const errBody = await (error as any)?.context?.json?.();
          if (errBody?.quota_exceeded) reason = 'quota_exceeded';
        } catch {
          // fall back to generic ai_feature reason
        }
        return { data: null, upgradeReason: reason, error: null };
      }
      throw error;
    }

    return { data: data as T, upgradeReason: null, error: null };
  } catch (err) {
    return { data: null, upgradeReason: null, error: err instanceof Error ? err.message : 'Something went wrong' };
  }
}