// Runs before every admin page and route (docs/auth-security.md §1, §3.2):
// - a fresh CSP nonce for each request;
// - a first gate: no admin session cookie means the login page (or 401 for an API call).
// The cookie is only checked for being there. Every page and action still calls requireAdmin(),
// which checks the session itself, its role and 2FA: this gate is never trusted alone.
import { COOKIE_PREFIX } from '@mustafa/auth/cookies';
import { nonceCsp } from '@mustafa/config/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

// Reachable without a session: the login steps and Better Auth's own endpoints.
const PUBLIC = [/^\/login(\/|$)/, /^\/api\/auth(\/|$)/];

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = nonceCsp('admin', nonce, { dev: process.env.NODE_ENV === 'development' });
  const { pathname } = request.nextUrl;

  let response: NextResponse;
  const signedIn = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX.admin }) !== null;
  if (signedIn || PUBLIC.some((path) => path.test(pathname))) {
    // Next reads the nonce from the request's CSP and adds it to its own scripts.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (pathname.startsWith('/api/')) {
    response = NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Please log in to continue.' } },
      { status: 401 },
    );
  } else {
    response = NextResponse.redirect(new URL('/login', request.url));
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/).*)'],
};
