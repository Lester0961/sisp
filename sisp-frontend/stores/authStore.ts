import { create } from 'zustand';
import { User } from '@/types';

/**
 * In-memory auth state (Phase 1).
 *
 * The access token is never persisted. The refresh credential lives in an
 * HttpOnly cookie managed by the backend. A non-sensitive session hint cookie
 * (role + expiry, no credential) lets the Next.js middleware redirect for UX;
 * the backend remains authoritative for every API call.
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;

  setSession: (payload: { user: User; accessToken: string; permissions?: string[] }) => void;
  setAccessToken: (accessToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  clearSession: () => void;
}

export const SESSION_HINT_COOKIE = 'sisp-session-hint';
const SESSION_HINT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const cleanupCallbacks: Array<() => void> = [];

export const registerLogoutCleanup = (cb: () => void) => {
  cleanupCallbacks.push(cb);
};

function writeSessionHint(user: User | null) {
  if (typeof document === 'undefined') return;
  if (!user) {
    document.cookie = `${SESSION_HINT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  const payload = encodeURIComponent(
    JSON.stringify({ role: user.role, exp: Date.now() + SESSION_HINT_MAX_AGE_SECONDS * 1000 }),
  );
  document.cookie = `${SESSION_HINT_COOKIE}=${payload}; path=/; max-age=${SESSION_HINT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: true,

  setSession: ({ user, accessToken, permissions }) => {
    writeSessionHint(user);
    set({
      user,
      accessToken,
      permissions: permissions ?? [],
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setLoading: (isLoading) => set({ isLoading }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),

  clearSession: () => {
    writeSessionHint(null);
    cleanupCallbacks.forEach((cb) => cb());
    set({
      user: null,
      accessToken: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
