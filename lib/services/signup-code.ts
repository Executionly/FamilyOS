import { supabase } from "../_core/supabase";


export async function checkSignupCode(code: string) {
  const { data, error } = await supabase.rpc('check_signup_code', { p_code: code });
  if (error) throw error;
  return data; // { name, role, family_name } or null
}