'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const roleNavs: Record<string, NavItem[]> = {
  student: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/grades', label: 'Grades', icon: BookOpen },
    { href: '/chat', label: 'ARIA', icon: Sparkles },
    { href: '/requests', label: 'Documents', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  faculty: [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/faculty/grades', label: 'Grade entry', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  dean: [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dean/grades', label: 'Approvals', icon: BookOpen },
    { href: '/dean/exceptions', label: 'Exceptions', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  admin_staff: [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/grades', label: 'Grade review', icon: BookOpen },
    { href: '/admin/requests', label: 'Payments', icon: FileText },
    { href: '/admin/escalations', label: 'Escalations', icon: Sparkles },
    { href: '/admin/kb', label: 'Policies', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  sys_admin: [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/kb', label: 'Policies', icon: BookOpen },
    { href: '/admin/audit', label: 'Audit', icon: Shield },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  live_agent: [
    { href: '/live-agent', label: 'Queue', icon: MessageSquare },
    { href: '/admin/users', label: 'Student records', icon: Users },
    { href: '/admin/kb', label: 'Policies', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

function formatRole(role?: string) {
  if (!role) return 'Student';
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = roleNavs[user?.role ?? 'student'] ?? roleNavs.student;

  return (
    <header className="sticky top-0 z-40 border-b border-[#dce7ef] bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={navItems[0]?.href ?? '/dashboard'} className="flex min-w-0 items-center gap-2.5" aria-label="SISP home">
          <Image
            src="/rmc/rmc-logo.png"
            alt=""
            width={40}
            height={40}
            className="size-9 shrink-0 rounded-full object-contain"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold tracking-[-0.02em] text-[#102f49]">SISP</p>
            <p className="truncate text-[11px] text-[#587387]">Regis Marie College</p>
          </div>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 lg:flex" aria-label="Portal navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-1.5 px-2.5 text-[13px]',
                  isActive && 'pointer-events-none',
                )}
              >
                <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                  <Icon className="size-3.5" strokeWidth={1.8} />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationBell />
          <div className="hidden max-w-[170px] flex-col text-right lg:flex">
            <span className="truncate text-xs font-semibold text-[#102f49]">{user?.email}</span>
            <span className="text-[10px] font-medium text-[#587387]">{formatRole(user?.role)}</span>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={logout}
            aria-label="Sign out"
            className="border-[#dce7ef] text-[#365a72] hover:bg-[#eef5fa] hover:text-[#102f49]"
          >
            <LogOut className="size-4" strokeWidth={1.8} />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
