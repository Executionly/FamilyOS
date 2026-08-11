import { supabase } from '@/lib/_core/supabase';

export class StorageLimitError extends Error {
  usedBytes: number;
  limitBytes: number;
  constructor(usedBytes: number, limitBytes: number) {
    super('storage_limit_exceeded');
    this.usedBytes = usedBytes;
    this.limitBytes = limitBytes;
  }
}

export async function checkStorageBeforeUpload(familyId: string, fileSizeBytes: number) {
  const { data, error } = await supabase.functions.invoke('check-storage-quota', {
    body: { family_id: familyId, file_size_bytes: fileSizeBytes },
  });
  if (error || !data?.allowed) {
    throw new StorageLimitError(data?.usedBytes ?? 0, data?.limitBytes ?? 0);
  }
}

export async function recordStorageDelta(familyId: string, deltaBytes: number) {
  try {
    await supabase.functions.invoke('record-storage-usage', {
      body: { family_id: familyId, delta_bytes: deltaBytes },
    });
  } catch (err) {
    console.error('Failed to record storage usage:', err);
  }
}