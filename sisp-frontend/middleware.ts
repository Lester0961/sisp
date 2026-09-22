import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/about', '/services', '/support', '/admission', '/activate', '/reset-password'];

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['registrar', 'treasury', 'sys_admin'],
  '/faculty': ['faculty'],
  '/dean': ['dean'],
  '/tickets': ['faculty', 'dean', 'registrar', 'treasury', 'sys_admin'],
  '/dashboard': ['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin'],
  '/grades': ['student'],
  '/financials': ['student'],
  '/requests': ['student'],
  '/chat': ['student'],
  '/enrollment': ['student'],
  '/curriculum': ['student', 'registrar', 'dean', 'faculty'],
};

/**
 * UX-ONLY route guard (Phase 1).
 *
 * Reads the non-sensitive `sisp-session-hint` cookie (role + expiry only, no
 * credential). It is not an authorization boundary: every API enforces
 * authentication, role, permission, and record-level authorization
 * server-side (NestJS guards + services). Never add security controls here.
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

  const hintCookie = request.cookies.get('sisp-session-hint');
  if (!hintCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const hint = JSON.parse(decodeURIComponent(hintCookie.value)) as {
      role?: string;
      exp?: number;
    };
    if (!hint.exp || Date.now() >= hint.exp) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('sisp-session-hint', '', { path: '/', expires: new Date(0) });
      return response;
    }

    const role = hint.role ?? '';
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
    response.cookies.set('sisp-session-hint', '', { path: '/', expires: new Date(0) });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
