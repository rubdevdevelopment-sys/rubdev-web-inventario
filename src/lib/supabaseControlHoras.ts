import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykpffodouzipefqyvjqd.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_3PgfhSvSXqaEjqB65TfWTw_AQhZYhbP33u59m134_f';

// Cliente con clave de almacenamiento aislada para Control de Horas
export const supabaseControlHoras = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'rubdev-controlhoras-auth', // Clave única que previene sesión cruzada con /inventarioescuela
    persistSession: true,
    autoRefreshToken: true,
  }
});