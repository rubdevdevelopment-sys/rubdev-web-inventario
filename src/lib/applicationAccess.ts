import type { SupabaseClient } from '@supabase/supabase-js';

export type ApplicationKey = 'autos' | 'inventarioescuela' | 'controlhoras';
export type ApplicationRole = 'user' | 'admin';

export async function getApplicationRole(
  client: SupabaseClient,
  application: ApplicationKey,
  userId: string,
): Promise<ApplicationRole | null> {
  const { data, error } = await client
    .from('app_user_access')
    .select('role')
    .eq('application', application)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data?.role === 'admin' || data?.role === 'user') return data.role;
  return null;
}
