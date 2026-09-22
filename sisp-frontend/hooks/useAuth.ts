'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';

export function homeForRole(role?: string | null): string {
  switch (role) {
    case 'faculty':
      return '/faculty';
    case 'dean':
      return '/dean/grades';
    case 'registrar':
    case 'treasury':
    case 'sys_admin':
      return '/admin/dashboard';
    case 'student':
    default:
      return '/dashboard';
  }
}

export function useAuth() {
  const router = useRouter();
  const {
    user,
    permissions,
    accessToken,
    isAuthenticated,
    isLoading,
    setSession,
    setLoading,
    clearSession,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await authApi.login({ email, password });
        if (!response.mfaRequired && response.accessToken) {
          setSession({
            user: response.user,
            accessToken: response.accessToken,
            permissions: response.permissions,
          });
        }
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setSession, setLoading],
  );

  const verifyMfa = useCallback(
    async (challengeId: string, otpCode: string) => {
      const response = await authApi.verifyMfa({ challengeId, otpCode });
      setSession({
        user: response.user,
        accessToken: response.accessToken,
        permissions: response.permissions,
      });
      return response;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Server-side revocation is best-effort; local state is always cleared.
    }
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  const redirectByRole = useCallback(
    (roleOverride?: string) => {
      router.push(homeForRole(roleOverride ?? user?.role));
    },
    [user, router],
  );

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  return {
    user,
    permissions,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    verifyMfa,
    logout,
    redirectByRole,
    hasPermission,
  };
}
