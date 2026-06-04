'use client';

import { useEffect } from 'react';
import { useAuthStore, registerLogoutCleanup } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useRequestStore } from '@/stores/requestStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    accessToken,
    isAuthenticated,
    hasHydrated,
    setAccessToken,
  } = useAuthStore();
  const clearStudent = useStudentStore((s) => s.clearStudent);
  const clearRequests = useRequestStore((s) => s.clearRequests);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const clearNotifications = useNotificationStore(
    (s) => s.clearNotifications,
  );

  useEffect(() => {
    registerLogoutCleanup(clearStudent);
    registerLogoutCleanup(clearRequests);
    registerLogoutCleanup(clearMessages);
    registerLogoutCleanup(clearNotifications);
  }, [clearStudent, clearRequests, clearMessages, clearNotifications]);

  // Auto-refresh token on page load if expired
  useEffect(() => {
    if (!hasHydrated) return;

    async function tryAutoRefresh() {
      const token = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!token || !storedRefreshToken) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        const buffer = 5 * 60 * 1000;

        if (now >= exp - buffer) {
          const response = await fetch(`${apiUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken);
            }
            document.cookie = `sisp-auth-token=${data.accessToken}; path=/; SameSite=Strict`;
            setAccessToken(data.accessToken);
          }
        }
      } catch {
        // Invalid JWT format or refresh failed — will be handled by
        // the Axios interceptor on the first real API call
      }
    }

    tryAutoRefresh();
  }, [hasHydrated, setAccessToken]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (accessToken && isAuthenticated) {
      localStorage.setItem('accessToken', accessToken);
      document.cookie = `sisp-auth-token=${accessToken}; path=/; SameSite=Strict`;
    } else {
      document.cookie =
        'sisp-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [accessToken, isAuthenticated, hasHydrated]);

  return <>{children}</>;
}