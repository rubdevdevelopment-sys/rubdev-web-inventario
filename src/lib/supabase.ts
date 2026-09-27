import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykpffodouzipefqyvjqd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3PgfhSvSXqaEjqB65TfWTw_AQhZXhBA'; // Agrega aquí tu llave completa

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
