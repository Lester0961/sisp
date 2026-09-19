import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/about', '/services', '/support', '/admission', '/activate'];

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['registrar', 'treasury', 'sys_admin', 'live_agent'],
  '/faculty': ['faculty'],
  '/dean': ['dean'],
  '/live-agent': ['registrar', 'dean', 'live_agent'],
  '/dashboard': ['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin', 'live_agent'],
  '/grades': ['student'],
  '/financials': ['student'],
  '/requests': ['student'],
  '/chat': ['student'],
  '/enrollment': ['student'],
  '/curriculum': ['student', 'registrar', 'dean', 'faculty'],
};

/**
 * UX-ONLY route guard (Phase 2, P2-08).
 *
 * This middleware redirects for navigation convenience. It is NOT an
 * authorization boundary:
 *  - the role claim below is decoded, not signature-verified, and is
 *    therefore forgeable;
 *  - verifying the signature here would require shipping the backend
 *    JWT_SECRET inside the frontend/edge bundle, so it is intentionally
 *    not done;
 *  - every API enforces authentication, role, permission, and record-level
 *    authorization server-side (NestJS guards + services).
 *
 * Never add security controls here. Hiding a menu or redirecting a route is
 * UX only; the backend is authoritative.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' || PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/rmc/')
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('sisp-auth-token');
  const token = authCookie?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );

    // Check token expiry
    const exp = payload.exp * 1000;
    if (Date.now() >= exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('sisp-auth-token', '', {
        path: '/',
        expires: new Date(0),
      });
      return response;
    }

    const role = payload.role as string;

    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        // Allow the dean to reach /admin/dashboard (faculty uses /faculty)
        if (route === '/admin' && pathname.startsWith('/admin/dashboard') && role === 'dean') {
          continue;
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('sisp-auth-token', '', {
      path: '/',
      expires: new Date(0),
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
