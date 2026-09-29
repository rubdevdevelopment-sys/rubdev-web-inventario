import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Colección de Autos | RubDev',
  description: 'Catálogo Maestro y Vitrina de Vehículos de Colección.',
  icons: {
    icon: [
      { url: '/autos/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/autos/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/autos/favicon.ico' },
    ],
    apple: [
      { url: '/autos/favicon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function AutosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}