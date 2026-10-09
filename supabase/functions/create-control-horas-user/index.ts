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

  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: 'Debes iniciar sesión como administrador.' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonResponse({ error: 'La solicitud no tiene un formato válido.' }, 400);
    }
    payload = body as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'La solicitud no contiene JSON válido.' }, 400);
  }

  if (typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    return jsonResponse({ error: 'El correo y la contraseña son obligatorios.' }, 400);
  }

  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'El correo electrónico no es válido.' }, 400);
  }
  if (password.length < 12) {
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
  if (authError || !adminUser?.email) {
    return jsonResponse({ error: 'La sesión no es válida o ha expirado.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminRecord, error: adminCheckError } = await adminClient
    .from('app_user_access')
    .select('role')
    .eq('application', 'controlhoras')
    .eq('user_id', adminUser.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminCheckError) {
    return jsonResponse({ error: 'No se pudo verificar el rol de administrador.' }, 500);
  }
  if (!adminRecord) {
    return jsonResponse({ error: 'No tienes permisos para crear cuentas de Control Horas.' }, 403);
  }

  const { data: employee, error: employeeCheckError } = await adminClient
    .from('control_horas_metas')
    .select('funcionario_nombre, es_admin')
    .eq('funcionario_email', email)
    .eq('periodo_anio', 2026)
    .maybeSingle();

  if (employeeCheckError) {
    return jsonResponse({ error: 'No se pudo verificar el funcionario configurado.' }, 500);
  }
  if (!employee) {
    return jsonResponse({ error: 'Primero configura este funcionario en el panel de Control Horas.' }, 404);
  }

  const { data, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: employee.funcionario_nombre },
  });

  if (createError) {
    const alreadyExists = /already (?:been )?registered|already exists/i.test(createError.message);
    return jsonResponse(
      { error: alreadyExists ? 'Ya existe una cuenta de acceso con ese correo.' : createError.message },
      alreadyExists ? 409 : 400,
    );
  }

  const { error: accessError } = await adminClient
    .from('app_user_access')
    .upsert({
      application: 'controlhoras',
      user_id: data.user.id,
      role: employee.es_admin ? 'admin' : 'user',
    }, { onConflict: 'application,user_id' });

  if (accessError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error('Failed to remove newly-created auth user after access assignment failed:', cleanupError);
    }
    return jsonResponse({ error: 'La cuenta se creó, pero no fue posible asignarle acceso a Control Horas.' }, 500);
  }

  return jsonResponse({ userId: data.user.id });
});
