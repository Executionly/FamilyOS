import { File } from 'expo-file-system';
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

export async function getFileSizeBytes(uri: string): Promise<number> {
  const file = new File(uri);
  const info = file.info();
  if (!info.exists || info.size == null) throw new Error('Could not determine file size');
  return info.size;
}

export async function checkStorageBeforeUpload(familyId: string, fileSizeBytes: number) {
  const { data, error } = await supabase.functions.invoke('check-storage-quota', {
    body: { family_id: familyId, file_size_bytes: fileSizeBytes },
  });
  if (error || !data?.allowed) {
    throw new StorageLimitError(data?.usedBytes ?? 0, data?.limitBytes ?? 0);
  }
}

// Called AFTER a successful upload — records both the ledger entry and the running total
export async function recordUpload(params: {
  familyId: string;
  bucket: 'family-memories' | 'chat-images' | 'dm-images' | 'member-avatars' | 'family-photos';
  storagePath: string;
  sizeBytes: number;
  sourceType: 'memory' | 'group_chat' | 'dm' | 'avatar' | 'family_photo';
  sourceId?: string;
  createdBy: string;
}) {
  try {
    await supabase.from('family_media').insert([{
      family_id: params.familyId,
      bucket: params.bucket,
      storage_path: params.storagePath,
      size_bytes: params.sizeBytes,
      source_type: params.sourceType,
      source_id: params.sourceId ?? null,
      created_by: params.createdBy,
    }]);
    await supabase.functions.invoke('record-storage-usage', {
      body: { family_id: params.familyId, delta_bytes: params.sizeBytes },
    });
  } catch (err) {
    console.error('Failed to record upload:', err);
  }
}

// Called on delete — removes both the storage object AND the ledger row, decrements the counter
export async function deleteMediaFile(mediaId: string): Promise<void> {
  const { data: media, error: fetchError } = await supabase
    .from('family_media')
    .select('*')
    .eq('id', mediaId)
    .single();
  if (fetchError || !media) throw fetchError ?? new Error('Media not found');

  const { error: storageError } = await supabase.storage.from(media.bucket).remove([media.storage_path]);
  if (storageError) throw storageError;

  await supabase.from('family_media').delete().eq('id', mediaId);

  await supabase.functions.invoke('record-storage-usage', {
    body: { family_id: media.family_id, delta_bytes: -media.size_bytes },
  });
}

export class VideoLimitError extends Error {
  videosUsed: number;
  videoLimit: number;
  constructor(videosUsed: number, videoLimit: number) {
    super('video_limit_exceeded');
    this.videosUsed = videosUsed;
    this.videoLimit = videoLimit;
  }
}

export async function checkVideoQuota(familyId: string) {
  const { data, error } = await supabase.functions.invoke('check-video-quota', {
    body: { family_id: familyId },
  });
  if (error || !data?.allowed) {
    throw new VideoLimitError(data?.videosUsed ?? 0, data?.videoLimit ?? 3);
  }
}