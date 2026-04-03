'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // If already authenticated, redirect to appropriate dashboard
    if (isAuthenticated && user) {
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
    }
  }, [isAuthenticated, user, router]);

  return <>{children}</>;
}