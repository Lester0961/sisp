'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopHeader } from '@/components/admin/layout/AdminTopHeader';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { StudentSidebar } from '@/components/student/layout/StudentSidebar';
import { StudentTopHeader } from '@/components/student/layout/StudentTopHeader';
import { StudentMobileBottomNav } from '@/components/student/layout/StudentMobileBottomNav';
import { useEscalationAttentionStore } from '@/stores/escalationAttentionStore';

const STORAGE_KEY = 'sisp_sidebar_collapsed';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasHydrated } = useAuthStore();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const refreshEscalations = useEscalationAttentionStore((state) => state.refresh);
  const clearEscalations = useEscalationAttentionStore((state) => state.clear);
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearEscalations();
      return;
    }
    void refreshEscalations();
    const refresh = () => void refreshEscalations();
    const onFocus = () => void refreshEscalations();
    const timer = window.setInterval(refresh, 20_000);
    window.addEventListener('focus', onFocus);
    window.addEventListener('sisp-escalation-changed', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('sisp-escalation-changed', refresh);
    };
  }, [isAuthenticated, user?.id, refreshEscalations, clearEscalations]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.mustChangePassword) {
        if (pathname !== '/force-password-change') {
          router.push('/force-password-change');
        }
      } else if (pathname === '/force-password-change') {
        router.push('/dashboard');
      }
    }
  }, [hasHydrated, isAuthenticated, isLoading, user?.mustChangePassword, pathname, router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!hasHydrated || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forced password change is a focused screen without portal chrome.
  if (pathname === '/force-password-change') {
    return <div className="min-h-[100dvh]">{children}</div>;
  }

  return (
    <div className={isStudent ? 'student-portal-shell flex min-h-screen antialiased' : 'staff-portal-shell flex min-h-screen antialiased'}>
      {isStudent ? (
        <StudentSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          user={user}
          onSignOut={() => void logout()}
        />
      ) : (
        <AdminSidebar
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isStudent ? (
          <StudentTopHeader onOpenMobile={() => setMobileOpen(true)} />
        ) : (
          <AdminTopHeader onOpenMobile={() => setMobileOpen(true)} />
        )}
        <div className="min-w-0 flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>

      {isStudent ? <StudentMobileBottomNav /> : <MobileBottomNav />}
    </div>
  );
}
