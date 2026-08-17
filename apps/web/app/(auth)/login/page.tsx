'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { OrbitLoader } from '@/components/space/orbit-loader';
import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <NebulaCard className="max-w-md w-full p-8 text-center relative overflow-hidden" glow="purple">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-nebula/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-nebula to-stellar flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] mb-6">
          <span className="text-black text-3xl">✦</span>
        </div>
        
        <h1 className="text-3xl font-space font-bold mb-2">Astrophage</h1>
        <p className="text-gray-400 font-mono text-sm mb-8">Navigate your codebase. Chart your architecture.</p>

        {loading ? (
          <div className="py-4">
            <OrbitLoader size="sm" label="Initiating sequence..." />
          </div>
        ) : (
          <button
            onClick={() => {
              setLoading(true);
              signIn('github', { callbackUrl: '/dashboard' });
            }}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-stellar transition-all duration-300 rounded-lg py-3 px-4 flex items-center justify-center gap-3 font-mono"
          >
            <Github className="w-5 h-5" />
            Launch with GitHub
          </button>
        )}
      </NebulaCard>
    </div>
  );
}
