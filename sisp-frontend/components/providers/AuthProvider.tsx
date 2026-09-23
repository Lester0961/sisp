'use client';

import { useEffect } from 'react';
import { useAuthStore, registerLogoutCleanup } from '@/stores/authStore';
import { useStudentStore } from '@/stores/studentStore';
import { useRequestStore } from '@/stores/requestStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { User } from '@/types';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

interface SessionBootstrapPayload {
  user: User;
  accessToken: string;
  permissions?: unknown;
}

// Next dev Strict Mode mounts effects twice. Share one refresh request so the
// rotating HttpOnly cookie is not consumed concurrently by two bootstraps.
let sessionBootstrapPromise: Promise<SessionBootstrapPayload | null> | null = null;

function bootstrapSessionOnce(): Promise<SessionBootstrapPayload | null> {
  if (!sessionBootstrapPromise) {
    sessionBootstrapPromise = fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => (response.ok ? (response.json() as Promise<SessionBootstrapPayload>) : null))
      .catch(() => null);
  }
  return sessionBootstrapPromise;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
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
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const data = await bootstrapSessionOnce();
        if (!cancelled) {
          if (data?.user && data.accessToken) {
            setSession({ user: data.user, accessToken: data.accessToken, permissions: data.permissions });
          } else {
            clearSession();
          }
        }
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
