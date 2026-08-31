'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { OrbitLoader } from '@/components/space/orbit-loader';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const publicPaths = ['/login', '/'];
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/api/');

    if (!auth) {
      setLoading(false);
      if (!isPublicPath) {
        router.push('/login');
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Enforce authentication
      if (!currentUser && !isPublicPath) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <OrbitLoader size="md" label="Authenticating pilot..." />
      </div>
    );
  }

  // If we're not logged in and not on a public page, don't render children yet to prevent flashing content
  const publicPaths = ['/login', '/'];
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/api/');
  
  if (!user && !isPublicPath) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
