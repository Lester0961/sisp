'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.mustChangePassword) {
        if (pathname !== '/force-password-change') {
          router.push('/force-password-change');
        }
      } else if (pathname === '/force-password-change') {
        router.push(user?.role === 'live_agent' ? '/live-agent' : '/dashboard');
      }
    }
  }, [hasHydrated, isAuthenticated, isLoading, user?.mustChangePassword, pathname, router]);

  if (!hasHydrated || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If password change is required, hide general layout details and only render the child change page
  const isForceResetPage = pathname === '/force-password-change';

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      {children}
      {!isForceResetPage && <MobileBottomNav />}
    </div>
  );
}
