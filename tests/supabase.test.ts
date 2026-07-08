import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Configuration', () => {
  it('should have valid Supabase credentials', async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('should be able to create a Supabase client', async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    const client = createClient(supabaseUrl, supabaseAnonKey);
    expect(client).toBeDefined();
  });

  it('should be able to connect to Supabase', async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    const client = createClient(supabaseUrl, supabaseAnonKey);

    // Try to get the current user (should work even if not authenticated)
    const { data, error } = await client.auth.getUser();

    // We expect this to either succeed or fail with auth error, not connection error
    expect(error?.message).not.toMatch(/connection|network|fetch/i);
  });
});
