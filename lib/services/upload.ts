import { supabase } from "../_core/supabase";
import { File } from 'expo-file-system';

export async function uploadPhoto(schema: string,storagePath: string, fileUri: string, mimeType: string) {
  const file = new File(fileUri);
  const bytes = await file.bytes(); // Uint8Array — verify this is sync on your SDK 54 install
  const { error } = await supabase.storage
    .from(schema)
    .upload(storagePath, bytes.buffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
}