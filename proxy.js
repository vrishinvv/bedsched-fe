import { NextResponse } from 'next/server';

// Authentication is handled by the backend API. Cross-origin httpOnly cookies
// cannot be read here, so client components perform redirects after validation.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api).*)',
  ],
};
