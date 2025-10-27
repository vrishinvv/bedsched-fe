import { NextResponse } from 'next/server';

// Middleware disabled - authentication is handled by the backend API
// Cross-origin httpOnly cookies cannot be read by Next.js middleware
// Client-side components will handle auth checks and redirects

export function middleware(req) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api).*)',
  ],
};
