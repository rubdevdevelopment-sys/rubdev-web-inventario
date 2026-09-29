import { redirect } from 'next/navigation';

export default function InventarioLegacyRedirect() {
  // Redirige automáticamente de la ruta antigua /inventario a /inventarioescuela
  redirect('/inventarioescuela');
}