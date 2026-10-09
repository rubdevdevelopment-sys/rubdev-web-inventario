import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getDefaultKey = (environmentVariable: string) => {
  const value = Deno.env.get(environmentVariable);
  if (!value) return undefined;

  try {
    const keys: unknown = JSON.parse(value);
    if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) return undefined;
    const defaultKey = (keys as Record<string, unknown>).default;
    return typeof defaultKey === 'string' ? defaultKey : undefined;
  } catch {
    return undefined;
  }
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: 'Debes iniciar sesión como administrador.' }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'La solicitud no contiene JSON válido.' }, 400);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return jsonResponse({ error: 'La solicitud no tiene un formato válido.' }, 400);
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    return jsonResponse({ error: 'El correo y la contraseña son obligatorios.' }, 400);
  }
  const email = payload.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'El correo electrónico no es válido.' }, 400);
  }
  if (payload.password.length < 12) {
    return jsonResponse({ error: 'La contraseña temporal debe tener al menos 12 caracteres.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? getDefaultKey('SUPABASE_PUBLISHABLE_KEYS');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? getDefaultKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'La función no tiene configuradas las credenciales de Supabase.' }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user: adminUser }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !adminUser) {
    return jsonResponse({ error: 'La sesión no es válida o ha expirado.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: adminRole, error: adminRoleError } = await adminClient
    .from('app_user_access')
    .select('role')
    .eq('application', 'controlhoras')
    .eq('user_id', adminUser.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminRoleError) {
    return jsonResponse({ error: 'No se pudo verificar el rol de administrador.' }, 500);
  }
  if (!adminRole) {
    return jsonResponse({ error: 'No tienes permisos para cambiar contraseñas de Control Horas.' }, 403);
  }

  const { data: targetAccess, error: targetAccessError } = await adminClient
    .from('app_user_access')
    .select('user_id')
    .eq('application', 'controlhoras');

  if (targetAccessError) {
    return jsonResponse({ error: 'No se pudieron verificar las cuentas de Control Horas.' }, 500);
  }

  const candidateIds = new Set((targetAccess ?? []).map((row) => row.user_id));
  let targetUserId: string | null = null;
  for (let page = 1; page <= 100; page += 1) {
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (listError) {
      return jsonResponse({ error: 'No se pudo buscar la cuenta de autenticación.' }, 500);
    }

    const match = users.users.find(
      (user) => user.email?.trim().toLowerCase() === email && candidateIds.has(user.id),
    );
    if (match) {
      targetUserId = match.id;
      break;
    }
    if (users.users.length < 1000) break;
  }

  if (!targetUserId) {
    return jsonResponse({ error: 'No existe una cuenta de usuario autorizada para Control Horas con ese correo.' }, 404);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: payload.password,
  });
  if (updateError) {
    return jsonResponse({ error: updateError.message }, 400);
  }

  return jsonResponse({ updated: true });
});
