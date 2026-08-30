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

export const metadata = {
  title: 'Astrophage | OpenKB',
  description: 'Navigate your codebase. Chart your architecture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col`}>
        <AuthProvider>
          <StarField />
          <ConditionalHeader>
            <header className="glass-card border-x-0 border-t-0 rounded-none h-16 flex items-center px-6 sticky top-0 z-50">
              <div className="flex items-center gap-2 font-space font-bold text-xl text-white tracking-wider">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-nebula to-stellar flex items-center justify-center animate-pulse-glow">
                  <span className="text-black text-lg">✦</span>
                </div>
                ASTROPHAGE
              </div>
              <nav className="ml-8 flex gap-6 text-sm font-mono text-gray-400">
                <a href="/dashboard" className="hover:text-stellar transition-colors">Dashboard</a>
                <a href="/orgs" className="hover:text-stellar transition-colors">Organizations</a>
              </nav>
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
