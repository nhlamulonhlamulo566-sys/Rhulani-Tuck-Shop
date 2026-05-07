import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerCleanup from '@/components/service-worker-cleanup';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RHULANI TUCK SHOP',
  description: 'Business Management Dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f9fafb" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
