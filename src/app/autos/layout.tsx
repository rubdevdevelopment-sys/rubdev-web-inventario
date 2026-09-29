import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Colección de Autos | RubDev',
  description: 'Catálogo de Colección de Autos.',
};

export default function AutosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}