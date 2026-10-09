import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control Horas Diciembre',
  description: 'Sistema de registro y seguimiento de horas compensadas de diciembre.',
  icons: {
    icon: [{ url: '/icohoras.png', type: 'image/png' }],
    apple: [{ url: '/icohoras.png', type: 'image/png' }],
  },
};

export default function ControlHorasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
