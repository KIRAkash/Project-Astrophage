'use client';
import { NebulaCard } from '@/components/space/nebula-card';
import { OrbitLoader } from '@/components/space/orbit-loader';
import { useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!auth) {
      const err = "Firebase Auth is not configured. Please verify your NEXT_PUBLIC_FIREBASE_* environment variables.";
      console.error(err);
      setErrorMessage(err);
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      if (error?.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setErrorMessage(`Unauthorized Domain: Please add "${currentDomain}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      } else if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to sign in with Google. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <NebulaCard className="max-w-md w-full p-8 text-center relative overflow-hidden" glow="purple">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-nebula/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex justify-center mb-8 mt-4">
          <img src="/assets/logos/lockup-wordmark-white.svg" alt="Astrophage" className="h-20" />
        </div>
        <p className="text-gray-400 font-mono text-sm mb-10">Navigate your codebase. Chart your architecture.</p>

        {loading ? (
          <div className="py-4">
            <OrbitLoader size="sm" label="Initiating sequence..." />
          </div>
        ) : (
          <>
            <button
              onClick={handleLogin}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-stellar transition-all duration-300 rounded-lg py-3 px-4 flex flex-row items-center justify-center gap-4 font-mono font-bold"
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5 shadow-md shrink-0">
                <img src="/assets/google/google.png" alt="Google" className="w-full h-full object-contain" />
              </div>
              Launch with Google
            </button>
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs font-mono text-left break-words">
                ⚠️ {errorMessage}
              </div>
            )}
          </>
        )}
      </NebulaCard>
    </div>
  );
}
