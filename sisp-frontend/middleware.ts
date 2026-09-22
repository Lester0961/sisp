import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/about', '/services', '/support', '/admission', '/activate', '/reset-password', '/account-entry'];

const ALL_STAFF = ['registrar', 'treasury', 'sys_admin', 'dean'];
const ALL_ROLES = ['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin'];

/** Where each role lands when a route rule denies access. */
const ROLE_HOME: Record<string, string> = {
  student: '/dashboard',
  faculty: '/faculty',
  dean: '/admin/dashboard',
  registrar: '/admin/dashboard',
  treasury: '/admin/dashboard',
  sys_admin: '/admin/dashboard',
};

/**
 * Role → route prefixes. Ordered most-specific first; the first matching
 * prefix decides. Mirrors the backend authorization matrix (NestJS @Roles /
 * @RequirePermissions) and lib/navigation.ts so no role is shown a module its
 * permissions cannot complete.
 */
const ROLE_ROUTES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/admin/dashboard', roles: ALL_STAFF },
  { prefix: '/admin/admission', roles: ['registrar', 'sys_admin', 'dean'] },
  { prefix: '/admin/advisers', roles: ['registrar', 'sys_admin'] },
  { prefix: '/admin/document-requests', roles: ['registrar'] },
  { prefix: '/admin/documents', roles: ['registrar'] },
  { prefix: '/admin/identity-verifications', roles: ['registrar'] },
  { prefix: '/admin/enrollments', roles: ['registrar'] },
  { prefix: '/admin/grades', roles: ['registrar'] },
  { prefix: '/admin/kb', roles: ['registrar', 'sys_admin'] },
  { prefix: '/admin/audit', roles: ['sys_admin'] },
  { prefix: '/admin/users', roles: ['sys_admin'] },
  { prefix: '/admin/financials', roles: ['treasury'] },
  { prefix: '/admin/requests', roles: ['treasury'] },
  { prefix: '/admin', roles: ['registrar', 'treasury', 'sys_admin'] },
  { prefix: '/faculty', roles: ['faculty'] },
  { prefix: '/dean', roles: ['dean'] },
  { prefix: '/tickets', roles: ['faculty', 'dean', 'registrar', 'treasury', 'sys_admin'] },
  { prefix: '/dashboard', roles: ALL_ROLES },
  { prefix: '/grades', roles: ['student'] },
  { prefix: '/financials', roles: ['student'] },
  { prefix: '/requests', roles: ['student'] },
  { prefix: '/chat', roles: ['student'] },
  { prefix: '/enrollment', roles: ['student'] },
  { prefix: '/schedule', roles: ['student'] },
  { prefix: '/curriculum', roles: ['student', 'registrar', 'dean', 'faculty'] },
  { prefix: '/settings', roles: ALL_ROLES },
];

/**
 * UX-ONLY route guard (Phase 1, aligned to the role/module matrix).
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
    const rule = ROLE_ROUTES.find((entry) => pathname.startsWith(entry.prefix));
    if (rule && !rule.roles.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', request.url));
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
