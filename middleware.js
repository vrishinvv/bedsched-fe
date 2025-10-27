import { NextResponse } from 'next/server';

// Paths that should bypass auth (static assets, login)
const PUBLIC_PATHS = [
  '/login',
  '/favicon.ico',
];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow Next internal and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const cookies = req.cookies;
  const user = cookies.get('bs_user');
  const role = cookies.get('bs_role');

  // If not logged in, redirect to /login
  if (!user || !role) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based gating: dashboard-only can access root dashboard page
  if (role.value === 'dashboard') {
    if (pathname !== '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api).*)', // apply to all pages, not API routes (frontend-only)
  ],
};
