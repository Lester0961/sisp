'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText, LayoutDashboard, MessageSquare, Settings, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isCenter?: boolean;
};

const roleNavs: Record<string, NavItem[]> = {
  student: [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/grades', label: 'Grades', icon: BookOpen },
    { href: '/chat', label: 'ARIA', icon: Sparkles, isCenter: true },
    { href: '/requests', label: 'Documents', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  faculty: [
    { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/faculty/grades', label: 'Grades', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  dean: [
    { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/dean/grades', label: 'Approvals', icon: BookOpen },
    { href: '/dean/exceptions', label: 'Exceptions', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  admin_staff: [
    { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/escalations', label: 'ARIA', icon: Sparkles, isCenter: true },
    { href: '/admin/requests', label: 'Payments', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  sys_admin: [
    { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/kb', label: 'Policies', icon: BookOpen },
    { href: '/admin/audit', label: 'Audit', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  live_agent: [
    { href: '/live-agent', label: 'Queue', icon: MessageSquare },
    { href: '/admin/users', label: 'Records', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const navItems = roleNavs[user?.role ?? 'student'] ?? roleNavs.student;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce7ef] bg-white lg:hidden">
      <nav
        className="flex min-h-[calc(4.75rem+env(safe-area-inset-bottom))] items-start justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2"
        aria-label="Mobile portal navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors active:translate-y-px',
                isActive ? 'text-[#0a439b]' : 'text-[#6c879a]',
              )}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-xl',
                  item.isCenter && 'size-10 -mt-4 border-4 border-[#f8fbfd] bg-[#0a439b] text-white shadow-[0_8px_20px_rgb(10_67_155_/_0.22)]',
                  isActive && !item.isCenter && 'bg-[#eaf3fa]',
                )}
              >
                <Icon className={cn(item.isCenter ? 'size-5' : 'size-[18px]')} strokeWidth={1.9} />
              </span>
              <span className={cn('max-w-full truncate text-[10px] leading-none', isActive && 'font-bold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
