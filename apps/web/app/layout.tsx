import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { StarField } from '@/components/space/star-field';
import { Toaster } from 'sonner';
import { cn } from "@/lib/utils";
import { ConditionalHeader } from '@/components/layout/conditional-header';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

import { AuthProvider } from '@/components/auth-provider';
import { GlobalSearch } from '@/components/layout/global-search';
import { LogoutButton } from '@/components/layout/logout-button';

export const metadata = {
  title: 'Astrophage | OpenKB',
  description: 'Navigate your codebase. Chart your architecture.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col`}>
        <AuthProvider>
          <StarField />
          <ConditionalHeader>
            <header className="glass-card border-x-0 border-t-0 rounded-none h-16 flex items-center px-6 sticky top-0 z-50 justify-between">
              <div className="flex items-center gap-8">
                <a href="/dashboard" className="block transition-opacity hover:opacity-80">
                  <img src="/assets/logos/lockup-wordmark-white.svg" alt="Astrophage" className="h-10" />
                </a>
                <nav className="hidden md:flex gap-6 text-sm font-mono text-gray-400">
                  <a href="/dashboard" className="hover:text-stellar transition-colors">Dashboard</a>
                  <a href="/orgs" className="hover:text-stellar transition-colors">Organizations</a>
                  <a href="/settings/connectors" className="hover:text-stellar transition-colors">Connectors</a>
                  <a href="/skill" className="hover:text-stellar transition-colors text-stellar font-bold">Agent Skill</a>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <GlobalSearch />
                <LogoutButton />
              </div>
            </header>
          </ConditionalHeader>
          <main className="flex-1">
            {children}
          </main>
          <Toaster theme="dark" className="font-mono" />
        </AuthProvider>
      </body>
    </html>
  );
}
