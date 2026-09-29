import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventario - Escuela Judicial SRLB | RubDev',
  description: 'Sistema de Gestión de Activos y Control de Inventarios.',
  icons: {
    icon: [
      { url: '/inventario/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/inventario/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/inventario/favicon.ico' },
    ],
    apple: [
      { url: '/inventario/favicon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}