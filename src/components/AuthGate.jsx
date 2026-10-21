'use client';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AuthGate({ children }) {
  const pathname = usePathname();
  // Public routes that don't require auth
  const publicRoutes = new Set(['/login']);

  if (publicRoutes.has(pathname)) {
    return <>{children}</>;
  }

  // For all other routes, enforce authentication
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
