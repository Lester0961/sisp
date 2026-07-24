import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/about', '/services', '/support'];

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['admin_staff', 'sys_admin', 'live_agent'],
  '/faculty': ['faculty'],
  '/dean': ['dean'],
  '/live-agent': ['admin_staff', 'dean', 'live_agent'],
  '/dashboard': ['student', 'admin_staff', 'faculty', 'dean', 'sys_admin', 'live_agent'],
  '/grades': ['student'],
  '/requests': ['student'],
  '/chat': ['student', 'admin_staff', 'dean', 'live_agent'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' || PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
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
        // Allow dean and faculty to access the /admin/dashboard
        if (route === '/admin' && pathname.startsWith('/admin/dashboard') && (role === 'dean' || role === 'faculty')) {
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