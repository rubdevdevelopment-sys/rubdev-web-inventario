import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabaseConfig';

export const supabaseAutos = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
  auth: {
    storageKey: 'rubdev-autos-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
