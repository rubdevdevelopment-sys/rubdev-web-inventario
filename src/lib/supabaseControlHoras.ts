import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabaseConfig';

// Cliente con clave de almacenamiento aislada para Control de Horas
export const supabaseControlHoras = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'rubdev-controlhoras-auth', // Clave única que previene sesión cruzada con /inventarioescuela
    persistSession: true,
    autoRefreshToken: true,
  }
});