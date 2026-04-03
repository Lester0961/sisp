'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (accessToken && isAuthenticated) {
      // Sync access token to localStorage for axios interceptor
      localStorage.setItem('accessToken', accessToken);
      // Sync access token to cookie for Next.js middleware
      document.cookie = `sisp-auth-token=${accessToken}; path=/; SameSite=Strict`;
    } else {
      // Clear the cookie on logout
      document.cookie =
        'sisp-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [accessToken, isAuthenticated]);

  return <>{children}</>;
}