'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopHeader } from '@/components/admin/layout/AdminTopHeader';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';

const STORAGE_KEY = 'sisp_sidebar_collapsed';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasHydrated } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    <div className="flex min-h-screen bg-[#f8fbfd] antialiased">
      <AdminSidebar
        isCollapsed={mounted ? isCollapsed : false}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopHeader onOpenMobile={() => setMobileOpen(true)} />
        <div className="flex-1 min-w-0 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
