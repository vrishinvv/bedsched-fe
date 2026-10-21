'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/lib/api';

export default function ProtectedRoute({ children, adminOnly = false, requiredRole = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Fast-path: if no token in localStorage, redirect immediately
        if (typeof window !== 'undefined') {
          const token = window.localStorage.getItem('bs_token');
          if (!token) {
            router.push('/login');
            return;
          }
        }
        const me = await getMe();
        if (!me || !me.user) {
          router.push('/login');
          return;
        }
        
        if (requiredRole && me.user.role !== requiredRole) {
          router.push('/');
          return;
        }

        // Existing admin pages are also used by location users.
        if (adminOnly && !['admin', 'location_user'].includes(me.user.role)) {
          router.push('/');
          return;
        }
        
        setAuthorized(true);
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, adminOnly, requiredRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
