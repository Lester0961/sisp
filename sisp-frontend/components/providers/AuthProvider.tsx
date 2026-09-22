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
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  const clearStudent = useStudentStore((s) => s.clearStudent);
  const clearRequests = useRequestStore((s) => s.clearRequests);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);

  useEffect(() => {
    registerLogoutCleanup(clearStudent);
    registerLogoutCleanup(clearRequests);
    registerLogoutCleanup(clearMessages);
    registerLogoutCleanup(clearNotifications);
  }, [clearStudent, clearRequests, clearMessages, clearNotifications]);

  // Bootstrap the session once on load using the HttpOnly refresh cookie.
  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          if (!cancelled) clearSession();
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setSession({ user: data.user, accessToken: data.accessToken, permissions: data.permissions });
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasHydrated(true);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
