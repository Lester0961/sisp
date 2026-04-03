import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do not require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

// Routes that require specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['admin_staff'],
  '/faculty': ['faculty'],
  '/dean': ['dean'],
  '/dashboard': ['student', 'admin_staff', 'faculty', 'dean'],
  '/grades': ['student'],
  '/requests': ['student'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Read auth storage from cookies or check the sisp-auth-storage key
  // We read the raw localStorage value passed as a cookie by the AuthProvider
  const authCookie = request.cookies.get('sisp-auth-token');
  const token = authCookie?.value;

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode the JWT payload (without verification — verification happens on the backend)
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    const role = payload.role as string;

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        // Redirect to their own dashboard if they try to access wrong role route
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch {
    // Invalid token — redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};