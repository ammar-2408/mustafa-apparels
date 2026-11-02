// Tier B of the CSP (docs/auth-security.md §3.2): a fresh nonce for the dynamic pages only.
// The matcher must stay a literal list of those pages: running here makes a page per-request,
// so a cached page must never match (a test checks both, against TIER_B_PATHS).
import { nonceCsp } from '@mustafa/config/headers';
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = nonceCsp('web', nonce, { dev: process.env.NODE_ENV === 'development' });

  // Next reads the nonce from the request's CSP and adds it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/account',
    '/account/:path*',
    '/search',
  ],
};
