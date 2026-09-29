import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventario - Escuela Judicial SRLB | RubDev',
  description: 'Sistema de Gestión de Activos y Control de Inventarios.',
};

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}