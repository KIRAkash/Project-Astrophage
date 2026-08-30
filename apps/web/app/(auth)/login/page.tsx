'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { OrbitLoader } from '@/components/space/orbit-loader';
import { useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!auth) {
      console.error("Firebase Auth is not configured. Please verify your environment variables.");
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/dashboard');
    } catch (error) {
      console.error("Firebase Login Error:", error);
      setLoading(false);
    }
  };

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
            onClick={handleLogin}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-stellar transition-all duration-300 rounded-lg py-3 px-4 flex items-center justify-center flex-col font-mono"
          >
            Launch with Google
          </button>
        )}
      </NebulaCard>
    </div>
  );
}
