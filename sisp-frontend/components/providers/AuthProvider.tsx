'use client';

import { useEffect } from 'react';
import { useAuthStore, registerLogoutCleanup } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useRequestStore } from '@/stores/requestStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { accessToken, isAuthenticated, hasHydrated } = useAuthStore();
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