// Every admin page gets a fresh CSP nonce (docs/auth-security.md §3.2). The admin is dynamic
// anyway, so this costs no caching. Static files and the brand icons are left out.
import { nonceCsp } from '@mustafa/config/headers';
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = nonceCsp('admin', nonce, { dev: process.env.NODE_ENV === 'development' });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/).*)'],
};
