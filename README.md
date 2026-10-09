This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Acceso por aplicación

Las aplicaciones asignan permisos independientes en `public.app_user_access`; estar registrado en Supabase Auth no concede acceso de administrador automáticamente. La migración `supabase/migrations/20261009090000_app_access_isolation.sql` configura RLS y asigna inicialmente Autos e Inventarios únicamente al administrador principal. También conserva el acceso a Control Horas para usuarios autenticados que estén configurados para 2026 en `control_horas_metas`.

Primero aplica esa migración una sola vez desde Supabase Dashboard > SQL Editor, conectado al proyecto correcto. Verifica que `rmonroyl@cendoj.ramajudicial.gov.co` ya exista en Authentication > Users y que existan las tablas y el bucket requeridos. La migración reemplaza las políticas RLS de las tablas de estas aplicaciones para cerrar políticas permisivas anteriores; revisa el contenido antes de ejecutarla. No despliegues la interfaz nueva antes de aplicar la migración, porque el inicio de sesión ahora requiere `app_user_access`.

Para Inventarios, aplica después `supabase/migrations/20261009110000_public_inventory_read_admin_write.sql` desde SQL Editor. Esta migración permite consultar los datos del inventario sin iniciar sesión, limita las escrituras a `rmonroyl@cendoj.ramajudicial.gov.co` y `ojulesa@cendoj.ramajudicial.gov.co`, y oculta la cédula en la vista pública de funcionarios. Ambas cuentas deben existir primero en Supabase Auth. La cédula solo se expone a los administradores en la vista `funcionarios_admin`.

Para Autos, aplica `supabase/migrations/20261009120000_public_autos_catalog_and_images.sql` desde SQL Editor. Permite consultar el catálogo y leer imágenes del bucket `autos_galeria` sin iniciar sesión, mientras reserva los cambios de catálogo, la colección y las imágenes a `rmonroyl@cendoj.ramajudicial.gov.co`. El bucket completo se vuelve público; cualquier persona con una URL de imagen podrá verla. La colección y sus datos permanecen restringidos a ese administrador.

## Funciones seguras de Control Horas

Las Edge Functions crean cuentas y cambian contraseñas únicamente cuando las invoca un administrador asignado a Control Horas. La clave administrativa permanece en el entorno de Supabase y nunca en el navegador.

Después de aplicar la migración anterior, desde la raíz del proyecto inicia sesión en Supabase CLI, vincula el proyecto y despliega las funciones:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy create-control-horas-user --project-ref <PROJECT_REF>
supabase functions deploy set-control-horas-password --project-ref <PROJECT_REF>
```

Obtén el `PROJECT_REF` en la URL del proyecto de Supabase. Las funciones requieren la verificación JWT habilitada, configurada en `supabase/config.toml`. Supabase proporciona las claves al entorno de Edge Functions; no copies una clave secreta o `service_role` a `.env.local`, al navegador ni a variables `NEXT_PUBLIC_*`.

Después del despliegue, en el Panel de Administración usa **Crear Cuenta de Acceso** en la fila del funcionario y define una contraseña temporal única de al menos 12 caracteres. Compártela por un canal seguro.
