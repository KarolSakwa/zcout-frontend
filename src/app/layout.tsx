import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter, IBM_Plex_Sans_Condensed } from 'next/font/google';
import './globals.css';
import TopNav from '../components/TopNav';
import RouteOverlayLoader from '@/components/RouteOverlayLoader';
import AuthProvider from '@/components/AuthProvider';
import { ScoutingProgressProvider } from '@/components/scouting/ScoutingProgressProvider';

const inter = Inter({ subsets: ['latin'] });

const ratingFont = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-rating',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zcout',
  description: 'Zcout',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="cool-slate">
      <body className={`${inter.className} ${ratingFont.variable}`}>
        <AuthProvider>
          <ScoutingProgressProvider>
            <TopNav />
            <Suspense fallback={null}>
              <RouteOverlayLoader />
            </Suspense>
            {children}
          </ScoutingProgressProvider>
        </AuthProvider>
      </body>
    </html>
  );
}