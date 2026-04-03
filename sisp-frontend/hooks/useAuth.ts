'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { AuthResponse } from '@/types';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setAuth,
    setAccessToken,
    setLoading,
    logout: clearAuth,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response: AuthResponse = await authApi.login({ email, password });
        setAuth(response.user, response.accessToken, response.refreshToken);
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading],
  );

  const register = useCallback(
    async (email: string, password: string, roleName: string) => {
      setLoading(true);
      try {
        const response: AuthResponse = await authApi.register({
          email,
          password,
          roleName,
        });
        setAuth(response.user, response.accessToken, response.refreshToken);
        return response;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading],
  );

  const refresh = useCallback(async () => {
    if (!refreshToken) return null;
    try {
      const response: AuthResponse = await authApi.refresh(refreshToken);
      setAccessToken(response.accessToken);
      return response;
    } catch {
      clearAuth();
      router.push('/login');
      return null;
    }
  }, [refreshToken, setAccessToken, clearAuth, router]);

  const logout = useCallback(() => {
    clearAuth();
    router.push('/login');
  }, [clearAuth, router]);

  const redirectByRole = useCallback(() => {
    if (!user) return;
    switch (user.role) {
      case 'student':
        router.push('/dashboard');
        break;
      case 'faculty':
        router.push('/faculty/grades');
        break;
      case 'admin_staff':
        router.push('/admin/dashboard');
        break;
      case 'dean':
        router.push('/dean/exceptions');
        break;
      default:
        router.push('/dashboard');
    }
  }, [user, router]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    refresh,
    logout,
    redirectByRole,
  };
}